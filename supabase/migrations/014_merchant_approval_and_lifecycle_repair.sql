-- ============================================================
-- MUNCHEEZ — MIGRATION 014: MERCHANT APPROVAL & STORE LIFECYCLE REPAIR
-- ============================================================

-- 1. Ensure columns exist on public.merchants
ALTER TABLE public.merchants
  ADD COLUMN IF NOT EXISTS is_suspended       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS business_permit    TEXT,
  ADD COLUMN IF NOT EXISTS business_permit_url TEXT,
  ADD COLUMN IF NOT EXISTS kra_pin_url        TEXT,
  ADD COLUMN IF NOT EXISTS health_permit_url  TEXT,
  ADD COLUMN IF NOT EXISTS rejection_reason   TEXT,
  ADD COLUMN IF NOT EXISTS approved_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspended_at       TIMESTAMPTZ;

-- 2. Ensure indexes for lifecycle queries
CREATE INDEX IF NOT EXISTS idx_merchants_status_active ON public.merchants(status, is_active);
CREATE INDEX IF NOT EXISTS idx_merchants_is_suspended  ON public.merchants(is_suspended);

-- 3. Row Level Security Policies for public.merchants
DO $$
BEGIN
  ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;

  -- Admin can manage all merchants
  DROP POLICY IF EXISTS "Admin manages merchants" ON public.merchants;
  CREATE POLICY "Admin manages merchants"
    ON public.merchants FOR ALL
    USING (public.is_admin());

  -- Public can view only approved, active, unsuspended stores
  DROP POLICY IF EXISTS "Public stores visible" ON public.merchants;
  CREATE POLICY "Public stores visible"
    ON public.merchants FOR SELECT
    USING (
      status = 'APPROVED'
      AND is_active = true
      AND (is_suspended = false OR is_suspended IS NULL)
    );

  -- Merchant can view their own record regardless of status
  DROP POLICY IF EXISTS "Merchant reads own" ON public.merchants;
  CREATE POLICY "Merchant reads own"
    ON public.merchants FOR SELECT
    USING (auth.uid() = id);

  -- Merchant can insert their own record
  DROP POLICY IF EXISTS "Merchant inserts own" ON public.merchants;
  CREATE POLICY "Merchant inserts own"
    ON public.merchants FOR INSERT
    WITH CHECK (auth.uid() = id);

  -- Merchant can update their own record
  DROP POLICY IF EXISTS "Merchant updates own" ON public.merchants;
  CREATE POLICY "Merchant updates own"
    ON public.merchants FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;
