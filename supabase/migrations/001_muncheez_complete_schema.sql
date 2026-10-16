-- ============================================================
-- MUNCHEEZ — COMPLETE SUPABASE SCHEMA
-- Migration: 001_muncheez_complete_schema.sql
-- 
-- Covers every frontend feature across:
--   Customer Storefront, Checkout, Order Tracking
--   Merchant Dashboard (8 workspaces)
--   Courier Dashboard  (5 workspaces)
--   Admin Command Center (13 pages)
--   Auth / Onboarding flows for all 4 roles
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 0.  EXTENSIONS
-- ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";        -- fuzzy / full-text search

-- ─────────────────────────────────────────────────────────────
-- 1.  ENUMS
-- ─────────────────────────────────────────────────────────────

-- Account / onboarding lifecycle (profiles + merchants + riders)
CREATE TYPE entity_status AS ENUM (
  'PENDING',          -- just signed up / submitted onboarding
  'UNDER_REVIEW',     -- admin has opened the application
  'APPROVED',         -- granted full access
  'REJECTED',         -- denied, rejection_reason stored
  'SUSPENDED',        -- temporarily disabled
  'ACTIVE',           -- generic active (profiles)
  'INACTIVE'          -- deactivated by admin
);

-- Roles (stored as text[] on profiles for multi-role support)
CREATE TYPE app_role AS ENUM ('customer', 'merchant', 'courier', 'admin');

-- Vehicle types — courier onboarding + admin Riders page
CREATE TYPE vehicle_type AS ENUM ('Motorbike', 'Bicycle', 'Foot', 'Car');

-- Full order lifecycle — every status shown in OrderStatus.tsx + dashboards
CREATE TYPE order_status AS ENUM (
  'CREATED',
  'PAYMENT_PENDING',
  'PAYMENT_CONFIRMED',
  'AWAITING_MERCHANT_ACTION',
  'ACCEPTED',
  'PACKING',
  'READY_FOR_PICKUP',
  'RIDER_ASSIGNED',
  'PICKED_UP',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'COMPLETED',
  'DECLINED',
  'CANCELLED',
  'FAILED'
);

-- Payment (checkout page)
CREATE TYPE payment_method  AS ENUM ('MPESA', 'CASH', 'CARD');
CREATE TYPE payment_status  AS ENUM ('PENDING','PROCESSING','CONFIRMED','FAILED','REFUNDED');

-- Wallet / financial transactions (courier wallet + merchant finance tab)
CREATE TYPE transaction_type AS ENUM (
  'DELIVERY_PAYOUT',
  'MPESA_WITHDRAWAL',
  'SURGE_BONUS',
  'PENALTY',
  'REFUND',
  'SETTLEMENT',
  'MERCHANT_PAYOUT',
  'PLATFORM_FEE',
  'ADJUSTMENT'
);

-- Dispatch offers (courier Radar tab)
CREATE TYPE dispatch_status AS ENUM ('PENDING','ACCEPTED','REJECTED','EXPIRED','CANCELLED');

-- Complaints (admin Support + merchant CRM)
CREATE TYPE complaint_category AS ENUM ('QUALITY','DELIVERY','BEHAVIOR','FRAUD','OTHER');
CREATE TYPE complaint_priority  AS ENUM ('LOW','MEDIUM','HIGH','URGENT');
CREATE TYPE complaint_status    AS ENUM ('OPEN','INVESTIGATING','RESOLVED','CLOSED');

-- Merchant warnings (admin Merchants page)
CREATE TYPE warning_severity AS ENUM ('LOW','MEDIUM','HIGH','CRITICAL');

-- Courier tier (courier Performance tab)
CREATE TYPE courier_tier AS ENUM ('Bronze','Silver','Gold','Platinum');

