-- 008: carry role metadata through signup
--
-- handle_new_user() previously dropped merchant_type / vehicle_type from the
-- signup payload. A merchant or courier who signed up never had their
-- business category or transport mode persisted on the profile, so the
-- onboarding wizard had to re-ask for it even though the user already chose it.
--
-- Adds the two columns (if missing) and re-creates the trigger idempotently,
-- so this is safe to run against an existing database.

-- ── 1. Columns (idempotent) ────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS merchant_type TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS vehicle_type TEXT;

-- ── 2. Re-create the trigger with full metadata passthrough ────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (
    id, full_name, email, phone, roles, email_verified,
    merchant_type, vehicle_type, loyalty_tier
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name',
             SPLIT_PART(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    ARRAY[COALESCE(NEW.raw_user_meta_data->>'role', 'customer')],
    COALESCE(NEW.email_confirmed_at IS NOT NULL, false),
    NEW.raw_user_meta_data->>'merchant_type',
    NEW.raw_user_meta_data->>'vehicle_type',
    'bronze'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name      = EXCLUDED.full_name,
    phone          = COALESCE(EXCLUDED.phone, public.profiles.phone),
    roles          = EXCLUDED.roles,
    email_verified = EXCLUDED.email_verified,
    merchant_type  = COALESCE(EXCLUDED.merchant_type, public.profiles.merchant_type),
    vehicle_type   = COALESCE(EXCLUDED.vehicle_type, public.profiles.vehicle_type);
  RETURN NEW;
END;
$$;

-- Trigger is already attached from migration 001; nothing to re-create here.