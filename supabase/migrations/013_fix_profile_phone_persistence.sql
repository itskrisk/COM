-- 013_fix_profile_phone_persistence.sql
-- Ensure customer phone from signup metadata is persisted to profiles.phone.
-- Idempotent: safe to re-run.

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
    NULLIF(TRIM(NEW.raw_user_meta_data->>'phone'), ''),
    ARRAY[COALESCE(NEW.raw_user_meta_data->>'role', 'customer')],
    COALESCE(NEW.email_confirmed_at IS NOT NULL, false),
    NEW.raw_user_meta_data->>'merchant_type',
    NEW.raw_user_meta_data->>'vehicle_type',
    'bronze'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name      = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    phone          = COALESCE(EXCLUDED.phone, public.profiles.phone),
    roles          = COALESCE(EXCLUDED.roles, public.profiles.roles),
    email_verified = EXCLUDED.email_verified,
    merchant_type  = COALESCE(EXCLUDED.merchant_type, public.profiles.merchant_type),
    vehicle_type   = COALESCE(EXCLUDED.vehicle_type, public.profiles.vehicle_type);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
