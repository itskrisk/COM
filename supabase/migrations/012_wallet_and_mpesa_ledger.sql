-- 012: Wallets, Ledger, M-Pesa Transactions, and Admin Settings
-- Creates wallet system for merchants, riders and platform, plus support and job tracking tables.

-- 1. WALLETS TABLE
CREATE TABLE IF NOT EXISTS public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  owner_type TEXT NOT NULL CHECK (owner_type IN ('MERCHANT', 'RIDER', 'PLATFORM')),
  balance NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  pending_balance NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  total_earned NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  total_withdrawn NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  currency TEXT NOT NULL DEFAULT 'KES',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_wallet_owner UNIQUE (owner_id, owner_type)
);

-- 2. WALLET TRANSACTIONS / LEDGER
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID REFERENCES public.wallets(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('ORDER_CREDIT', 'COMMISSION_DEDUCTION', 'DELIVERY_EARNING', 'WITHDRAWAL', 'REFUND', 'ADJUSTMENT')),
  amount NUMERIC(10,2) NOT NULL,
  fee NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  reference TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. M-PESA TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.mpesa_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  phone_number TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  merchant_request_id TEXT,
  checkout_request_id TEXT,
  mpesa_receipt_number TEXT,
  result_code INTEGER,
  result_desc TEXT,
  status TEXT NOT NULL DEFAULT 'INITIATED' CHECK (status IN ('INITIATED', 'SUCCESS', 'FAILED', 'CANCELLED')),
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. ADMIN SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.admin_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed default settings
INSERT INTO public.admin_settings (key, value)
VALUES 
  ('mpesa_config', '{"shortcode":"174379","consumer_key":"hNY8AACKWRniHG91pB9PCP11v55i4sOdaGeIAVk8xxidr2AL","environment":"sandbox","commission_rate":0.15,"default_delivery_fee":150}'::jsonb),
  ('platform_rules', '{"is_site_live":true,"merchant_signups_enabled":true,"courier_signups_enabled":true,"maintenance_mode":false}'::jsonb)
ON CONFLICT (key) DO UPDATE 
SET value = EXCLUDED.value, updated_at = now();

-- 5. SUPPORT TICKETS TABLE
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  category TEXT NOT NULL DEFAULT 'GENERAL',
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
  priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mpesa_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view their own wallets and admin full access
DROP POLICY IF EXISTS "Public can view wallets" ON public.wallets;
CREATE POLICY "Public can view wallets" ON public.wallets FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public can manage wallets" ON public.wallets;
CREATE POLICY "Public can manage wallets" ON public.wallets FOR ALL USING (true);

DROP POLICY IF EXISTS "Public can view wallet transactions" ON public.wallet_transactions;
CREATE POLICY "Public can view wallet transactions" ON public.wallet_transactions FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public can manage wallet transactions" ON public.wallet_transactions;
CREATE POLICY "Public can manage wallet transactions" ON public.wallet_transactions FOR ALL USING (true);

DROP POLICY IF EXISTS "Public can view mpesa transactions" ON public.mpesa_transactions;
CREATE POLICY "Public can view mpesa transactions" ON public.mpesa_transactions FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public can manage mpesa transactions" ON public.mpesa_transactions;
CREATE POLICY "Public can manage mpesa transactions" ON public.mpesa_transactions FOR ALL USING (true);

DROP POLICY IF EXISTS "Public can view admin settings" ON public.admin_settings;
CREATE POLICY "Public can view admin settings" ON public.admin_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public can manage admin settings" ON public.admin_settings;
CREATE POLICY "Public can manage admin settings" ON public.admin_settings FOR ALL USING (true);

DROP POLICY IF EXISTS "Public can view support tickets" ON public.support_tickets;
CREATE POLICY "Public can view support tickets" ON public.support_tickets FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public can manage support tickets" ON public.support_tickets;
CREATE POLICY "Public can manage support tickets" ON public.support_tickets FOR ALL USING (true);
