import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, sendRateLimitResponse } from '../_lib/rateLimiter.js';
import { requireSupabaseUser } from '../_lib/requireSupabaseUser.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://xvnvyrddhgmxqynypboa.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2bnZ5cmRkaGdteHF5bnlwYm9hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjA3MTYyMywiZXhwIjoyMTA3NjQ3NjIzfQ.EnsCmbkRf6AMw2_62AWzqgk2hXSu1zEOTX3GguuZjQI';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const MPESA_CONFIG = {
  consumerKey: process.env.MPESA_CONSUMER_KEY || 'hNY8AACKWRniHG91pB9PCP11v55i4sOdaGeIAVk8xxidr2AL',
  consumerSecret: process.env.MPESA_CONSUMER_SECRET || 'PTwPUvKELJu5RW6oV9mJWzi5Gua4Oab0uHFQKXdIntd7haRWZo8Jdgc5LceptxAA',
  shortcode: process.env.MPESA_SHORTCODE || '174379',
  passkey: process.env.MPESA_PASSKEY || 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919',
  env: process.env.MPESA_ENVIRONMENT || 'sandbox',
  callbackUrl: process.env.MPESA_CALLBACK_URL || 'https://muncheez.co.ke/api/mpesa/callback'
};

const BASE_URL = MPESA_CONFIG.env === 'production'
  ? 'https://api.safaricom.co.ke'
  : 'https://sandbox.safaricom.co.ke';