-- ─────────────────────────────────────────────────────────────
-- 2.  SHARED updated_at TRIGGER FUNCTION
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 3.  PROFILES  (auto-created by trigger on auth.users INSERT)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name       TEXT    NOT NULL DEFAULT '',
  phone           TEXT,
  email           TEXT,                        -- mirrors auth.users.email
  avatar_url      TEXT,
  -- Multi-role support  (customer + merchant is legal)
  roles           TEXT[]  NOT NULL DEFAULT ARRAY['customer'],
  status          entity_status NOT NULL DEFAULT 'ACTIVE',
  -- Customer loyalty (StoreListing loyalty badge)
  loyalty_tier    TEXT    NOT NULL DEFAULT 'bronze',
  loyalty_points  INTEGER NOT NULL DEFAULT 0,
  -- Saved addresses (checkout prefill)
  addresses       JSONB   NOT NULL DEFAULT '[]',
  -- Verification flags
  email_verified  BOOLEAN NOT NULL DEFAULT false,
  phone_verified  BOOLEAN NOT NULL DEFAULT false,
  -- Role-specific metadata carried from signup (merchant_type, vehicle_type)
  merchant_type    TEXT,
  vehicle_type     TEXT,
  -- Timestamps
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- ── Trigger: auto-create profile on signup ──────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (
    id, full_name, email, phone, roles, email_verified,
    merchant_type, vehicle_type, loyalty_tier
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name',
             SPLIT_PART(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    ARRAY[COALESCE(NEW.raw_user_meta_data->>'role', 'customer')],
    COALESCE(NEW.email_confirmed_at IS NOT NULL, false),
    NEW.raw_user_meta_data->>'merchant_type',
    NEW.raw_user_meta_data->>'vehicle_type',
    'bronze'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name      = EXCLUDED.full_name,
    phone          = COALESCE(EXCLUDED.phone, public.profiles.phone),
    roles          = EXCLUDED.roles,
    email_verified = EXCLUDED.email_verified,
    merchant_type  = COALESCE(EXCLUDED.merchant_type, public.profiles.merchant_type),
    vehicle_type   = COALESCE(EXCLUDED.vehicle_type, public.profiles.vehicle_type);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ── Trigger: sync email_verified when user confirms email ───
CREATE OR REPLACE FUNCTION public.handle_user_email_confirmed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    UPDATE public.profiles SET email_verified = true WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_email_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_user_email_confirmed();

-- ─────────────────────────────────────────────────────────────
-- 4.  MERCHANTS  (Supermarket Partners)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.merchants (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Identity  (onboarding Step 1)
  business_name       TEXT    NOT NULL,
  type                TEXT    NOT NULL DEFAULT 'Supermarket',
  -- Location  (onboarding Step 1)
  branch_zone         TEXT,                   -- Westlands / Kilimani / CBD …
  address             TEXT,
  lat                 DOUBLE PRECISION,
  lng                 DOUBLE PRECISION,
  -- Contact
  phone               TEXT,
  email               TEXT,
  -- Compliance  (onboarding Step 2)
  kra_pin             TEXT,
  health_permit       TEXT,                   -- County business permit number
  mpesa_till          TEXT,                   -- M-Pesa Till / Paybill
  -- Documents   (Supabase Storage paths — onboarding Step 2 upload)
  documents           JSONB   NOT NULL DEFAULT '{}',
  -- Operational settings  (merchant dashboard → Settings tab)
  is_active           BOOLEAN NOT NULL DEFAULT false,
  operating_hours     JSONB   NOT NULL DEFAULT '{"hours":"08:00 AM – 10:00 PM"}',
  pack_time_min       INTEGER NOT NULL DEFAULT 20,
  delivery_radius_km  INTEGER NOT NULL DEFAULT 7,
  delivery_fee        INTEGER NOT NULL DEFAULT 150,
  low_stock_threshold INTEGER NOT NULL DEFAULT 10,
  bulk_purchase_limit INTEGER NOT NULL DEFAULT 10,
  -- Branding  (merchant dashboard → Settings)
  logo_url            TEXT,
  cover_url           TEXT,
  description         TEXT,
  branding            JSONB   NOT NULL DEFAULT '{}',
  -- Platform financial config  (merchant Finance tab + admin Financials)
  commission_rate     NUMERIC(5,2) NOT NULL DEFAULT 10.00,
  vat_rate            NUMERIC(5,2) NOT NULL DEFAULT 16.00,
  -- Admin fields
  status              entity_status NOT NULL DEFAULT 'PENDING',
  rejection_reason    TEXT,
  is_featured         BOOLEAN NOT NULL DEFAULT false,
  rating              NUMERIC(3,2) NOT NULL DEFAULT 0,
  total_orders        INTEGER NOT NULL DEFAULT 0,
  -- Timestamps
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at         TIMESTAMPTZ,
  suspended_at        TIMESTAMPTZ
);

CREATE TRIGGER merchants_updated_at
  BEFORE UPDATE ON public.merchants
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE INDEX idx_merchants_status     ON public.merchants(status);
CREATE INDEX idx_merchants_is_active  ON public.merchants(is_active);

-- ─────────────────────────────────────────────────────────────
-- 5.  MERCHANT WARNINGS  (admin Merchants → warnings drawer)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.merchant_warnings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id     UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  severity        warning_severity NOT NULL DEFAULT 'LOW',
  reason          TEXT NOT NULL,
  details         TEXT,
  issued_by       UUID REFERENCES public.profiles(id),
  acknowledged    BOOLEAN     NOT NULL DEFAULT false,
  acknowledged_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_merchant_warnings_merchant ON public.merchant_warnings(merchant_id);

-- ─────────────────────────────────────────────────────────────
-- 6.  RIDERS  (Courier Fleet)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.riders (
  id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Onboarding Step 1
  vehicle_type      vehicle_type NOT NULL DEFAULT 'Motorbike',
  vehicle_make      TEXT,
  vehicle_model     TEXT,
  vehicle_plate     TEXT,
  -- Onboarding Step 2
  national_id       TEXT,
  mpesa_phone       TEXT,                    -- Daraja B2C payout target
  has_helmet        BOOLEAN NOT NULL DEFAULT false,
  has_thermal_bag   BOOLEAN NOT NULL DEFAULT false,
  has_vest          BOOLEAN NOT NULL DEFAULT false,
  has_logbook       BOOLEAN NOT NULL DEFAULT false,
  has_id_doc        BOOLEAN NOT NULL DEFAULT false,
  has_license       BOOLEAN NOT NULL DEFAULT false,
  -- Documents   (Supabase Storage paths)
  documents         JSONB NOT NULL DEFAULT '{}',
  -- Operational
  is_online         BOOLEAN NOT NULL DEFAULT false,
  -- Admin
  status            entity_status NOT NULL DEFAULT 'PENDING',
  rejection_reason  TEXT,
  -- Performance  (courier Performance tab)
  rating            NUMERIC(3,2) NOT NULL DEFAULT 0,
  acceptance_rate   NUMERIC(5,2) NOT NULL DEFAULT 0,
  completion_rate   NUMERIC(5,2) NOT NULL DEFAULT 0,
  on_time_rate      NUMERIC(5,2) NOT NULL DEFAULT 0,
  reliability_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  total_deliveries  INTEGER      NOT NULL DEFAULT 0,
  tier              courier_tier NOT NULL DEFAULT 'Bronze',
  -- Timestamps
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at       TIMESTAMPTZ
);

CREATE TRIGGER riders_updated_at
  BEFORE UPDATE ON public.riders
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE INDEX idx_riders_status    ON public.riders(status);
CREATE INDEX idx_riders_is_online ON public.riders(is_online);

-- ─────────────────────────────────────────────────────────────
-- 7.  CATEGORIES  (merchant Inventory + storefront filter tabs)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  name        TEXT    NOT NULL,    -- "Fruits & Vegetables", "Bakery", …
  priority    INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_categories_merchant ON public.categories(merchant_id);

-- ─────────────────────────────────────────────────────────────
-- 8.  PRODUCTS  (merchant Inventory ↔ Storefront ↔ Cart)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.products (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id   UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  category_id   UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  -- Core  (Add/Edit Product modal)
  name          TEXT           NOT NULL,
  description   TEXT,
  price         NUMERIC(10,2)  NOT NULL,
  image_url     TEXT,
  is_available  BOOLEAN        NOT NULL DEFAULT true,
  -- Retail/Inventory  (merchant dashboard matrix table)
  sku           TEXT,
  stock_level   INTEGER        NOT NULL DEFAULT 0,
  unit          TEXT           DEFAULT 'unit',
  barcode       TEXT,
  -- Promo  (merchant Promotions tab + storefront Deals tab)
  is_featured   BOOLEAN        NOT NULL DEFAULT false,
  compare_price NUMERIC(10,2),               -- "old price" strike-through
  -- Metadata
  tags          TEXT[]         NOT NULL DEFAULT '{}',
  vat_rate      NUMERIC(5,2)   NOT NULL DEFAULT 16.00,
  -- Timestamps
  created_at    TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ    NOT NULL DEFAULT now()
);

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE INDEX idx_products_merchant   ON public.products(merchant_id);
CREATE INDEX idx_products_category   ON public.products(category_id);
CREATE INDEX idx_products_available  ON public.products(is_available);
CREATE INDEX idx_products_featured   ON public.products(is_featured);
CREATE INDEX idx_products_search     ON public.products
  USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- ─────────────────────────────────────────────────────────────
-- 9.  PROMOTIONS / PROMO CODES  (merchant Promotions tab)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.promotions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id      UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  code             TEXT           NOT NULL,
  discount_percent NUMERIC(5,2)   NOT NULL,
  min_basket_kes   NUMERIC(10,2)  NOT NULL DEFAULT 0,
  is_active        BOOLEAN        NOT NULL DEFAULT true,
  expires_at       DATE,
  usage_count      INTEGER        NOT NULL DEFAULT 0,
  max_uses         INTEGER,
  created_at       TIMESTAMPTZ    NOT NULL DEFAULT now(),
  UNIQUE(merchant_id, code)
);

CREATE INDEX idx_promotions_merchant ON public.promotions(merchant_id);
CREATE INDEX idx_promotions_code     ON public.promotions(code);

-- ─────────────────────────────────────────────────────────────
-- 10. ORDERS  (the central transaction entity)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.orders (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- Parties
  customer_id           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  merchant_id           UUID NOT NULL REFERENCES public.merchants(id),
  rider_id              UUID REFERENCES public.riders(id) ON DELETE SET NULL,
  -- Line items  [{productId, name, qty, price, unit, options[]}]
  items                 JSONB         NOT NULL DEFAULT '[]',
  -- Financials
  total                 NUMERIC(10,2) NOT NULL,
  delivery_fee          NUMERIC(10,2) NOT NULL DEFAULT 150,
  service_fee           NUMERIC(10,2) NOT NULL DEFAULT 0,
  vat_amount            NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount_amount       NUMERIC(10,2) NOT NULL DEFAULT 0,
  promo_code            TEXT,
  -- Delivery  (checkout → delivery step)
  delivery_address      TEXT,
  delivery_lat          DOUBLE PRECISION,
  delivery_lng          DOUBLE PRECISION,
  delivery_instructions TEXT,
  -- Payment  (checkout → payment step)
  payment_method        payment_method NOT NULL DEFAULT 'MPESA',
  payment_status        payment_status NOT NULL DEFAULT 'PENDING',
  mpesa_code            TEXT,               -- STK push code
  mpesa_receipt         TEXT,
  amount_paid           NUMERIC(10,2),
  -- Extras  (checkout extras)
  wants_cutlery         BOOLEAN NOT NULL DEFAULT false,
  notes                 TEXT,
  -- Status
  status                order_status NOT NULL DEFAULT 'CREATED',
  -- Timestamps
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at           TIMESTAMPTZ,
  ready_at              TIMESTAMPTZ,
  picked_up_at          TIMESTAMPTZ,
  delivered_at          TIMESTAMPTZ,
  completed_at          TIMESTAMPTZ,
  cancelled_at          TIMESTAMPTZ
);

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE INDEX idx_orders_customer ON public.orders(customer_id);
CREATE INDEX idx_orders_merchant ON public.orders(merchant_id);
CREATE INDEX idx_orders_rider    ON public.orders(rider_id);
CREATE INDEX idx_orders_status   ON public.orders(status);
CREATE INDEX idx_orders_created  ON public.orders(created_at DESC);

-- Auto-increment totals counters when order completes
CREATE OR REPLACE FUNCTION public.on_order_completed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'COMPLETED' AND OLD.status <> 'COMPLETED' THEN
    UPDATE public.merchants
      SET total_orders = total_orders + 1
      WHERE id = NEW.merchant_id;
    IF NEW.rider_id IS NOT NULL THEN
      UPDATE public.riders
        SET total_deliveries = total_deliveries + 1
        WHERE id = NEW.rider_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_order_completed
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE PROCEDURE public.on_order_completed();

-- ─────────────────────────────────────────────────────────────
-- 11. ORDER STATUS HISTORY  (order tracking timeline)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.order_status_history (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id    UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status      order_status NOT NULL,
  changed_by  UUID REFERENCES auth.users(id),
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_status_history_order ON public.order_status_history(order_id);

-- Auto-log every status change
CREATE OR REPLACE FUNCTION public.log_order_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.order_status_history(order_id, status)
    VALUES (NEW.id, NEW.status);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_order_status_change
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE PROCEDURE public.log_order_status_change();

-- Order state machine validator (called by dashboards before transitioning)
CREATE OR REPLACE FUNCTION public.can_transition_order(
  p_current order_status,
  p_new     order_status
) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
BEGIN
  RETURN CASE p_current
    WHEN 'CREATED'                    THEN p_new IN ('PAYMENT_PENDING','CANCELLED')
    WHEN 'PAYMENT_PENDING'            THEN p_new IN ('PAYMENT_CONFIRMED','FAILED','CANCELLED')
    WHEN 'PAYMENT_CONFIRMED'          THEN p_new IN ('AWAITING_MERCHANT_ACTION','CANCELLED')
    WHEN 'AWAITING_MERCHANT_ACTION'   THEN p_new IN ('ACCEPTED','DECLINED')
    WHEN 'ACCEPTED'                   THEN p_new IN ('PACKING','CANCELLED')
    WHEN 'PACKING'                    THEN p_new IN ('READY_FOR_PICKUP','CANCELLED')
    WHEN 'READY_FOR_PICKUP'           THEN p_new IN ('RIDER_ASSIGNED','CANCELLED')
    WHEN 'RIDER_ASSIGNED'             THEN p_new IN ('PICKED_UP','CANCELLED')
    WHEN 'PICKED_UP'                  THEN p_new IN ('OUT_FOR_DELIVERY')
    WHEN 'OUT_FOR_DELIVERY'           THEN p_new IN ('DELIVERED','FAILED')
    WHEN 'DELIVERED'                  THEN p_new IN ('COMPLETED')
    ELSE false
  END;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 12. DISPATCH OFFERS  (courier Radar/HOME tab)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.dispatch_offers (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id     UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  rider_id     UUID NOT NULL REFERENCES public.riders(id) ON DELETE CASCADE,
  status       dispatch_status NOT NULL DEFAULT 'PENDING',
  -- Offer details shown on courier's offer card
  distance_km  NUMERIC(6,2),
  payout_kes   NUMERIC(10,2),
  items_count  INTEGER,
  -- Timing
  offered_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '90 seconds'),
  responded_at TIMESTAMPTZ,
  metadata     JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX idx_dispatch_rider   ON public.dispatch_offers(rider_id);
CREATE INDEX idx_dispatch_order   ON public.dispatch_offers(order_id);
CREATE INDEX idx_dispatch_status  ON public.dispatch_offers(status);
CREATE INDEX idx_dispatch_expires ON public.dispatch_offers(expires_at);

-- ─────────────────────────────────────────────────────────────
-- 13. RIDER LOCATIONS  (live GPS tracking on order status page)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.rider_locations (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rider_id   UUID NOT NULL REFERENCES public.riders(id)  ON DELETE CASCADE,
  order_id   UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  lat        DOUBLE PRECISION NOT NULL,
  lng        DOUBLE PRECISION NOT NULL,
  accuracy   DOUBLE PRECISION,
  heading    DOUBLE PRECISION,   -- 0–360 compass bearing
  speed      DOUBLE PRECISION,   -- km/h
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER rider_locations_updated_at
  BEFORE UPDATE ON public.rider_locations
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE INDEX idx_rider_loc_rider ON public.rider_locations(rider_id);
CREATE INDEX idx_rider_loc_order ON public.rider_locations(order_id);

-- ─────────────────────────────────────────────────────────────
-- 14. WALLET LEDGER  (courier WALLET tab + merchant Finance)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.wallet_ledger (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id         UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  amount           NUMERIC(10,2) NOT NULL,   -- positive = credit, negative = debit
  transaction_type transaction_type NOT NULL,
  reference        TEXT,                     -- M-Pesa code / B2C ref
  metadata         JSONB NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_wallet_user    ON public.wallet_ledger(user_id);
CREATE INDEX idx_wallet_order   ON public.wallet_ledger(order_id);
CREATE INDEX idx_wallet_created ON public.wallet_ledger(created_at DESC);

-- ─────────────────────────────────────────────────────────────
-- 15. FINANCIAL LEDGER  (admin Financials + merchant Finance)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.financial_ledger (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id           UUID REFERENCES public.orders(id)   ON DELETE SET NULL,
  merchant_id        UUID REFERENCES public.merchants(id) ON DELETE SET NULL,
  rider_id           UUID REFERENCES public.riders(id)   ON DELETE SET NULL,
  type               TEXT          NOT NULL,  -- MERCHANT_PAYOUT / PLATFORM_FEE / RIDER_PAYOUT / VAT
  amount             NUMERIC(10,2) NOT NULL,
  currency           TEXT          NOT NULL DEFAULT 'KES',
  status             TEXT          NOT NULL DEFAULT 'PENDING',  -- PENDING / SETTLED / FAILED
  provider           TEXT,
  provider_reference TEXT,
  settled_at         TIMESTAMPTZ,
  metadata           JSONB NOT NULL DEFAULT '{}',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER financial_ledger_updated_at
  BEFORE UPDATE ON public.financial_ledger
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE INDEX idx_financial_order    ON public.financial_ledger(order_id);
CREATE INDEX idx_financial_merchant ON public.financial_ledger(merchant_id);
CREATE INDEX idx_financial_status   ON public.financial_ledger(status);

-- ─────────────────────────────────────────────────────────────
-- 16. REVIEWS  (storefront star ratings + merchant CRM tab)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.reviews (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id     UUID NOT NULL REFERENCES public.orders(id)   ON DELETE CASCADE,
  customer_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  merchant_id  UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  rating       SMALLINT    NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment      TEXT,
  is_visible   BOOLEAN     NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(order_id, customer_id)
);

CREATE TRIGGER reviews_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE INDEX idx_reviews_merchant ON public.reviews(merchant_id);
CREATE INDEX idx_reviews_visible  ON public.reviews(is_visible);

-- Recompute merchant avg rating on review change
CREATE OR REPLACE FUNCTION public.update_merchant_rating()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_merchant_id UUID;
BEGIN
  v_merchant_id := COALESCE(NEW.merchant_id, OLD.merchant_id);
  UPDATE public.merchants
  SET rating = (
    SELECT ROUND(AVG(rating)::NUMERIC, 2)
    FROM   public.reviews
    WHERE  merchant_id = v_merchant_id AND is_visible = true
  )
  WHERE id = v_merchant_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_review_change
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE PROCEDURE public.update_merchant_rating();

-- ─────────────────────────────────────────────────────────────
-- 17. COMPLAINTS  (admin Support page + merchant CRM)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.complaints (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id     UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  filed_by     UUID NOT NULL REFERENCES auth.users(id),
  against_id   UUID NOT NULL REFERENCES auth.users(id),
  category     complaint_category NOT NULL DEFAULT 'OTHER',
  priority     complaint_priority NOT NULL DEFAULT 'LOW',
  subject      TEXT NOT NULL,
  description  TEXT NOT NULL,
  status       complaint_status NOT NULL DEFAULT 'OPEN',
  resolution   TEXT,
  resolved_by  UUID REFERENCES auth.users(id),
  resolved_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER complaints_updated_at
  BEFORE UPDATE ON public.complaints
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE INDEX idx_complaints_filed  ON public.complaints(filed_by);
CREATE INDEX idx_complaints_status ON public.complaints(status);

-- ─────────────────────────────────────────────────────────────
-- 18. NOTIFICATIONS  (real-time bell icon everywhere)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,   -- ORDER_UPDATE / NEW_DISPATCH / APPROVAL / PROMO / SYSTEM
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  data       JSONB       NOT NULL DEFAULT '{}',
  is_read    BOOLEAN     NOT NULL DEFAULT false,
  channel    TEXT        NOT NULL DEFAULT 'IN_APP',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user   ON public.notifications(user_id);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id, is_read)
  WHERE is_read = false;

-- ─────────────────────────────────────────────────────────────
-- 19. WAITLIST  (admin Waitlist page)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.waitlist (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email      TEXT        NOT NULL UNIQUE,
  full_name  TEXT,
  phone      TEXT,
  role       TEXT        NOT NULL DEFAULT 'customer',
  area       TEXT,
  notes      TEXT,
  status     TEXT        NOT NULL DEFAULT 'WAITING',   -- WAITING / INVITED / JOINED
  invited_at TIMESTAMPTZ,
  joined_at  TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_waitlist_status ON public.waitlist(status);
CREATE INDEX idx_waitlist_role   ON public.waitlist(role);

-- ─────────────────────────────────────────────────────────────
-- 20. CARTS  (persistent cart — authenticated + guest)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.carts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id  TEXT,                        -- guest fallback
  merchant_id UUID REFERENCES public.merchants(id) ON DELETE SET NULL,
  items       JSONB       NOT NULL DEFAULT '[]',
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER carts_updated_at
  BEFORE UPDATE ON public.carts
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE INDEX idx_carts_user   ON public.carts(user_id);
CREATE INDEX idx_carts_active ON public.carts(user_id, is_active)
  WHERE is_active = true;

-- ─────────────────────────────────────────────────────────────
-- 21. SUPPORT TICKETS  (admin Support page)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.support_tickets (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  filed_by    UUID NOT NULL REFERENCES auth.users(id),
  subject     TEXT NOT NULL,
  description TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT 'GENERAL',
  priority    complaint_priority NOT NULL DEFAULT 'LOW',
  status      TEXT NOT NULL DEFAULT 'OPEN',
  assigned_to UUID REFERENCES auth.users(id),
  resolution  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE INDEX idx_support_filed  ON public.support_tickets(filed_by);
CREATE INDEX idx_support_status ON public.support_tickets(status);

-- ─────────────────────────────────────────────────────────────
-- 22. ADMIN SETTINGS  (admin Settings page + platform defaults)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.admin_settings (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL,
  description TEXT,
  updated_by  UUID REFERENCES auth.users(id),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.admin_settings (key, value, description) VALUES
  ('platform_commission_rate', '"10"',      'Muncheez platform commission % per order'),
  ('kra_vat_rate',             '"16"',      'Kenya Revenue Authority VAT %'),
  ('min_withdrawal_kes',       '"500"',     'Minimum courier wallet withdrawal (KES)'),
  ('delivery_base_fee_kes',    '"150"',     'Base delivery fee charged to customer'),
  ('dispatch_offer_ttl_sec',   '"90"',      'Seconds before a dispatch offer expires'),
  ('max_cart_items',           '"50"',      'Maximum items allowed in a single cart'),
  ('onboarding_sla_hours',     '"48"',      'Review SLA for merchant/courier applications'),
  ('support_whatsapp',         '"+254700000000"', 'WhatsApp support contact'),
  ('platform_name',            '"Muncheez"',  'Platform display name'),
  ('surge_threshold_orders',   '"5"',       'Queue depth before surge pricing activates');

-- ─────────────────────────────────────────────────────────────
-- 23. RLS HELPER FUNCTIONS
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND 'admin' = ANY(roles)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_merchant()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND 'merchant' = ANY(roles)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_courier()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND 'courier' = ANY(roles)
  );
$$;

-- ─────────────────────────────────────────────────────────────
-- 24. ROW LEVEL SECURITY  — enable + policies
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchants          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_warnings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.riders             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatch_offers    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rider_locations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_ledger      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_ledger   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carts              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings     ENABLE ROW LEVEL SECURITY;

-- ── PROFILES ──────────────────────────────────────────────────
CREATE POLICY "Own profile readable"   ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Own profile editable"   ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admin reads profiles"   ON public.profiles FOR SELECT USING (public.is_admin());
CREATE POLICY "Admin updates profiles" ON public.profiles FOR UPDATE USING (public.is_admin());

-- ── MERCHANTS ──────────────────────────────────────────────────
CREATE POLICY "Public stores visible"
  ON public.merchants FOR SELECT
  USING (status = 'APPROVED' AND is_active = true);

CREATE POLICY "Merchant reads own"   ON public.merchants FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Merchant inserts own" ON public.merchants FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Merchant updates own" ON public.merchants FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admin manages merchants" ON public.merchants FOR ALL USING (public.is_admin());

-- ── MERCHANT WARNINGS ─────────────────────────────────────────
CREATE POLICY "Admin manages warnings" ON public.merchant_warnings FOR ALL USING (public.is_admin());
CREATE POLICY "Merchant reads own warnings"
  ON public.merchant_warnings FOR SELECT USING (merchant_id = auth.uid());

-- ── RIDERS ────────────────────────────────────────────────────
CREATE POLICY "Rider reads own"   ON public.riders FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Rider inserts own" ON public.riders FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Rider updates own" ON public.riders FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admin manages riders" ON public.riders FOR ALL USING (public.is_admin());
CREATE POLICY "Online riders visible to merchants"
  ON public.riders FOR SELECT
  USING (status = 'APPROVED' AND is_online = true AND public.is_merchant());

-- ── CATEGORIES ────────────────────────────────────────────────
CREATE POLICY "Active categories public" ON public.categories FOR SELECT USING (is_active = true);
CREATE POLICY "Merchant manages own categories"
  ON public.categories FOR ALL USING (merchant_id = auth.uid());
CREATE POLICY "Admin manages categories" ON public.categories FOR ALL USING (public.is_admin());

-- ── PRODUCTS ──────────────────────────────────────────────────
CREATE POLICY "Available products public" ON public.products FOR SELECT USING (is_available = true);
CREATE POLICY "Merchant manages own products"
  ON public.products FOR ALL USING (merchant_id = auth.uid());
CREATE POLICY "Admin manages products" ON public.products FOR ALL USING (public.is_admin());

-- ── PROMOTIONS ────────────────────────────────────────────────
CREATE POLICY "Active promos public" ON public.promotions FOR SELECT USING (is_active = true);
CREATE POLICY "Merchant manages own promos"
  ON public.promotions FOR ALL USING (merchant_id = auth.uid());
CREATE POLICY "Admin manages promos" ON public.promotions FOR ALL USING (public.is_admin());

-- ── ORDERS ────────────────────────────────────────────────────
CREATE POLICY "Customer reads own orders"
  ON public.orders FOR SELECT USING (customer_id = auth.uid());
CREATE POLICY "Customer creates orders"
  ON public.orders FOR INSERT WITH CHECK (customer_id = auth.uid());
CREATE POLICY "Merchant reads own store orders"
  ON public.orders FOR SELECT USING (merchant_id = auth.uid());
CREATE POLICY "Merchant updates order status"
  ON public.orders FOR UPDATE USING (merchant_id = auth.uid());
CREATE POLICY "Rider reads assigned orders"
  ON public.orders FOR SELECT USING (rider_id = auth.uid());
CREATE POLICY "Rider updates delivery status"
  ON public.orders FOR UPDATE USING (rider_id = auth.uid());
CREATE POLICY "Admin manages all orders" ON public.orders FOR ALL USING (public.is_admin());

-- ── ORDER STATUS HISTORY ──────────────────────────────────────
CREATE POLICY "Parties read own order history"
  ON public.order_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o WHERE o.id = order_id
      AND (o.customer_id = auth.uid() OR o.merchant_id = auth.uid() OR o.rider_id = auth.uid())
    )
  );
CREATE POLICY "Authenticated inserts history"
  ON public.order_status_history FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admin reads all history"
  ON public.order_status_history FOR SELECT USING (public.is_admin());

-- ── DISPATCH OFFERS ───────────────────────────────────────────
CREATE POLICY "Rider reads own offers"
  ON public.dispatch_offers FOR SELECT USING (rider_id = auth.uid());
CREATE POLICY "Rider responds to offers"
  ON public.dispatch_offers FOR UPDATE USING (rider_id = auth.uid());
CREATE POLICY "Merchant creates dispatch offers"
  ON public.dispatch_offers FOR INSERT WITH CHECK (public.is_merchant() OR public.is_admin());
CREATE POLICY "Admin manages dispatch" ON public.dispatch_offers FOR ALL USING (public.is_admin());

-- ── RIDER LOCATIONS ───────────────────────────────────────────
CREATE POLICY "Rider manages own location"
  ON public.rider_locations FOR ALL USING (rider_id = auth.uid());
CREATE POLICY "Order parties read rider location"
  ON public.rider_locations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o WHERE o.rider_id = rider_locations.rider_id
      AND (o.customer_id = auth.uid() OR o.merchant_id = auth.uid())
      AND o.status IN ('RIDER_ASSIGNED','PICKED_UP','OUT_FOR_DELIVERY')
    )
  );
CREATE POLICY "Admin reads all locations" ON public.rider_locations FOR SELECT USING (public.is_admin());

-- ── WALLET LEDGER ─────────────────────────────────────────────
CREATE POLICY "User reads own wallet"
  ON public.wallet_ledger FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "User inserts wallet entries"
  ON public.wallet_ledger FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admin manages wallet" ON public.wallet_ledger FOR ALL USING (public.is_admin());

-- ── FINANCIAL LEDGER ──────────────────────────────────────────
CREATE POLICY "Admin manages financials" ON public.financial_ledger FOR ALL USING (public.is_admin());
CREATE POLICY "Merchant reads own financials"
  ON public.financial_ledger FOR SELECT USING (merchant_id = auth.uid());
CREATE POLICY "Rider reads own financials"
  ON public.financial_ledger FOR SELECT USING (rider_id = auth.uid());

-- ── REVIEWS ───────────────────────────────────────────────────
CREATE POLICY "Visible reviews public" ON public.reviews FOR SELECT USING (is_visible = true);
CREATE POLICY "Customer creates review"
  ON public.reviews FOR INSERT WITH CHECK (customer_id = auth.uid());
CREATE POLICY "Customer updates own review"
  ON public.reviews FOR UPDATE USING (customer_id = auth.uid());
CREATE POLICY "Admin manages reviews" ON public.reviews FOR ALL USING (public.is_admin());

-- ── COMPLAINTS ────────────────────────────────────────────────
CREATE POLICY "User reads own complaints"
  ON public.complaints FOR SELECT
  USING (filed_by = auth.uid() OR against_id = auth.uid());
CREATE POLICY "User files complaint"
  ON public.complaints FOR INSERT WITH CHECK (filed_by = auth.uid());
CREATE POLICY "Admin manages complaints" ON public.complaints FOR ALL USING (public.is_admin());

-- ── NOTIFICATIONS ─────────────────────────────────────────────
CREATE POLICY "User reads own notifications"
  ON public.notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "User marks own read"
  ON public.notifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "System creates notifications"
  ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin manages notifications" ON public.notifications FOR ALL USING (public.is_admin());

-- ── CARTS ─────────────────────────────────────────────────────
CREATE POLICY "User manages own cart"
  ON public.carts FOR ALL USING (user_id = auth.uid());

-- ── SUPPORT TICKETS ───────────────────────────────────────────
CREATE POLICY "User reads own tickets"
  ON public.support_tickets FOR SELECT USING (filed_by = auth.uid());
CREATE POLICY "User files ticket"
  ON public.support_tickets FOR INSERT WITH CHECK (filed_by = auth.uid());
CREATE POLICY "Admin manages tickets" ON public.support_tickets FOR ALL USING (public.is_admin());

-- ── WAITLIST ──────────────────────────────────────────────────
CREATE POLICY "Anyone joins waitlist" ON public.waitlist FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin manages waitlist" ON public.waitlist FOR ALL USING (public.is_admin());

-- ── ADMIN SETTINGS ────────────────────────────────────────────
CREATE POLICY "Settings are readable" ON public.admin_settings FOR SELECT USING (true);
CREATE POLICY "Admin updates settings" ON public.admin_settings FOR ALL USING (public.is_admin());

-- ─────────────────────────────────────────────────────────────
-- 25. REALTIME PUBLICATION  (enable live subscriptions)
-- ─────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dispatch_offers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rider_locations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_status_history;

-- ─────────────────────────────────────────────────────────────
-- 26. STORAGE BUCKETS  (create in Dashboard → Storage)
-- ─────────────────────────────────────────────────────────────
-- merchant-documents  (PRIVATE)   {merchant_id}/permit.pdf
-- rider-documents     (PRIVATE)   {rider_id}/id.pdf  {rider_id}/license.pdf
-- product-images      (PUBLIC)    {merchant_id}/{product_id}.jpg
-- merchant-branding   (PUBLIC)    {merchant_id}/logo.png  {merchant_id}/cover.jpg
-- profile-avatars     (PUBLIC)    {user_id}/avatar.jpg

-- ─────────────────────────────────────────────────────────────
-- 27. POST-MIGRATION: SEED ADMIN USER
--
-- 1. Go to Supabase Dashboard → Authentication → Users
-- 2. Create user:  admin@muncheez.co.ke  (set a strong password)
-- 3. Copy the resulting UUID, then run:
--
--    UPDATE public.profiles
--    SET roles = ARRAY['admin'], status = 'ACTIVE'
--    WHERE email = 'admin@muncheez.co.ke';
--
-- That's it. The admin can then log in at /admin/login
-- ─────────────────────────────────────────────────────────────
