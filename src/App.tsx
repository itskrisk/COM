import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/layout/Navbar";
import AdminLayout from "./layouts/AdminLayout";
import CustomerLayout from "./layouts/CustomerLayout";
import ProtectedRoute from "./components/ProtectedRoute";

// ── Customer / Public Shopping ──────────────────────────────────────────────
import Home from "./pages/customer/Home";
import StoreListing from "./pages/customer/StoreListing";
import StoreFront from "./pages/customer/StoreFront";
import CheckoutView from "./pages/customer/CheckoutView";
import OrderStatus from "./pages/customer/OrderStatus";
import CustomerLogin from "./pages/customer/Login";
import CustomerSignup from "./pages/customer/Signup";

// ── Authentication ──────────────────────────────────────────────────────────
import AuthCallback from "./pages/auth/AuthCallback";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import VerifyEmail from "./pages/auth/VerifyEmail";

// ── State Screens ───────────────────────────────────────────────────────────
import PendingApproval from "./pages/PendingApproval";
import Rejected from "./pages/Rejected";
import Suspended from "./pages/Suspended";

// ── Public Corporate Pages ──────────────────────────────────────────────────
import OurStory from "./pages/common/OurStory";
import OurTeam from "./pages/common/OurTeam";
import Careers from "./pages/common/Careers";
import JobApplicationPage from "./pages/common/JobApplicationPage";
import Newsroom from "./pages/common/Newsroom";
import PressReleases from "./pages/common/PressReleases";
import MediaKit from "./pages/common/MediaKit";
import CorporateInfo from "./pages/common/CorporateInfo";
import InvestorRelations from "./pages/common/InvestorRelations";
import WaitlistPage from "./pages/common/WaitlistPage";
import ComingSoon from "./pages/common/ComingSoon";
import NotFound from "./pages/common/NotFound";

// ── Support & Legal ─────────────────────────────────────────────────────────
import LegalPage from "./pages/common/LegalPage";

// ── Merchant Portal ─────────────────────────────────────────────────────────
import PartnerLogin from "./pages/merchant/PartnerLogin";
import PartnerSignup from "./pages/merchant/PartnerSignup";
import MerchantOnboarding from "./pages/merchant/Onboarding";
import MerchantDashboard from "./pages/merchant/Dashboard";

// ── Rider Portal ────────────────────────────────────────────────────────────
import CourierLogin from "./pages/courier/Login";
import CourierSignup from "./pages/courier/Signup";
import CourierOnboarding from "./pages/courier/Onboarding";
import CourierDashboard from "./pages/courier/Dashboard";

// ── Admin ───────────────────────────────────────────────────────────────────
import AdminLogin from "./pages/admin/Login";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminMerchants from "./pages/admin/Merchants";
import AdminRiders from "./pages/admin/Riders";
import AdminOrders from "./pages/admin/Orders";
import AdminCustomers from "./pages/admin/Customers";
import AdminFinancials from "./pages/admin/Financials";
import AdminInventory from "./pages/admin/Inventory";
import AdminMarketing from "./pages/admin/Marketing";
import AdminApprovals from "./pages/admin/Approvals";
import AdminWaitlist from "./pages/admin/Waitlist";
import AdminCareers from "./pages/admin/Careers";
import AdminSettings from "./pages/admin/Settings";
import AdminSupport from "./pages/admin/Support";

// ── Legacy Redirects ────────────────────────────────────────────────────────
import LegacyRedirect from "./routes/LegacyRedirect";
import ScrollToTop from "./routes/ScrollToTop";

/**
 * Muncheez route architecture (canonical domain: https://muncheez.co.ke)
 *
 * Route groups:
 *   1. Customer / public shopping   /, /stores, /stores/:id, /checkout, /order/:id
 *   2. Authentication               /login, /signup, /auth/*
 *   3. Public corporate             /company/*, /waitlist
 *   4. Support & legal              /terms, /privacy, /cookies, /contact, /help, /help/faq
 *   5. Merchant portal              /merchant/*
 *   6. Rider portal                 /rider/*
 *   7. Administration               /admin/*
 *   8. Legacy redirects             old pre-restructure URLs → canonical (query-preserving)
 *   9. 404                          unknown URLs render NotFound (never redirect home)
 */
