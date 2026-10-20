-- 018_fix_handle_new_user_no_email.sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (
    id, full_name, phone, roles
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name',
             SPLIT_PART(NEW.email, '@', 1)),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'phone'), ''),
    ARRAY[COALESCE(NEW.raw_user_meta_data->>'role', 'customer')]
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    phone     = COALESCE(EXCLUDED.phone, public.profiles.phone),
    roles     = COALESCE(EXCLUDED.roles, public.profiles.roles);
  RETURN NEW;
END;
$$;
