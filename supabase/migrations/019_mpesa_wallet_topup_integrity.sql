-- ============================================================
-- 019: M-Pesa wallet top-up integrity
-- Adds an explicit customer association on payment attempts,
-- a credited flag for idempotency, and one transactional RPC
-- used by the Daraja callback and STK query fallback.
-- DO NOT apply from this repair task; apply before production deploy.
-- ============================================================

ALTER TABLE public.mpesa_transactions
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.mpesa_transactions
  ADD COLUMN IF NOT EXISTS wallet_credited BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_mpesa_tx_user_id
  ON public.mpesa_transactions (user_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_mpesa_checkout_request_id
  ON public.mpesa_transactions (checkout_request_id)
  WHERE checkout_request_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_mpesa_receipt_number
  ON public.mpesa_transactions (mpesa_receipt_number)
  WHERE mpesa_receipt_number IS NOT NULL AND mpesa_receipt_number <> '';

-- Recover identity from historical STK payloads when the column is new.
UPDATE public.mpesa_transactions
SET user_id = (raw_payload->>'topupUserId')::uuid
WHERE user_id IS NULL
  AND raw_payload->>'topupUserId' IS NOT NULL
  AND raw_payload->>'topupUserId' ~ '^[0-9a-fA-F-]{36}$';

CREATE OR REPLACE FUNCTION public.process_mpesa_stk_result(
  p_checkout_request_id TEXT,
  p_merchant_request_id TEXT DEFAULT NULL,
  p_result_code INTEGER DEFAULT NULL,
  p_result_desc TEXT DEFAULT NULL,
  p_receipt_number TEXT DEFAULT NULL,
  p_amount NUMERIC DEFAULT NULL,
  p_phone_number TEXT DEFAULT NULL,
  p_raw_payload JSONB DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx public.mpesa_transactions%ROWTYPE;
  v_user_id UUID;
  v_success BOOLEAN;
  v_status TEXT;
  v_amount NUMERIC;
  v_receipt TEXT;
  v_merged JSONB;
  v_wallet_id UUID;
  v_ledger_ref TEXT;
  v_already_receipt BOOLEAN := false;
BEGIN
  IF p_checkout_request_id IS NULL OR length(trim(p_checkout_request_id)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'MISSING_CHECKOUT_ID');
  END IF;

  SELECT *
  INTO v_tx
  FROM public.mpesa_transactions
  WHERE checkout_request_id = p_checkout_request_id
  FOR UPDATE;

  IF NOT FOUND AND p_merchant_request_id IS NOT NULL THEN
    SELECT *
    INTO v_tx
    FROM public.mpesa_transactions
    WHERE merchant_request_id = p_merchant_request_id
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE;
  END IF;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NOT_FOUND');
  END IF;

  v_success := (p_result_code = 0);
  IF v_success THEN
    v_status := 'SUCCESS';
  ELSIF p_result_code = 1032 THEN
    v_status := 'CANCELLED';
  ELSE
    v_status := 'FAILED';
  END IF;

  v_amount := COALESCE(p_amount, v_tx.amount);
  v_receipt := NULLIF(trim(COALESCE(p_receipt_number, v_tx.mpesa_receipt_number, '')), '');

  v_user_id := v_tx.user_id;
  IF v_user_id IS NULL AND v_tx.raw_payload ? 'topupUserId' THEN
    BEGIN
      v_user_id := NULLIF(v_tx.raw_payload->>'topupUserId', '')::uuid;
    EXCEPTION WHEN OTHERS THEN
      v_user_id := NULL;
    END;
  END IF;

  v_merged := COALESCE(v_tx.raw_payload, '{}'::jsonb);
  IF p_raw_payload IS NOT NULL THEN
    v_merged := v_merged || jsonb_build_object('stkResult', p_raw_payload);
  END IF;
  IF v_user_id IS NOT NULL THEN
    v_merged := v_merged || jsonb_build_object('topupUserId', v_user_id::text);
  END IF;

  -- Already credited: persist receipt/status only, never credit again.
  IF v_tx.wallet_credited THEN
    UPDATE public.mpesa_transactions
    SET
      status = CASE WHEN v_status = 'SUCCESS' THEN 'SUCCESS' ELSE status END,
      result_code = COALESCE(p_result_code, result_code),
      result_desc = COALESCE(p_result_desc, result_desc),
      mpesa_receipt_number = COALESCE(v_receipt, mpesa_receipt_number),
      merchant_request_id = COALESCE(p_merchant_request_id, merchant_request_id),
      user_id = COALESCE(user_id, v_user_id),
      raw_payload = v_merged,
      updated_at = now()
    WHERE id = v_tx.id;

    RETURN jsonb_build_object(
      'ok', true,
      'duplicate', true,
      'credited', true,
      'status', 'SUCCESS',
      'reason', 'ALREADY_CREDITED',
      'order_id', v_tx.order_id,
      'user_id', v_user_id,
      'receipt', COALESCE(v_receipt, v_tx.mpesa_receipt_number)
    );
  END IF;

  IF NOT v_success THEN
    UPDATE public.mpesa_transactions
    SET
      status = v_status,
      result_code = p_result_code,
      result_desc = p_result_desc,
      merchant_request_id = COALESCE(p_merchant_request_id, merchant_request_id),
      user_id = COALESCE(user_id, v_user_id),
      raw_payload = v_merged,
      updated_at = now()
    WHERE id = v_tx.id;

    IF v_tx.order_id IS NOT NULL THEN
      UPDATE public.orders
      SET payment_status = 'FAILED', updated_at = now()
      WHERE id = v_tx.order_id
        AND payment_status IS DISTINCT FROM 'PAID';
    END IF;

    RETURN jsonb_build_object(
      'ok', true,
      'duplicate', false,
      'credited', false,
      'status', v_status,
      'order_id', v_tx.order_id,
      'user_id', v_user_id
    );
  END IF;

  -- Confirmed success. Do not guess a customer if none is stored on this STK row.
  UPDATE public.mpesa_transactions
  SET
    status = 'SUCCESS',
    result_code = 0,
    result_desc = COALESCE(p_result_desc, result_desc),
    mpesa_receipt_number = COALESCE(v_receipt, mpesa_receipt_number),
    merchant_request_id = COALESCE(p_merchant_request_id, merchant_request_id),
    user_id = COALESCE(user_id, v_user_id),
    raw_payload = v_merged,
    updated_at = now()
  WHERE id = v_tx.id;

  IF v_tx.order_id IS NOT NULL THEN
    UPDATE public.orders
    SET
      payment_status = 'PAID',
      mpesa_receipt = COALESCE(v_receipt, mpesa_receipt),
      mpesa_code = COALESCE(v_receipt, mpesa_code),
      updated_at = now()
    WHERE id = v_tx.order_id
      AND payment_status IS DISTINCT FROM 'PAID';
  END IF;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', true,
      'duplicate', false,
      'credited', false,
      'status', 'SUCCESS',
      'reason', CASE WHEN v_tx.order_id IS NOT NULL THEN 'ORDER_PAYMENT' ELSE 'NO_CUSTOMER_ASSOCIATION' END,
      'order_id', v_tx.order_id,
      'receipt', v_receipt
    );
  END IF;

  v_ledger_ref := COALESCE(v_receipt, 'STK:' || v_tx.checkout_request_id);

  IF v_receipt IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.mpesa_transactions
      WHERE mpesa_receipt_number = v_receipt
        AND wallet_credited = true
        AND id <> v_tx.id
    ) INTO v_already_receipt;
  END IF;

  IF v_already_receipt OR EXISTS (
    SELECT 1 FROM public.wallet_transactions
    WHERE reference = v_ledger_ref
      AND status = 'COMPLETED'
  ) THEN
    UPDATE public.mpesa_transactions
    SET wallet_credited = true, updated_at = now()
    WHERE id = v_tx.id;

    RETURN jsonb_build_object(
      'ok', true,
      'duplicate', true,
      'credited', true,
      'status', 'SUCCESS',
      'reason', 'ALREADY_CREDITED',
      'user_id', v_user_id,
      'receipt', v_receipt
    );
  END IF;

  INSERT INTO public.wallets (
    owner_id, owner_type, balance, pending_balance, total_earned, total_withdrawn, currency
  ) VALUES (
    v_user_id, 'CUSTOMER', v_amount, 0, v_amount, 0, 'KES'
  )
  ON CONFLICT (owner_id, owner_type) DO UPDATE
  SET
    balance = public.wallets.balance + EXCLUDED.balance,
    total_earned = public.wallets.total_earned + EXCLUDED.total_earned,
    updated_at = now()
  RETURNING id INTO v_wallet_id;

  INSERT INTO public.wallet_transactions (
    wallet_id, type, amount, fee, reference, description, status
  ) VALUES (
    v_wallet_id,
    'ADJUSTMENT',
    v_amount,
    0,
    v_ledger_ref,
    'Wallet top-up via M-Pesa',
    'COMPLETED'
  );

  UPDATE public.mpesa_transactions
  SET wallet_credited = true, updated_at = now()
  WHERE id = v_tx.id;

  RETURN jsonb_build_object(
    'ok', true,
    'duplicate', false,
    'credited', true,
    'status', 'SUCCESS',
    'user_id', v_user_id,
    'receipt', v_receipt,
    'amount', v_amount
  );
END;
$$;

REVOKE ALL ON FUNCTION public.process_mpesa_stk_result(
  TEXT, TEXT, INTEGER, TEXT, TEXT, NUMERIC, TEXT, JSONB
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.process_mpesa_stk_result(
  TEXT, TEXT, INTEGER, TEXT, TEXT, NUMERIC, TEXT, JSONB
) TO service_role;
