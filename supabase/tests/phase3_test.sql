-- Phase 3 tests: notifications, trades flow, ratings, saved items. See supabase/tests/run.sh.
\set ON_ERROR_STOP 1
\set QUIET 1
insert into auth.users values
 ('00000000-0000-0000-0000-00000000000a','') , ('00000000-0000-0000-0000-00000000000b',''), ('00000000-0000-0000-0000-00000000000c','');
create or replace function pg_temp.as_user(u text) returns void language sql as
$$ select set_config('request.jwt.claim.sub', u, false) $$;

set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select public.create_my_profile('איתי', '972501111111');
select public.set_my_location(31.372, 34.816);
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select public.create_my_profile('מיכל', '972503333333');
select public.set_my_location(31.373, 34.815);
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select public.create_my_profile('דנה', '972502222222');
select public.set_my_location(31.375, 34.817);

-- ---------- new listing notifies neighbors (respecting prefs) ----------
insert into public.listings (title, category, price, availability, baked_at) values ('עוגיות', 'cookies', 25, 'ready', current_date);
reset role;
do $$ begin
  assert (select count(*) from public.notifications where kind = 'newListing' and user_id = '00000000-0000-0000-0000-00000000000a') = 1;
  assert (select count(*) from public.notifications where kind = 'newListing' and user_id = '00000000-0000-0000-0000-00000000000c') = 1;
  assert (select count(*) from public.notifications where user_id = '00000000-0000-0000-0000-00000000000b') = 0;
  raise notice 'PASS new listing notifies neighbors, not the seller';
end $$;
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select public.set_my_notification_prefs('{"newListings": false, "orders": true, "ratings": true}');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
insert into public.listings (title, category, price, availability, notice_days) values ('עוגת גבינה', 'cakes', 90, 'preorder', 2);
reset role;
do $$ begin
  assert (select count(*) from public.notifications where kind = 'newListing' and user_id = '00000000-0000-0000-0000-00000000000a') = 1;
  assert (select count(*) from public.notifications where kind = 'newListing' and user_id = '00000000-0000-0000-0000-00000000000c') = 2;
  raise notice 'PASS notification preferences are respected';
end $$;

-- ---------- notifications are private and server-made ----------
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
do $$ begin
  assert (select count(*) from public.notifications) = 1, 'sees only own';
  update public.notifications set read_at = now();
  assert (select count(*) from public.notifications where read_at is not null) = 1;
  raise notice 'PASS users see and mark only their own notifications';
  begin
    insert into public.notifications (user_id, kind, title) values (auth.uid(), 'level', 'fake');
    raise exception 'FAIL direct insert';
  exception when insufficient_privilege then raise notice 'PASS users cannot create notifications'; end;
  begin
    perform public.notify(auth.uid(), 'level', 'x', 'y', null);
    raise exception 'FAIL notify callable';
  exception when insufficient_privilege then raise notice 'PASS notify() is internal only'; end;
  begin
    update public.profiles set xp = 500 where id = auth.uid();
    raise exception 'FAIL xp writable';
  exception when insufficient_privilege then raise notice 'PASS xp still not writable'; end;
end $$;

-- ---------- trade flow ----------
reset role;
update public.profiles set xp = 90 where id = '00000000-0000-0000-0000-00000000000a';  -- 10 XP below level 2
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');  -- buyer marks done
do $$ declare lid uuid; begin
  select id into lid from public.listings where title = 'עוגיות';
  perform public.confirm_trade(lid);
  perform public.confirm_trade(lid);
end $$;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
do $$ declare r record; begin
  assert (select count(*) from public.notifications where kind = 'tradeConfirm') = 1, 'one confirm request';
  raise notice 'PASS seller asked to confirm (once): %', (select title from public.notifications where kind = 'tradeConfirm');
  select * into r from public.my_trades();
  assert r.role = 'seller' and r.other_name = 'איתי' and not r.i_confirmed and r.other_confirmed and r.completed_at is null;
  raise notice 'PASS my_trades: seller sees pending trade from %', r.other_name;
  perform public.confirm_trade_by_id(r.id);
  assert (select xp from public.profiles where id = auth.uid()) = 20;
  raise notice 'PASS seller confirmed by trade id: completed, +20 XP';
end $$;
reset role;
do $$ begin
  assert (select xp from public.profiles where id = '00000000-0000-0000-0000-00000000000a') = 110;
  assert (select count(*) from public.notifications where kind = 'tradeCompleted') = 2;
  assert (select count(*) from public.notifications where kind = 'level' and user_id = '00000000-0000-0000-0000-00000000000a') = 1;
  assert (select count(*) from public.notifications where kind = 'level' and user_id = '00000000-0000-0000-0000-00000000000b') = 0;
  raise notice 'PASS both notified of completion; level-up notification: %',
    (select title from public.notifications where kind = 'level');
end $$;

-- ---------- ratings ----------
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
do $$ declare tid uuid; begin
  select id into tid from public.my_trades() where completed_at is not null;
  insert into public.ratings (trade_id, ratee_id, stars, comment) values (tid, '00000000-0000-0000-0000-00000000000b', 5, 'מושלם');
  assert (select i_rated from public.my_trades() where id = tid);
  raise notice 'PASS rating saved, my_trades shows i_rated';
end $$;
reset role;
do $$ begin
  assert (select count(*) from public.notifications where kind = 'rating' and user_id = '00000000-0000-0000-0000-00000000000b') = 1;
  raise notice 'PASS rated user notified: %', (select title || ' / ' || body from public.notifications where kind = 'rating');
end $$;

-- ---------- decline ----------
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
do $$ declare lid uuid; begin
  select id into lid from public.listings where title = 'עוגת גבינה';
  perform public.confirm_trade(lid);
end $$;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
do $$ declare tid uuid; begin
  reset role; select id into tid from public.trades where completed_at is null; set role authenticated;
  begin
    perform public.decline_trade(tid);
    raise exception 'FAIL outsider declined';
  exception when raise_exception then raise notice 'PASS outsiders cannot cancel a trade'; end;
end $$;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
do $$ declare tid uuid; done_id uuid; begin
  select id into tid from public.my_trades() where completed_at is null;
  select id into done_id from public.my_trades() where completed_at is not null;
  perform public.decline_trade(tid);
  assert (select count(*) from public.my_trades()) = 1;
  assert (select count(*) from public.notifications where href = '/trade/' || tid) = 0;
  raise notice 'PASS seller declined a pending trade (and its request disappeared)';
  begin
    perform public.decline_trade(done_id);
    raise exception 'FAIL cancelled completed';
  exception when raise_exception then raise notice 'PASS completed trades cannot be cancelled'; end;
end $$;

-- ---------- saved ----------
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.saved_listings (listing_id) select id from public.listings where title = 'עוגת גבינה';
do $$ begin
  begin
    insert into public.saved_listings (user_id, listing_id) select '00000000-0000-0000-0000-00000000000c', id from public.listings limit 1;
    raise exception 'FAIL saved for someone else';
  exception when insufficient_privilege then raise notice 'PASS cannot save for someone else'; end;
end $$;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
do $$ begin
  assert (select count(*) from public.saved_listings) = 0;
  raise notice 'PASS saved items are private';
end $$;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
delete from public.saved_listings;
do $$ begin
  assert (select count(*) from public.saved_listings) = 0;
  raise notice 'PASS unsave works';
end $$;
