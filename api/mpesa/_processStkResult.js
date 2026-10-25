/**
 * Shared Daraja result processing for callback + STK query.
 * Prefers the transactional RPC from migration 019.
 */

export function isDarajaSuccess(resultCode) {
  if (resultCode === undefined || resultCode === null || resultCode === '') return false;
  return Number(resultCode) === 0;
}

export function normalizeResultCode(resultCode) {
  if (resultCode === undefined || resultCode === null || resultCode === '') return null;
  const n = Number(resultCode);
  return Number.isFinite(n) ? n : null;
}

export function isDarajaInProgress(sfData) {
  if (!sfData || typeof sfData !== 'object') return true;
  const code = sfData.ResultCode ?? sfData.errorCode ?? sfData.ResponseCode;
  const desc = String(
    sfData.ResultDesc || sfData.errorMessage || sfData.ResponseDescription || ''
  ).toLowerCase();
  if (code === undefined || code === null || code === '') return true;
  const codeStr = String(code);
  if (codeStr.includes('500.001') || codeStr === '499') return true;
  if (desc.includes('being processed') || desc.includes('for processing')) return true;
  return false;
}

function ledgerReference(receiptNumber, checkoutRequestId) {
  const receipt = receiptNumber ? String(receiptNumber).trim() : '';
  if (receipt) return receipt;
  return checkoutRequestId ? `STK:${checkoutRequestId}` : null;
}

/**
 * Sequential fallback used only when process_mpesa_stk_result is not installed yet.
 * Still refuses to credit without a stored customer id and skips duplicate ledger refs.
 */
