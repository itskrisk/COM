-- ============================================================
-- MUNCHEEZ MIGRATION 020: OPTIONAL & MULTI-ACCOUNT PHONE NUMBERS
-- + RESILIENT HANDLE_NEW_USER TRIGGER
--
-- Requirements:
-- 1. Phone number is NOT mandatory.
-- 2. The SAME phone number can be used across multiple accounts.
-- 3. Drops the UNIQUE constraint (profiles_phone_key) on public.profiles.
-- 4. Guarantees handle_new_user trigger never fails auth signup.
-- ============================================================

-- 1. Allow multiple accounts to share the same phone number & allow NULLs
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_phone_key;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_phone_unique;
DROP INDEX IF EXISTS public.profiles_phone_key;
DROP INDEX IF EXISTS public.idx_profiles_phone_unique;

-- 2. Fast non-unique index for phone lookups
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);

-- 3. Resilient trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    user_roles_arr text[];
    primary_role text;
    user_full_name text;
    user_phone text;
    m_type text;
BEGIN
    -- Extract role safely (ONE EMAIL = ONE ROLE)
    IF NEW.raw_user_meta_data IS NOT NULL AND NEW.raw_user_meta_data->>'role' IS NOT NULL THEN
        user_roles_arr := ARRAY[NEW.raw_user_meta_data->>'role'];
    ELSIF NEW.raw_user_meta_data IS NOT NULL AND NEW.raw_user_meta_data->'roles' IS NOT NULL THEN
        SELECT ARRAY(
            SELECT jsonb_array_elements_text(NEW.raw_user_meta_data->'roles')
        ) INTO user_roles_arr;
        user_roles_arr := ARRAY[user_roles_arr[1]];
    ELSE
        user_roles_arr := ARRAY['customer'];
    END IF;

    IF array_length(user_roles_arr, 1) IS NULL THEN
        user_roles_arr := ARRAY['customer'];
    END IF;

    primary_role := user_roles_arr[1];
    user_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1));
    user_phone := NULLIF(TRIM(NEW.raw_user_meta_data->>'phone'), '');

    -- Upsert profile (phone is optional and non-unique)
    BEGIN
        INSERT INTO public.profiles (
            id, full_name, email, phone, roles, account_status, status
        ) VALUES (
            NEW.id,
            user_full_name,
            NEW.email,
            user_phone,
            user_roles_arr,
            CASE WHEN primary_role = 'customer' THEN 'active' ELSE 'pending_onboarding' END,
            'ACTIVE'
        )
        ON CONFLICT (id) DO UPDATE SET
            full_name = EXCLUDED.full_name,
            email     = COALESCE(EXCLUDED.email, public.profiles.email),
            phone     = CASE WHEN EXCLUDED.phone IS NOT NULL AND EXCLUDED.phone <> '' THEN EXCLUDED.phone ELSE public.profiles.phone END,
            roles     = EXCLUDED.roles;
    EXCEPTION
        WHEN unique_violation THEN
            -- Fallback in case constraint still exists in DB
            INSERT INTO public.profiles (
                id, full_name, email, phone, roles, account_status, status
            ) VALUES (
                NEW.id,
                user_full_name,
                NEW.email,
                NULL,
                user_roles_arr,
                CASE WHEN primary_role = 'customer' THEN 'active' ELSE 'pending_onboarding' END,
                'ACTIVE'
            )
            ON CONFLICT (id) DO UPDATE SET
                full_name = EXCLUDED.full_name,
                email     = COALESCE(EXCLUDED.email, public.profiles.email),
                roles     = EXCLUDED.roles;
    END;

    -- If Merchant: provision merchant row
    IF 'merchant' = ANY(user_roles_arr) OR primary_role = 'merchant' THEN
        m_type := COALESCE(NEW.raw_user_meta_data->>'merchant_type', NEW.raw_user_meta_data->>'business_type', 'Restaurant');
        BEGIN
            INSERT INTO public.merchants (
                id, business_name, type, status, phone, email, owner_name, delivery_fee
            ) VALUES (
                NEW.id,
                COALESCE(NEW.raw_user_meta_data->>'business_name', user_full_name, 'Unnamed Business'),
                m_type::merchant_type,
                'PENDING',
                user_phone,
                NEW.email,
                user_full_name,
                150.00
            ) ON CONFLICT (id) DO NOTHING;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'handle_new_user: merchant provision notice: %', SQLERRM;
        END;
    END IF;

    -- If Courier: provision rider row
    IF 'courier' = ANY(user_roles_arr) OR primary_role = 'courier' THEN
        BEGIN
            INSERT INTO public.riders (
                id, name, phone, email, vehicle_type, status
            ) VALUES (
                NEW.id,
                user_full_name,
                user_phone,
                NEW.email,
                COALESCE(NEW.raw_user_meta_data->>'vehicle_type', 'Motorbike'),
                'PENDING'
            ) ON CONFLICT (id) DO NOTHING;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'handle_new_user: rider provision notice: %', SQLERRM;
        END;
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Safety guarantee: NEVER fail auth.users creation
    RAISE WARNING 'handle_new_user fatal exception: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Ensure trigger is active
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
