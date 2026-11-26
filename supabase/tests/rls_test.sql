-- Security / behavior tests for the migration. See supabase/tests/run.sh.
\set ON_ERROR_STOP 1
\set QUIET 1
-- users: A, B in Lehavim; C elsewhere
insert into auth.users values
 ('00000000-0000-0000-0000-00000000000a','972501111111'),
 ('00000000-0000-0000-0000-00000000000b','972502222222'),
 ('00000000-0000-0000-0000-00000000000c','972503333333');

create or replace function pg_temp.as_user(u text) returns void language sql as
$$ select set_config('request.jwt.claim.sub', u, false) $$;

-- ---------- profiles ----------
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select public.create_my_profile('איתי', '972501111111');
do $$ begin
  assert (select phone from public.get_my_profile()) = '972501111111', 'phone saved';
  raise notice 'PASS profile created with WhatsApp phone';
  begin
    perform public.update_my_profile(null, '12345');
    raise exception 'FAIL bad phone accepted';
  exception when check_violation then raise notice 'PASS phone must be an Israeli mobile (9725XXXXXXXX)'; end;
  perform public.update_my_profile(null, '972501111112');
  assert (select phone from public.get_my_profile()) = '972501111112', 'phone updated';
  raise notice 'PASS users can update their own phone';
  begin
    update public.profiles set name = 'ישיר' where id = auth.uid();
    raise exception 'FAIL direct profile update allowed';
  exception when insufficient_privilege then raise notice 'PASS profiles are written only through the RPCs'; end;
  begin
    perform public.set_my_notification_prefs('"oops"'::jsonb);
    raise exception 'FAIL non-object prefs accepted';
  exception when invalid_parameter_value then raise notice 'PASS notification prefs must be an object'; end;
  begin
    perform public.create_my_profile('א', '972501111112');
    raise exception 'FAIL 1-letter name accepted';
  exception when check_violation then raise notice 'PASS name must be 2-30 letters'; end;
  perform public.create_my_profile('איתי', '972501111112');
  assert (select count(*) from public.profiles where id = auth.uid()) = 1, 'retry is idempotent';
  raise notice 'PASS creating the profile twice just updates it';
  begin
    update public.profiles set xp = 999 where id = auth.uid();
    raise exception 'FAIL xp writable';
  exception when insufficient_privilege then raise notice 'PASS xp not writable by user'; end;
  begin
    insert into public.profiles (id, name) values ('00000000-0000-0000-0000-00000000000b', 'fake');
    raise exception 'FAIL could create profile for someone else';
  exception when insufficient_privilege then raise notice 'PASS cannot create someone else''s profile'; end;
end $$;
select public.update_my_profile('איתי ד');
select public.set_my_location(31.37204, 34.81617);

select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select public.create_my_profile('דנה', '972502222222');
select public.set_my_location(31.37500, 34.81700);
do $$ begin
  begin
    update public.profiles set name = 'hacked' where id = '00000000-0000-0000-0000-00000000000a';
  exception when insufficient_privilege then null; end;
  assert (select name from public.profiles where id = '00000000-0000-0000-0000-00000000000a') = 'איתי ד', 'cannot rename others';
  raise notice 'PASS cannot rename another user';
  assert (select count(*) from public.profile_locations) = 1, 'sees only own location';
  raise notice 'PASS other users'' locations are not readable';
  assert (select extensions.st_y(location::extensions.geometry) from public.profile_locations) = 31.375, 'snapped';
  raise notice 'PASS stored location snapped to ~100 m grid';
end $$;

-- ---------- listings ----------
insert into public.listings (title, category, price, unit, availability, baked_at, dietary)
values ('עוגיות שוקולד', 'cookies', 25, 'קופסה של 12', 'ready', current_date, '{kosher,nutFree}');
insert into public.listings (title, category, price, availability, notice_days)
values ('עוגת גבינה', 'cakes', 90, 'preorder', 2);
do $$ begin
  begin
    insert into public.listings (title, category, price, availability, notice_days, baked_at)
    values ('bad', 'cakes', 10, 'preorder', 2, current_date);
    raise exception 'FAIL preorder with baked_at accepted';
  exception when check_violation then raise notice 'PASS availability fields enforced'; end;
  begin
    insert into public.listings (title, category, price, availability, baked_at) values ('free', 'cakes', 0, 'ready', current_date);
    raise exception 'FAIL price 0 accepted';
  exception when check_violation then raise notice 'PASS price must be positive (sales only)'; end;
  begin
    insert into public.listings (seller_id, title, category, price, availability, baked_at)
    values ('00000000-0000-0000-0000-00000000000a', 'spoof', 'cakes', 10, 'ready', current_date);
    raise exception 'FAIL could set seller_id';
  exception when insufficient_privilege then raise notice 'PASS cannot post as someone else'; end;
end $$;

select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
do $$ declare r record; n int; begin
  update public.listings set price = 1 where seller_id = '00000000-0000-0000-0000-00000000000b';
  assert (select min(price) from public.listings) = 25, 'cannot edit others';
  raise notice 'PASS cannot edit another seller''s listing';
  select count(*) into n from public.nearby_listings();
  assert n = 2, 'A sees B''s 2 listings';
  select * into r from public.nearby_listings() limit 1;
  assert r.distance_meters % 50 = 0 and r.distance_meters between 300 and 400, 'rounded distance ~350';
  raise notice 'PASS feed: % listings, seller %, distance % m (rounded), level %', n, r.seller_name, r.distance_meters, r.seller_level;
