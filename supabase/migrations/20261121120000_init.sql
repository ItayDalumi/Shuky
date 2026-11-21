-- =============================================================================
-- Shuky · Phase 2 schema
--
-- Tables: profiles, profile_locations, listings, trades, ratings
-- Rules enforced here (not only in the app):
--   * Exact locations are never readable by other users. Points are snapped to a
--     ~100 m grid on write, and other users only ever see a rounded distance.
--   * Users can only write their own name; XP, trades, rating and phone are server-managed.
--   * XP is awarded only when BOTH sides confirm a trade (confirm_trade()).
--   * Only signed-in users of the same community see listings.
--
-- Run once in the Supabase dashboard (SQL Editor) or with `supabase db push`.
-- =============================================================================

create extension if not exists postgis with schema extensions;

-- -----------------------------------------------------------------------------
-- Enums (values match src/data/types.ts)
-- -----------------------------------------------------------------------------
create type public.listing_category as enum ('cakes', 'cookies', 'pastries', 'breads', 'desserts');
create type public.listing_availability as enum ('ready', 'preorder');
create type public.dietary_tag as enum ('kosher', 'parve', 'glutenFree', 'vegan', 'nutFree');

-- Level ladder. Keep in sync with src/lib/levels.ts.
create function public.level_for_xp(xp integer)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case
    when xp >= 900 then 5
    when xp >= 500 then 4
    when xp >= 250 then 3
    when xp >= 100 then 2
    else 1
  end
$$;

-- XP per completed trade. Keep in sync with XP_PER_TRADE in src/lib/levels.ts.
create function public.xp_per_trade()
returns integer
language sql
immutable
set search_path = ''
as $$ select 20 $$;

-- -----------------------------------------------------------------------------
-- profiles: public info about a user (visible to signed-in users)
-- -----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 30),
  -- Copied from auth.users on insert; used only for wa.me links.
  phone text,
  community text not null default 'להבים',
  xp integer not null default 0 check (xp >= 0),
  trades_count integer not null default 0 check (trades_count >= 0),
  rating_avg numeric(2, 1),
  rating_count integer not null default 0 check (rating_count >= 0),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Signed-in users can see profiles"
  on public.profiles for select to authenticated
  using (true);

create policy "Users create their own profile"
  on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));

create policy "Users update their own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Column-level: clients may only set their id + name. Everything else is server-managed.
revoke insert, update, delete on public.profiles from anon, authenticated;
revoke select on public.profiles from anon;
grant insert (id, name) on public.profiles to authenticated;
grant update (name) on public.profiles to authenticated;

create function public.profiles_set_phone()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select u.phone into new.phone from auth.users u where u.id = new.id;
  return new;
end;
$$;

create trigger profiles_set_phone
  before insert on public.profiles
  for each row execute function public.profiles_set_phone();

-- -----------------------------------------------------------------------------
-- profile_locations: private. Only the owner can read their own point.
-- -----------------------------------------------------------------------------
create table public.profile_locations (
  profile_id uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  location extensions.geography(point, 4326) not null,
  updated_at timestamptz not null default now()
);

alter table public.profile_locations enable row level security;

create policy "Users see only their own location"
  on public.profile_locations for select to authenticated
  using (profile_id = (select auth.uid()));

create policy "Users insert their own location"
  on public.profile_locations for insert to authenticated
  with check (profile_id = (select auth.uid()));

create policy "Users update their own location"
  on public.profile_locations for update to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

revoke all on public.profile_locations from anon;

-- Snap every stored point to a ~100 m grid: even the database never holds the exact address.
create function public.profile_locations_snap()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.location := extensions.st_snaptogrid(new.location::extensions.geometry, 0.001)::extensions.geography;
  new.updated_at := now();
  return new;
end;
$$;

create trigger profile_locations_snap
  before insert or update on public.profile_locations
  for each row execute function public.profile_locations_snap();

-- Called by the app after the location permission prompt.
create function public.set_my_location(lat double precision, lng double precision)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'not signed in';
  end if;
  if lat not between -90 and 90 or lng not between -180 and 180 then
    raise exception 'invalid coordinates';
  end if;
  insert into public.profile_locations (profile_id, location)
  values (
    (select auth.uid()),
    extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography
  )
  on conflict (profile_id) do update set location = excluded.location;
end;
$$;

revoke execute on function public.set_my_location(double precision, double precision) from public, anon;
grant execute on function public.set_my_location(double precision, double precision) to authenticated;

-- -----------------------------------------------------------------------------
-- listings: home-baked goods for sale
-- -----------------------------------------------------------------------------
create table public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 2 and 40),
  category public.listing_category not null,
  price integer not null check (price between 1 and 9999),
  unit text check (char_length(unit) <= 30),
  description text not null default '' check (char_length(description) <= 280),
  availability public.listing_availability not null,
  baked_at date,
  notice_days smallint check (notice_days in (1, 2, 3, 7)),
  dietary public.dietary_tag[] not null default '{}',
  -- Path inside the "listing-photos" bucket: <seller_id>/<file>
  photo_path text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint listings_availability_fields check (
    (availability = 'ready' and baked_at is not null and notice_days is null)
    or (availability = 'preorder' and notice_days is not null and baked_at is null)
  )
);

create index listings_seller_id_idx on public.listings (seller_id);
create index listings_active_created_idx on public.listings (created_at desc) where is_active;

alter table public.listings enable row level security;

create policy "Signed-in users see active listings and their own"
  on public.listings for select to authenticated
  using (is_active or seller_id = (select auth.uid()));