export default function App() {
    return (
        <BrowserRouter>
            <ScrollToTop />
            <Routes>
                {/* ═══ 1. CUSTOMER / PUBLIC SHOPPING ═══ */}
                <Route element={<CustomerLayout />}>
                    <Route path="/" element={<><Navbar /><Home /></>} />
                    <Route path="/stores" element={<StoreListing />} />
                    <Route path="/stores/:id" element={<StoreFront />} />
                    <Route path="/checkout" element={<CheckoutView />} />
                    <Route path="/order/:id" element={<OrderStatus />} />
                    <Route
                        path="/social"
                        element={<Navigate to="/coming-soon" state={{ name: "The Feed" }} replace />}
                    />
                </Route>

                {/* ═══ 2. AUTHENTICATION ═══ */}
                <Route path="/login" element={<CustomerLogin />} />
                <Route path="/signup" element={<CustomerSignup />} />
                <Route path="/auth/forgot-password" element={<ForgotPassword />} />
                <Route path="/auth/reset-password" element={<ResetPassword />} />
                <Route path="/auth/verify" element={<VerifyEmail />} />
                {/* Supabase OAuth / email callback — do not move this route */}
                <Route path="/auth/callback" element={<AuthCallback />} />

                {/* ── Onboarding State Screens ──────────────────────────────── */}
                <Route path="/pending-approval" element={<PendingApproval />} />
                <Route path="/rejected" element={<Rejected />} />
                <Route path="/suspended" element={<Suspended />} />

                {/* ═══ 3. PUBLIC CORPORATE ═══ */}
                <Route path="/company/story" element={<OurStory />} />
                <Route path="/company/team" element={<OurTeam />} />
                <Route path="/company/careers" element={<Careers />} />
                <Route path="/company/careers/apply" element={<JobApplicationPage />} />
                <Route path="/company/careers/apply/:id" element={<JobApplicationPage />} />
                <Route path="/company/news" element={<Newsroom />} />
                <Route path="/company/news/press-releases" element={<PressReleases />} />
                <Route path="/company/news/media-kit" element={<MediaKit />} />
                <Route path="/company/news/corporate" element={<CorporateInfo />} />
                <Route path="/company/investors" element={<InvestorRelations />} />
                <Route path="/waitlist" element={<WaitlistPage />} />
                <Route path="/coming-soon" element={<ComingSoon />} />

                {/* ═══ 4. SUPPORT & LEGAL (canonical) ═══ */}
                <Route path="/terms" element={<LegalPage forceType="terms-of-service" />} />
                <Route path="/privacy" element={<LegalPage forceType="privacy-policy" />} />
                <Route path="/cookies" element={<LegalPage forceType="cookie-policy" />} />
                <Route path="/contact" element={<LegalPage forceType="contact-us" />} />
                <Route path="/help" element={<LegalPage forceType="help-center" />} />
                <Route path="/help/faq" element={<LegalPage forceType="faq" />} />

                {/* ═══ 5. MERCHANT PORTAL ═══ */}
                <Route path="/merchant/login" element={<PartnerLogin />} />
                <Route path="/merchant/signup" element={<PartnerSignup />} />
                <Route path="/merchant/onboarding" element={<MerchantOnboarding />} />
                <Route
                    path="/merchant/dashboard"
                    element={
                        <ProtectedRoute requiredRole="merchant">
                            <MerchantDashboard />
                        </ProtectedRoute>
                    }
                />
                <Route path="/merchant" element={<Navigate to="/merchant/dashboard" replace />} />

                {/* ═══ 6. RIDER PORTAL ═══ */}
                <Route path="/rider/login" element={<CourierLogin />} />
                <Route path="/rider/signup" element={<CourierSignup />} />
                <Route path="/rider/onboarding" element={<CourierOnboarding />} />
                <Route
                    path="/rider/dashboard"
                    element={
                        <ProtectedRoute requiredRole="courier">
                            <CourierDashboard />
                        </ProtectedRoute>
                    }
                />
                <Route path="/rider" element={<Navigate to="/rider/dashboard" replace />} />

                {/* ═══ 7. ADMINISTRATION ═══ */}
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route
                    element={
                        <ProtectedRoute requiredRole="admin">
                            <AdminLayout />
                        </ProtectedRoute>
                    }
                >
                    <Route path="/admin" element={<AdminDashboard />} />
                    <Route path="/admin/dashboard" element={<AdminDashboard />} />
                    <Route path="/admin/merchants" element={<AdminMerchants />} />
                    <Route path="/admin/riders" element={<AdminRiders />} />
                    <Route path="/admin/orders" element={<AdminOrders />} />
                    <Route path="/admin/customers" element={<AdminCustomers />} />
                    <Route path="/admin/financials" element={<AdminFinancials />} />
                    <Route path="/admin/inventory" element={<AdminInventory />} />
                    <Route path="/admin/marketing" element={<AdminMarketing />} />
                    <Route path="/admin/approvals" element={<AdminApprovals />} />
                    <Route path="/admin/waitlist" element={<AdminWaitlist />} />
                    <Route path="/admin/careers" element={<AdminCareers />} />
                    <Route path="/admin/settings" element={<AdminSettings />} />
                    <Route path="/admin/support" element={<AdminSupport />} />
                </Route>

                {/* ═══ 8. LEGACY REDIRECTS (old → canonical, permanent, query-preserving) ═══ */}

                {/* Corporate: was /our-story, /our-team, /careers, /newsroom, /investors */}
                <Route path="/our-story" element={<LegacyRedirect to="/company/story" />} />
                <Route path="/our-team" element={<LegacyRedirect to="/company/team" />} />
                <Route path="/careers" element={<LegacyRedirect to="/company/careers" />} />
                <Route path="/careers/apply" element={<LegacyRedirect to="/company/careers/apply" />} />
                <Route path="/careers/apply/:id" element={<LegacyRedirect to="/company/careers/apply/:id" />} />
                <Route path="/newsroom" element={<LegacyRedirect to="/company/news" />} />
                <Route path="/newsroom/press-releases" element={<LegacyRedirect to="/company/news/press-releases" />} />
                <Route path="/newsroom/media-kit" element={<LegacyRedirect to="/company/news/media-kit" />} />
                <Route path="/newsroom/corporate" element={<LegacyRedirect to="/company/news/corporate" />} />
                <Route path="/investors" element={<LegacyRedirect to="/company/investors" />} />

                {/* Shopping: was /stores (customer app alias), /store/:id */}
                <Route path="/c/stores" element={<LegacyRedirect to="/stores" />} />
                <Route path="/c/store/:id" element={<LegacyRedirect to="/stores/:id" />} />
                <Route path="/store/:id" element={<LegacyRedirect to="/stores/:id" />} />

                {/* Partnerships: public landing aliases for portal signups */}
                <Route path="/partners/merchants" element={<LegacyRedirect to="/merchant/signup" />} />
                <Route path="/partners/riders" element={<LegacyRedirect to="/rider/signup" />} />

                {/* Auth: was /verify-email, /forgot-password, /reset-password */}
                <Route path="/verify-email" element={<LegacyRedirect to="/auth/verify" />} />
                <Route path="/auth/verify-email" element={<LegacyRedirect to="/auth/verify" />} />
                <Route path="/forgot-password" element={<LegacyRedirect to="/auth/forgot-password" />} />
                <Route path="/reset-password" element={<LegacyRedirect to="/auth/reset-password" />} />

                {/* Legal: was /legal/:type — canonical is now /terms, /privacy, /cookies, /contact, /help */}
                <Route path="/legal/terms-of-service" element={<LegacyRedirect to="/terms" />} />
                <Route path="/legal/privacy-policy" element={<LegacyRedirect to="/privacy" />} />
                <Route path="/legal/cookie-policy" element={<LegacyRedirect to="/cookies" />} />
                <Route path="/legal/contact-us" element={<LegacyRedirect to="/contact" />} />
                <Route path="/legal/help-center" element={<LegacyRedirect to="/help" />} />
                <Route path="/legal/faq" element={<LegacyRedirect to="/help/faq" />} />
                {/* Unknown legal slugs get the real 404, not a redirect */}
                <Route path="/legal/:type" element={<NotFound />} />

                {/* Merchant portal: was /partner/* */}
                <Route path="/partner" element={<LegacyRedirect to="/merchant/dashboard" />} />
                <Route path="/partner/login" element={<LegacyRedirect to="/merchant/login" />} />
                <Route path="/partner/signup" element={<LegacyRedirect to="/merchant/signup" />} />
                <Route path="/partner/onboarding" element={<LegacyRedirect to="/merchant/onboarding" />} />
                <Route path="/partner/dashboard" element={<LegacyRedirect to="/merchant/dashboard" />} />

                {/* Rider portal: was /courier/* */}
                <Route path="/courier" element={<LegacyRedirect to="/rider/dashboard" />} />
                <Route path="/courier/login" element={<LegacyRedirect to="/rider/login" />} />
                <Route path="/courier/signup" element={<LegacyRedirect to="/rider/signup" />} />
                <Route path="/courier/onboarding" element={<LegacyRedirect to="/rider/onboarding" />} />
                <Route path="/courier/dashboard" element={<LegacyRedirect to="/rider/dashboard" />} />

                {/* ═══ 9. 404 — unknown URLs render NotFound ═══ */}
                <Route path="*" element={<NotFound />} />
            </Routes>
        </BrowserRouter>
    );
}
