-- =============================================================================
-- Shuky · privacy & compliance
--
--   * Photos are no longer public: the bucket is private, and a signed-in user can
--     read a photo only if it belongs to a listing they can see (same community,
--     active or their own, not blocked). The app uses short-lived signed URLs.
--   * export_my_data(): everything we hold about the user, as JSON (right of access).
--   * Data minimisation: old notifications / logs are purged daily (pg_cron).
--   * Report reason for dangerous content (e.g. self-harm).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Private photos
-- -----------------------------------------------------------------------------
update storage.buckets set public = false where id = 'listing-photos';

create function public.can_view_listing_photo(p_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
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

revoke execute on function public.can_view_listing_photo(text) from public, anon;
grant execute on function public.can_view_listing_photo(text) to authenticated;

create policy "Listing photos: neighbors view photos of listings they can see"
  on storage.objects for select to authenticated
  using (bucket_id = 'listing-photos' and public.can_view_listing_photo(name));

-- -----------------------------------------------------------------------------
-- Report reason for dangerous content (self-harm, threats, ...)
-- -----------------------------------------------------------------------------
alter type public.report_reason add value if not exists 'dangerous';

-- -----------------------------------------------------------------------------
-- Right of access: download everything about me
-- -----------------------------------------------------------------------------
create function public.export_my_data()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
begin
  if me is null then
    raise exception 'not signed in';
  end if;

  return jsonb_build_object(
    'exported_at', now(),
    'account', (select jsonb_build_object('id', u.id, 'email', u.email, 'created_at', u.created_at)
                from auth.users u where u.id = me),
    'profile', (select to_jsonb(p) from public.profiles p where p.id = me),
    'approximate_location', (
      select jsonb_build_object(
        'lat', extensions.st_y(l.location::extensions.geometry),
        'lng', extensions.st_x(l.location::extensions.geometry),
        'note', 'rounded to about 100 m',
        'updated_at', l.updated_at)
      from public.profile_locations l where l.profile_id = me),
    'listings', coalesce((
      select jsonb_agg(to_jsonb(l) order by l.created_at desc) from public.listings l where l.seller_id = me), '[]'),
    'trades', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', t.id, 'listing_id', t.listing_id,
        'role', case when t.buyer_id = me then 'buyer' else 'seller' end,
        'other_side', o.name,
        'my_confirmation', case when t.buyer_id = me then t.buyer_confirmed_at else t.seller_confirmed_at end,
        'completed_at', t.completed_at, 'xp_awarded', t.xp_awarded, 'created_at', t.created_at)
        order by t.created_at desc)
      from public.trades t
      join public.profiles o on o.id = case when t.buyer_id = me then t.seller_id else t.buyer_id end
      where me in (t.buyer_id, t.seller_id)), '[]'),
    'ratings_given', coalesce((
      select jsonb_agg(jsonb_build_object('to', p.name, 'stars', r.stars, 'comment', r.comment, 'created_at', r.created_at))
      from public.ratings r join public.profiles p on p.id = r.ratee_id where r.rater_id = me), '[]'),
    'ratings_received', coalesce((
      select jsonb_agg(jsonb_build_object('stars', r.stars, 'comment', r.comment, 'created_at', r.created_at))
      from public.ratings r where r.ratee_id = me), '[]'),
    'saved_listings', coalesce((
      select jsonb_agg(jsonb_build_object('listing_id', s.listing_id, 'saved_at', s.created_at))
      from public.saved_listings s where s.user_id = me), '[]'),
    'notifications', coalesce((
      select jsonb_agg(jsonb_build_object('title', n.title, 'body', n.body, 'read_at', n.read_at, 'created_at', n.created_at)
        order by n.created_at desc)
      from public.notifications n where n.user_id = me), '[]'),
    'blocked_users', coalesce((
      select jsonb_agg(jsonb_build_object('name', p.name, 'since', b.created_at))
      from public.blocks b join public.profiles p on p.id = b.blocked_id where b.blocker_id = me), '[]'),
    'reports_filed', coalesce((
      select jsonb_agg(jsonb_build_object('listing_id', r.listing_id, 'reason', r.reason, 'details', r.details, 'created_at', r.created_at))
      from public.reports r where r.reporter_id = me), '[]'),
    'sellers_contacted', coalesce((
      select jsonb_agg(jsonb_build_object('seller', p.name, 'at', c.created_at) order by c.created_at desc)
      from public.contact_reveals c join public.profiles p on p.id = c.seller_id where c.user_id = me), '[]'),
    'push_devices', coalesce((
      select jsonb_agg(jsonb_build_object('platform', d.platform, 'registered_at', d.updated_at))
      from public.push_tokens d where d.user_id = me), '[]')
  );
end;
$$;

revoke execute on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;

-- -----------------------------------------------------------------------------
-- Data minimisation: keep logs only as long as they're needed
-- -----------------------------------------------------------------------------
create function public.purge_old_data()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.notifications where created_at < now() - interval '180 days';
  delete from public.contact_reveals where created_at < now() - interval '30 days';
  delete from public.listing_posts where created_at < now() - interval '7 days';
  delete from public.push_tokens where updated_at < now() - interval '270 days';
$$;

revoke execute on function public.purge_old_data() from public, anon, authenticated;

-- Run it every night with pg_cron (free on Supabase: Database → Extensions → pg_cron).
do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule('shuky-purge-old-data', '17 3 * * *', 'select public.purge_old_data()');
exception when others then
  raise notice 'pg_cron is not available here; run select public.purge_old_data() periodically';
end;
$$;
