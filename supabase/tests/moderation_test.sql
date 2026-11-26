-- Moderation tests (supabase/migrations/*_moderation.sql). See supabase/tests/run.sh.
\set ON_ERROR_STOP 1
\set QUIET 1
insert into auth.users values
 ('00000000-0000-0000-0000-00000000000a',''), ('00000000-0000-0000-0000-00000000000b',''),
 ('00000000-0000-0000-0000-00000000000c','');
create or replace function pg_temp.as_user(u text) returns void language sql as $$ select set_config('request.jwt.claim.sub', u, false) $$;

-- a = admin (איתי), b = seller (דנה), c = buyer who reports (מיכל)
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select public.create_my_profile('איתי', '972501111111');
select public.set_my_location(31.372, 34.816);
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select public.create_my_profile('דנה', '972502222222');
select public.set_my_location(31.375, 34.817);
insert into public.listings (title, category, price, availability, baked_at) values ('עוגת גבינה', 'cakes', 90, 'ready', current_date);
insert into public.listings (title, category, price, availability, baked_at) values ('חלה', 'breads', 20, 'ready', current_date);
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select public.create_my_profile('מיכל', '972503333333');
select public.set_my_location(31.373, 34.816);

reset role;
insert into public.admins (user_id) values ('00000000-0000-0000-0000-00000000000a');
set role authenticated;

do $$ begin
  -- Non-admins can't see or act on reports
  perform pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
  assert not public.is_admin(), 'c is not admin';
  begin
    perform * from public.admin_reports();
    raise exception 'FAIL non-admin listed reports';
  exception when insufficient_privilege then raise notice 'PASS only admins can list reports'; end;
  begin
    perform * from public.admins;
    raise exception 'FAIL admins table readable';
  exception when insufficient_privilege then raise notice 'PASS the admins list is private'; end;

  perform pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
  assert public.is_admin(), 'a is admin';
  raise notice 'PASS is_admin() knows the operator';
end $$;

-- c reports b's cheesecake → the admin gets a notification (even with ratings notifications off)
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select public.set_my_notification_prefs('{"newListings": false, "orders": false, "ratings": false}');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
insert into public.reports (reported_user_id, listing_id, reason, details)
select seller_id, id, 'unsafe_food', 'הקרם היה חמוץ' from public.listings where title = 'עוגת גבינה';

do $$ declare n public.notifications; rid uuid; begin
  perform pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
  select * into n from public.notifications where kind = 'report';
  assert n.id is not null, 'admin notified';
  assert n.title = 'דיווח חדש: מזון לא בטוח' and n.body = 'עוגת גבינה' and n.href = '/admin', 'notification content: ' || n.title;
  raise notice 'PASS a new report notifies the admin: % / %', n.title, n.body;

  select id into rid from public.admin_reports() where listing_title = 'עוגת גבינה';
  assert rid is not null, 'report listed';
  assert (select reporter_name from public.admin_reports() where id = rid) = 'מיכל', 'reporter shown';
  assert (select details from public.admin_reports() where id = rid) = 'הקרם היה חמוץ', 'details shown';
  raise notice 'PASS the admin sees the report with listing, reporter and details';

  perform public.admin_resolve_report(rid, 'hide');
  assert not (select listing_active from public.admin_reports() where id = rid), 'hidden';
  assert (select status from public.admin_reports() where id = rid) = 'reviewed', 'reviewed';
  raise notice 'PASS hide: the listing disappears and the report is closed';
end $$;

-- The seller can't turn a moderated listing back on
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
do $$ begin
  begin
    update public.listings set is_active = true where title = 'עוגת גבינה';
    raise exception 'FAIL seller re-activated a hidden listing';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
    raise notice 'PASS the seller cannot re-activate a listing hidden by moderation';
  end;
  begin
    update public.listings set moderated_at = null where title = 'עוגת גבינה';
    raise exception 'FAIL seller cleared moderation';
  exception when insufficient_privilege then raise notice 'PASS the moderation flag is not writable by users'; end;
end $$;

-- Restore brings it back
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
do $$ declare rid uuid; begin
  select id into rid from public.admin_reports() where listing_title = 'עוגת גבינה';
  perform public.admin_resolve_report(rid, 'restore');
  assert (select listing_active from public.admin_reports() where id = rid), 'restored';
  raise notice 'PASS restore: the listing is back';
end $$;

-- Dismiss only closes the report
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
insert into public.reports (reported_user_id, listing_id, reason)
select seller_id, id, 'spam' from public.listings where title = 'חלה';
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
do $$ declare rid uuid; begin
  select id into rid from public.admin_reports() where listing_title = 'חלה' and status = 'open';
  perform public.admin_resolve_report(rid, 'dismiss');
  assert (select status from public.admin_reports() where id = rid) = 'dismissed', 'dismissed';
  assert (select is_active from public.listings where title = 'חלה'), 'still visible';
  raise notice 'PASS dismiss: the report is closed and the listing stays';

  begin
    perform public.admin_resolve_report(rid, 'delete-everything');
    raise exception 'FAIL unknown action accepted';
  exception when invalid_parameter_value then raise notice 'PASS unknown actions are rejected'; end;
end $$;

-- Suspend: all the user's listings are hidden and they can't post
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
insert into public.reports (reported_user_id, listing_id, reason)
select seller_id, id, 'harassment' from public.listings where title = 'חלה';
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
do $$ declare rid uuid; begin
  select id into rid from public.admin_reports() where listing_title = 'חלה' and status = 'open';
  perform public.admin_resolve_report(rid, 'suspend');
  assert (select reported_suspended from public.admin_reports() where id = rid), 'shown as suspended';
  raise notice 'PASS suspend: every listing of the user is hidden';
end $$;
reset role;
do $$ begin
  assert (select count(*) from public.listings where seller_id = '00000000-0000-0000-0000-00000000000b' and is_active) = 0, 'all hidden';
  assert (select count(*) from public.listings where seller_id = '00000000-0000-0000-0000-00000000000b' and moderated_at is not null) = 2, 'all moderated';
  raise notice 'PASS (server view) all of the suspended user''s listings are hidden and locked';
end $$;
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
do $$ begin
  begin
    insert into public.listings (title, category, price, availability, baked_at) values ('עוגיות', 'cookies', 25, 'ready', current_date);
    raise exception 'FAIL suspended user posted';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
    raise notice 'PASS a suspended user cannot post (%)', sqlerrm;
  end;
end $$;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select public.admin_unsuspend('00000000-0000-0000-0000-00000000000b');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
insert into public.listings (title, category, price, availability, baked_at) values ('עוגיות', 'cookies', 25, 'ready', current_date);
do $$ begin
  assert (select count(*) from public.listings where title = 'עוגיות' and is_active) = 1, 'can post again';
  raise notice 'PASS after unsuspend the user can post again';
end $$;

-- Admins can view the photo of a hidden listing; neighbors can't
reset role;
update public.listings set photo_path = '00000000-0000-0000-0000-00000000000b/x.jpg', is_active = false
where title = 'חלה';
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
do $$ begin
  assert not public.can_view_listing_photo('00000000-0000-0000-0000-00000000000b/x.jpg'), 'neighbor cannot';
  perform pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
  assert public.can_view_listing_photo('00000000-0000-0000-0000-00000000000b/x.jpg'), 'admin can';
  raise notice 'PASS admins can see the photo of a hidden listing, neighbors cannot';
end $$;
reset role;
