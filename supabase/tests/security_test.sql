-- Security hardening tests (supabase/migrations/*_security.sql). See supabase/tests/run.sh.
\set ON_ERROR_STOP 1
\set QUIET 1
insert into auth.users values
 ('00000000-0000-0000-0000-00000000000a',''), ('00000000-0000-0000-0000-00000000000b',''),
 ('00000000-0000-0000-0000-00000000000c',''), ('00000000-0000-0000-0000-00000000000d','');
create or replace function pg_temp.as_user(u text) returns void language sql as $$ select set_config('request.jwt.claim.sub', u, false) $$;

set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.profiles (id, name, phone) values (auth.uid(), 'איתי', '972501111111');
-- ---------- 6. location must be inside the community ----------
do $$ begin
  begin
    perform public.set_my_location(32.0853, 34.7818);  -- Tel Aviv
    raise exception 'FAIL outside location accepted';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
    raise notice 'PASS location outside the community is rejected (%)', sqlerrm;
  end;
  begin
    insert into public.listings (title, category, price, availability, baked_at) values ('x', 'cakes', 10, 'ready', current_date);
    raise exception 'FAIL listing without location';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
    raise notice 'PASS posting requires a location in the community';
  end;
  begin
    insert into public.profile_locations (profile_id, location) values (auth.uid(), 'SRID=4326;POINT(34.78 32.08)');
    raise exception 'FAIL direct location write';
  exception when insufficient_privilege then raise notice 'PASS location only through set_my_location()'; end;
end $$;
select public.set_my_location(31.372, 34.816);
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
insert into public.profiles (id, name, phone) values (auth.uid(), 'דנה', '972502222222');
select public.set_my_location(31.375, 34.817);
insert into public.listings (title, category, price, availability, baked_at) values ('עוגיות', 'cookies', 25, 'ready', current_date);
insert into public.listings (title, category, price, availability, baked_at) values ('חלה', 'breads', 20, 'ready', current_date);
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
insert into public.profiles (id, name, phone) values (auth.uid(), 'מיכל', '972503333333');
select public.set_my_location(31.373, 34.815);
select pg_temp.as_user('00000000-0000-0000-0000-00000000000d');
insert into public.profiles (id, name, phone) values (auth.uid(), 'רון', '972504444444');
select public.set_my_location(31.374, 34.814);

-- ---------- 1. phone numbers ----------
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
do $$ declare lid uuid; begin
  begin
    perform phone from public.profiles;
    raise exception 'FAIL phones readable';
  exception when insufficient_privilege then raise notice 'PASS phone numbers cannot be read in bulk'; end;
  assert (select count(*) from information_schema.routines r
          join information_schema.parameters prm on prm.specific_name = r.specific_name
          where r.routine_name = 'nearby_listings' and prm.parameter_name = 'seller_phone') = 0;
  raise notice 'PASS the feed no longer includes phone numbers';
  assert (select phone from public.get_my_profile()) = '972501111111';
  raise notice 'PASS users still read their own phone';
  select id into lid from public.listings where title = 'עוגיות';
  assert public.get_seller_whatsapp(lid) = '972502222222';
  raise notice 'PASS one seller''s WhatsApp number on demand';
end $$;
reset role;
-- simulate 20 different sellers already contacted today
insert into public.contact_reveals (user_id, seller_id)
select '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000c' from generate_series(1, 1);
do $$ begin
  for i in 1..18 loop
    insert into auth.users values (gen_random_uuid(), '') ;
  end loop;
  insert into public.profiles (id, name) select id, 'שכן' from auth.users where phone = '' and id not in (select id from public.profiles);
  insert into public.contact_reveals (user_id, seller_id)
  select '00000000-0000-0000-0000-00000000000a', id from public.profiles where name = 'שכן';
end $$;
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
do $$ declare lid uuid; begin
  select id into lid from public.listings where title = 'חלה';
  assert public.get_seller_whatsapp(lid) is not null, 'same seller as before is still allowed';
  reset role;
  insert into auth.users values ('00000000-0000-0000-0000-0000000000ee', '');
  insert into public.profiles (id, name) values ('00000000-0000-0000-0000-0000000000ee', 'חדש');
  insert into public.profile_locations (profile_id, location) values ('00000000-0000-0000-0000-0000000000ee', 'SRID=4326;POINT(34.816 31.372)');
  insert into public.listings (seller_id, title, category, price, availability, baked_at) values ('00000000-0000-0000-0000-0000000000ee', 'מאפה', 'pastries', 9, 'ready', current_date) returning id into lid;
  set role authenticated;
  begin
    perform public.get_seller_whatsapp(lid);
    raise exception 'FAIL 21st seller';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
    raise notice 'PASS contacting more than 20 new sellers a day is blocked (%)', sqlerrm;
  end;
end $$;

-- ---------- 3. XP farming ----------
do $$ declare lid uuid; begin
  select id into lid from public.listings where title = 'עוגיות';
  perform public.confirm_trade(lid);
end $$;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
do $$ declare tid uuid; begin
  select id into tid from public.my_trades() where completed_at is null;
  perform public.confirm_trade_by_id(tid);
  assert (select xp from public.profiles where id = auth.uid()) = 20;
  raise notice 'PASS first trade between two neighbors: +20 XP';
end $$;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
do $$ declare lid uuid; begin
  select id into lid from public.listings where title = 'עוגיות';
  perform public.confirm_trade(lid);
end $$;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
do $$ declare tid uuid; r record; begin
  select id into tid from public.my_trades() where completed_at is null;
  perform public.confirm_trade_by_id(tid);
  select * into r from public.my_trades() where id = tid;
  assert r.completed_at is not null and not r.xp_awarded;
  assert (select xp from public.profiles where id = auth.uid()) = 20;
  raise notice 'PASS repeat trade with the same neighbor within 7 days: completes, no XP';
end $$;
reset role;
do $$ begin
  assert (select title from public.notifications where user_id = '00000000-0000-0000-0000-00000000000a' and kind = 'tradeCompleted' order by created_at desc limit 1) = 'העסקה הושלמה!';
  raise notice 'PASS the no-XP completion notification doesn''t promise points';
end $$;

-- ---------- ratings: once per 30 days per pair ----------
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
do $$ declare t1 uuid; t2 uuid; begin
  select id into t1 from public.my_trades() where xp_awarded;
  select id into t2 from public.my_trades() where completed_at is not null and not xp_awarded;
  insert into public.ratings (trade_id, ratee_id, stars) values (t1, '00000000-0000-0000-0000-00000000000b', 5);
  assert not (select can_rate from public.my_trades() where id = t2);
  begin
    insert into public.ratings (trade_id, ratee_id, stars) values (t2, '00000000-0000-0000-0000-00000000000b', 5);
    raise exception 'FAIL second rating in 30 days';
  exception when insufficient_privilege then raise notice 'PASS one rating per neighbor per 30 days'; end;
end $$;

-- ---------- daily XP cap ----------
reset role;
insert into public.trades (seller_id, buyer_id, completed_at, xp_awarded, seller_confirmed_at, buyer_confirmed_at)
select '00000000-0000-0000-0000-00000000000c', id, now(), true, now(), now()
from public.profiles where name = 'שכן' limit 3;
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
insert into public.listings (title, category, price, availability, baked_at) values ('קינוח', 'desserts', 30, 'ready', current_date);
select pg_temp.as_user('00000000-0000-0000-0000-00000000000d');
do $$ declare lid uuid; begin
  select id into lid from public.listings where title = 'קינוח';
  perform public.confirm_trade(lid);
end $$;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
do $$ declare tid uuid; begin
  select id into tid from public.my_trades() where completed_at is null;
  perform public.confirm_trade_by_id(tid);
  assert not (select xp_awarded from public.my_trades() where id = tid);
  raise notice 'PASS max 3 XP trades a day per person';
end $$;

-- ---------- 4. rate limits ----------
reset role;
insert into public.listing_posts (seller_id) select '00000000-0000-0000-0000-00000000000d' from generate_series(1, 10);
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000d');
do $$ begin
  begin
    insert into public.listings (title, category, price, availability, baked_at) values ('ספאם', 'cakes', 5, 'ready', current_date);
    raise exception 'FAIL 11th listing';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
    raise notice 'PASS max 10 new listings a day (deleting doesn''t reset it)';
  end;
end $$;
reset role;
insert into public.trades (seller_id, buyer_id, created_at)
select id, '00000000-0000-0000-0000-00000000000d', now() from public.profiles where name = 'שכן' limit 15;
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000d');
do $$ declare lid uuid; begin
  select id into lid from public.listings where title = 'חלה';
  begin
    perform public.confirm_trade(lid);
    raise exception 'FAIL 16th trade';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
    raise notice 'PASS max 15 new trades a day';
  end;
end $$;

-- ---------- 5. reports ----------
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
do $$ declare lid uuid; begin
  select id into lid from public.listings where title = 'חלה';
  insert into public.reports (reported_user_id, listing_id, reason, details) values ('00000000-0000-0000-0000-00000000000b', lid, 'unsafe_food', 'נראה מקולקל');
  raise notice 'PASS users can report a listing';
  begin
    perform * from public.reports;
    raise exception 'FAIL reports readable';
  exception when insufficient_privilege then raise notice 'PASS users cannot read reports'; end;
  begin
    insert into public.reports (reported_user_id, listing_id, reason) values ('00000000-0000-0000-0000-00000000000c', lid, 'spam');
    raise exception 'FAIL mismatched listing';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
    raise notice 'PASS a report must match the listing''s seller';
  end;
end $$;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
insert into public.reports (reported_user_id, listing_id, reason) select '00000000-0000-0000-0000-00000000000b', id, 'fake' from public.listings where title = 'חלה';
do $$ begin
  assert (select count(*) from public.nearby_listings() where title = 'חלה') = 1, 'still visible after 2';
end $$;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000d');
insert into public.reports (reported_user_id, listing_id, reason) select '00000000-0000-0000-0000-00000000000b', id, 'spam' from public.listings where title = 'חלה';
do $$ begin
  assert (select count(*) from public.nearby_listings() where title = 'חלה') = 0;
  raise notice 'PASS a listing reported by 3 different people is hidden';
end $$;

-- ---------- 5. blocks ----------
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.blocks (blocked_id) values ('00000000-0000-0000-0000-00000000000b');
do $$ declare lid uuid; begin
  assert (select count(*) from public.nearby_listings() where seller_id = '00000000-0000-0000-0000-00000000000b') = 0;
  raise notice 'PASS blocked user''s listings disappear from my feed';
  assert (select name from public.my_blocks()) = 'דנה';
  select id into lid from public.listings where title = 'עוגיות';
  begin
    perform public.get_seller_whatsapp(lid);
    raise exception 'FAIL contact blocked';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
    raise notice 'PASS no contact with a blocked user';
  end;
  begin
    perform public.confirm_trade(lid);
    raise exception 'FAIL trade blocked';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
    raise notice 'PASS no trades with a blocked user';
  end;
end $$;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
do $$ begin
  assert (select count(*) from public.nearby_listings() where seller_id = '00000000-0000-0000-0000-00000000000a') = 0;
  assert (select count(*) from public.blocks) = 0, 'B cannot see that A blocked them';
  raise notice 'PASS works both ways, and the blocked user can''t see the block';
end $$;
reset role;
delete from public.listing_posts;
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
insert into public.listings (title, category, price, availability, baked_at) values ('בורקס', 'pastries', 40, 'ready', current_date);
reset role;
do $$ begin
  assert (select count(*) from public.notifications where user_id = '00000000-0000-0000-0000-00000000000a' and body = 'בורקס') = 0;
  assert (select count(*) from public.notifications where user_id = '00000000-0000-0000-0000-00000000000c' and body = 'בורקס') = 1;
  raise notice 'PASS no new-listing notifications from a blocked user';
end $$;
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
delete from public.blocks where blocked_id = '00000000-0000-0000-0000-00000000000b';
do $$ begin
  assert (select count(*) from public.nearby_listings() where seller_id = '00000000-0000-0000-0000-00000000000b') > 0;
  raise notice 'PASS unblocking restores the feed';
end $$;
