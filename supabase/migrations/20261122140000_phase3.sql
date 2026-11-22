-- =============================================================================
-- Shuky · Phase 3: trades & XP flow, ratings, saved items, notifications
--
--   * saved_listings: each user's saved items (private)
--   * profiles.notification_prefs: which notifications the user wants
--   * notifications: created by the server (triggers / functions), never by clients
--   * confirm_trade(): now also notifies the other side, and on completion
--     notifies both (+ level-up notifications)
--   * my_trades(): the user's trades with titles, names and "did I rate" state
--   * decline_trade(): either side can cancel a trade that isn't completed yet
-- =============================================================================

-- Keep in sync with LEVELS in src/lib/levels.ts
create function public.level_title(level integer)
returns text
language sql
immutable
set search_path = ''
as $$
  select case level
    when 1 then 'בצק טרי'
    when 2 then 'תופח יפה'
    when 3 then 'יוצא מהתנור'
    when 4 then 'זהוב ופריך'
    else 'כוכב המאפייה'
  end
$$;

-- -----------------------------------------------------------------------------
-- Saved items
-- -----------------------------------------------------------------------------
create table public.saved_listings (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

alter table public.saved_listings enable row level security;

create policy "Users see their saved items"
  on public.saved_listings for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Users save items for themselves"
  on public.saved_listings for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users unsave their items"
  on public.saved_listings for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.saved_listings from anon;
revoke insert, update on public.saved_listings from authenticated;
grant insert (listing_id) on public.saved_listings to authenticated;

-- -----------------------------------------------------------------------------
-- Notification preferences (also used for push notifications later)
-- -----------------------------------------------------------------------------
alter table public.profiles
  add column notification_prefs jsonb not null default '{"newListings": true, "orders": true, "ratings": true}';

grant update (name, phone, notification_prefs) on public.profiles to authenticated;

-- -----------------------------------------------------------------------------
-- Notifications
-- -----------------------------------------------------------------------------
create type public.notification_kind as enum ('tradeConfirm', 'tradeCompleted', 'rating', 'newListing', 'level');

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind public.notification_kind not null,
  title text not null,
  body text not null default '',
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_created_idx on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

create policy "Users see their notifications"
  on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Users mark their notifications as read"
  on public.notifications for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on public.notifications from anon;
revoke insert, update, delete on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;

-- Internal helper: respects the recipient's preferences.
create function public.notify(
  p_user uuid,
  p_kind public.notification_kind,
  p_title text,
  p_body text,
  p_href text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  prefs jsonb;
  pref_key text := case p_kind
    when 'newListing' then 'newListings'
    when 'tradeConfirm' then 'orders'
    when 'tradeCompleted' then 'orders'
    else 'ratings'
  end;
begin
  select notification_prefs into prefs from public.profiles where id = p_user;
  if prefs is null or coalesce((prefs ->> pref_key)::boolean, true) then
    insert into public.notifications (user_id, kind, title, body, href)
    values (p_user, p_kind, p_title, coalesce(p_body, ''), p_href);
  end if;
end;
$$;

revoke execute on function public.notify(uuid, public.notification_kind, text, text, text) from public, anon, authenticated;

-- New listing -> neighbors in the same community.
create function public.listings_notify_neighbors()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  seller public.profiles;
begin
  select * into seller from public.profiles where id = new.seller_id;
  perform public.notify(p.id, 'newListing', 'חדש מ' || seller.name, new.title, '/product/' || new.id)
  from public.profiles p
  where p.community = seller.community and p.id <> seller.id;
  return new;
end;
$$;

create trigger listings_notify_neighbors
  after insert on public.listings
  for each row execute function public.listings_notify_neighbors();

-- New rating -> the person who was rated.
create function public.ratings_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  rater_name text;
begin
  select name into rater_name from public.profiles where id = new.rater_id;
  perform public.notify(
    new.ratee_id,
    'rating',
    'קיבלת דירוג חדש: ' || new.stars || ' כוכבים',
    case when coalesce(new.comment, '') = '' then rater_name else rater_name || ': ״' || new.comment || '״' end,
    '/profile'
  );
  return new;
end;
$$;

create trigger ratings_notify
  after insert on public.ratings
  for each row execute function public.ratings_notify();

-- -----------------------------------------------------------------------------
-- confirm_trade(): same rules as before (XP only when BOTH confirm, once),
-- now with notifications.
-- -----------------------------------------------------------------------------
create or replace function public.confirm_trade(p_listing_id uuid, p_buyer_id uuid default null)
returns public.trades
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  v_seller uuid;
  v_buyer uuid;
  v_title text;
  v_other uuid;
  v_my_name text;
  t public.trades;
  p record;
  old_level integer;
begin
  if me is null then
    raise exception 'not signed in';
  end if;

  select seller_id, title into v_seller, v_title from public.listings where id = p_listing_id;
  if v_seller is null then
    raise exception 'listing not found';
  end if;

  v_buyer := case when me = v_seller then p_buyer_id else me end;
  if v_buyer is null or v_buyer = v_seller then
    raise exception 'a trade needs a buyer and a seller';
  end if;
  v_other := case when me = v_seller then v_buyer else v_seller end;

  select * into t from public.trades
  where listing_id = p_listing_id and seller_id = v_seller and buyer_id = v_buyer and completed_at is null
  order by created_at desc
  limit 1
  for update;

  if t.id is null then
    insert into public.trades (listing_id, seller_id, buyer_id)
    values (p_listing_id, v_seller, v_buyer)
    returning * into t;
  end if;

  if me = v_seller then
    update public.trades set seller_confirmed_at = coalesce(seller_confirmed_at, now()) where id = t.id returning * into t;
  else
    update public.trades set buyer_confirmed_at = coalesce(buyer_confirmed_at, now()) where id = t.id returning * into t;
  end if;

  if t.seller_confirmed_at is not null and t.buyer_confirmed_at is not null and t.completed_at is null then
    update public.trades set completed_at = now() where id = t.id returning * into t;

    for p in select id, xp from public.profiles where id in (t.seller_id, t.buyer_id) for update loop
      old_level := public.level_for_xp(p.xp);
      update public.profiles
        set xp = xp + public.xp_per_trade(), trades_count = trades_count + 1
        where id = p.id;
      perform public.notify(
        p.id, 'tradeCompleted',
        'העסקה הושלמה! +' || public.xp_per_trade() || ' נקודות',
        v_title,
        '/trade/' || t.id
      );
      if public.level_for_xp(p.xp + public.xp_per_trade()) > old_level then
        perform public.notify(
          p.id, 'level',
          'עלית לרמה ' || public.level_for_xp(p.xp + public.xp_per_trade()) || ': '
            || public.level_title(public.level_for_xp(p.xp + public.xp_per_trade())),
          'כל הכבוד!',
          '/profile'
        );
      end if;
    end loop;
  elsif (me = v_seller and t.buyer_confirmed_at is null) or (me = v_buyer and t.seller_confirmed_at is null) then
    -- Ask the other side to confirm (only the first time).
    if not exists (
      select 1 from public.notifications
      where user_id = v_other and kind = 'tradeConfirm' and href = '/trade/' || t.id
    ) then
      select name into v_my_name from public.profiles where id = me;
      perform public.notify(
        v_other, 'tradeConfirm',
        case when me = v_buyer then v_my_name || ' סימן/ה שקנה/תה ממך' else v_my_name || ' סימן/ה שמכר/ה לך' end,
        '״' || v_title || '״. אשרו, ושניכם תקבלו ' || public.xp_per_trade() || ' נקודות.',
        '/trade/' || t.id
      );
    end if;
  end if;

  return t;
end;
$$;

revoke execute on function public.confirm_trade(uuid, uuid) from public, anon;
grant execute on function public.confirm_trade(uuid, uuid) to authenticated;

-- Confirm by trade id (used from the trade screen / trades list).
create function public.confirm_trade_by_id(p_trade_id uuid)
returns public.trades
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.trades;
begin
  select * into t from public.trades where id = p_trade_id;
  if t.id is null or (select auth.uid()) not in (t.seller_id, t.buyer_id) then
    raise exception 'trade not found';
  end if;
  if t.listing_id is null then
    raise exception 'the listing was removed';
  end if;
  return public.confirm_trade(t.listing_id, t.buyer_id);
end;
$$;

revoke execute on function public.confirm_trade_by_id(uuid) from public, anon;
grant execute on function public.confirm_trade_by_id(uuid) to authenticated;

-- Either side cancels a trade that hasn't completed.
create function public.decline_trade(p_trade_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.trades;
begin
  select * into t from public.trades where id = p_trade_id;
  if t.id is null or (select auth.uid()) not in (t.seller_id, t.buyer_id) then
    raise exception 'trade not found';
  end if;
  if t.completed_at is not null then
    raise exception 'completed trades cannot be cancelled';
  end if;
  delete from public.notifications where href = '/trade/' || t.id and kind = 'tradeConfirm';
  delete from public.trades where id = t.id;
end;
$$;

revoke execute on function public.decline_trade(uuid) from public, anon;
grant execute on function public.decline_trade(uuid) to authenticated;

-- The user's trades, newest first, with everything the screens need.
create function public.my_trades()
returns table (
  id uuid,
  listing_id uuid,
  listing_title text,
  listing_category public.listing_category,
  role text,
  other_id uuid,
  other_name text,
  i_confirmed boolean,
  other_confirmed boolean,
  completed_at timestamptz,
  created_at timestamptz,
  i_rated boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    t.id,
    t.listing_id,
    coalesce(l.title, 'מוצר שהוסר'),
    l.category,
    case when t.buyer_id = me.uid then 'buyer' else 'seller' end,
    o.id,
    o.name,
    case when t.buyer_id = me.uid then t.buyer_confirmed_at is not null else t.seller_confirmed_at is not null end,
    case when t.buyer_id = me.uid then t.seller_confirmed_at is not null else t.buyer_confirmed_at is not null end,
    t.completed_at,
    t.created_at,
    exists (select 1 from public.ratings r where r.trade_id = t.id and r.rater_id = me.uid)
  from (select (select auth.uid()) as uid) me
  join public.trades t on me.uid in (t.buyer_id, t.seller_id)
  left join public.listings l on l.id = t.listing_id
  join public.profiles o on o.id = case when t.buyer_id = me.uid then t.seller_id else t.buyer_id end
  order by t.created_at desc
  limit 200
$$;

revoke execute on function public.my_trades() from public, anon;
grant execute on function public.my_trades() to authenticated;
