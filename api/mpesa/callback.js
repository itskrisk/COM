import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://xvnvyrddhgmxqynypboa.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2bnZ5cmRkaGdteHF5bnlwYm9hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjA3MTYyMywiZXhwIjoyMTA3NjQ3NjIzfQ.EnsCmbkRf6AMw2_62AWzqgk2hXSu1zEOTX3GguuZjQI';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body || {};
    const stkCallback = body?.Body?.stkCallback;

    console.log('M-Pesa Webhook Callback received:', JSON.stringify(stkCallback, null, 2));

    if (!stkCallback) {
      return res.status(400).json({ ResultCode: 1, ResultDesc: 'Missing stkCallback payload' });
    }

    const merchantRequestId = stkCallback.MerchantRequestID;
    const checkoutRequestId = stkCallback.CheckoutRequestID;
    const resultCode = stkCallback.ResultCode;
    const resultDesc = stkCallback.ResultDesc;

    let receiptNumber = null;
    let amount = null;
    let phoneNumber = null;

    if (stkCallback.CallbackMetadata?.Item) {
      for (const item of stkCallback.CallbackMetadata.Item) {
        if (item.Name === 'MpesaReceiptNumber') receiptNumber = String(item.Value);
        if (item.Name === 'Amount') amount = Number(item.Value);
        if (item.Name === 'PhoneNumber') phoneNumber = String(item.Value);
      }
    }

    const isSuccess = resultCode === 0;
    const status = isSuccess ? 'SUCCESS' : 'FAILED';

    // 1. Update mpesa_transactions record
    const { data: txData, error: txError } = await supabase
      .from('mpesa_transactions')
      .update({
        status,
        result_code: resultCode,
        result_desc: resultDesc,
        mpesa_receipt_number: receiptNumber,
        raw_payload: body,
        updated_at: new Date().toISOString()
      })
      .eq('checkout_request_id', checkoutRequestId)
      .select('order_id, phone_number, amount, raw_payload')
      .single();

    if (txError) {
      console.error('Error updating mpesa_transactions:', txError);
    }

    const orderId = txData?.order_id;
    const topupUserId = txData?.raw_payload?.topupUserId;

    if (!orderId && !topupUserId) {
      console.warn('No order_id/topup found for checkoutRequestId:', checkoutRequestId);
      return res.status(200).json({ ResultCode: 0, ResultDesc: 'Callback acknowledged - no linked order' });
    }

    if (isSuccess && topupUserId) {
      const customerId = topupUserId;
      const { data: existingTx } = await supabase.from('wallet_transactions').select('id').eq('reference', receiptNumber).maybeSingle();
      if (existingTx) {
        return res.status(200).json({ ResultCode: 0, ResultDesc: 'Already processed' });
      }
      const { data: w } = await supabase.from('wallets').select('id,balance,total_earned').eq('owner_id', customerId).eq('owner_type', 'CUSTOMER').maybeSingle();
      if (w) {
        await supabase.from('wallets').update({ balance: Number(w.balance) + amount, total_earned: Number(w.total_earned) + amount, updated_at: new Date().toISOString() }).eq('id', w.id);
      } else {
        await supabase.from('wallets').insert({ owner_id: customerId, owner_type: 'CUSTOMER', balance: amount, total_earned: amount, total_withdrawn: 0, pending_balance: 0, currency: 'KES' });
      }
      const { data: w2 } = await supabase.from('wallets').select('id').eq('owner_id', customerId).eq('owner_type', 'CUSTOMER').maybeSingle();
      await supabase.from('wallet_transactions').insert({ wallet_id: w2?.id || w?.id, type: 'ADJUSTMENT', amount, fee: 0, reference: receiptNumber, description: 'Wallet top-up via M-Pesa', status: 'COMPLETED' });
      return res.status(200).json({ ResultCode: 0, ResultDesc: 'Top-up processed' });
    }


