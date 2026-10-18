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
      .select('order_id, phone_number, amount')
      .single();

    if (txError) {
      console.error('Error updating mpesa_transactions:', txError);
    }

    const orderId = txData?.order_id;

    // 2. If payment succeeded, confirm the order and credit merchant wallet
    if (isSuccess && orderId) {
      // Mark order as CONFIRMED and payment as PAID
      await supabase
        .from('orders')
        .update({
          status: 'CONFIRMED',
          payment_status: 'PAID',
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      // Fetch order details for merchant wallet split
      const { data: order } = await supabase
        .from('orders')
        .select('merchant_id, total, delivery_fee')
        .eq('id', orderId)
        .single();

      if (order && order.merchant_id) {
        const orderTotal = Number(order.total) || amount || 0;
        const commissionRate = 0.15; // 15% platform commission
        const commission = Math.round(orderTotal * commissionRate * 100) / 100;
        const merchantEarnings = Math.max(0, orderTotal - commission);

        // Fetch or create merchant wallet
        let { data: wallet } = await supabase
          .from('wallets')
          .select('id, balance, total_earned')
          .eq('owner_id', order.merchant_id)
          .eq('owner_type', 'MERCHANT')
          .single();

        if (!wallet) {
          const { data: newWallet } = await supabase
            .from('wallets')
            .insert({
              owner_id: order.merchant_id,
              owner_type: 'MERCHANT',
              balance: merchantEarnings,
              total_earned: merchantEarnings
            })
            .select()
            .single();
          wallet = newWallet;
        } else {
          await supabase
            .from('wallets')
            .update({
              balance: Number(wallet.balance) + merchantEarnings,
              total_earned: Number(wallet.total_earned) + merchantEarnings,
              updated_at: new Date().toISOString()
            })
            .eq('id', wallet.id);
        }

        // Record wallet ledger transaction
        if (wallet) {
          await supabase.from('wallet_transactions').insert({
            wallet_id: wallet.id,
            order_id: orderId,
            type: 'ORDER_CREDIT',
            amount: merchantEarnings,
            fee: commission,
            reference: receiptNumber || `MPESA-${orderId.slice(0, 6)}`,
            description: `Order #${orderId.slice(0, 8)} payment credited via M-Pesa (${receiptNumber || 'Lipa'})`,
            status: 'COMPLETED'
          });
        }
      }
    }

    return res.status(200).json({ ResultCode: 0, ResultDesc: 'Callback processed successfully' });
  } catch (err) {
    console.error('Error handling Safaricom callback:', err);
    return res.status(500).json({ ResultCode: 1, ResultDesc: err.message || 'Callback error' });
  }
}
