-- =============================================================================
-- Shuky · security hardening
--
--   1. Phone numbers can't be scraped: hidden from profiles / the feed; revealed one
--      seller at a time via get_seller_whatsapp() (logged, rate limited).
--   3. No XP farming: XP only once per pair of users per 7 days, max 3 XP trades a day.
--      Ratings: once per rater -> ratee per 30 days.
--   4. Rate limits: new listings (10/day), new trades (15/day), reports (20/day).
--   5. Report & block: reports (auto-hide a listing after 3 reporters), blocks hide
--      each other's listings, notifications, contact and trades.
--   6. Location must be inside the community area; posting a listing needs it.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Communities: allowed area per community (location check)
-- -----------------------------------------------------------------------------
create table public.community_areas (
  community text primary key,
  center extensions.geography(point, 4326) not null,
  radius_meters integer not null check (radius_meters > 0)
);

alter table public.community_areas enable row level security;
revoke all on public.community_areas from anon, authenticated;

insert into public.community_areas (community, center, radius_meters)
values ('להבים', extensions.st_setsrid(extensions.st_makepoint(34.8150, 31.3710), 4326)::extensions.geography, 3500);

-- -----------------------------------------------------------------------------
-- Blocks
-- -----------------------------------------------------------------------------
create table public.blocks (
  blocker_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint blocks_not_self check (blocker_id <> blocked_id)
);

alter table public.blocks enable row level security;

create policy "Users see whom they blocked"
  on public.blocks for select to authenticated
  using (blocker_id = (select auth.uid()));

create policy "Users block for themselves"
  on public.blocks for insert to authenticated
  with check (blocker_id = (select auth.uid()));

create policy "Users unblock"
  on public.blocks for delete to authenticated
  using (blocker_id = (select auth.uid()));

revoke all on public.blocks from anon;
revoke insert, update on public.blocks from authenticated;
grant insert (blocked_id) on public.blocks to authenticated;

-- True when either user blocked the other.
create function public.is_blocked_pair(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  )
$$;

revoke execute on function public.is_blocked_pair(uuid, uuid) from public, anon, authenticated;

create function public.my_blocks()
returns table (user_id uuid, name text, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select b.blocked_id, p.name, b.created_at
  from public.blocks b
  join public.profiles p on p.id = b.blocked_id
  where b.blocker_id = (select auth.uid())
  order by b.created_at desc
$$;

revoke execute on function public.my_blocks() from public, anon;
grant execute on function public.my_blocks() to authenticated;

-- -----------------------------------------------------------------------------
-- Reports
-- -----------------------------------------------------------------------------
create type public.report_reason as enum ('spam', 'inappropriate', 'unsafe_food', 'fake', 'harassment', 'other');

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  reported_user_id uuid not null references public.profiles (id) on delete cascade,
  listing_id uuid references public.listings (id) on delete set null,
  reason public.report_reason not null,
  details text check (char_length(details) <= 500),
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  created_at timestamptz not null default now(),
  constraint reports_not_self check (reporter_id <> reported_user_id)
);

create index reports_open_idx on public.reports (created_at desc) where status = 'open';

alter table public.reports enable row level security;

-- Users can file reports but not read them; the operator reviews them in the dashboard.
create policy "Users file reports"
  on public.reports for insert to authenticated
  with check (reporter_id = (select auth.uid()));

revoke all on public.reports from anon;
revoke select, insert, update, delete on public.reports from authenticated;
grant insert (reported_user_id, listing_id, reason, details) on public.reports to authenticated;

create function public.reports_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.reports where reporter_id = new.reporter_id and created_at > now() - interval '24 hours') >= 20 then
    raise exception 'rate limit: too many reports';
  end if;
  if new.listing_id is not null
     and not exists (select 1 from public.listings where id = new.listing_id and seller_id = new.reported_user_id) then
    raise exception 'listing does not belong to the reported user';
  end if;
  return new;
end;
$$;

