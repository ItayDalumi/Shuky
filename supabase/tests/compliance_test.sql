-- Compliance tests: private photos, data export, retention. See supabase/tests/run.sh.
\set ON_ERROR_STOP 1
\set QUIET 1
insert into auth.users (id, phone, email) values
 ('00000000-0000-0000-0000-00000000000a', '', 'itai@example.com'),
 ('00000000-0000-0000-0000-00000000000b', '', 'dana@example.com'),
 ('00000000-0000-0000-0000-00000000000c', '', 'far@example.com');
create or replace function pg_temp.as_user(u text) returns void language sql as $$ select set_config('request.jwt.claim.sub', u, false) $$;

set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.profiles (id, name, phone) values (auth.uid(), 'איתי', '972501111111');
select public.set_my_location(31.372, 34.816);
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
insert into public.profiles (id, name, phone) values (auth.uid(), 'דנה', '972502222222');
select public.set_my_location(31.375, 34.817);
insert into storage.objects (bucket_id, name) values ('listing-photos', '00000000-0000-0000-0000-00000000000b/cake.jpg');
insert into storage.objects (bucket_id, name) values ('listing-photos', '00000000-0000-0000-0000-00000000000b/draft.jpg');
insert into public.listings (title, category, price, availability, baked_at, photo_path)
values ('עוגה', 'cakes', 50, 'ready', current_date, '00000000-0000-0000-0000-00000000000b/cake.jpg');
reset role;
insert into public.profiles (id, name, community) values ('00000000-0000-0000-0000-00000000000c', 'רחוק', 'עומר');
do $$ begin
  assert (select not public from storage.buckets where id = 'listing-photos');
  raise notice 'PASS the photo bucket is private';
end $$;

set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
do $$ begin
  assert (select count(*) from storage.objects where name like '00000000-0000-0000-0000-00000000000b/%') = 1;
  assert (select name from storage.objects) = '00000000-0000-0000-0000-00000000000b/cake.jpg';
  raise notice 'PASS a neighbor can see photos of listings in the feed, not other files';
end $$;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
do $$ begin
  assert (select count(*) from storage.objects) = 0;
  raise notice 'PASS another community cannot see the photos';
end $$;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.blocks (blocked_id) values ('00000000-0000-0000-0000-00000000000b');
do $$ begin
  assert (select count(*) from storage.objects) = 0;
  raise notice 'PASS blocked users cannot see each other''s photos';
end $$;
delete from public.blocks;
reset role; set role anon;
do $$ begin
  begin
    assert (select count(*) from storage.objects) = 0;
  exception when insufficient_privilege then null;  -- no access at all is fine too
  end;
  raise notice 'PASS signed-out visitors cannot see photos';
end $$;
reset role; set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
do $$ begin
  assert (select count(*) from storage.objects) = 2;
  raise notice 'PASS sellers still see all their own files';
end $$;

-- ---------- export ----------
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
do $$ declare lid uuid; begin
  select id into lid from public.listings;
  perform public.confirm_trade(lid);
  insert into public.saved_listings (listing_id) values (lid);
  insert into public.reports (reported_user_id, listing_id, reason) values ('00000000-0000-0000-0000-00000000000b', lid, 'dangerous');
  raise notice 'PASS new report reason "dangerous" works';
end $$;
do $$ declare d jsonb; begin
  d := public.export_my_data();
  assert d -> 'account' ->> 'email' = 'itai@example.com';
  assert d -> 'profile' ->> 'phone' = '972501111111';
  assert (d -> 'approximate_location' ->> 'lat')::numeric = 31.372;
  assert jsonb_array_length(d -> 'trades') = 1 and d -> 'trades' -> 0 ->> 'role' = 'buyer';
  assert jsonb_array_length(d -> 'saved_listings') = 1;
  assert jsonb_array_length(d -> 'reports_filed') = 1;
  assert jsonb_array_length(d -> 'sellers_contacted') = 0;
  assert d::text not like '%972502222222%', 'export must not contain other users'' phones';
  raise notice 'PASS export_my_data has my data (% keys) and no one else''s phone', (select count(*) from jsonb_object_keys(d));
end $$;
reset role; set role anon;
do $$ begin
  begin
    perform public.export_my_data();
    raise exception 'FAIL anon export';
  exception when insufficient_privilege then raise notice 'PASS export only for the signed-in user'; end;
end $$;

-- ---------- retention ----------
reset role;
insert into public.notifications (user_id, kind, title, created_at) values ('00000000-0000-0000-0000-00000000000a', 'level', 'ישן', now() - interval '200 days');
insert into public.contact_reveals (user_id, seller_id, created_at) values ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b', now() - interval '40 days');
select public.purge_old_data();
do $$ begin
  assert (select count(*) from public.notifications where title = 'ישן') = 0;
  assert (select count(*) from public.contact_reveals) = 0;
  assert (select count(*) from public.notifications) > 0, 'recent notifications kept';
  raise notice 'PASS old notifications and contact logs are purged, recent ones kept';
end $$;
