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

    if (!orderId) {
      console.warn('No order_id found for checkoutRequestId:', checkoutRequestId);
      return res.status(200).json({ ResultCode: 0, ResultDesc: 'Callback acknowledged - no linked order' });
    }

    if (isSuccess && orderId && String(orderId).startsWith('TOPUP-')) {
      const phone = txData?.phone_number;
      // Resolve customer profile by phone
      const { data: prof } = await supabase.from('profiles').select('id').eq('phone', phone).maybeSingle();
      const customerId = prof?.id;
      if (customerId) {
        const { data: w } = await supabase.from('wallets').select('id,balance,total_earned').eq('owner_id', customerId).eq('owner_type', 'CUSTOMER').maybeSingle();
        if (w) {
          await supabase.from('wallets').update({ balance: Number(w.balance) + amount, total_earned: Number(w.total_earned) + amount, updated_at: new Date().toISOString() }).eq('id', w.id);
        } else {
          await supabase.from('wallets').insert({ owner_id: customerId, owner_type: 'CUSTOMER', balance: amount, total_earned: amount, total_withdrawn: 0, pending_balance: 0, currency: 'KES' });
        }
        await supabase.from('wallet_transactions').insert({ wallet_id: w?.id || null, type: 'ADJUSTMENT', amount, fee: 0, reference: receiptNumber, description: 'Wallet top-up via M-Pesa', status: 'COMPLETED' });
      }
      return res.status(200).json({ ResultCode: 0, ResultDesc: 'Top-up processed' });
    }

      // --- IDEMPOTENCY: only credit wallets once per order ---
      // Check if this order was already marked PAID to prevent double-credit
      const { data: existingOrder } = await supabase
        .from('orders')
        .select('payment_status, merchant_id, total, delivery_fee')
        .eq('id', orderId)
        .single();

      if (existingOrder?.payment_status === 'PAID') {
        console.warn('Duplicate M-Pesa callback for already-paid order:', orderId);
        return res.status(200).json({ ResultCode: 0, ResultDesc: 'Already processed' });
      }

      // 2. Advance order: payment_status -> PAID, fulfilment status -> PAYMENT_CONFIRMED
      //    PAYMENT_CONFIRMED is the correct order_status enum value (not 'CONFIRMED')
      await supabase
        .from('orders')
        .update({
          status: 'PAYMENT_CONFIRMED',
          payment_status: 'PAID',
          mpesa_code: receiptNumber,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      const order = existingOrder;

      if (order && order.merchant_id) {
        const orderTotal = Number(order.total) || amount || 0;
        const deliveryFee = Number(order.delivery_fee) || 150;
        const productSubtotal = Math.max(0, orderTotal - deliveryFee);
        const commissionRate = 0.15;
        const commission = Math.round(productSubtotal * commissionRate * 100) / 100;
        const merchantEarnings = Math.max(0, productSubtotal - commission);

        // 3. Fetch or create merchant wallet
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

        // 4. Record wallet ledger transaction (guarded by unique index if one exists)
        if (wallet) {
          await supabase.from('wallet_transactions').insert({
            wallet_id: wallet.id,
            order_id: orderId,
            type: 'ORDER_CREDIT',
            amount: merchantEarnings,
            fee: commission,
            reference: receiptNumber || `MPESA-${orderId.slice(0, 6)}`,
            description: `Order #${orderId.slice(0, 8)} payment via M-Pesa ${receiptNumber || ''}`,
            status: 'COMPLETED'
          });
        }

        // 5. Credit platform commission wallet
        const platformId = '00000000-0000-0000-0000-000000000001';
        let { data: platformWallet } = await supabase
          .from('wallets')
          .select('id, balance, total_earned')
          .eq('owner_id', platformId)
          .eq('owner_type', 'PLATFORM')
          .single();

        if (!platformWallet) {
          const { data: newPlatformWallet } = await supabase
            .from('wallets')
            .insert({ owner_id: platformId, owner_type: 'PLATFORM', balance: commission, total_earned: commission })
            .select()
            .single();
          platformWallet = newPlatformWallet;
        } else {
          await supabase
            .from('wallets')
            .update({
              balance: Number(platformWallet.balance) + commission,
              total_earned: Number(platformWallet.total_earned) + commission,
              updated_at: new Date().toISOString()
            })
            .eq('id', platformWallet.id);
        }

        if (platformWallet) {
          await supabase.from('wallet_transactions').insert({
            wallet_id: platformWallet.id,
            order_id: orderId,
            type: 'COMMISSION_DEDUCTION',
            amount: commission,
            fee: 0,
            reference: receiptNumber || `MPESA-${orderId.slice(0, 6)}`,
            description: `15% commission on order #${orderId.slice(0, 8)}`,
            status: 'COMPLETED'
          });
        }
      }
    } else {
      // Payment failed: mark payment_status as FAILED (not EXPIRED - that is for timeouts)
      await supabase
        .from('orders')
        .update({
          payment_status: 'FAILED',
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .neq('payment_status', 'PAID'); // Never downgrade a paid order
    }

    return res.status(200).json({ ResultCode: 0, ResultDesc: 'Callback processed successfully' });
  } catch (err) {
    console.error('Error handling Safaricom callback:', err);
    return res.status(500).json({ ResultCode: 1, ResultDesc: err.message || 'Callback error' });
  }
}