create trigger reports_guard
  before insert on public.reports
  for each row execute function public.reports_guard();

-- Three different established neighbors (location in the community, account 3+ days old) reporting
-- the same listing hide it until the operator reviews it. Fresh throwaway accounts don't count.
create function public.reports_autohide()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.listing_id is not null and (
    select count(distinct r.reporter_id)
    from public.reports r
    join public.profiles p on p.id = r.reporter_id
    where r.listing_id = new.listing_id
      and r.status = 'open'
      and p.created_at < now() - interval '3 days'
      and exists (select 1 from public.profile_locations pl where pl.profile_id = r.reporter_id)
  ) >= 3 then
    update public.listings set is_active = false where id = new.listing_id;
  end if;
  return new;
end;
$$;

create trigger reports_autohide
  after insert on public.reports
  for each row execute function public.reports_autohide();

-- -----------------------------------------------------------------------------
-- 1. Phone numbers: not readable in bulk
-- -----------------------------------------------------------------------------
revoke select on public.profiles from authenticated;
grant select (id, name, community, xp, trades_count, rating_avg, rating_count, created_at)
  on public.profiles to authenticated;

-- The signed-in user's own full profile (incl. phone and preferences).
create function public.get_my_profile()
returns table (
  id uuid,
  name text,
  phone text,
  community text,
  xp integer,
  trades_count integer,
  rating_avg numeric,
  notification_prefs jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.name, p.phone, p.community, p.xp, p.trades_count, p.rating_avg, p.notification_prefs
  from public.profiles p
  where p.id = (select auth.uid())
$$;

revoke execute on function public.get_my_profile() from public, anon;
grant execute on function public.get_my_profile() to authenticated;

create table public.contact_reveals (
  user_id uuid not null references public.profiles (id) on delete cascade,
  seller_id uuid not null references public.profiles (id) on delete cascade,
  listing_id uuid references public.listings (id) on delete set null,
  created_at timestamptz not null default now()
);

create index contact_reveals_user_idx on public.contact_reveals (user_id, created_at desc);

alter table public.contact_reveals enable row level security;
revoke all on public.contact_reveals from anon, authenticated;

-- One seller's WhatsApp number, when the buyer taps "order". At most 20 different sellers a day.
create function public.get_seller_whatsapp(p_listing_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  v_seller uuid;
  v_phone text;
begin
  if me is null then
    raise exception 'not signed in';
  end if;

  select l.seller_id, p.phone into v_seller, v_phone
  from public.listings l
  join public.profiles p on p.id = l.seller_id
  join public.profiles mine on mine.id = me and mine.community = p.community
  where l.id = p_listing_id and (l.is_active or l.seller_id = me);

  if v_seller is null or public.is_blocked_pair(me, v_seller) then
    raise exception 'not available';
  end if;
  if v_seller = me then
    return v_phone;
  end if;

  if not exists (
    select 1 from public.contact_reveals
    where user_id = me and seller_id = v_seller and created_at > now() - interval '24 hours'
  ) and (
    select count(distinct seller_id) from public.contact_reveals
    where user_id = me and created_at > now() - interval '24 hours'
  ) >= 20 then
    raise exception 'rate limit: too many contacts';
  end if;

  insert into public.contact_reveals (user_id, seller_id, listing_id) values (me, v_seller, p_listing_id);
  return v_phone;
end;
$$;

revoke execute on function public.get_seller_whatsapp(uuid) from public, anon;
grant execute on function public.get_seller_whatsapp(uuid) to authenticated;

-- Feed without phone numbers, and without blocked users.
drop function public.nearby_listings();

create function public.nearby_listings()
returns table (
  id uuid,
  seller_id uuid,
  title text,
  category public.listing_category,
  price integer,
  unit text,
  description text,
  availability public.listing_availability,
  baked_at date,
  notice_days smallint,
  dietary public.dietary_tag[],
  photo_path text,
  is_active boolean,
  created_at timestamptz,
  seller_name text,
  seller_level integer,
  seller_trades integer,
  seller_rating numeric,
  distance_meters integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    l.id, l.seller_id, l.title, l.category, l.price, l.unit, l.description, l.availability,
    l.baked_at, l.notice_days, l.dietary, l.photo_path, l.is_active, l.created_at,
    p.name, public.level_for_xp(p.xp), p.trades_count, p.rating_avg,
    case
      when l.seller_id = me.id then 0
      when ml.location is null or sl.location is null then null
      else (round(extensions.st_distance(ml.location, sl.location) / 50.0) * 50)::integer
    end
  from public.profiles me
  join public.listings l on (l.is_active or l.seller_id = me.id)
  join public.profiles p on p.id = l.seller_id and p.community = me.community
  left join public.profile_locations ml on ml.profile_id = me.id
  left join public.profile_locations sl on sl.profile_id = l.seller_id
  where me.id = (select auth.uid())
    and not public.is_blocked_pair(me.id, l.seller_id)
  order by l.created_at desc
  limit 300
$$;

revoke execute on function public.nearby_listings() from public, anon;
grant execute on function public.nearby_listings() to authenticated;

-- -----------------------------------------------------------------------------
-- 6. Location must be inside the community area
-- -----------------------------------------------------------------------------
create or replace function public.set_my_location(lat double precision, lng double precision)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  point extensions.geography;
  area public.community_areas;
begin
  if me is null then
    raise exception 'not signed in';
  end if;
  if lat not between -90 and 90 or lng not between -180 and 180 then
    raise exception 'invalid coordinates';
  end if;
  point := extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography;

  select a.* into area
  from public.community_areas a
  join public.profiles p on p.community = a.community
  where p.id = me;

  if area.community is not null and extensions.st_distance(point, area.center) > area.radius_meters then
    raise exception 'outside community';
  end if;

  insert into public.profile_locations (profile_id, location)
  values (me, point)
  on conflict (profile_id) do update set location = excluded.location;
end;
$$;

revoke execute on function public.set_my_location(double precision, double precision) from public, anon;
grant execute on function public.set_my_location(double precision, double precision) to authenticated;

-- Clients can only set their location through set_my_location() (with the area check).
revoke insert, update on public.profile_locations from authenticated;

-- -----------------------------------------------------------------------------
-- 4 + 6. Listings: location required, max 10 new listings a day (deletes don't reset it)
-- -----------------------------------------------------------------------------
create table public.listing_posts (
  seller_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index listing_posts_seller_idx on public.listing_posts (seller_id, created_at desc);

alter table public.listing_posts enable row level security;
revoke all on public.listing_posts from anon, authenticated;

create function public.listings_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.profile_locations where profile_id = new.seller_id) then
    raise exception 'location required';
  end if;
  if (select count(*) from public.listing_posts where seller_id = new.seller_id and created_at > now() - interval '24 hours') >= 10 then
    raise exception 'rate limit: too many listings';
  end if;
  insert into public.listing_posts (seller_id) values (new.seller_id);
  return new;
end;
$$;

create trigger listings_guard
  before insert on public.listings
  for each row execute function public.listings_guard();

-- New-listing notifications skip blocked users.
create or replace function public.listings_notify_neighbors()
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
  where p.community = seller.community
    and p.id <> seller.id
    and not public.is_blocked_pair(p.id, seller.id);
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 3. Trades: XP once per pair per 7 days, max 3 XP trades a day; 15 new trades a day; blocks
-- -----------------------------------------------------------------------------
alter table public.trades add column xp_awarded boolean not null default false;

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
  v_award boolean;
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
  if public.is_blocked_pair(v_buyer, v_seller) then
    raise exception 'not available';
  end if;
  v_other := case when me = v_seller then v_buyer else v_seller end;

  select * into t from public.trades
  where listing_id = p_listing_id and seller_id = v_seller and buyer_id = v_buyer and completed_at is null
  order by created_at desc
  limit 1
  for update;

  if t.id is null then
    if (select count(*) from public.trades where me in (seller_id, buyer_id) and created_at > now() - interval '24 hours') >= 15 then
      raise exception 'rate limit: too many trades';
    end if;
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
    -- XP only for the first trade between these two in 7 days, and at most 3 XP trades a day per person.
    v_award := not exists (
      select 1 from public.trades x
      where x.id <> t.id and x.xp_awarded and x.completed_at > now() - interval '7 days'
        and ((x.seller_id = t.seller_id and x.buyer_id = t.buyer_id) or (x.seller_id = t.buyer_id and x.buyer_id = t.seller_id))
    )
    and (select count(*) from public.trades x where x.xp_awarded and x.completed_at > now() - interval '24 hours' and t.seller_id in (x.seller_id, x.buyer_id)) < 3
    and (select count(*) from public.trades x where x.xp_awarded and x.completed_at > now() - interval '24 hours' and t.buyer_id in (x.seller_id, x.buyer_id)) < 3;

    update public.trades set completed_at = now(), xp_awarded = v_award where id = t.id returning * into t;

    for p in select id, xp from public.profiles where id in (t.seller_id, t.buyer_id) for update loop
      if v_award then
        old_level := public.level_for_xp(p.xp);
        update public.profiles
          set xp = xp + public.xp_per_trade(), trades_count = trades_count + 1
          where id = p.id;
        perform public.notify(p.id, 'tradeCompleted', 'העסקה הושלמה! +' || public.xp_per_trade() || ' נקודות', v_title, '/trade/' || t.id);
        if public.level_for_xp(p.xp + public.xp_per_trade()) > old_level then
          perform public.notify(
            p.id, 'level',
            'עלית לרמה ' || public.level_for_xp(p.xp + public.xp_per_trade()) || ': '
              || public.level_title(public.level_for_xp(p.xp + public.xp_per_trade())),
            'כל הכבוד!',
            '/profile'
          );
        end if;
      else
        perform public.notify(p.id, 'tradeCompleted', 'העסקה הושלמה!', v_title, '/trade/' || t.id);
      end if;
    end loop;
  elsif (me = v_seller and t.buyer_confirmed_at is null) or (me = v_buyer and t.seller_confirmed_at is null) then
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

drop function public.my_trades();

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
  i_rated boolean,
  xp_awarded boolean,
  can_rate boolean
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
    exists (select 1 from public.ratings r where r.trade_id = t.id and r.rater_id = me.uid),
    t.xp_awarded,
    t.completed_at is not null and not exists (
      select 1 from public.ratings r
      where r.rater_id = me.uid and r.ratee_id = o.id and r.created_at > now() - interval '30 days'
    )
  from (select (select auth.uid()) as uid) me
  join public.trades t on me.uid in (t.buyer_id, t.seller_id)
  left join public.listings l on l.id = t.listing_id
  join public.profiles o on o.id = case when t.buyer_id = me.uid then t.seller_id else t.buyer_id end
  order by t.created_at desc
  limit 200
$$;

revoke execute on function public.my_trades() from public, anon;
grant execute on function public.my_trades() to authenticated;

-- Ratings: one per rater -> ratee per 30 days (repeat trades can't pump a rating).
drop policy "Participants rate the other side of a completed trade" on public.ratings;

create policy "Participants rate the other side of a completed trade"
  on public.ratings for insert to authenticated
  with check (
    rater_id = (select auth.uid())
    and exists (
      select 1 from public.trades t
      where t.id = trade_id
        and t.completed_at is not null
        and (
          (t.seller_id = rater_id and t.buyer_id = ratee_id)
          or (t.buyer_id = rater_id and t.seller_id = ratee_id)
        )
    )
    and not exists (
      select 1 from public.ratings r
      -- "ratings.ratee_id" is the new row (the subquery's own table is aliased r).
      where r.rater_id = (select auth.uid()) and r.ratee_id = ratings.ratee_id and r.created_at > now() - interval '30 days'
    )
  );
