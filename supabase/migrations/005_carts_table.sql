-- Migration: 005_carts_table
-- Purpose: The new Supabase project was missing the `carts` table, which cartService
-- depends on for customer checkout. This adds it with RLS.

CREATE TABLE IF NOT EXISTS public.carts (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    session_id  TEXT,
    items       JSONB NOT NULL DEFAULT '[]'::jsonb,
    merchant_id UUID REFERENCES public.merchants(id) ON DELETE SET NULL,
    is_active   BOOLEAN DEFAULT true,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_carts_user_id ON public.carts(user_id);
CREATE INDEX IF NOT EXISTS idx_carts_session_id ON public.carts(session_id);

ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own cart" ON public.carts;
CREATE POLICY "Users manage own cart" ON public.carts FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins manage all carts" ON public.carts;
CREATE POLICY "Admins manage all carts" ON public.carts FOR ALL USING (public.is_admin());