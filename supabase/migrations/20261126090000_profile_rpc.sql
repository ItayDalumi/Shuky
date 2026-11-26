-- =============================================================================
-- Shuky · profile writes through RPCs + explicit Data API grants
--
-- On a live project, creating the profile with a plain INSERT on public.profiles
-- failed with "permission denied for table profiles" (the table's SELECT is
-- column-restricted to hide phone numbers). Own-profile writes now go through
-- small SECURITY DEFINER functions that only ever touch the caller's own row
-- and validate their input. Direct INSERT / UPDATE on profiles is revoked.
--
-- Newer Supabase projects also don't grant table privileges to the Data API
-- roles automatically, so the privileges the app relies on are granted here
-- explicitly (row-level security still decides which rows are visible).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Own profile: create / update / notification preferences
-- -----------------------------------------------------------------------------
create function public.create_my_profile(p_name text, p_phone text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
begin
  if me is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;

  -- Retrying after a flaky network is fine: the second call just updates.
  insert into public.profiles (id, name, phone)
  values (me, btrim(p_name), nullif(btrim(p_phone), ''))
  on conflict (id) do update
    set name = excluded.name,
        phone = excluded.phone;
end;
$$;

create function public.update_my_profile(p_name text default null, p_phone text default null)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
begin
  if me is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;

  update public.profiles
  set name = coalesce(nullif(btrim(p_name), ''), name),
      phone = coalesce(nullif(btrim(p_phone), ''), phone)
  where id = me;
end;
$$;

create function public.set_my_notification_prefs(p_prefs jsonb)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
begin
  if me is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if p_prefs is null or jsonb_typeof(p_prefs) <> 'object' or length(p_prefs::text) > 1000 then
    raise exception 'invalid notification preferences' using errcode = '22023';
  end if;

  update public.profiles set notification_prefs = p_prefs where id = me;
end;
$$;

revoke execute on function public.create_my_profile(text, text) from public, anon;
revoke execute on function public.update_my_profile(text, text) from public, anon;
revoke execute on function public.set_my_notification_prefs(jsonb) from public, anon;
grant execute on function public.create_my_profile(text, text) to authenticated;
grant execute on function public.update_my_profile(text, text) to authenticated;
grant execute on function public.set_my_notification_prefs(jsonb) to authenticated;

-- Profiles are written only through the functions above.
revoke insert, update, delete on public.profiles from anon, authenticated;

-- -----------------------------------------------------------------------------
-- Explicit Data API grants (same set the app had via Supabase's old defaults)
-- -----------------------------------------------------------------------------
grant usage on schema public to authenticated;

grant select (id, name, community, xp, trades_count, rating_avg, rating_count, created_at)
  on public.profiles to authenticated;

grant select, delete on public.listings to authenticated;
grant insert (title, category, price, unit, description, availability, baked_at, notice_days, dietary, photo_path)
  on public.listings to authenticated;
grant update (title, category, price, unit, description, availability, baked_at, notice_days, dietary, photo_path, is_active)
  on public.listings to authenticated;

grant select on public.trades to authenticated;
grant select on public.ratings to authenticated;
grant insert (trade_id, ratee_id, stars, comment) on public.ratings to authenticated;

grant select, delete on public.saved_listings to authenticated;
grant insert (listing_id) on public.saved_listings to authenticated;

grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

grant select, delete on public.blocks to authenticated;
grant insert (blocked_id) on public.blocks to authenticated;

grant insert (reported_user_id, listing_id, reason, details) on public.reports to authenticated;

grant select, delete on public.push_tokens to authenticated;
