import { createClient } from '@supabase/supabase-js';

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

  try {
    const { phoneNumber, amount, orderId, accountReference, transactionDesc } = req.body || {};

    if (!phoneNumber || !amount || !orderId) {
      return res.status(400).json({ error: 'Missing required parameters: phoneNumber, amount, orderId' });
    }

    const formattedPhone = formatPhone(phoneNumber);
    if (!formattedPhone || formattedPhone.length !== 12) {
      return res.status(400).json({ error: 'Invalid Kenyan phone number format. Must be 254XXXXXXXXX' });
    }

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
    const ref = (accountReference || `MUNCHEEZ-${orderId.slice(0, 6)}`).toUpperCase().replace(/[^A-Z0-9_-]/g, '');

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

    const isSuccess = stkData.ResponseCode === '0';
    const checkoutRequestId = stkData.CheckoutRequestID || null;
    const merchantRequestId = stkData.MerchantRequestID || null;

    // 4. Record transaction in Supabase
    await supabase.from('mpesa_transactions').insert({
      order_id: orderId,
      phone_number: formattedPhone,
      amount: roundAmount,
      merchant_request_id: merchantRequestId,
      checkout_request_id: checkoutRequestId,
      status: isSuccess ? 'INITIATED' : 'FAILED',
      result_code: isSuccess ? 0 : Number(stkData.ResponseCode) || 1,
      result_desc: stkData.ResponseDescription || stkData.CustomerMessage || 'STK Push sent',
      raw_payload: stkData
    });

    if (!isSuccess) {
      return res.status(400).json({
        success: false,
        error: stkData.ResponseDescription || stkData.errorMessage || 'Safaricom STK push rejected',
        raw: stkData
      });
    }

    return res.status(200).json({
      success: true,
      checkoutRequestId,
      merchantRequestId,
      customerMessage: stkData.CustomerMessage || 'Prompt sent to your phone. Enter your M-Pesa PIN.',
      phoneNumber: formattedPhone
    });
  } catch (err) {
    console.error('Server error in STK push:', err);
    return res.status(500).json({ error: err.message || 'Internal server error processing STK push' });
  }
}
