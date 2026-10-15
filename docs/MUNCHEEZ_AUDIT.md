# MUNCHEEZ AUDIT

## Task 1: Audit the Existing Project

### Project Overview
- **Framework**: React 19 + TypeScript + Vite 7.2.7
- **Backend**: Supabase (PostgreSQL) + optional Node/Express backend (`backend/`)
- **Routing**: React Router DOM 7 with customer, merchant, courier, admin portals
- **State**: AuthContext, MockDatabaseContext (Supabase-backed), CartContext
- **Styling**: Tailwind CSS 3 + custom CSS (`src/index.css`)

### What Works
1. **Build**: `npm run build` passes cleanly (tsc -b && vite build, 2281 modules, 22.7s)
2. **Routing**: Full route structure with legacy redirects, 404 handling, SEO metadata
3. **Auth**: Supabase auth with email confirmation gate, session persistence, role enforcement
4. **ProtectedRoute**: Role-based access + onboarding status enforcement for merchant/courier
5. **Schema**: Complete Supabase schema with RLS policies for all 20+ tables
6. **Migrations**: 5 migration files (schema, careers/waitlist, onboarding, contacts, carts)
7. **Cart**: Supabase-backed cart with localStorage fallback, single-merchant enforcement
8. **MockDatabaseContext**: All data operations route through Supabase (no mock data remaining)
9. **PartnerTicker**: Restored partner logos (Google, Voda, Ink) in both `public/logos/` and `src/assets/logos/`

### What Is Incomplete / Broken
1. **No tests**: No test files exist (`npm test` not configured for frontend; backend has Jest but backend is not running)
2. **Backend offline**: `backend/` exists but is not running; admin API calls (`adminFetch`) point to `http://localhost:5000` which is dead
3. **Admin login broken**: `src/pages/admin/Login.tsx` was edited to remove auto-provisioning; admin login requires backend or manual SQL seed
4. **Carts table migration not applied**: `supabase/migrations/005_carts_table.sql` exists but must be run manually in Supabase SQL editor
5. **Email confirmation required**: Supabase auth requires email confirmation; SMTP not configured
6. **Payment flow stubbed**: `paymentApi.initiate` returns mock data; no real M-Pesa integration
7. **No error boundaries**: Unhandled promise rejections in components
8. **No monitoring/observability**

### Mock Data Status
- **Removed**: `MockDatabaseContext.tsx` no longer uses hardcoded arrays; all data comes from Supabase via `api.ts`
- **Remaining stubs**: `paymentApi` returns mock `checkoutRequestId`; `getLoyalty` returns hardcoded tier/points; `customerApi.getCustomers` and `getPayments`/`getReports` return empty arrays

### Supabase Configuration
- **Project**: `https://ewsdumyzxmvnmjeatlqp.supabase.co`
- **Tables**: profiles, active_sessions, merchants, riders, carts, categories, products, orders, order_status_history, wallet_ledger, reviews, financial_ledger, notifications, dispatch_offers, rider_locations, complaints, warnings, campaigns, promo_codes, waitlist, job_positions, job_applications, contacts
- **RLS**: Enabled on all tables with per-role policies
- **Storage**: `documents` bucket (public read, authenticated write)

### Files Audited
- `src/main.tsx` — Provider tree (Auth → MockDatabase → Cart)
- `src/App.tsx` — Full route map with legacy redirects
- `src/context/AuthContext.tsx` — Auth with email gate, session tracking
- `src/context/MockDatabaseContext.tsx` — Supabase-backed data layer
- `src/context/CartContext.tsx` — Cart with Supabase persistence
- `src/components/ProtectedRoute.tsx` — Role + onboarding enforcement
- `src/lib/api.ts` — API service layer (customer, merchant, courier, admin, payment)
- `src/lib/supabaseService.ts` — Direct Supabase service functions
- `src/lib/supabaseClient.ts` — Supabase client config
- `src/lib/socialService.ts` — Social/search via Supabase
- `supabase/schema.sql` — Full schema with RLS, triggers, functions
- `supabase/migrations/001-005` — Migration files
- `supabase/seed_admin.sql` — Admin account seed
- `index.html` — SEO metadata, favicon, social images
- `package.json` — Dependencies and scripts
- `vite.config.ts` — Build config with code splitting
- `tsconfig.json` / `tsconfig.app.json` / `tsconfig.node.json` — TypeScript config
- `eslint.config.js` — Linting config
- `.env` — Supabase URL/anon key (gitignored)

### Next Steps
- Task 2: Establish testing baseline (run build, lint, typecheck; document failures)