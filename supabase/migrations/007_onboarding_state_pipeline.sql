-- 007: State-driven onboarding pipeline
-- Adds a dedicated account_status column on profiles so the frontend
-- ProtectedRoute can enforce the full lifecycle:
--   pending_email_verification -> pending_onboarding -> pending_approval -> active -> rejected
-- Also tightens RLS so unapproved merchants/riders cannot query operational tables.

-- ── 1. account_status enum ─────────────────────────────────────────────────
CREATE TYPE public.account_status AS ENUM (
  'pending_email_verification',
  'pending_onboarding',
  'pending_approval',
  'active',
  'rejected',
  'suspended'
);

-- ── 2. profiles.account_status column ──────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_status public.account_status NOT NULL DEFAULT 'pending_email_verification';

-- Backfill from existing status and the auth.users email confirmation flag.
-- profiles does not have its own email_verified column; the canonical source
-- is auth.users.email_confirmed_at, which Supabase sets when the user clicks
-- the verification link. Note: auth is its own schema, not under public.
UPDATE public.profiles p
SET account_status = CASE
  WHEN au.email_confirmed_at IS NULL THEN 'pending_email_verification'::account_status
  WHEN p.status IN ('PENDING', 'UNDER_REVIEW') THEN 'pending_approval'::account_status
  WHEN p.status = 'REJECTED' THEN 'rejected'::account_status
  WHEN p.status = 'SUSPENDED' THEN 'suspended'::account_status
  ELSE 'active'::account_status
END
FROM auth.users au
WHERE p.id = au.id
  AND (p.account_status IS NULL OR p.account_status = 'pending_email_verification');

-- ── 3. Trigger: auto-set account_status on new user signup ─────────────────
CREATE OR REPLACE FUNCTION public.set_initial_account_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.account_status IS NULL THEN
    NEW.account_status := 'pending_email_verification';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_set_initial_status
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.set_initial_account_status();

-- ── 4. Trigger: when email is confirmed, move to pending_onboarding ────────
CREATE OR REPLACE FUNCTION public.on_email_confirmed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    UPDATE public.profiles
    SET account_status = 'pending_onboarding'
    WHERE id = NEW.id
      AND account_status = 'pending_email_verification';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_email_confirmed_status
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.on_email_confirmed();

-- ── 5. RLS: block non-active merchants/riders from querying operational data
--    (products, orders, categories, promotions, dispatch_offers)

CREATE OR REPLACE FUNCTION public.is_active_merchant()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.merchants m
    WHERE m.id = auth.uid()
      AND m.status = 'APPROVED'
      AND m.is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_active_rider()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.riders r
    WHERE r.id = auth.uid()
      AND r.status = 'APPROVED'
  );
$$;

-- ── 6. Tighten existing RLS policies on operational tables ─────────────────
-- Each block is guarded so the migration does not fail if a particular
-- operational table does not exist in this project's schema.

-- Products: merchant must be approved + active
DO $$
BEGIN
  IF to_regclass('public.products') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Merchant manages own products" ON public.products;
    CREATE POLICY "Merchant manages own products"
      ON public.products FOR ALL
      USING (merchant_id = auth.uid() AND public.is_active_merchant());
  END IF;
END $$;

-- Orders: merchant can only read own store's orders when approved
DO $$
BEGIN
  IF to_regclass('public.orders') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Merchant reads own store orders" ON public.orders;
    CREATE POLICY "Merchant reads own store orders"
      ON public.orders FOR SELECT
      USING (merchant_id = auth.uid() AND public.is_active_merchant());

    DROP POLICY IF EXISTS "Merchant updates order status" ON public.orders;
    CREATE POLICY "Merchant updates order status"
      ON public.orders FOR UPDATE
      USING (merchant_id = auth.uid() AND public.is_active_merchant());

    DROP POLICY IF EXISTS "Rider reads assigned orders" ON public.orders;
    CREATE POLICY "Rider reads assigned orders"
      ON public.orders FOR SELECT
      USING (rider_id = auth.uid() AND public.is_active_rider());

    DROP POLICY IF EXISTS "Rider updates delivery status" ON public.orders;
    CREATE POLICY "Rider updates delivery status"
      ON public.orders FOR UPDATE
      USING (rider_id = auth.uid() AND public.is_active_rider());
  END IF;
END $$;

-- Dispatch offers: rider only sees own when approved
DO $$
BEGIN
  IF to_regclass('public.dispatch_offers') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Rider reads own offers" ON public.dispatch_offers;
    CREATE POLICY "Rider reads own offers"
      ON public.dispatch_offers FOR SELECT
      USING (rider_id = auth.uid() AND public.is_active_rider());

    DROP POLICY IF EXISTS "Rider responds to offers" ON public.dispatch_offers;
    CREATE POLICY "Rider responds to offers"
      ON public.dispatch_offers FOR UPDATE
      USING (rider_id = auth.uid() AND public.is_active_rider());
  END IF;
END $$;

-- Categories / Promotions: merchant must be approved
DO $$
BEGIN
  IF to_regclass('public.categories') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Merchant manages own categories" ON public.categories;
    CREATE POLICY "Merchant manages own categories"
      ON public.categories FOR ALL
      USING (merchant_id = auth.uid() AND public.is_active_merchant());
  END IF;
  IF to_regclass('public.promotions') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Merchant manages own promos" ON public.promotions;
    CREATE POLICY "Merchant manages own promos"
      ON public.promotions FOR ALL
      USING (merchant_id = auth.uid() AND public.is_active_merchant());
  END IF;
END $$;

-- ── 7. Index for fast status lookups ───────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_account_status
  ON public.profiles(account_status);