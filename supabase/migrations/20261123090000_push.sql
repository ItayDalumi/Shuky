-- =============================================================================
-- Shuky · push notifications (free: Expo Push Service + pg_net, no extra server)
--
--   * push_tokens: each signed-in device registers its Expo push token
--   * every row inserted into notifications is also sent as a push to the
--     recipient's devices (the in-app notification rules / preferences apply,
--     because notify() only inserts when the preference allows it)
--   * a failed push never blocks the in-app notification
-- =============================================================================

-- pg_net is available on every Supabase project (Database → Extensions).
do $$
begin
  create extension if not exists pg_net;
exception when others then
  raise notice 'pg_net is not available here; pushes will be skipped';
end;
$$;

create table public.push_tokens (
  token text primary key,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  platform text check (platform in ('ios', 'android')),
  updated_at timestamptz not null default now()
);

create index push_tokens_user_idx on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;

create policy "Users see their own devices"
  on public.push_tokens for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Users remove their own devices"
  on public.push_tokens for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.push_tokens from anon;
revoke insert, update on public.push_tokens from authenticated;

-- Register (or move) a device token to the signed-in user.
-- A phone that signs into another account moves to that account.
create function public.register_push_token(p_token text, p_platform text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'not signed in';
  end if;
  if p_token !~ '^Expo(nent)?PushToken\[[A-Za-z0-9_-]+\]$' then
    raise exception 'invalid push token';
  end if;
  insert into public.push_tokens (token, user_id, platform, updated_at)
  values (p_token, (select auth.uid()), p_platform, now())
  on conflict (token) do update set user_id = excluded.user_id, platform = excluded.platform, updated_at = now();
end;
$$;

revoke execute on function public.register_push_token(text, text) from public, anon;
grant execute on function public.register_push_token(text, text) to authenticated;

-- Send each new notification to the recipient's devices through the Expo Push API.
create function public.notifications_send_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  messages jsonb;
begin
  select jsonb_agg(jsonb_build_object(
    'to', t.token,
    'title', new.title,
    'body', new.body,
    'sound', 'default',
    'channelId', 'default',
    'data', jsonb_build_object('href', new.href, 'notificationId', new.id)
  ))
  into messages
  from public.push_tokens t
  where t.user_id = new.user_id;

  if messages is not null then
    begin
      perform net.http_post(
        url := 'https://exp.host/--/api/v2/push/send',
        body := messages,
        headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb
      );
    exception when others then
      -- Never let a push problem block the in-app notification.
      raise warning 'push send failed: %', sqlerrm;
    end;
  end if;
  return new;
end;
$$;

create trigger notifications_send_push
  after insert on public.notifications
  for each row execute function public.notifications_send_push();
