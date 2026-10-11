# Muncheez — Supabase Schema Setup
## Complete Technical Reference

**Date:** 2026-10-11  
**Migration File:** `supabase/migrations/001_muncheez_complete_schema.sql`  
**Scope:** New Supabase project — zero mock data, every frontend feature covered

---

## How to Apply This (8 Steps)

| Step | Action |
|------|--------|
| 1 | Create new Supabase project at **supabase.com/dashboard** |
| 2 | SQL Editor → New Query → paste `001_muncheez_complete_schema.sql` → **Run** |
| 3 | Settings → API → copy **Project URL** + **anon key** → paste into `.env` |
| 4 | Authentication → Providers → Email enabled, **Confirm email = ON** |
| 5 | Authentication → Users → create `admin@muncheez.co.ke` (strong password) |
| 6 | SQL Editor → run the admin UPDATE at the bottom of the migration |
| 7 | Storage → create **5 buckets** (details below) |
| 8 | `npm run dev` — app is live on real Supabase |

### `.env` file (after Step 3)
```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key-here
```

---

## What Was Audited (Frontend Files Read)

Every file below was read before writing a single line of SQL — nothing was assumed.

| File | Role | Features Captured |
|------|------|-------------------|
| `src/pages/merchant/Onboarding.tsx` | Merchant signup | Store name, branch zone, address, phone, pack time, KRA PIN, business permit, M-Pesa till, document upload |
| `src/pages/courier/Onboarding.tsx` | Courier signup | Full name, vehicle type/plate, phone, national ID, M-Pesa payout phone, helmet checkbox, thermal bag checkbox, ID doc upload, license upload |
| `src/pages/customer/CheckoutView.tsx` | Customer checkout | Delivery address (+ GPS), delivery instructions, payment method (M-Pesa/Cash/Card), M-Pesa phone, cutlery option, notes, promo code |
| `src/pages/customer/OrderStatus.tsx` | Order tracking | 15-state order lifecycle, merchant info, rider GPS location |
| `src/pages/admin/Approvals.tsx` | Admin approvals | Merchant application review (KRA, permit, documents), rider verification (ID, license, logbook, helmet, vest, thermal bag), approve/reject/suspend actions |
| `src/pages/admin/Merchants.tsx` | Admin merchant management | Business name, type, status, owner name/phone/email, address, M-Pesa shortcode, CSV export, warnings, complaints, documents, timeline |
| `src/pages/merchant/Dashboard.tsx` | Merchant operations | Orders (live), Inventory, CRM, Promotions, Analytics, Finance, Logistics, Settings |
| `src/pages/courier/Dashboard.tsx` | Courier operations | Radar/Missions, Wallet/Payouts, Performance, Safety/SOS, Vehicle/Profile |
| `src/types/schema.ts` | TypeScript entities | All field types for Merchant, Rider, Product, Order, MerchantWarning, MerchantComplaint |
| `src/context/AuthContext.tsx` | Auth system | Multi-role, email verification, profile hydration, session enforcement |
| `src/lib/supabaseService.ts` | Service layer | All service method signatures used by dashboards |

---

## Tables Created (21 Total)

### 1. `profiles`
Auto-created by trigger when a user signs up via Supabase Auth.

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID PK | Links to `auth.users.id` |
| `full_name` | TEXT | Display name (pre-filled from `user_metadata`) |
| `phone` | TEXT | Contact / M-Pesa checkout prefill |
| `email` | TEXT | Mirrors `auth.users.email` for easy queries |
| `avatar_url` | TEXT | Profile photo (Storage: `profile-avatars`) |
| `roles` | TEXT[] | `['customer']` / `['merchant']` / `['courier']` / `['admin']` |
| `status` | entity_status | `ACTIVE` / `SUSPENDED` / `INACTIVE` |
| `loyalty_tier` | TEXT | `bronze` / `silver` / `gold` / `platinum` |
| `loyalty_points` | INTEGER | Earned through orders |
| `addresses` | JSONB | Saved delivery addresses for checkout prefill |
| `email_verified` | BOOLEAN | Synced from auth when user confirms email |
| `phone_verified` | BOOLEAN | For future OTP verification |

