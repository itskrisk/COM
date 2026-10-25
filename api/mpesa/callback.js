import { createClient } from '@supabase/supabase-js';
import { isDarajaSuccess, normalizeResultCode, processStkResult } from './_processStkResult.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://xvnvyrddhgmxqynypboa.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2bnZ5cmRkaGdteHF5bnlwYm9hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjA3MTYyMywiZXhwIjoyMTA3NjQ3NjIzfQ.EnsCmbkRf6AMw2_62AWzqgk2hXSu1zEOTX3GguuZjQI';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function metadataValue(items, name) {
  if (!Array.isArray(items)) return null;
  const item = items.find((entry) => entry && entry.Name === name);
  return item && item.Value !== undefined && item.Value !== null ? item.Value : null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ResultCode: 1, ResultDesc: 'Method not allowed' });
  }

  try {
    const body = req.body || {};
    const stkCallback = body?.Body?.stkCallback;

    if (!stkCallback || typeof stkCallback !== 'object') {
      return res.status(400).json({ ResultCode: 1, ResultDesc: 'Missing stkCallback payload' });
    }

    const merchantRequestId = stkCallback.MerchantRequestID || null;
    const checkoutRequestId = stkCallback.CheckoutRequestID || null;
    const resultCode = normalizeResultCode(stkCallback.ResultCode);
    const resultDesc = stkCallback.ResultDesc || null;
    const items = stkCallback.CallbackMetadata?.Item;
    const receiptNumber = metadataValue(items, 'MpesaReceiptNumber');
    const amountRaw = metadataValue(items, 'Amount');
    const phoneNumber = metadataValue(items, 'PhoneNumber');
    const amount = amountRaw != null ? Number(amountRaw) : null;

    console.log('M-Pesa callback', {
      checkoutRequestId,
      merchantRequestId,
      resultCode,
      hasReceipt: Boolean(receiptNumber)
    });

    if (!checkoutRequestId) {
      return res.status(400).json({ ResultCode: 1, ResultDesc: 'Missing CheckoutRequestID' });
    }

    const { data, error } = await processStkResult(supabase, {
      checkoutRequestId,
      merchantRequestId,
      resultCode,
      resultDesc,
      receiptNumber: receiptNumber != null ? String(receiptNumber) : null,
      amount: Number.isFinite(amount) ? amount : null,
      phoneNumber: phoneNumber != null ? String(phoneNumber) : null,
      rawPayload: body
    });

    if (error) {
      console.error('M-Pesa callback processing failed:', error.message || error.code);
      return res.status(500).json({ ResultCode: 1, ResultDesc: 'Processing failed' });
    }

    if (!data?.ok && data?.reason === 'NOT_FOUND') {
      console.error('M-Pesa callback before matching transaction record', { checkoutRequestId });
      return res.status(503).json({ ResultCode: 1, ResultDesc: 'Transaction record not ready' });
    }

    if (!data?.ok && data?.reason === 'MISSING_CHECKOUT_ID') {
      return res.status(400).json({ ResultCode: 1, ResultDesc: 'Missing CheckoutRequestID' });
    }

    if (!data?.ok) {
      console.error('M-Pesa callback rejected:', data?.reason || 'unknown');
      return res.status(500).json({ ResultCode: 1, ResultDesc: 'Processing rejected' });
    }

    if (isDarajaSuccess(resultCode) && !data.credited && data.reason === 'NO_CUSTOMER_ASSOCIATION') {
      console.error('Confirmed M-Pesa payment has no stored customer id; wallet not credited', {
        checkoutRequestId
      });
      return res.status(500).json({ ResultCode: 1, ResultDesc: 'Customer association missing' });
    }

    return res.status(200).json({
      ResultCode: 0,
      ResultDesc: data.duplicate ? 'Already processed' : 'Callback processed'
    });
  } catch (err) {
    console.error('M-Pesa callback handler error:', err.message || err);
    return res.status(500).json({ ResultCode: 1, ResultDesc: 'Internal callback error' });
  }
}
