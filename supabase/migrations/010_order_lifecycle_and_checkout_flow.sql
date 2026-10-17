-- ============================================================
-- MUNCHEEZ — MIGRATION 010: ORDER LIFECYCLE & CHECKOUT FLOW
-- ============================================================

-- 1. Ensure columns exist on public.orders for customer contacts, phone and extras
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_phone        TEXT,
  ADD COLUMN IF NOT EXISTS payment_phone         TEXT,
  ADD COLUMN IF NOT EXISTS service_fee           NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_fee          NUMERIC(10,2) NOT NULL DEFAULT 150,
  ADD COLUMN IF NOT EXISTS wants_cutlery         BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS delivery_instructions TEXT,
  ADD COLUMN IF NOT EXISTS notes                 TEXT;

-- 2. Complete Order State Machine Function (Robust with overloaded type casting)
-- Handles all valid transitions across customer, merchant, courier and admin.
CREATE OR REPLACE FUNCTION public.can_transition_order(
  p_current_status text,
  p_new_status text
) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE
  v_curr TEXT;
  v_next TEXT;
BEGIN
  v_curr := UPPER(TRIM(p_current_status));
  v_next := UPPER(TRIM(p_new_status));

  -- Normalize aliases
  IF v_curr = 'PACKING' THEN v_curr := 'PREPARING'; END IF;
  IF v_next = 'PACKING' THEN v_next := 'PREPARING'; END IF;
  IF v_curr = 'IN_TRANSIT' THEN v_curr := 'OUT_FOR_DELIVERY'; END IF;
  IF v_next = 'IN_TRANSIT' THEN v_next := 'OUT_FOR_DELIVERY'; END IF;

  -- Terminal states
  IF v_curr IN ('DELIVERED', 'COMPLETED', 'CANCELLED', 'DECLINED', 'REFUNDED') THEN
    RETURN FALSE;
  END IF;

  -- Exact match (idempotent updates)
  IF v_curr = v_next THEN
    RETURN TRUE;
  END IF;

  -- From CREATED
  IF v_curr = 'CREATED' THEN
    RETURN v_next IN ('PAYMENT_PENDING', 'PAYMENT_CONFIRMED', 'ACCEPTED', 'PREPARING', 'CANCELLED');
  END IF;

  -- From PAYMENT_PENDING
  IF v_curr = 'PAYMENT_PENDING' THEN
    RETURN v_next IN ('PAYMENT_CONFIRMED', 'ACCEPTED', 'PREPARING', 'CANCELLED', 'FAILED');
  END IF;

  -- From PAYMENT_CONFIRMED
  IF v_curr = 'PAYMENT_CONFIRMED' THEN
    RETURN v_next IN ('ACCEPTED', 'PREPARING', 'CANCELLED', 'REFUND_PENDING');
  END IF;

  -- From ACCEPTED
  IF v_curr = 'ACCEPTED' THEN
    RETURN v_next IN ('PREPARING', 'READY_FOR_PICKUP', 'CANCELLED', 'REFUND_PENDING');
  END IF;

  -- From PREPARING
  IF v_curr = 'PREPARING' THEN
    RETURN v_next IN ('READY_FOR_PICKUP', 'RIDER_ASSIGNED', 'CANCELLED', 'REFUND_PENDING');
  END IF;

  -- From READY_FOR_PICKUP
  IF v_curr = 'READY_FOR_PICKUP' THEN
    RETURN v_next IN ('RIDER_ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'CANCELLED', 'REFUND_PENDING');
  END IF;

  -- From RIDER_ASSIGNED
  IF v_curr = 'RIDER_ASSIGNED' THEN
    RETURN v_next IN ('PICKED_UP', 'OUT_FOR_DELIVERY', 'READY_FOR_PICKUP', 'CANCELLED', 'REFUND_PENDING');
  END IF;

  -- From PICKED_UP
  IF v_curr = 'PICKED_UP' THEN
    RETURN v_next IN ('OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'REFUND_PENDING');
  END IF;

  -- From OUT_FOR_DELIVERY
  IF v_curr = 'OUT_FOR_DELIVERY' THEN
    RETURN v_next IN ('DELIVERED', 'COMPLETED', 'CANCELLED', 'FAILED', 'REFUND_PENDING');
  END IF;

  -- From DELIVERED
  IF v_curr = 'DELIVERED' THEN
    RETURN v_next IN ('COMPLETED');
  END IF;

  -- From FAILED
  IF v_curr = 'FAILED' THEN
    RETURN v_next IN ('CREATED', 'PAYMENT_PENDING', 'CANCELLED');
  END IF;

  -- Default permissive fallback for admin orchestration
  RETURN TRUE;
END;
$$;

-- 3. Overloaded function signatures so PostgreSQL type resolution never throws 42883
CREATE OR REPLACE FUNCTION public.can_transition_order(
  p_current text,
  p_new order_status
) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
BEGIN
  RETURN public.can_transition_order(p_current, p_new::text);
END;
$$;

CREATE OR REPLACE FUNCTION public.can_transition_order(
  p_current order_status,
  p_new text
) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
BEGIN
  RETURN public.can_transition_order(p_current::text, p_new);
END;
$$;

CREATE OR REPLACE FUNCTION public.can_transition_order(
  p_current order_status,
  p_new order_status
) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
BEGIN
  RETURN public.can_transition_order(p_current::text, p_new::text);
END;
$$;

-- 4. Trigger Function with explicit text casting
CREATE OR REPLACE FUNCTION public.enforce_order_state_transition()
RETURNS TRIGGER AS $$
DECLARE
  v_old_status TEXT;
  v_new_status TEXT;
BEGIN
  -- Only validate on actual status changes
  IF NEW.status::text = OLD.status::text THEN
    RETURN NEW;
  END IF;

  v_old_status := OLD.status::text;
  v_new_status := NEW.status::text;

  IF NOT public.can_transition_order(v_old_status, v_new_status) THEN
    RAISE EXCEPTION 'Invalid order state transition: % -> %', v_old_status, v_new_status;
  END IF;

  -- Auto-populate lifecycle timestamps
  IF v_new_status = 'ACCEPTED' AND NEW.accepted_at IS NULL THEN
    NEW.accepted_at := NOW();
  END IF;

  IF v_new_status IN ('PREPARING', 'READY_FOR_PICKUP') AND NEW.ready_at IS NULL THEN
    NEW.ready_at := NOW();
  END IF;

  IF v_new_status = 'PICKED_UP' AND NEW.picked_up_at IS NULL THEN
    NEW.picked_up_at := NOW();
  END IF;

  IF v_new_status IN ('DELIVERED', 'COMPLETED') AND NEW.delivered_at IS NULL THEN
    NEW.delivered_at := NOW();
    NEW.completed_at := NOW();
  END IF;

  IF v_new_status = 'CANCELLED' AND NEW.cancelled_at IS NULL THEN
    NEW.cancelled_at := NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Status history auto-logging with explicit text casting
CREATE OR REPLACE FUNCTION public.log_order_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_changed_by UUID;
BEGIN
  v_changed_by := auth.uid();
  IF v_changed_by IS NULL THEN
    v_changed_by := NEW.customer_id;
  END IF;

  INSERT INTO public.order_status_history (order_id, status, changed_by, note)
  VALUES (
    NEW.id,
    NEW.status,
    v_changed_by,
    'Status changed from ' || OLD.status::text || ' to ' || NEW.status::text
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Attach triggers safely
DROP TRIGGER IF EXISTS enforce_order_state_transition ON public.orders;
CREATE TRIGGER enforce_order_state_transition
  BEFORE UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_order_state_transition();

DROP TRIGGER IF EXISTS log_order_status_change ON public.orders;
CREATE TRIGGER log_order_status_change
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.log_order_status_change();

-- 7. Orders RLS Policies: comprehensive persona access
DO $$
BEGIN
  ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

  -- Customers can view their own orders
  DROP POLICY IF EXISTS "Customers view own orders" ON public.orders;
  CREATE POLICY "Customers view own orders"
    ON public.orders FOR SELECT
    USING (customer_id = auth.uid());

  -- Customers can place orders
  DROP POLICY IF EXISTS "Customers create orders" ON public.orders;
  CREATE POLICY "Customers create orders"
    ON public.orders FOR INSERT
    WITH CHECK (true);

  -- Merchants can view and update orders belonging to their store
  DROP POLICY IF EXISTS "Merchants manage own orders" ON public.orders;
  CREATE POLICY "Merchants manage own orders"
    ON public.orders FOR ALL
    USING (merchant_id = auth.uid());

  -- Couriers can view orders assigned to them or ready for pickup
  DROP POLICY IF EXISTS "Couriers view and update assigned orders" ON public.orders;
  CREATE POLICY "Couriers view and update assigned orders"
    ON public.orders FOR ALL
    USING (
      rider_id = auth.uid() OR
      status::text IN ('READY_FOR_PICKUP', 'PREPARING')
    );

  -- Admin access
  DROP POLICY IF EXISTS "Admins manage all orders" ON public.orders;
  CREATE POLICY "Admins manage all orders"
    ON public.orders FOR ALL
    USING (public.is_admin());

EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;
