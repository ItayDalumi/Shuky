-- =============================================================================
-- Shuky · sign in with an email code (free) instead of SMS
--
-- The phone number is no longer verified by SMS, but sellers still need one for
-- WhatsApp orders, so users enter it themselves. Stored as international digits:
-- 9725XXXXXXXX (what wa.me expects).
-- =============================================================================

drop trigger if exists profiles_set_phone on public.profiles;
drop function if exists public.profiles_set_phone();

alter table public.profiles
  add constraint profiles_phone_format check (phone is null or phone ~ '^9725[0-9]{8}$');

-- Users may now write their own phone (plus id + name, as before).
grant insert (id, name, phone) on public.profiles to authenticated;
grant update (name, phone) on public.profiles to authenticated;