async function processStkResultFallback(supabase, params) {
  const checkoutRequestId = params.checkoutRequestId;
  if (!checkoutRequestId) {
    return { data: { ok: false, reason: 'MISSING_CHECKOUT_ID' }, error: null };
  }

  let { data: tx, error: findError } = await supabase
    .from('mpesa_transactions')
    .select('*')
    .eq('checkout_request_id', checkoutRequestId)
    .maybeSingle();

  if (findError) {
    return { data: null, error: findError };
  }

  if (!tx && params.merchantRequestId) {
    const lookup = await supabase
      .from('mpesa_transactions')
      .select('*')
      .eq('merchant_request_id', params.merchantRequestId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    tx = lookup.data;
    if (lookup.error) return { data: null, error: lookup.error };
  }

  if (!tx) {
    return { data: { ok: false, reason: 'NOT_FOUND' }, error: null };
  }

  const resultCode = params.resultCode;
  const success = isDarajaSuccess(resultCode);
  const status = success ? 'SUCCESS' : (resultCode === 1032 ? 'CANCELLED' : 'FAILED');
  const originalPayload = tx.raw_payload && typeof tx.raw_payload === 'object' ? tx.raw_payload : {};
  const userId = tx.user_id || originalPayload.topupUserId || null;
  const receipt = params.receiptNumber || tx.mpesa_receipt_number || null;
  const amount = params.amount != null ? Number(params.amount) : Number(tx.amount);
  const mergedPayload = {
    ...originalPayload,
    ...(params.rawPayload ? { stkResult: params.rawPayload } : {}),
    ...(userId ? { topupUserId: userId } : {})
  };

  if (tx.wallet_credited) {
    await supabase
      .from('mpesa_transactions')
      .update({
        status: success ? 'SUCCESS' : tx.status,
        result_code: resultCode,
        result_desc: params.resultDesc || tx.result_desc,
        mpesa_receipt_number: receipt,
        raw_payload: mergedPayload,
        user_id: tx.user_id || userId,
        updated_at: new Date().toISOString()
      })
      .eq('id', tx.id);
    return {
      data: { ok: true, duplicate: true, credited: true, status: 'SUCCESS', reason: 'ALREADY_CREDITED', user_id: userId, receipt },
      error: null
    };
  }

  const updateFields = {
    status,
    result_code: resultCode,
    result_desc: params.resultDesc || null,
    mpesa_receipt_number: receipt,
    raw_payload: mergedPayload,
    updated_at: new Date().toISOString()
  };
  if (userId) updateFields.user_id = userId;

  const { error: updateError } = await supabase
    .from('mpesa_transactions')
    .update(updateFields)
    .eq('id', tx.id);

  if (updateError && /user_id|wallet_credited/.test(updateError.message || '')) {
    delete updateFields.user_id;
    const retry = await supabase.from('mpesa_transactions').update(updateFields).eq('id', tx.id);
    if (retry.error) return { data: null, error: retry.error };
  } else if (updateError) {
    return { data: null, error: updateError };
  }

  if (!success) {
    if (tx.order_id) {
      await supabase
        .from('orders')
        .update({ payment_status: 'FAILED', updated_at: new Date().toISOString() })
        .eq('id', tx.order_id)
        .neq('payment_status', 'PAID');
    }
    return { data: { ok: true, credited: false, status, user_id: userId, order_id: tx.order_id }, error: null };
  }

  if (tx.order_id) {
    await supabase
      .from('orders')
      .update({
        payment_status: 'PAID',
        mpesa_receipt: receipt,
        mpesa_code: receipt,
        updated_at: new Date().toISOString()
      })
      .eq('id', tx.order_id)
      .neq('payment_status', 'PAID');
  }

  if (!userId) {
    return {
      data: {
        ok: true,
        credited: false,
        status: 'SUCCESS',
        reason: tx.order_id ? 'ORDER_PAYMENT' : 'NO_CUSTOMER_ASSOCIATION',
        order_id: tx.order_id,
        receipt
      },
      error: null
    };
  }

  const reference = ledgerReference(receipt, checkoutRequestId);
  const { data: existingLedger } = await supabase
    .from('wallet_transactions')
    .select('id')
    .eq('reference', reference)
    .eq('status', 'COMPLETED')
    .maybeSingle();

  if (existingLedger) {
    await supabase.from('mpesa_transactions').update({ wallet_credited: true, updated_at: new Date().toISOString() }).eq('id', tx.id);
    return { data: { ok: true, duplicate: true, credited: true, status: 'SUCCESS', reason: 'ALREADY_CREDITED', user_id: userId, receipt }, error: null };
  }

  const { data: wallet } = await supabase
    .from('wallets')
    .select('id,balance,total_earned')
    .eq('owner_id', userId)
    .eq('owner_type', 'CUSTOMER')
    .maybeSingle();

  if (wallet) {
    const { error: walletError } = await supabase
      .from('wallets')
      .update({
        balance: Number(wallet.balance) + amount,
        total_earned: Number(wallet.total_earned) + amount,
        updated_at: new Date().toISOString()
      })
      .eq('id', wallet.id);
    if (walletError) return { data: null, error: walletError };
  } else {
    const { error: createError } = await supabase.from('wallets').insert({
      owner_id: userId,
      owner_type: 'CUSTOMER',
      balance: amount,
      total_earned: amount,
      total_withdrawn: 0,
      pending_balance: 0,
      currency: 'KES'
    });
    if (createError) return { data: null, error: createError };
  }

  const { data: walletRow } = await supabase
    .from('wallets')
    .select('id')
    .eq('owner_id', userId)
    .eq('owner_type', 'CUSTOMER')
    .maybeSingle();

  if (!walletRow?.id) {
    return { data: null, error: { message: 'Wallet row missing after credit' } };
  }

  const { error: ledgerError } = await supabase.from('wallet_transactions').insert({
    wallet_id: walletRow.id,
    type: 'ADJUSTMENT',
    amount,
    fee: 0,
    reference,
    description: 'Wallet top-up via M-Pesa',
    status: 'COMPLETED'
  });
  if (ledgerError) return { data: null, error: ledgerError };

  await supabase
    .from('mpesa_transactions')
    .update({ wallet_credited: true, updated_at: new Date().toISOString() })
    .eq('id', tx.id);

  return {
    data: { ok: true, duplicate: false, credited: true, status: 'SUCCESS', user_id: userId, receipt, amount },
    error: null
  };
}

export async function processStkResult(supabase, params) {
  const rpc = await supabase.rpc('process_mpesa_stk_result', {
    p_checkout_request_id: params.checkoutRequestId,
    p_merchant_request_id: params.merchantRequestId || null,
    p_result_code: params.resultCode,
    p_result_desc: params.resultDesc || null,
    p_receipt_number: params.receiptNumber || null,
    p_amount: params.amount != null ? params.amount : null,
    p_phone_number: params.phoneNumber || null,
    p_raw_payload: params.rawPayload || null
  });

  const missingFn = rpc.error && (
    rpc.error.code === '42883' ||
    /process_mpesa_stk_result|does not exist/i.test(rpc.error.message || '')
  );

  if (missingFn) {
    console.error('process_mpesa_stk_result RPC missing; using non-atomic fallback. Apply migration 019 before production.');
    return processStkResultFallback(supabase, params);
  }

  return rpc;
}