---

### 2. `merchants`
Created by merchant after signup, updated during onboarding and dashboard Settings.

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID PK | Same as `auth.users.id` |
| `business_name` | TEXT | Store trading name |
| `type` | TEXT | `'Supermarket'` (only type for now) |
| `branch_zone` | TEXT | Nairobi zone: Westlands / Kilimani / CBD / Karen / ThikaRoad / Lavington |
| `address` | TEXT | Physical street / building |
| `lat` / `lng` | DOUBLE PRECISION | GPS coordinates for delivery radius |
| `phone` | TEXT | Store dispatch phone |
| `email` | TEXT | Merchant contact email |
| `kra_pin` | TEXT | Kenya Revenue Authority PIN (onboarding Step 2) |
| `health_permit` | TEXT | County business permit number |
| `mpesa_till` | TEXT | M-Pesa Till or Paybill for settlements |
| `documents` | JSONB | `{permit: "storage-path", kra: "storage-path"}` |
| `is_active` | BOOLEAN | Store live toggle (merchant Settings tab) |
| `operating_hours` | JSONB | `{hours: "08:00 AM – 10:00 PM"}` |
| `pack_time_min` | INTEGER | 15 / 20 / 30 minutes (onboarding + Settings) |
| `delivery_radius_km` | INTEGER | Configurable in merchant Settings |
| `delivery_fee` | INTEGER | KES delivery fee |
| `low_stock_threshold` | INTEGER | Alert threshold (merchant Settings) |
| `bulk_purchase_limit` | INTEGER | Max qty per item |
| `logo_url` / `cover_url` | TEXT | Branding (Storage: `merchant-branding`) |
| `description` | TEXT | Store description shown on storefront |
| `commission_rate` | NUMERIC | Default 10% (admin configurable) |
| `vat_rate` | NUMERIC | Default 16% KRA VAT |
| `status` | entity_status | `PENDING` → `APPROVED` / `REJECTED` / `SUSPENDED` |
| `rejection_reason` | TEXT | Admin sets on rejection |
| `is_featured` | BOOLEAN | Admin can feature the store on homepage |
| `rating` | NUMERIC(3,2) | Auto-computed from reviews trigger |
| `total_orders` | INTEGER | Auto-incremented on order completion trigger |
| `approved_at` / `suspended_at` | TIMESTAMPTZ | Admin action timestamps |

---

### 3. `merchant_warnings`
Issued by admin from the Merchants page warnings drawer.

| Column | Type | Purpose |
|--------|------|---------|
| `merchant_id` | UUID FK | References `merchants.id` |
| `severity` | warning_severity | `LOW` / `MEDIUM` / `HIGH` / `CRITICAL` |
| `reason` | TEXT | Short reason label |
| `details` | TEXT | Full explanation |
| `issued_by` | UUID FK | Admin profile who issued it |
| `acknowledged` | BOOLEAN | Merchant can acknowledge |

---

### 4. `riders`
Created by courier after signup, updated during onboarding and dashboard.

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID PK | Same as `auth.users.id` |
| `vehicle_type` | vehicle_type | `Motorbike` / `Bicycle` / `Foot` / `Car` |
| `vehicle_make` / `vehicle_model` | TEXT | e.g. Honda / Ace 125 |
| `vehicle_plate` | TEXT | e.g. KMD 102Z |
| `national_id` | TEXT | ID number (onboarding Step 2) |
| `mpesa_phone` | TEXT | Daraja B2C payout target |
| `has_helmet` | BOOLEAN | Safety gear checkbox (onboarding Step 2) |
| `has_thermal_bag` | BOOLEAN | Delivery gear checkbox |
| `has_vest` / `has_logbook` | BOOLEAN | Admin verifiable safety items |
| `has_id_doc` / `has_license` | BOOLEAN | Document verification flags (admin Riders page) |
| `documents` | JSONB | `{id_doc: "path", license: "path"}` |
| `is_online` | BOOLEAN | Online/offline toggle (courier Radar tab), synced to DB |
| `status` | entity_status | `PENDING` → `APPROVED` / `REJECTED` |
| `rating` | NUMERIC(3,2) | Rider star rating |
| `acceptance_rate` | NUMERIC(5,2) | % of offers accepted |
| `completion_rate` | NUMERIC(5,2) | % of accepted orders completed |
| `on_time_rate` | NUMERIC(5,2) | % delivered on time |
| `reliability_score` | NUMERIC(5,2) | Composite score |
| `total_deliveries` | INTEGER | Auto-incremented on completion trigger |
| `tier` | courier_tier | `Bronze` / `Silver` / `Gold` / `Platinum` |

