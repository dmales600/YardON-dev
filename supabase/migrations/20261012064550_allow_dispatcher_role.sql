-- Supabase migration: 20261012064550_allow_dispatcher_role
-- Authorizes the new Dispatcher app role without expanding privileges of existing roles.
ALTER TABLE public.yardivo_user_access
  DROP CONSTRAINT IF EXISTS yardivo_user_access_app_role_chk;
ALTER TABLE public.yardivo_user_access
  ADD CONSTRAINT yardivo_user_access_app_role_chk
  CHECK (app_role = ANY (ARRAY['admin','manager','inventory','reception','gate','supplier','dispatcher']::text[]));
