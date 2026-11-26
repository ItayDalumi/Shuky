-- =============================================================================
-- Shuky · moderation tools for the operator
--
--   * public.admins: who may moderate. Add yourself once in the SQL Editor:
--       insert into public.admins (user_id)
--       select id from auth.users where email = 'YOUR-EMAIL';
--   * Every new report sends a push + in-app notification to the admins
--     (not subject to the user's notification toggles).
--   * Admin RPCs: list reports, hide / restore a listing, dismiss a report,
--     suspend / unsuspend a user. Suspended users can't post or reactivate listings.
--   * Admins can see the photo of a hidden listing (to judge a report).
-- =============================================================================

alter type public.notification_kind add value if not exists 'report';

-- -----------------------------------------------------------------------------
-- Admins
-- -----------------------------------------------------------------------------
create table public.admins (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;
revoke all on public.admins from anon, authenticated;

create function public.is_admin(p_user uuid default null)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins a where a.user_id = coalesce(p_user, (select auth.uid())))
$$;

revoke execute on function public.is_admin(uuid) from public, anon;
grant execute on function public.is_admin(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Suspended users
-- -----------------------------------------------------------------------------
alter table public.profiles add column suspended_at timestamptz;

-- Set when a listing is hidden by moderation (3 reports or an admin). The seller can't turn it
-- back on; only an admin's "restore" clears it. Not writable by users (column grants).
alter table public.listings add column moderated_at timestamptz;

create function public.listings_block_suspended()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.is_active and exists (
    select 1 from public.profiles where id = new.seller_id and suspended_at is not null
  ) then
    raise exception 'account suspended';
  end if;
  if new.is_active and new.moderated_at is not null then
    raise exception 'hidden by moderation';
  end if;
  return new;
end;
$$;

create trigger listings_block_suspended
  before insert or update of is_active, moderated_at on public.listings
  for each row execute function public.listings_block_suspended();

-- Auto-hide (3 established reporters) now also marks the listing as moderated.
create or replace function public.reports_autohide()
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
    update public.listings set is_active = false, moderated_at = now() where id = new.listing_id;
  end if;
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Reports always reach the admins
-- -----------------------------------------------------------------------------
create or replace function public.notify(
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
  pref_key text := case p_kind::text
    when 'newListing' then 'newListings'
    when 'tradeConfirm' then 'orders'
    when 'tradeCompleted' then 'orders'
    when 'report' then null -- moderation alerts can't be turned off
    else 'ratings'
  end;
begin
  select notification_prefs into prefs from public.profiles where id = p_user;
  if pref_key is null or prefs is null or coalesce((prefs ->> pref_key)::boolean, true) then
    insert into public.notifications (user_id, kind, title, body, href)
    values (p_user, p_kind, p_title, coalesce(p_body, ''), p_href);
  end if;
end;
$$;

revoke execute on function public.notify(uuid, public.notification_kind, text, text, text) from public, anon, authenticated;

create function public.report_label(p_reason public.report_reason)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_reason::text
    when 'unsafe_food' then 'מזון לא בטוח'
    when 'fake' then 'תיאור מזויף'
    when 'inappropriate' then 'תוכן לא הולם'
    when 'spam' then 'ספאם'
    when 'harassment' then 'הטרדה'
    when 'dangerous' then 'סכנה לאדם'
    else 'אחר'
  end
$$;

create function public.reports_notify_admins()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  what text;
begin
  select coalesce(l.title, p.name) into what
  from public.profiles p
  left join public.listings l on l.id = new.listing_id
  where p.id = new.reported_user_id;

  perform public.notify(a.user_id, 'report'::text::public.notification_kind,
                        'דיווח חדש: ' || public.report_label(new.reason), coalesce(what, ''), '/admin')
  from public.admins a
  where a.user_id <> new.reported_user_id;
  return new;
end;
$$;

create trigger reports_notify_admins
  after insert on public.reports
  for each row execute function public.reports_notify_admins();

-- -----------------------------------------------------------------------------
-- Admin RPCs
-- -----------------------------------------------------------------------------
create function public.admin_reports()
returns table (
  id uuid,
  created_at timestamptz,
  reason public.report_reason,
  details text,
  status text,
  listing_id uuid,
  listing_title text,
  listing_active boolean,
  listing_photo_path text,
  listing_category public.listing_category,
  reported_user_id uuid,
  reported_name text,
  reported_suspended boolean,
  reporter_name text,
  open_reports_on_target bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return query
  select r.id, r.created_at, r.reason, r.details, r.status,
         r.listing_id, l.title, l.is_active, l.photo_path, l.category,
         r.reported_user_id, ru.name, ru.suspended_at is not null, rp.name,
         (select count(*) from public.reports o
           where o.status = 'open'
             and (o.listing_id = r.listing_id or (r.listing_id is null and o.reported_user_id = r.reported_user_id)))
  from public.reports r
  join public.profiles ru on ru.id = r.reported_user_id
  join public.profiles rp on rp.id = r.reporter_id
  left join public.listings l on l.id = r.listing_id
  where r.status = 'open' or r.created_at > now() - interval '30 days'
  order by (r.status = 'open') desc, r.created_at desc
  limit 200;
end;
$$;

-- p_action: 'hide' (hide the listing), 'restore' (show it again), 'dismiss' (report is unfounded),
-- 'suspend' (suspend the reported user and hide all their listings).
create function public.admin_resolve_report(p_report uuid, p_action text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  rep public.reports;
begin
  if not public.is_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select * into rep from public.reports where id = p_report;
  if rep.id is null then
    raise exception 'not available';
  end if;

  if p_action = 'hide' then
    update public.listings set is_active = false, moderated_at = now() where id = rep.listing_id;
    update public.reports set status = 'reviewed'
      where status = 'open' and (id = rep.id or (rep.listing_id is not null and listing_id = rep.listing_id));
  elsif p_action = 'restore' then
    update public.reports set status = 'dismissed'
      where status = 'open' and (id = rep.id or (rep.listing_id is not null and listing_id = rep.listing_id));
    update public.listings set moderated_at = null, is_active = true where id = rep.listing_id;
  elsif p_action = 'dismiss' then
    update public.reports set status = 'dismissed' where id = rep.id;
  elsif p_action = 'suspend' then
    update public.profiles set suspended_at = now() where id = rep.reported_user_id and suspended_at is null;
    update public.listings set is_active = false, moderated_at = now() where seller_id = rep.reported_user_id;
    update public.reports set status = 'reviewed'
      where status = 'open' and reported_user_id = rep.reported_user_id;
  else
    raise exception 'unknown action' using errcode = '22023';
  end if;
end;
$$;

create function public.admin_unsuspend(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.profiles set suspended_at = null where id = p_user;
end;
$$;

revoke execute on function public.admin_reports() from public, anon;
revoke execute on function public.admin_resolve_report(uuid, text) from public, anon;
revoke execute on function public.admin_unsuspend(uuid) from public, anon;
grant execute on function public.admin_reports() to authenticated;
grant execute on function public.admin_resolve_report(uuid, text) to authenticated;
grant execute on function public.admin_unsuspend(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Admins can see the photo of any listing (to judge a report, even after it's hidden)
-- -----------------------------------------------------------------------------
create or replace function public.can_view_listing_photo(p_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_admin() or exists (
    select 1
    from public.listings l
    join public.profiles seller on seller.id = l.seller_id
    join public.profiles me on me.id = (select auth.uid())
    where l.photo_path = p_path
      and seller.community = me.community
      and (l.is_active or l.seller_id = me.id)
      and not public.is_blocked_pair(me.id, l.seller_id)
  )
$$;