function formatPhone(phone) {
  let cleaned = (phone || '').replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) cleaned = '254' + cleaned.slice(1);
  else if (cleaned.startsWith('7') || cleaned.startsWith('1')) cleaned = '254' + cleaned;
  else if (cleaned.startsWith('+254')) cleaned = cleaned.slice(1);
  return cleaned;
}

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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // --- Rate limit: 3 STK pushes per IP per 10 minutes ---
  const ipLimit = checkRateLimit(req, { max: 3, windowMs: 10 * 60_000, keyPrefix: 'stkpush' });
  if (!ipLimit.allowed) return sendRateLimitResponse(res, ipLimit);

  const verifiedUser = await requireSupabaseUser(req, res);
  if (!verifiedUser) return;

  try {
    const { phoneNumber, amount, orderId, accountReference, transactionDesc, topupUserId } = req.body || {};

    if (!phoneNumber || !amount || (!orderId && !topupUserId)) {
      return res.status(400).json({ error: 'Missing required parameters: phoneNumber, amount, orderId' });
    }

    const isTopup = !!topupUserId;
    if (isTopup && String(topupUserId) !== String(verifiedUser.id)) {
      return res.status(403).json({ error: 'Top-up user does not match the authenticated session' });
    }
    const topupOwnerId = isTopup ? verifiedUser.id : null;

    const formattedPhone = formatPhone(phoneNumber);
    if (!formattedPhone || formattedPhone.length !== 12) {
      return res.status(400).json({ error: 'Invalid Kenyan phone number format. Must be 254XXXXXXXXX' });
    }

    if (!isTopup) {
      // idempotency check only for real orders
      const { data: existingOrder, error: orderLookupError } = await supabase
        .from('orders')
        .select('customer_id, payment_status, payment_expires_at')
        .eq('id', orderId)
        .maybeSingle();

      if (orderLookupError) {
        console.error('STK push order lookup failed:', orderLookupError.code || orderLookupError.message);
        return res.status(500).json({ error: 'Unable to verify order ownership' });
      }

      if (!existingOrder) {
        return res.status(404).json({ error: 'Order not found' });
      }

      if (String(existingOrder.customer_id) !== String(verifiedUser.id)) {
        return res.status(403).json({ error: 'Order does not belong to the authenticated user' });
      }

      if (existingOrder.payment_status === 'PAID') {
        return res.status(409).json({ error: 'Order is already paid. Duplicate payment rejected.' });
      }
      if (existingOrder.payment_status === 'PENDING' && existingOrder.payment_expires_at) {
        const expiresAt = new Date(existingOrder.payment_expires_at);
        if (expiresAt > new Date()) {
          const remainingMs = expiresAt - new Date();
          const remainingSec = Math.ceil(remainingMs / 1000);
          return res.status(409).json({
            error: `An M-Pesa prompt is already active for this order. Check your phone. It expires in ${remainingSec}s.`,
            retryAfter: remainingSec
          });
        }
      }
    }

    // Per-order / per-user top-up rate limit
    const rateLimitTarget = isTopup ? `topup-${topupOwnerId}` : `order-${orderId}`;
    const orderLimit = checkRateLimit(
      { ...req, headers: { ...req.headers, 'x-forwarded-for': rateLimitTarget } },
      { max: isTopup ? 6 : 3, windowMs: 15 * 60_000, keyPrefix: isTopup ? 'stkpush-topup' : 'stkpush-order' }
    );
    if (!orderLimit.allowed) return sendRateLimitResponse(res, orderLimit);

    // 1. Get OAuth Token from Safaricom
    const authHeader = Buffer.from(`${MPESA_CONFIG.consumerKey}:${MPESA_CONFIG.consumerSecret}`).toString('base64');
    const tokenRes = await fetch(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: { Authorization: `Basic ${authHeader}` }
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error('Daraja OAuth error:', errText);
      return res.status(502).json({ error: 'Failed to authenticate with Safaricom Daraja', details: errText });
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // 2. Prepare STK Push payload
    const timestamp = getTimestamp();
    const password = Buffer.from(`${MPESA_CONFIG.shortcode}${MPESA_CONFIG.passkey}${timestamp}`).toString('base64');
    const roundAmount = Math.max(1, Math.round(Number(amount)));
    const refSource = orderId || topupUserId || 'TOPUP';
    const ref = (accountReference || `MUNCHEEZ-${String(refSource).slice(0, 6)}`).toUpperCase().replace(/[^A-Z0-9_-]/g, '');

    const stkPayload = {
      BusinessShortCode: MPESA_CONFIG.shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: roundAmount,
      PartyA: formattedPhone,
      PartyB: MPESA_CONFIG.shortcode,
      PhoneNumber: formattedPhone,
      CallBackURL: MPESA_CONFIG.callbackUrl,
      AccountReference: ref,
      TransactionDesc: (transactionDesc || 'Muncheez Food Order').slice(0, 30)
    };

    // 3. Dispatch to Safaricom Daraja STK Push Endpoint
    const stkRes = await fetch(`${BASE_URL}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(stkPayload)
    });

    const stkData = await stkRes.json();
    console.log('Safaricom STK Response:', stkData);

    const isAccepted = stkData.ResponseCode === '0';
    const checkoutRequestId = stkData.CheckoutRequestID || null;
    const merchantRequestId = stkData.MerchantRequestID || null;
    const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();

    // 4. Record transaction in Supabase (with idempotency key and explicit customer id)
    const idempotencyKey = `${orderId || topupOwnerId}-${timestamp}`;
    const insertRow = {
      order_id: isTopup ? null : orderId,
      user_id: topupOwnerId,
      phone_number: formattedPhone,
      amount: roundAmount,
      merchant_request_id: merchantRequestId,
      checkout_request_id: checkoutRequestId,
      status: isAccepted ? 'INITIATED' : 'FAILED',
      result_code: isAccepted ? 0 : Number(stkData.ResponseCode) || 1,
      result_desc: stkData.ResponseDescription || stkData.CustomerMessage || 'STK Push sent',
      raw_payload: { ...stkData, topupUserId: topupOwnerId },
      idempotency_key: idempotencyKey,
      wallet_credited: false
    };

    let { error: insertError } = await supabase.from('mpesa_transactions').insert(insertRow);
    if (insertError && /user_id|wallet_credited/.test(insertError.message || '')) {
      delete insertRow.user_id;
      delete insertRow.wallet_credited;
      ({ error: insertError } = await supabase.from('mpesa_transactions').insert(insertRow));
    }

    if (insertError) {
      console.error('mpesa_transactions insert failed:', insertError.message || insertError.code);
      return res.status(502).json({
        success: false,
        pending: false,
        paymentConfirmed: false,
        error: 'STK request could not be recorded. If a prompt appeared, do not retry until support checks this CheckoutRequestID.',
        checkoutRequestId,
        merchantRequestId
      });
    }

    if (!isAccepted) {
      return res.status(400).json({
        success: false,
        pending: false,
        paymentConfirmed: false,
        error: stkData.ResponseDescription || stkData.errorMessage || 'Safaricom STK push rejected',
        checkoutRequestId,
        merchantRequestId
      });
    }

    if (!isTopup) {
      await supabase
        .from('orders')
        .update({
          payment_status: 'PENDING',
          payment_expires_at: expiresAt,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);
    }

    return res.status(200).json({
      success: true,
      pending: true,
      paymentConfirmed: false,
      status: 'INITIATED',
      checkoutRequestId,
      merchantRequestId,
      customerMessage: stkData.CustomerMessage || 'Prompt sent to your phone. Enter your M-Pesa PIN.',
      phoneNumber: formattedPhone,
      expiresAt
    });
  } catch (err) {
    console.error('Server error in STK push:', err);
    return res.status(500).json({ error: err.message || 'Internal server error processing STK push' });
  }
}