---

### 5. `categories`
Merchant-defined product groupings. Shown as filter tabs on storefront.

| Column | Type | Purpose |
|--------|------|---------|
| `merchant_id` | UUID FK | Owner merchant |
| `name` | TEXT | e.g. "Fruits & Vegetables", "Bakery", "Dairy" |
| `priority` | INTEGER | Display order |
| `is_active` | BOOLEAN | Show/hide on storefront |

---

### 6. `products`
The core product entity — lives in merchant Inventory, appears on Storefront.

| Column | Type | Purpose |
|--------|------|---------|
| `merchant_id` | UUID FK | Owner merchant |
| `category_id` | UUID FK | Product category |
| `name` | TEXT | Product name (Add/Edit modal) |
| `description` | TEXT | Description shown on product card |
| `price` | NUMERIC(10,2) | Selling price in KES |
| `image_url` | TEXT | Storage: `product-images` |
| `is_available` | BOOLEAN | Stock toggle — controls cart availability |
| `sku` | TEXT | Merchant's stock-keeping unit |
| `stock_level` | INTEGER | Inventory count |
| `unit` | TEXT | `unit` / `kg` / `pack` / `bottle` / `loaf` |
| `barcode` | TEXT | Future barcode scanner support |
| `is_featured` | BOOLEAN | Promotes to Deals / hero sections |
| `compare_price` | NUMERIC(10,2) | "Old price" shown as strike-through for promos |
| `tags` | TEXT[] | e.g. `['Vegan', 'Gluten-Free', 'New']` |
| `vat_rate` | NUMERIC(5,2) | Default 16% KRA VAT |

---

### 7. `promotions`
Promo codes created in merchant Promotions tab, validated at checkout.

| Column | Type | Purpose |
|--------|------|---------|
| `merchant_id` | UUID FK | Owning merchant |
| `code` | TEXT | Promo code string (e.g. `FRESH20`) |
| `discount_percent` | NUMERIC | e.g. 10, 15, 20 |
| `min_basket_kes` | NUMERIC | Minimum basket to qualify |
| `is_active` | BOOLEAN | Enable/disable toggle |
| `expires_at` | DATE | Expiry date |
| `usage_count` | INTEGER | Incremented on each use |
| `max_uses` | INTEGER | Optional cap |

---

### 8. `orders`
The central transaction entity — every checkout creates one.

