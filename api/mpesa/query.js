import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, sendRateLimitResponse } from '../_lib/rateLimiter.js';
import { isDarajaInProgress, isDarajaSuccess, normalizeResultCode, processStkResult } from './_processStkResult.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://xvnvyrddhgmxqynypboa.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2bnZ5cmRkaGdteHF5bnlwYm9hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjA3MTYyMywiZXhwIjoyMTA3NjQ3NjIzfQ.EnsCmbkRf6AMw2_62AWzqgk2hXSu1zEOTX3GguuZjQI';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const MPESA_CONFIG = {
  consumerKey: process.env.MPESA_CONSUMER_KEY || 'hNY8AACKWRniHG91pB9PCP11v55i4sOdaGeIAVk8xxidr2AL',
  consumerSecret: process.env.MPESA_CONSUMER_SECRET || 'PTwPUvKELJu5RW6oV9mJWzi5Gua4Oab0uHFQKXdIntd7haRWZo8Jdgc5LceptxAA',
  shortcode: process.env.MPESA_SHORTCODE || '174379',
  passkey: process.env.MPESA_PASSKEY || 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919',
  env: process.env.MPESA_ENVIRONMENT || 'sandbox'
};

const BASE_URL = MPESA_CONFIG.env === 'production'
  ? 'https://api.safaricom.co.ke'
  : 'https://sandbox.safaricom.co.ke';

function getTimestamp() {
  const now = new Date();
  const pad = n => n.toString().padStart(2, '0');
  return (
    now.getFullYear().toString() +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds())
  );
}

function toClientPayload(tx, extra = {}) {
  const credited = Boolean(tx?.wallet_credited);
  const complete = tx?.status === 'SUCCESS' || tx?.status === 'FAILED' || tx?.status === 'CANCELLED';
  return {
    status: tx?.status || extra.status || 'INITIATED',
    resultCode: tx?.result_code ?? extra.resultCode ?? null,
    resultDesc: tx?.result_desc || extra.resultDesc || null,
    receiptNumber: tx?.mpesa_receipt_number || extra.receiptNumber || null,
    checkoutRequestId: tx?.checkout_request_id || extra.checkoutRequestId || null,
    paymentConfirmed: tx?.status === 'SUCCESS',
    walletCredited: credited,
    isComplete: complete && (tx?.status !== 'SUCCESS' || credited || !tx?.user_id && !tx?.raw_payload?.topupUserId),
    ...extra
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const limit = checkRateLimit(req, { max: 20, windowMs: 60_000, keyPrefix: 'mpesa-query' });
  if (!limit.allowed) return sendRateLimitResponse(res, limit);

  try {
    const checkoutRequestId = req.query.checkoutRequestId || req.body?.checkoutRequestId;
    const orderId = req.query.orderId || req.body?.orderId;

    if (!checkoutRequestId && !orderId) {
      return res.status(400).json({ error: 'checkoutRequestId or orderId required' });
    }

    let query = supabase.from('mpesa_transactions').select('*');
    if (checkoutRequestId) query = query.eq('checkout_request_id', checkoutRequestId);
    else if (orderId) query = query.eq('order_id', orderId);

    const { data: tx } = await query.order('created_at', { ascending: false }).limit(1).maybeSingle();

    const needsTopupCredit = Boolean(
      tx &&
      tx.status === 'SUCCESS' &&
      !tx.wallet_credited &&
      (tx.user_id || tx.raw_payload?.topupUserId)
    );

    if (tx && (tx.status === 'SUCCESS' || tx.status === 'FAILED' || tx.status === 'CANCELLED') && !needsTopupCredit) {
      return res.status(200).json(toClientPayload(tx));
    }

    if (!checkoutRequestId) {
      return res.status(200).json({
        status: tx?.status || 'INITIATED',
        paymentConfirmed: false,
        walletCredited: Boolean(tx?.wallet_credited),
        isComplete: false,
        message: 'Awaiting PIN input on phone'
      });
    }

    const authHeader = Buffer.from(`${MPESA_CONFIG.consumerKey}:${MPESA_CONFIG.consumerSecret}`).toString('base64');
    const tokenRes = await fetch(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: { Authorization: `Basic ${authHeader}` }
    });
    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return res.status(200).json({
        status: tx?.status || 'INITIATED',
        paymentConfirmed: false,
        walletCredited: Boolean(tx?.wallet_credited),
        isComplete: false,
        message: 'Awaiting PIN input on phone'
      });
    }

    const timestamp = getTimestamp();
    const password = Buffer.from(`${MPESA_CONFIG.shortcode}${MPESA_CONFIG.passkey}${timestamp}`).toString('base64');
    const sfRes = await fetch(`${BASE_URL}/mpesa/stkpushquery/v1/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        BusinessShortCode: MPESA_CONFIG.shortcode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId
      })
    });

    const sfData = await sfRes.json();
    console.log('Safaricom query response', {
      checkoutRequestId,
      resultCode: sfData.ResultCode ?? sfData.errorCode ?? sfData.ResponseCode
    });

    if (isDarajaInProgress(sfData)) {
      return res.status(200).json({
        status: tx?.status || 'INITIATED',
        paymentConfirmed: false,
        walletCredited: Boolean(tx?.wallet_credited),
        isComplete: false,
        message: 'Awaiting PIN input on phone'
      });
    }

    const resultCode = normalizeResultCode(sfData.ResultCode);
    if (resultCode === null) {
      return res.status(200).json({
        status: tx?.status || 'INITIATED',
        paymentConfirmed: false,
        walletCredited: Boolean(tx?.wallet_credited),
        isComplete: false,
        message: 'Awaiting PIN input on phone'
      });
    }

    const { data, error } = await processStkResult(supabase, {
      checkoutRequestId,
      merchantRequestId: tx?.merchant_request_id || sfData.MerchantRequestID || null,
      resultCode,
      resultDesc: sfData.ResultDesc || sfData.ResponseDescription || null,
      receiptNumber: tx?.mpesa_receipt_number || null,
      amount: tx?.amount != null ? Number(tx.amount) : null,
      rawPayload: sfData
    });

    if (error) {
      console.error('STK query processing failed:', error.message || error.code);
      return res.status(500).json({ error: 'Failed to record payment status' });
    }

    if (!data?.ok && data?.reason === 'NOT_FOUND') {
      return res.status(200).json({
        status: 'INITIATED',
        paymentConfirmed: false,
        walletCredited: false,
        isComplete: false,
        message: 'Awaiting payment record'
      });
    }

    if (!data?.ok) {
      return res.status(200).json({
        status: tx?.status || 'INITIATED',
        paymentConfirmed: false,
        walletCredited: false,
        isComplete: false,
        message: 'Awaiting PIN input on phone'
      });
    }

    const credited = Boolean(data.credited);
    const completeStatus = data.status === 'SUCCESS' || data.status === 'FAILED' || data.status === 'CANCELLED';
    const isTopup = Boolean(tx?.user_id || tx?.raw_payload?.topupUserId);

    return res.status(200).json({
      status: data.status,
      resultCode,
      resultDesc: sfData.ResultDesc,
      receiptNumber: data.receipt || tx?.mpesa_receipt_number || null,
      checkoutRequestId,
      paymentConfirmed: data.status === 'SUCCESS',
      walletCredited: credited,
      isComplete: completeStatus && (data.status !== 'SUCCESS' || credited || !isTopup),
      isDarajaSuccess: isDarajaSuccess(resultCode)
    });
  } catch (err) {
    console.error('Error in query function:', err.message || err);
    return res.status(500).json({ error: err.message });
  }
}
