-- ============================================================
-- MUNCHEEZ — MIGRATION 011: UNIVERSAL PRODUCT VISIBILITY & ORDER LIFECYCLE RESILIENCE
-- ============================================================

-- 1. Ensure all order lifecycle timestamp columns exist on public.orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS accepted_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ready_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS picked_up_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at  TIMESTAMPTZ;

-- 2. Update RLS on public.products so that products belonging to approved, active stores
-- remain visible to customers even when marked as offline/unavailable (is_available = false)
-- or out of stock (stock_level = 0).
-- In the storefront, these items are displayed with an "UNAVAILABLE" / "OUT OF STOCK" badge
-- and a disabled add-to-cart button, instead of vanishing completely.
DO $$
BEGIN
  IF to_regclass('public.products') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Available products public" ON public.products;
    DROP POLICY IF EXISTS "Store products public" ON public.products;
    DROP POLICY IF EXISTS "Public can view products of active merchants" ON public.products;

    CREATE POLICY "Store products public"
      ON public.products FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.merchants
          WHERE merchants.id = products.merchant_id
            AND merchants.status = 'APPROVED'
            AND merchants.is_active = true
        )
      );
  END IF;
END $$;

-- 3. Resilient state transition trigger that safely handles transitions
CREATE OR REPLACE FUNCTION public.enforce_order_state_transition()
RETURNS TRIGGER AS $$
DECLARE
  v_old_status TEXT;
  v_new_status TEXT;
BEGIN
  IF NEW.status::text = OLD.status::text THEN
    RETURN NEW;
  END IF;

  v_old_status := UPPER(TRIM(OLD.status::text));
  v_new_status := UPPER(TRIM(NEW.status::text));

  IF NOT public.can_transition_order(v_old_status, v_new_status) THEN
    RAISE EXCEPTION 'Invalid order state transition: % -> %', v_old_status, v_new_status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