| Column | Type | Purpose |
|--------|------|---------|
| `customer_id` | UUID FK | Ordering customer |
| `merchant_id` | UUID FK | Fulfilling merchant |
| `rider_id` | UUID FK | Assigned courier (set after dispatch) |
| `items` | JSONB | `[{productId, name, qty, price, unit, options[]}]` |
| `total` | NUMERIC | Order subtotal |
| `delivery_fee` | NUMERIC | Delivery charge |
| `service_fee` | NUMERIC | Platform service fee |
| `vat_amount` | NUMERIC | 16% VAT computed amount |
| `discount_amount` | NUMERIC | Promo code discount applied |
| `promo_code` | TEXT | Promo code used |
| `delivery_address` | TEXT | Customer delivery address (checkout Step 2) |
| `delivery_lat` / `delivery_lng` | DOUBLE PRECISION | GPS coords from browser geolocation |
| `delivery_instructions` | TEXT | e.g. "Leave at gate" |
| `payment_method` | payment_method | `MPESA` / `CASH` / `CARD` |
| `payment_status` | payment_status | `PENDING` → `CONFIRMED` / `FAILED` |
| `mpesa_code` | TEXT | STK push confirmation code |
| `mpesa_receipt` | TEXT | M-Pesa transaction receipt |
| `amount_paid` | NUMERIC | Actual amount received |
| `wants_cutlery` | BOOLEAN | Checkbox at checkout |
| `notes` | TEXT | Order special instructions |
| `status` | order_status | Full 15-state lifecycle (see below) |
| `accepted_at` / `ready_at` / `picked_up_at` / `delivered_at` / `completed_at` / `cancelled_at` | TIMESTAMPTZ | State transition timestamps |

---

### 9. `order_status_history`
Auto-populated by trigger — every status change is logged. Powers the order timeline.

| Column | Type | Purpose |
|--------|------|---------|
| `order_id` | UUID FK | Parent order |
| `status` | order_status | The status that was set |
| `changed_by` | UUID FK | Who changed it (merchant / rider / system) |
| `note` | TEXT | Optional admin note |

---

### 10. `dispatch_offers`
Created when a merchant marks an order `READY_FOR_PICKUP`. Sent to an available rider.

| Column | Type | Purpose |
|--------|------|---------|
| `order_id` | UUID FK | Order to be delivered |
| `rider_id` | UUID FK | Rider being offered the job |
| `status` | dispatch_status | `PENDING` → `ACCEPTED` / `REJECTED` / `EXPIRED` |
| `distance_km` | NUMERIC | Shown on courier offer card |
| `payout_kes` | NUMERIC | KES payout shown on offer card |
| `items_count` | INTEGER | Number of items |
| `offered_at` | TIMESTAMPTZ | When the offer was created |
| `expires_at` | TIMESTAMPTZ | Default: 90 seconds after offer (configurable in admin_settings) |
| `responded_at` | TIMESTAMPTZ | When rider responded |

---

### 11. `rider_locations`
GPS coordinates pushed by the courier app. Streamed live to the customer's order tracking map.

| Column | Type | Purpose |
|--------|------|---------|
| `rider_id` | UUID FK | Courier |
| `order_id` | UUID FK | Active delivery |
| `lat` / `lng` | DOUBLE PRECISION | Current position |
| `heading` | DOUBLE PRECISION | Compass direction (0–360°) |
| `speed` | DOUBLE PRECISION | Speed in km/h |
| `accuracy` | DOUBLE PRECISION | GPS accuracy in metres |

---

### 12. `wallet_ledger`
Every credit and debit for a courier's or merchant's wallet. Powers the Wallet tab.

| Column | Type | Purpose |
|--------|------|---------|
| `user_id` | UUID FK | Courier or merchant |
| `order_id` | UUID FK | Linked order (for payouts) |
| `amount` | NUMERIC | Positive = credit, Negative = debit |
| `transaction_type` | transaction_type | `DELIVERY_PAYOUT` / `MPESA_WITHDRAWAL` / `SURGE_BONUS` / `PENALTY` / etc. |
| `reference` | TEXT | M-Pesa code / B2C reference |
| `metadata` | JSONB | `{description, provider, dispatch_id}` |

---

### 13. `financial_ledger`
Platform-level double-entry ledger. Powers admin Financials page.

| Column | Type | Purpose |
|--------|------|---------|
| `order_id` | UUID FK | Source order |
| `merchant_id` | UUID FK | Merchant party |
| `rider_id` | UUID FK | Rider party |
| `type` | TEXT | `MERCHANT_PAYOUT` / `PLATFORM_FEE` / `RIDER_PAYOUT` / `VAT` |
| `amount` | NUMERIC | Amount in KES |
| `status` | TEXT | `PENDING` / `SETTLED` / `FAILED` |
| `provider` | TEXT | `Daraja` / `Internal` |
| `provider_reference` | TEXT | M-Pesa transaction ref |
| `settled_at` | TIMESTAMPTZ | Settlement timestamp |

