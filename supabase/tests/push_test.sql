-- Push notification tests (pg_net is stubbed: requests are recorded in net.test_calls).
\set ON_ERROR_STOP 1
\set QUIET 1
insert into auth.users values ('00000000-0000-0000-0000-00000000000a',''), ('00000000-0000-0000-0000-00000000000b',''), ('00000000-0000-0000-0000-00000000000c','');
create or replace function pg_temp.as_user(u text) returns void language sql as $$ select set_config('request.jwt.claim.sub', u, false) $$;
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.profiles (id, name, phone) values (auth.uid(), 'איתי', '972501111111');
select public.register_push_token('ExponentPushToken[aaaa1111]', 'ios');
do $$ begin
  begin
    perform public.register_push_token('not-a-token', 'ios');
    raise exception 'FAIL bad token';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
    raise notice 'PASS invalid push tokens are rejected';
  end;
  begin
    insert into public.push_tokens (token, platform) values ('ExponentPushToken[zzz]', 'ios');
    raise exception 'FAIL direct insert';
  exception when insufficient_privilege then raise notice 'PASS tokens only through register_push_token()'; end;
end $$;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
insert into public.profiles (id, name, phone) values (auth.uid(), 'מיכל', '972503333333');
select public.set_my_location(31.373, 34.815);
do $$ begin
  assert (select count(*) from public.push_tokens) = 0, 'cannot see others tokens';
  raise notice 'PASS users cannot see other users'' devices';
end $$;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
insert into public.profiles (id, name, phone) values (auth.uid(), 'דנה', '972502222222');
select public.set_my_location(31.375, 34.817);
insert into public.listings (title, category, price, availability, baked_at) values ('עוגיות', 'cookies', 25, 'ready', current_date);
reset role;
do $$ declare c record; begin
  assert (select count(*) from net.test_calls) = 1, 'one push (A has a device, C has none)';
  select * into c from net.test_calls;
  assert c.url = 'https://exp.host/--/api/v2/push/send';
  assert c.body -> 0 ->> 'to' = 'ExponentPushToken[aaaa1111]';
  assert c.body -> 0 -> 'data' ->> 'href' like '/product/%';
  raise notice 'PASS new notification sent as push to Expo: "%" → %', c.body -> 0 ->> 'title', c.body -> 0 ->> 'to';
end $$;
-- preference off -> no notification -> no push
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
update public.profiles set notification_prefs = '{"newListings": false, "orders": true, "ratings": true}' where id = auth.uid();
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
insert into public.listings (title, category, price, availability, baked_at) values ('חלה', 'breads', 20, 'ready', current_date);
reset role;
do $$ begin
  assert (select count(*) from net.test_calls) = 1, 'no push when the preference is off';
  raise notice 'PASS no push when the user turned that notification type off';
end $$;
-- the same phone signing into another account moves the token
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select public.register_push_token('ExponentPushToken[aaaa1111]', 'ios');
reset role;
do $$ begin
  assert (select user_id from public.push_tokens) = '00000000-0000-0000-0000-00000000000b';
  raise notice 'PASS a device that switches account moves to the new account';
end $$;
-- push failure must not block the in-app notification
create or replace function net.http_post(url text, body jsonb default '{}', params jsonb default '{}', headers jsonb default '{}', timeout_milliseconds integer default 5000)
returns bigint language plpgsql as $$ begin raise exception 'network down'; end $$;
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
set client_min_messages = error;
insert into public.listings (title, category, price, availability, baked_at) values ('מאפה', 'pastries', 15, 'ready', current_date);
set client_min_messages = notice;
reset role;
do $$ begin
  assert (select count(*) from public.notifications where user_id = '00000000-0000-0000-0000-00000000000b' and body = 'מאפה') = 1;
  raise notice 'PASS a failed push does not block the in-app notification';
end $$;
