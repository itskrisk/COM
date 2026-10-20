-- ============================================================
-- MUNCHEEZ - MIGRATION 016: PAYMENT INTEGRITY
-- Separate payment_status from fulfilment status.
-- Add expiry window, idempotency key, and guard triggers.
-- ============================================================

-- 1. Add payment_expires_at to orders (10-minute STK Push window)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_expires_at TIMESTAMPTZ;

-- 2. Normalize payment_status CHECK constraint to cover all lifecycle states.
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_payment_status_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_payment_status_check
  CHECK (payment_status IN (''PENDING'', ''PAID'', ''FAILED'', ''CANCELLED'', ''EXPIRED'', ''REFUNDED''));

-- 3. Add idempotency_key to mpesa_transactions to prevent double-credit.
ALTER TABLE public.mpesa_transactions
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_mpesa_idempotency_key
  ON public.mpesa_transactions (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- 4. Add lifecycle timestamps if missing (some may exist from migration 010).
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS accepted_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ready_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS picked_up_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at  TIMESTAMPTZ;

-- 5. Guard function: prevent merchant from accepting an unpaid MPESA order.
CREATE OR REPLACE FUNCTION public.enforce_payment_before_fulfilment()
RETURNS TRIGGER AS $$
DECLARE
  v_new_status     TEXT;
  v_payment_status TEXT;
  v_payment_method TEXT;
BEGIN
  v_new_status     := UPPER(TRIM(NEW.status::text));
  v_payment_status := UPPER(TRIM(COALESCE(NEW.payment_status, ''PENDING'')));
  v_payment_method := UPPER(TRIM(COALESCE(NEW.payment_method, ''MPESA'')));

  IF v_new_status IN (''ACCEPTED'', ''PREPARING'', ''READY_FOR_PICKUP'', ''RIDER_ASSIGNED'',
                      ''PICKED_UP'', ''OUT_FOR_DELIVERY'', ''DELIVERED'', ''COMPLETED'') THEN
    IF v_payment_method IN (''CASH'', ''CARD'') THEN
      RETURN NEW;
    END IF;
    IF v_payment_status <> ''PAID'' THEN
      RAISE EXCEPTION
        ''Cannot advance order to % - payment_status is % (expected PAID)'',
        v_new_status, v_payment_status;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_payment_before_fulfilment ON public.orders;
CREATE TRIGGER enforce_payment_before_fulfilment
  BEFORE UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_payment_before_fulfilment();

-- 6. Helper: expire stale pending M-Pesa orders older than 10 minutes.
CREATE OR REPLACE FUNCTION public.expire_stale_mpesa_orders()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  UPDATE public.orders
  SET
    payment_status = ''EXPIRED'',
    status         = ''FAILED'',
    updated_at     = NOW()
  WHERE
    payment_method = ''MPESA''
    AND payment_status = ''PENDING''
    AND (
      (payment_expires_at IS NOT NULL AND NOW() > payment_expires_at)
      OR (payment_expires_at IS NULL AND created_at < NOW() - INTERVAL ''10 minutes'')
    )
    AND status NOT IN (''PAYMENT_CONFIRMED'', ''ACCEPTED'', ''PREPARING'',
                       ''READY_FOR_PICKUP'', ''RIDER_ASSIGNED'', ''PICKED_UP'',
                       ''OUT_FOR_DELIVERY'', ''DELIVERED'', ''COMPLETED'',
                       ''CANCELLED'', ''FAILED'');

  GET DIAGNOSTICS v_count = ROW_COUNT;

  UPDATE public.mpesa_transactions mt
  SET
    status      = ''FAILED'',
    result_desc = ''Payment expired - customer did not complete M-Pesa PIN entry within 10 minutes'',
    updated_at  = NOW()
  FROM public.orders o
  WHERE
    mt.order_id   = o.id
    AND mt.status = ''INITIATED''
    AND o.payment_status = ''EXPIRED'';

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.expire_stale_mpesa_orders() TO service_role;
