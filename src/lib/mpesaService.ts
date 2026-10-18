import { adminSupabase } from './adminSupabase';
import { supabase } from './supabaseClient';
import { walletService } from './walletService';

// Safaricom Daraja API Configuration
export const MPESA_CONFIG = {
    consumerKey: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_MPESA_CONSUMER_KEY) || 'hNY8AACKWRniHG91pB9PCP11v55i4sOdaGeIAVk8xxidr2AL',
    consumerSecret: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_MPESA_CONSUMER_SECRET) || 'PTwPUvKELJu5RW6oV9mJWzi5Gua4Oab0uHFQKXdIntd7haRWZo8Jdgc5LceptxAA',
    shortcode: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_MPESA_SHORTCODE) || '174379',
    passkey: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_MPESA_PASSKEY) || 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919',
    env: ((typeof import.meta !== 'undefined' && import.meta.env?.VITE_MPESA_ENVIRONMENT) || 'sandbox') as 'sandbox' | 'production',
    callbackUrl: 'https://muncheez.co.ke/api/mpesa/callback'
};

const getBaseUrl = () => {
    return MPESA_CONFIG.env === 'production'
        ? 'https://api.safaricom.co.ke'
        : 'https://sandbox.safaricom.co.ke';
};

/**
 * Formats any Kenyan phone number to 2547XXXXXXXX or 2541XXXXXXXX
 */
export function formatPhoneNumber(phone: string): string {
    let cleaned = phone.replace(/[^0-9]/g, '');
    if (cleaned.startsWith('0')) {
        cleaned = '254' + cleaned.substring(1);
    } else if (cleaned.startsWith('7') || cleaned.startsWith('1')) {
        cleaned = '254' + cleaned;
    } else if (cleaned.startsWith('+254')) {
        cleaned = cleaned.substring(1);
    }
    return cleaned;
}

/**
 * Formats current UTC timestamp as YYYYMMDDHHmmss
 */
function getTimestamp(): string {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return (
        now.getFullYear().toString() +
        pad(now.getMonth() + 1) +
        pad(now.getDate()) +
        pad(now.getHours()) +
        pad(now.getMinutes()) +
        pad(now.getSeconds())
    );
}

export interface STKPushParams {
    phoneNumber: string;
    amount: number;
    orderId: string;
    accountReference?: string;
    transactionDesc?: string;
    merchantId?: string;
    riderId?: string;
}

export interface STKPushResponse {
    success: boolean;
    checkoutRequestId?: string;
    merchantRequestId?: string;
    responseCode?: string;
    responseDescription?: string;
    customerMessage?: string;
    receiptNumber?: string;
    error?: string;
}

export const mpesaService = {
    /**
     * Get OAuth Token from Daraja
     */
    async getOAuthToken(): Promise<string | null> {
        try {
            const auth = btoa(`${MPESA_CONFIG.consumerKey}:${MPESA_CONFIG.consumerSecret}`);
            const res = await fetch(`${getBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`, {
                method: 'GET',
                headers: {
                    Authorization: `Basic ${auth}`
                }
            });
            const data = await res.json();
            return data.access_token || null;
        } catch (e) {
            console.warn('Direct Daraja OAuth token fetch warning (CORS limitation in browser):', e);
            return null;
        }
    },

    /**
     * Trigger Lipa Na M-Pesa Online STK Push via backend bridge
     */
    async initiateSTKPush(params: STKPushParams): Promise<STKPushResponse> {
        const formattedPhone = formatPhoneNumber(params.phoneNumber);
        const roundAmount = Math.max(1, Math.round(params.amount));
        const ref = params.accountReference || `MUNCHEEZ-${params.orderId.slice(0, 6).toUpperCase()}`;

        try {
            // Call serverless proxy (bypasses browser CORS and executes real Safaricom Daraja STK Push)
            const res = await fetch('/api/mpesa/stkpush', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phoneNumber: formattedPhone,
                    amount: roundAmount,
                    orderId: params.orderId,
                    accountReference: ref,
                    transactionDesc: params.transactionDesc || 'Muncheez Order Payment',
                    merchantId: params.merchantId
                })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                return {
                    success: true,
                    checkoutRequestId: data.checkoutRequestId,
                    merchantRequestId: data.merchantRequestId,
                    responseCode: '0',
                    responseDescription: 'Success. Request accepted for processing',
                    customerMessage: data.customerMessage || `Prompt sent to ${formattedPhone}. Please check your phone and enter your M-Pesa PIN.`
                };
            } else {
                return {
                    success: false,
                    error: data.error || 'Failed to dispatch STK push prompt.'
                };
            }
        } catch (err: any) {
            console.error('STK push network error:', err);
            return {
                success: false,
                error: err?.message || 'Network error communicating with payment service.'
            };
        }
    },

    /**
     * Query real STK Push transaction status
     */
    async queryStatus(checkoutRequestId: string, orderId?: string): Promise<{ status: string; isComplete: boolean; receiptNumber?: string; resultDesc?: string }> {
        try {
            const url = `/api/mpesa/query?checkoutRequestId=${encodeURIComponent(checkoutRequestId || '')}${orderId ? `&orderId=${encodeURIComponent(orderId)}` : ''}`;
            const res = await fetch(url);
            const data = await res.json();
            return data;
        } catch (err) {
            return { status: 'INITIATED', isComplete: false };
        }
    },

    /**
     * Confirms M-Pesa payment and automatically routes funds to merchant, courier, and platform wallets
     */
    async confirmOrderPayment(orderId: string, receiptNumber: string, amount: number, merchantId?: string, riderId?: string) {
        const client = adminSupabase || supabase;

        // 1. Update order payment status
        await client
            .from('orders')
            .update({
                payment_status: 'CONFIRMED',
                mpesa_code: receiptNumber,
                status: 'PAYMENT_CONFIRMED',
                updated_at: new Date().toISOString()
            })
            .eq('id', orderId);

        // 2. Update mpesa_transactions
        try {
            await client
                .from('mpesa_transactions')
                .update({
                    status: 'SUCCESS',
                    mpesa_receipt_number: receiptNumber,
                    result_code: 0,
                    result_desc: 'The service request is processed successfully.'
                })
                .eq('order_id', orderId);
        } catch (e) {
            console.warn('Could not update mpesa_transactions:', e);
        }

        // 3. Allocate funds into respective wallets (Merchant, Rider, Platform)
        await walletService.allocateOrderRevenue({
            orderId,
            totalAmount: amount,
            merchantId,
            riderId,
            receiptNumber
        });
    }
};
