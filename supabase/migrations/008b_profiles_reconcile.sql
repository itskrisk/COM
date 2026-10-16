-- 008b: reconcile live profiles schema with migration 001
--
-- The deployed profiles table was created from an older schema and is missing
-- several columns that migration 001 defines. 001 cannot be re-run as-is
-- (its CREATE TYPE / CREATE TABLE statements lack IF NOT EXISTS and the
-- types already exist). This migration adds the missing columns idempotently
-- so the live schema matches 001, then re-creates the signup trigger with full
-- metadata passthrough.

-- ── 1. Missing columns (idempotent) ────────────────────────────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email              TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS loyalty_tier      TEXT    DEFAULT 'bronze';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS loyalty_points    INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_verified    BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_verified    BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS merchant_type     TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS vehicle_type      TEXT;

-- Backfill email from auth.users where it is blank
UPDATE public.profiles p
SET email = au.email
FROM auth.users au
WHERE p.id = au.id AND (p.email IS NULL OR p.email = '');

-- ── 2. Re-create the signup trigger with full metadata passthrough ────────
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
    email          = COALESCE(EXCLUDED.email, public.profiles.email),
    roles          = EXCLUDED.roles,
    email_verified = EXCLUDED.email_verified,
    merchant_type  = COALESCE(EXCLUDED.merchant_type, public.profiles.merchant_type),
    vehicle_type   = COALESCE(EXCLUDED.vehicle_type, public.profiles.vehicle_type),
    loyalty_tier   = COALESCE(EXCLUDED.loyalty_tier, public.profiles.loyalty_tier);
  RETURN NEW;
END;
$$;