end $$;
-- my own listing shows distance 0
insert into public.listings (title, category, price, availability, baked_at) values ('חלה', 'breads', 22, 'ready', current_date);
do $$ begin
  assert (select distance_meters from public.nearby_listings() where seller_id = auth.uid()) = 0, 'own = 0';
  raise notice 'PASS own listing in feed with distance 0';
end $$;

-- C: other community sees nothing
reset role;
insert into public.profiles (id, name, community) values ('00000000-0000-0000-0000-00000000000c', 'רמי', 'עומר');
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
do $$ begin
  assert (select count(*) from public.nearby_listings()) = 0, 'other community';
  raise notice 'PASS other community does not see Lehavim listings';
end $$;

-- ---------- trades: XP only when BOTH confirm ----------
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');  -- A buys B's cookies
do $$ declare lid uuid; t public.trades; begin
  select id into lid from public.listings where title = 'עוגיות שוקולד';
  t := public.confirm_trade(lid);
  assert t.completed_at is null, 'not complete after one side';
  assert (select xp from public.profiles where id = auth.uid()) = 0, 'no xp yet';
  raise notice 'PASS buyer confirmed: trade pending, no XP yet';
  t := public.confirm_trade(lid);
  assert (select count(*) from public.trades) = 1, 'no duplicate trade';
  assert (select xp from public.profiles where id = auth.uid()) = 0, 'still no xp';
  raise notice 'PASS confirming twice from one side does not complete it';
  begin
    insert into public.trades (seller_id, buyer_id) values ('00000000-0000-0000-0000-00000000000b', auth.uid());
    raise exception 'FAIL direct trade insert';
  exception when insufficient_privilege then raise notice 'PASS trades cannot be written directly'; end;
end $$;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');  -- seller confirms
do $$ declare lid uuid; t public.trades; begin
  select id into lid from public.listings where title = 'עוגיות שוקולד';
  t := public.confirm_trade(lid, '00000000-0000-0000-0000-00000000000a');
  assert t.completed_at is not null, 'completed';
  assert (select xp from public.profiles where id = '00000000-0000-0000-0000-00000000000a') = 20, 'A +20';
  assert (select xp from public.profiles where id = '00000000-0000-0000-0000-00000000000b') = 20, 'B +20';
  raise notice 'PASS both confirmed: trade completed, each side +20 XP';
  t := public.confirm_trade(lid, '00000000-0000-0000-0000-00000000000a');
  assert (select xp from public.profiles where id = '00000000-0000-0000-0000-00000000000b') = 20, 'no double xp';
  raise notice 'PASS re-confirming does not award XP twice';
end $$;

-- ---------- ratings ----------
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
do $$ declare tid uuid; begin
  select id into tid from public.trades where completed_at is not null;
  insert into public.ratings (trade_id, ratee_id, stars, comment) values (tid, '00000000-0000-0000-0000-00000000000b', 5, 'מעולה');
  assert (select rating_avg from public.profiles where id = '00000000-0000-0000-0000-00000000000b') = 5.0, 'avg';
  raise notice 'PASS rating saved, seller average updated to 5.0';
  begin
    insert into public.ratings (trade_id, ratee_id, stars) values (tid, '00000000-0000-0000-0000-00000000000b', 1);
    raise exception 'FAIL double rating';
  exception when unique_violation or insufficient_privilege then raise notice 'PASS one rating per side per trade'; end;
end $$;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
do $$ declare tid uuid; begin
  select id into tid from public.trades limit 1;  -- C can't even see it
  assert tid is null, 'C cannot see trade';
  begin
    insert into public.ratings (trade_id, ratee_id, stars)
    values ((select id from public.ratings limit 1), '00000000-0000-0000-0000-00000000000b', 1);
    raise exception 'FAIL outsider rated';
  exception when insufficient_privilege or foreign_key_violation then raise notice 'PASS outsiders cannot rate'; end;
end $$;

-- ---------- anon ----------
reset role; set role anon;
do $$ begin
  begin perform * from public.listings; raise exception 'FAIL anon read listings';
  exception when insufficient_privilege then raise notice 'PASS anon cannot read listings'; end;
  begin perform public.nearby_listings(); raise exception 'FAIL anon rpc';
  exception when insufficient_privilege then raise notice 'PASS anon cannot call the feed'; end;
end $$;

-- ---------- storage ----------
reset role; set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
insert into storage.objects (bucket_id, name) values ('listing-photos', '00000000-0000-0000-0000-00000000000a/cake.jpg');
do $$ begin
  begin
    insert into storage.objects (bucket_id, name) values ('listing-photos', '00000000-0000-0000-0000-00000000000b/x.jpg');
    raise exception 'FAIL upload to other folder';
  exception when insufficient_privilege then raise notice 'PASS photos only into your own folder'; end;
end $$;

-- ---------- delete account ----------
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select public.delete_my_account();
reset role;
do $$ begin
  assert (select count(*) from public.profiles where id = '00000000-0000-0000-0000-00000000000b') = 0;
  assert (select count(*) from public.listings where seller_id = '00000000-0000-0000-0000-00000000000b') = 0;
  assert (select count(*) from public.profile_locations where profile_id = '00000000-0000-0000-0000-00000000000b') = 0;
  raise notice 'PASS delete account removes profile, listings and location';
end $$;
