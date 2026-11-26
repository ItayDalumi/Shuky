-- =============================================================================
-- Shuky · keep the free Supabase project awake
--
-- Free projects are paused after about a week without activity. A scheduled GitHub Action
-- (.github/workflows/keepalive.yml) calls this once a day. It reads nothing private.
-- =============================================================================
create function public.keepalive()
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select now()
$$;

revoke execute on function public.keepalive() from public;
grant execute on function public.keepalive() to anon, authenticated;
