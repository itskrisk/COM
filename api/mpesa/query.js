import { createClient } from '@supabase/supabase-js';

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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const checkoutRequestId = req.query.checkoutRequestId || req.body?.checkoutRequestId;
    const orderId = req.query.orderId || req.body?.orderId;

    if (!checkoutRequestId && !orderId) {
      return res.status(400).json({ error: 'checkoutRequestId or orderId required' });
    }

    // 1. Check database first
    let query = supabase.from('mpesa_transactions').select('*');
    if (checkoutRequestId) query = query.eq('checkout_request_id', checkoutRequestId);
    else if (orderId) query = query.eq('order_id', orderId);

    const { data: tx } = await query.order('created_at', { ascending: false }).limit(1).maybeSingle();

    if (tx && (tx.status === 'SUCCESS' || tx.status === 'FAILED')) {
      return res.status(200).json({
        status: tx.status,
        resultCode: tx.result_code,
        resultDesc: tx.result_desc,
        receiptNumber: tx.mpesa_receipt_number,
        isComplete: true
      });
    }

    // 2. Query Safaricom if still INITIATED and checkoutRequestId is available
    if (checkoutRequestId) {
      const authHeader = Buffer.from(`${MPESA_CONFIG.consumerKey}:${MPESA_CONFIG.consumerSecret}`).toString('base64');
      const tokenRes = await fetch(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
        headers: { Authorization: `Basic ${authHeader}` }
      });
      const tokenData = await tokenRes.json();
      const accessToken = tokenData.access_token;

      if (accessToken) {
        const timestamp = getTimestamp();
        const password = Buffer.from(`${MPESA_CONFIG.shortcode}${MPESA_CONFIG.passkey}${timestamp}`).toString('base64');

        const queryPayload = {
          BusinessShortCode: MPESA_CONFIG.shortcode,
          Password: password,
          Timestamp: timestamp,
          CheckoutRequestID: checkoutRequestId
        };

        const sfRes = await fetch(`${BASE_URL}/mpesa/stkpushquery/v1/query`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(queryPayload)
        });

        const sfData = await sfRes.json();
        console.log('Safaricom query response:', sfData);

        if (sfData.ResultCode === '0') {
          // Success
          await supabase
            .from('mpesa_transactions')
            .update({ status: 'SUCCESS', result_code: 0, result_desc: sfData.ResultDesc })
            .eq('checkout_request_id', checkoutRequestId);

          return res.status(200).json({
            status: 'SUCCESS',
            resultCode: 0,
            resultDesc: sfData.ResultDesc,
            isComplete: true
          });
        } else if (sfData.ResultCode && sfData.ResultCode !== '0') {
          // Explicit failure/cancel from Safaricom
          await supabase
            .from('mpesa_transactions')
            .update({ status: 'FAILED', result_code: Number(sfData.ResultCode), result_desc: sfData.ResultDesc })
            .eq('checkout_request_id', checkoutRequestId);

          return res.status(200).json({
            status: 'FAILED',
            resultCode: Number(sfData.ResultCode),
            resultDesc: sfData.ResultDesc,
            isComplete: true
          });
        }
      }
    }

    return res.status(200).json({
      status: tx?.status || 'INITIATED',
      isComplete: false,
      message: 'Awaiting PIN input on phone'
    });
  } catch (err) {
    console.error('Error in query function:', err);
    return res.status(500).json({ error: err.message });
  }
}
