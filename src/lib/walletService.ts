import { adminSupabase } from './adminSupabase';
import { supabase } from './supabaseClient';

export interface Wallet {
    id: string;
    owner_id: string;
    owner_type: 'MERCHANT' | 'RIDER' | 'PLATFORM' | 'CUSTOMER';    balance: number;
    pending_balance: number;
    total_earned: number;
    total_withdrawn: number;
    currency: string;
    updated_at: string;
}

export interface WalletTransaction {
    id: string;
    wallet_id: string;
    order_id?: string;
    type: 'ORDER_CREDIT' | 'COMMISSION_DEDUCTION' | 'DELIVERY_EARNING' | 'WITHDRAWAL' | 'REFUND' | 'ADJUSTMENT';
    amount: number;
    fee: number;
    reference?: string;
    description?: string;
    status: 'PENDING' | 'COMPLETED' | 'FAILED';
    created_at: string;
}

const PLATFORM_WALLET_ID = '00000000-0000-0000-0000-000000000001';

export const walletService = {
    /**
     * Get or create wallet for an entity
     */
    async getOrCreateWallet(ownerId: string, ownerType: 'MERCHANT' | 'RIDER' | 'PLATFORM' | 'CUSTOMER'): Promise<Wallet | null> {
        const client = adminSupabase || supabase;
        try {
            // Find existing
            const { data } = await client
                .from('wallets')
                .select('*')
                .eq('owner_id', ownerId)
                .eq('owner_type', ownerType)
                .maybeSingle();

            if (data) return data;

            // Create new wallet
            const { data: created, error } = await client
                .from('wallets')
                .insert({
                    owner_id: ownerId,
                    owner_type: ownerType,
                    balance: 0.0,
                    pending_balance: 0.0,
                    total_earned: 0.0,
                    total_withdrawn: 0.0,
                    currency: 'KES'
                })
                .select()
                .single();

            if (error) {
                console.warn('Wallet create fallback (reading local):', error.message);
                return {
                    id: `wallet_${ownerId.slice(0, 8)}`,
                    owner_id: ownerId,
                    owner_type: ownerType,
                    balance: 0.0,
                    pending_balance: 0.0,
                    total_earned: 0.0,
                    total_withdrawn: 0.0,
                    currency: 'KES',
                    updated_at: new Date().toISOString()
                };
            }

            return created;
        } catch (e) {
            console.error('Wallet fetch error:', e);
            return null;
        }
    },

    /**
     * Split order revenue and credit wallets
     */
    async allocateOrderRevenue(params: {
        orderId: string;
        totalAmount: number;
        merchantId?: string;
        riderId?: string;
        receiptNumber: string;
    }) {
        const client = adminSupabase || supabase;
        const deliveryFee = 150;
        const total = Number(params.totalAmount) || 0;
        const productSubtotal = Math.max(0, total - deliveryFee);
        const commissionRate = 0.15; // 15% Muncheez take
        const platformCommission = Math.round(productSubtotal * commissionRate);
        const merchantNet = productSubtotal - platformCommission;

        const effectiveMerchantId = params.merchantId || '11949575-b1f4-43e1-a256-8561eaf234b4';
        const effectiveRiderId = params.riderId || '00000000-0000-0000-0000-000000000002';

        try {
            // 1. Credit Merchant Wallet
            const merchantWallet = await this.getOrCreateWallet(effectiveMerchantId, 'MERCHANT');
            if (merchantWallet) {
                const newBalance = Number(merchantWallet.balance || 0) + merchantNet;
                const newTotalEarned = Number(merchantWallet.total_earned || 0) + merchantNet;

                await client
                    .from('wallets')
                    .update({
                        balance: newBalance,
                        total_earned: newTotalEarned,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', merchantWallet.id);

                await client.from('wallet_transactions').insert({
                    wallet_id: merchantWallet.id,
                    order_id: params.orderId,
                    type: 'ORDER_CREDIT',
                    amount: merchantNet,
                    fee: platformCommission,
                    reference: params.receiptNumber,
                    description: `Order #${params.orderId.slice(0, 8).toUpperCase()} Settlement (Gross KES ${productSubtotal.toLocaleString()} - 15% fee KES ${platformCommission.toLocaleString()})`,
                    status: 'COMPLETED'
                });
            }

            // 2. Credit Rider Wallet (Delivery Fee)
            const riderWallet = await this.getOrCreateWallet(effectiveRiderId, 'RIDER');
            if (riderWallet) {
                const newBalance = Number(riderWallet.balance || 0) + deliveryFee;
                const newTotalEarned = Number(riderWallet.total_earned || 0) + deliveryFee;

                await client
                    .from('wallets')
                    .update({
                        balance: newBalance,
                        total_earned: newTotalEarned,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', riderWallet.id);

                await client.from('wallet_transactions').insert({
                    wallet_id: riderWallet.id,
                    order_id: params.orderId,
                    type: 'DELIVERY_EARNING',
                    amount: deliveryFee,
                    fee: 0,
                    reference: params.receiptNumber,
                    description: `Delivery payout for order #${params.orderId.slice(0, 8).toUpperCase()}`,
                    status: 'COMPLETED'
                });
            }

            // 3. Credit Platform Wallet (Muncheez commission)
            const platformWallet = await this.getOrCreateWallet(PLATFORM_WALLET_ID, 'PLATFORM');
            if (platformWallet) {
                const newBalance = Number(platformWallet.balance || 0) + platformCommission;
                const newTotalEarned = Number(platformWallet.total_earned || 0) + platformCommission;

                await client
                    .from('wallets')
                    .update({
                        balance: newBalance,
                        total_earned: newTotalEarned,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', platformWallet.id);

                await client.from('wallet_transactions').insert({
                    wallet_id: platformWallet.id,
                    order_id: params.orderId,
                    type: 'COMMISSION_DEDUCTION',
                    amount: platformCommission,
                    fee: 0,
                    reference: params.receiptNumber,
                    description: `15% commission on order #${params.orderId.slice(0, 8).toUpperCase()}`,
                    status: 'COMPLETED'
                });
            }

            // Save state event
            window.dispatchEvent(new CustomEvent('muncheez_wallet_updated'));
        } catch (e) {
            console.error('Error allocating order funds:', e);
        }
    },

    /**
     * Credit a customer wallet (top-up)
     */
    async creditWallet(ownerId: string, amount: number, reference: string, description?: string): Promise<boolean> {
        const client = adminSupabase || supabase;
        try {
            const wallet = await this.getOrCreateWallet(ownerId, 'CUSTOMER');
            if (!wallet) return false;
            const newBalance = Number(wallet.balance || 0) + amount;
            const newEarned = Number(wallet.total_earned || 0) + amount;
            await client.from('wallets').update({ balance: newBalance, total_earned: newEarned, updated_at: new Date().toISOString() }).eq('id', wallet.id);
            await client.from('wallet_transactions').insert({
                wallet_id: wallet.id,
                type: 'ADJUSTMENT',
                amount,
                fee: 0,
                reference,
                description: description || 'Wallet top-up',
                status: 'COMPLETED'
            });
            window.dispatchEvent(new CustomEvent('muncheez_wallet_updated'));
            return true;
        } catch (e) {
            console.error('creditWallet failed:', e);
            return false;
        }
    },
    /**
     * Debit a customer wallet (checkout)
     */
    async debitWallet(ownerId: string, amount: number, orderId: string, reference: string): Promise<boolean> {
        const client = adminSupabase || supabase;
        try {
            const wallet = await this.getOrCreateWallet(ownerId, 'CUSTOMER');
            if (!wallet || Number(wallet.balance || 0) < amount) return false;
            const newBalance = Number(wallet.balance || 0) - amount;
            const newWithdrawn = Number(wallet.total_withdrawn || 0) + amount;
            await client.from('wallets').update({ balance: newBalance, total_withdrawn: newWithdrawn, updated_at: new Date().toISOString() }).eq('id', wallet.id);
            await client.from('wallet_transactions').insert({
                wallet_id: wallet.id,
                order_id: orderId,
                type: 'ADJUSTMENT',
                amount: -amount,
                fee: 0,
                reference,
                description: `Wallet payment for order #${orderId.slice(0, 8).toUpperCase()}`,
                status: 'COMPLETED'
            });
            window.dispatchEvent(new CustomEvent('muncheez_wallet_updated'));
            return true;
        } catch (e) {
            console.error('debitWallet failed:', e);
            return false;
        }
    },
    /**
     * Get all wallets for Admin console
     */
    async getAllWallets(): Promise<Wallet[]> {
        const client = adminSupabase || supabase;
        try {
            const { data } = await client
                .from('wallets')
                .select('*')
                .order('balance', { ascending: false });
            return data || [];
        } catch {
            return [];
        }
    },

    /**
     * Get all transactions for Admin ledger
     */
    async getAllTransactions(): Promise<WalletTransaction[]> {
        const client = adminSupabase || supabase;
        try {
            const { data } = await client
                .from('wallet_transactions')
                .select('*')
                .order('created_at', { ascending: false });
            return data || [];
        } catch {
            return [];
        }
    },

    /**
     * Request a withdrawal / payout to M-Pesa
     */
    async requestWithdrawal(walletId: string, amount: number, mpesaPhone: string): Promise<boolean> {
        const client = adminSupabase || supabase;
        try {
            const { data: wallet } = await client
                .from('wallets')
                .select('balance, total_withdrawn')
                .eq('id', walletId)
                .single();

            if (!wallet || wallet.balance < amount) {
                return false;
            }

            const newBalance = wallet.balance - amount;
            const newWithdrawn = (wallet.total_withdrawn || 0) + amount;

            await client
                .from('wallets')
                .update({
                    balance: newBalance,
                    total_withdrawn: newWithdrawn,
                    updated_at: new Date().toISOString()
                })
                .eq('id', walletId);

            await client.from('wallet_transactions').insert({
                wallet_id: walletId,
                type: 'WITHDRAWAL',
                amount: amount,
                fee: 0,
                reference: `WD-${Date.now().toString().slice(-6)}`,
                description: `M-Pesa B2C Payout to ${mpesaPhone}`,
                status: 'COMPLETED'
            });

            return true;
        } catch (err) {
            console.error('Withdrawal failed:', err);
            return false;
        }
    }
};