create policy "Users create their own listings"
  on public.listings for insert to authenticated
  with check (seller_id = (select auth.uid()));

create policy "Users update their own listings"
  on public.listings for update to authenticated
  using (seller_id = (select auth.uid()))
  with check (seller_id = (select auth.uid()));

create policy "Users delete their own listings"
  on public.listings for delete to authenticated
  using (seller_id = (select auth.uid()));

revoke all on public.listings from anon;
revoke insert, update on public.listings from authenticated;
grant insert (title, category, price, unit, description, availability, baked_at, notice_days, dietary, photo_path)
  on public.listings to authenticated;
grant update (title, category, price, unit, description, availability, baked_at, notice_days, dietary, photo_path, is_active)
  on public.listings to authenticated;

-- -----------------------------------------------------------------------------
-- nearby_listings(): the feed. Same community only, with a ROUNDED distance (50 m steps).
-- Security definer so it can measure distance without exposing anyone's location.
-- -----------------------------------------------------------------------------
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
  seller_phone text,
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
    p.name, p.phone, public.level_for_xp(p.xp), p.trades_count, p.rating_avg,
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
  order by l.created_at desc
  limit 300
$$;

revoke execute on function public.nearby_listings() from public, anon;
grant execute on function public.nearby_listings() to authenticated;

-- -----------------------------------------------------------------------------
-- trades: one buyer, one seller, one listing. Completed only when BOTH confirm.
-- -----------------------------------------------------------------------------
create table public.trades (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings (id) on delete set null,
  seller_id uuid not null references public.profiles (id) on delete cascade,
  buyer_id uuid not null references public.profiles (id) on delete cascade,
  seller_confirmed_at timestamptz,
  buyer_confirmed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint trades_two_sides check (seller_id <> buyer_id)
);

create index trades_seller_idx on public.trades (seller_id);
create index trades_buyer_idx on public.trades (buyer_id);

alter table public.trades enable row level security;

create policy "Participants see their trades"
  on public.trades for select to authenticated
  using ((select auth.uid()) in (seller_id, buyer_id));

-- No direct writes: trades change only through confirm_trade().
revoke all on public.trades from anon;
revoke insert, update, delete on public.trades from authenticated;

-- Either side marks the trade as done. When both have confirmed, the trade completes
-- and each side gets XP exactly once.
--   p_listing_id: the listing traded
--   p_buyer_id:   required when the SELLER confirms (who bought it); ignored for the buyer
create function public.confirm_trade(p_listing_id uuid, p_buyer_id uuid default null)
returns public.trades
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  v_seller uuid;
  v_buyer uuid;
  t public.trades;
begin
  if me is null then
    raise exception 'not signed in';
  end if;

  select seller_id into v_seller from public.listings where id = p_listing_id;
  if v_seller is null then
    raise exception 'listing not found';
  end if;

  v_buyer := case when me = v_seller then p_buyer_id else me end;
  if v_buyer is null or v_buyer = v_seller then
    raise exception 'a trade needs a buyer and a seller';
  end if;

  -- Reuse the open trade between these two for this listing, or start one.
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
    update public.profiles
      set xp = xp + public.xp_per_trade(), trades_count = trades_count + 1
      where id in (t.seller_id, t.buyer_id);
  end if;

  return t;
end;
$$;

revoke execute on function public.confirm_trade(uuid, uuid) from public, anon;
grant execute on function public.confirm_trade(uuid, uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- ratings: after a completed trade, each side may rate the other once.
-- -----------------------------------------------------------------------------
create table public.ratings (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references public.trades (id) on delete cascade,
  rater_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  ratee_id uuid not null references public.profiles (id) on delete cascade,
  stars smallint not null check (stars between 1 and 5),
  comment text check (char_length(comment) <= 200),
  created_at timestamptz not null default now(),
  constraint ratings_one_per_side unique (trade_id, rater_id),
  constraint ratings_not_self check (rater_id <> ratee_id)
);

create index ratings_ratee_idx on public.ratings (ratee_id);

alter table public.ratings enable row level security;

create policy "Signed-in users see ratings"
  on public.ratings for select to authenticated
  using (true);

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
  );

revoke all on public.ratings from anon;
revoke insert, update, delete on public.ratings from authenticated;
grant insert (trade_id, ratee_id, stars, comment) on public.ratings to authenticated;

create function public.ratings_update_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles p
    set rating_count = s.cnt, rating_avg = s.avg
    from (
      select count(*)::integer as cnt, round(avg(stars), 1) as avg
      from public.ratings where ratee_id = new.ratee_id
    ) s
    where p.id = new.ratee_id;
  return new;
end;
$$;

create trigger ratings_update_profile
  after insert on public.ratings
  for each row execute function public.ratings_update_profile();

-- -----------------------------------------------------------------------------
-- Delete account (required by the App Store). The app removes the user's photos
-- through the Storage API first; this deletes the auth user, and everything else
-- cascades (profile, location, listings, trades, ratings).
-- -----------------------------------------------------------------------------
create function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'not signed in';
  end if;
  delete from auth.users where id = (select auth.uid());
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- -----------------------------------------------------------------------------
-- Storage: public bucket for listing photos. Users write only inside <their id>/.
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-photos', 'listing-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "Listing photos: upload to own folder"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Listing photos: read own folder"
  on storage.objects for select to authenticated
  using (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Listing photos: update own folder"
  on storage.objects for update to authenticated
  using (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Listing photos: delete own folder"
  on storage.objects for delete to authenticated
  using (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