---

### 14. `reviews`
Customer star ratings + comments. Powers storefront ratings + merchant CRM tab.

| Column | Type | Purpose |
|--------|------|---------|
| `order_id` | UUID FK | Must be a completed order |
| `customer_id` | UUID FK | Reviewer |
| `merchant_id` | UUID FK | Being reviewed |
| `rating` | SMALLINT | 1–5 stars (CHECK constraint) |
| `comment` | TEXT | Written review |
| `is_visible` | BOOLEAN | Admin can hide/show |

> **Trigger**: Every insert/update/delete on `reviews` automatically recomputes `merchants.rating` as the average of all visible reviews.

---

### 15. `complaints`
Filed by customers, merchants, or couriers. Managed by admin Support page.

| Column | Type | Purpose |
|--------|------|---------|
| `filed_by` | UUID FK | Who filed it |
| `against_id` | UUID FK | Who it's against |
| `category` | complaint_category | `QUALITY` / `DELIVERY` / `BEHAVIOR` / `FRAUD` / `OTHER` |
| `priority` | complaint_priority | `LOW` / `MEDIUM` / `HIGH` / `URGENT` |
| `status` | complaint_status | `OPEN` → `INVESTIGATING` → `RESOLVED` → `CLOSED` |
| `resolution` | TEXT | Admin resolution note |

---

### 16. `notifications`
In-app notification bell. Realtime — appears instantly without refresh.

| Column | Type | Purpose |
|--------|------|---------|
| `user_id` | UUID FK | Recipient |
| `type` | TEXT | `ORDER_UPDATE` / `NEW_DISPATCH` / `APPROVAL` / `PROMO` / `SYSTEM` |
| `title` / `body` | TEXT | Notification content |
| `data` | JSONB | e.g. `{orderId, status}` for deep-linking |
| `is_read` | BOOLEAN | Read state |
| `channel` | TEXT | `IN_APP` / `SMS` / `EMAIL` / `PUSH` |

---

### 17. `waitlist`
Admin Waitlist management page.

| Column | Type | Purpose |
|--------|------|---------|
| `email` | TEXT UNIQUE | Waitlist entry |
| `role` | TEXT | `customer` / `merchant` / `courier` |
| `area` | TEXT | Nairobi zone of interest |
| `status` | TEXT | `WAITING` / `INVITED` / `JOINED` |
| `invited_at` / `joined_at` | TIMESTAMPTZ | Conversion timestamps |

---

### 18. `carts`
Persistent cart — works for logged-in users and guests (via `session_id`).

| Column | Type | Purpose |
|--------|------|---------|
| `user_id` | UUID FK | Authenticated user |
| `session_id` | TEXT | Guest fallback |
| `merchant_id` | UUID FK | Cart is locked to one merchant at a time |
| `items` | JSONB | Full cart items array |
| `is_active` | BOOLEAN | Archived after checkout |

---

### 19. `support_tickets`
Customer/merchant/courier support requests. Admin Support page.

| Column | Type | Purpose |
|--------|------|---------|
| `filed_by` | UUID FK | Who filed |
| `category` | TEXT | `GENERAL` / `ORDER` / `PAYMENT` / `ACCOUNT` |
| `priority` | complaint_priority | Urgency level |
| `status` | TEXT | `OPEN` / `IN_PROGRESS` / `RESOLVED` / `CLOSED` |
| `assigned_to` | UUID FK | Admin agent assigned |

---

### 20. `merchant_warnings`
Admin issues warnings to merchants directly from the Merchants page.

*(See table definition above — covered under #3)*

---

### 21. `admin_settings`
Key-value store for platform-wide configuration. Admin Settings page.

| Key | Default | Description |
|-----|---------|-------------|
| `platform_commission_rate` | `10` | % fee Muncheez takes per order |
| `kra_vat_rate` | `16` | KRA VAT % |
| `min_withdrawal_kes` | `500` | Minimum courier cashout amount |
| `delivery_base_fee_kes` | `150` | Default delivery fee |
| `dispatch_offer_ttl_sec` | `90` | Seconds before offer expires |
| `max_cart_items` | `50` | Cart item limit |
| `onboarding_sla_hours` | `48` | Merchant/courier review SLA |
| `support_whatsapp` | `+254700000000` | Support contact |
| `platform_name` | `Muncheez` | Display name |
| `surge_threshold_orders` | `5` | Orders queued before surge |

---

## Enums

| Enum | Values |
|------|--------|
| `entity_status` | `PENDING`, `UNDER_REVIEW`, `APPROVED`, `REJECTED`, `SUSPENDED`, `ACTIVE`, `INACTIVE` |
| `app_role` | `customer`, `merchant`, `courier`, `admin` |
| `vehicle_type` | `Motorbike`, `Bicycle`, `Foot`, `Car` |
| `order_status` | `CREATED`, `PAYMENT_PENDING`, `PAYMENT_CONFIRMED`, `AWAITING_MERCHANT_ACTION`, `ACCEPTED`, `PACKING`, `READY_FOR_PICKUP`, `RIDER_ASSIGNED`, `PICKED_UP`, `OUT_FOR_DELIVERY`, `DELIVERED`, `COMPLETED`, `DECLINED`, `CANCELLED`, `FAILED` |
| `payment_method` | `MPESA`, `CASH`, `CARD` |
| `payment_status` | `PENDING`, `PROCESSING`, `CONFIRMED`, `FAILED`, `REFUNDED` |
| `transaction_type` | `DELIVERY_PAYOUT`, `MPESA_WITHDRAWAL`, `SURGE_BONUS`, `PENALTY`, `REFUND`, `SETTLEMENT`, `MERCHANT_PAYOUT`, `PLATFORM_FEE`, `ADJUSTMENT` |
| `dispatch_status` | `PENDING`, `ACCEPTED`, `REJECTED`, `EXPIRED`, `CANCELLED` |
| `complaint_category` | `QUALITY`, `DELIVERY`, `BEHAVIOR`, `FRAUD`, `OTHER` |
| `complaint_priority` | `LOW`, `MEDIUM`, `HIGH`, `URGENT` |
| `complaint_status` | `OPEN`, `INVESTIGATING`, `RESOLVED`, `CLOSED` |
| `warning_severity` | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |
| `courier_tier` | `Bronze`, `Silver`, `Gold`, `Platinum` |

---

## Triggers (10 Total)

| Trigger | Table | Fires | Effect |
|---------|-------|-------|--------|
| `on_auth_user_created` | `auth.users` | AFTER INSERT | Auto-creates `profiles` row |
| `on_auth_user_email_confirmed` | `auth.users` | AFTER UPDATE | Sets `profiles.email_verified = true` |
| `profiles_updated_at` | `profiles` | BEFORE UPDATE | Sets `updated_at = now()` |
| `merchants_updated_at` | `merchants` | BEFORE UPDATE | Sets `updated_at = now()` |
| `riders_updated_at` | `riders` | BEFORE UPDATE | Sets `updated_at = now()` |
| `products_updated_at` | `products` | BEFORE UPDATE | Sets `updated_at = now()` |
| `orders_updated_at` | `orders` | BEFORE UPDATE | Sets `updated_at = now()` |
| `on_order_completed` | `orders` | AFTER UPDATE | Increments `merchants.total_orders` + `riders.total_deliveries` |
| `on_order_status_change` | `orders` | AFTER UPDATE | Inserts row into `order_status_history` |
| `on_review_change` | `reviews` | AFTER INSERT/UPDATE/DELETE | Recomputes `merchants.rating` |

---

## Order State Machine

```
CREATED
  └── PAYMENT_PENDING
        ├── FAILED
        └── PAYMENT_CONFIRMED
              └── AWAITING_MERCHANT_ACTION
                    ├── DECLINED
                    └── ACCEPTED
                          └── PACKING
                                └── READY_FOR_PICKUP
                                      └── RIDER_ASSIGNED
                                            └── PICKED_UP
                                                  └── OUT_FOR_DELIVERY
                                                        ├── FAILED
                                                        └── DELIVERED
                                                              └── COMPLETED

Any state → CANCELLED (except terminal states)
```

Enforced by the `can_transition_order(p_current, p_new)` DB function.

---

## RLS Policies Summary

| Table | Customer | Merchant | Courier | Admin |
|-------|----------|----------|---------|-------|
| `profiles` | Own only | Own only | Own only | All |
| `merchants` | Public (approved+active) | Own only | — | All |
| `products` | Public (available) | Own only | — | All |
| `orders` | Own only | Own store | Assigned only | All |
| `dispatch_offers` | — | Create only | Own only | All |
| `rider_locations` | Read (during active delivery) | Read (during active delivery) | Own only | All |
| `wallet_ledger` | — | Own | Own | All |
| `notifications` | Own only | Own only | Own only | All |
| `reviews` | Create/edit own | — | — | All |
| `complaints` | Own filed/against | Own filed/against | Own filed/against | All |

---

## Realtime Enabled Tables

| Table | Who subscribes | What they see |
|-------|----------------|---------------|
| `orders` | Merchant dashboard | New orders appear instantly; status changes live |
| `dispatch_offers` | Courier dashboard | New dispatch offers flash on Radar tab |
| `rider_locations` | Customer order status page | Rider moves on the map in real time |
| `notifications` | All users | Notification bell updates without refresh |
| `order_status_history` | Customer order tracking | Timeline updates live |

---

## Storage Buckets (5 Total)

| Bucket | Access | Path Pattern | Content |
|--------|--------|-------------|---------|
| `merchant-documents` | **PRIVATE** | `{merchant_id}/permit.pdf` | KRA PIN scan, business permit, health certificate |
| `rider-documents` | **PRIVATE** | `{rider_id}/id.pdf`, `{rider_id}/license.pdf` | National ID, driving license, logbook |
| `product-images` | **PUBLIC** | `{merchant_id}/{product_id}.jpg` | Product photos shown on storefront |
| `merchant-branding` | **PUBLIC** | `{merchant_id}/logo.png`, `{merchant_id}/cover.jpg` | Store logo and cover banner |
| `profile-avatars` | **PUBLIC** | `{user_id}/avatar.jpg` | User profile photos |

> Create these in **Supabase Dashboard → Storage → New Bucket**. Private buckets require signed URLs (Supabase handles this automatically).

---

## Auth Flow (Enforced by Schema)

```
1. User signs up (any role)
   → auth.users row created
   → handle_new_user trigger fires
   → profiles row auto-created with roles=['customer'] (or role from metadata)
   → Email verification sent

2. User verifies email
   → on_auth_user_email_confirmed trigger fires
   → profiles.email_verified = true

3. Merchant/Courier: complete onboarding form
   → upsert into merchants / riders table
   → status = 'PENDING'

4. Admin reviews application (admin Approvals page)
   → UPDATE merchants/riders SET status = 'APPROVED'
   → Merchant/courier gets full dashboard access

5. Customer: browse stores (no account needed)
   → Products/merchants visible with public RLS policies
   → Cart in localStorage (or carts table if logged in)

6. Customer: checkout
   → Must be logged in for order creation
   → orders row inserted
   → order_status_history auto-populated by trigger
   → dispatch_offer created for nearest available rider
```

---

## Files Created / Modified

| File | Action | Purpose |
|------|--------|---------|
| `supabase/migrations/001_muncheez_complete_schema.sql` | **CREATED** | Complete DB schema — paste into SQL Editor |
| `.env` | **CREATED** | Template for Supabase URL + anon key |
| `history.md` | **UPDATED** | Session log appended |
