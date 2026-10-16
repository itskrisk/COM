# Supabase Email & SMTP Configuration Guide — Muncheez

This document outlines the complete setup for email templates, custom SMTP for `muncheez.co.ke`, and the smart routing system that guides Customers, Merchants, and Couriers to their respective portals after verifying.

---

## 1. Smart Link Routing Architecture

### Why Generalized Email Templates with Smart App Routing?
Supabase Auth (GoTrue) provides **one universal email slot** per action (e.g., one *Confirm sign up* template for everyone). When a user signs up on `/signup` (Customer), `/merchant/signup` (Merchant), or `/rider/signup` (Courier), the same trigger is fired.

To make this feel completely bespoke and seamless:
1. **Universal Network Copy**: Every email template is styled with high-end Muncheez editorial typography, welcoming members to the *Customer, Merchant & Courier Network*.
2. **Direct Callback (`/auth/callback`)**: When the user clicks `{{ .ConfirmationURL }}`, Supabase verifies the security token and lands the user on:
   ```
   https://muncheez.co.ke/auth/callback
   ```
3. **Automatic Role & State Detection**: The app's `AuthCallback.tsx` checks:
   - User metadata role (`user_metadata.role`)
   - Database `profiles` table (`roles` / `role`)
   - `merchants` table (checks if onboarded or approved)
   - `riders` table (checks if onboarded or approved)
   - Auto-routes to:
     - **Customer**: `/login?verified=true` or `/stores`
     - **Merchant**:
       - If approved: `/merchant/dashboard`
       - If onboarding submitted: `/pending-approval`
       - If new: `/merchant/onboarding`
     - **Courier / Rider**:
       - If approved: `/rider/dashboard`
       - If onboarding submitted: `/pending-approval`
       - If new: `/rider/onboarding`
     - **Recovery Link**: `/auth/reset-password`
     - **Session Error Fallback**: Presents direct one-click buttons to *Customer Login*, *Merchant Login*, and *Rider Login*.

---

## 2. Supabase URL Configuration

In your Supabase project dashboard, navigate to:
**Authentication → URL Configuration**

### Site URL
```
https://muncheez.co.ke
```

### Redirect URLs
Add these entries to the **Redirect URLs** list:
```
https://muncheez.co.ke/auth/callback
https://muncheez.co.ke/auth/reset-password
https://muncheez.co.ke/**
http://localhost:5173/**
http://localhost:3000/**
```

---

## 3. Custom SMTP Setup for `muncheez.co.ke`

In Supabase Dashboard, navigate to:
**Authentication → Email Settings** (or **Authentication → Emails → SMTP Settings**)

Toggle **Enable Custom SMTP** to **ON**.

### Recommended Provider: Resend (Fastest & Free 3,000 emails/month)
1. Sign up at [resend.com](https://resend.com)
2. Add your domain: `muncheez.co.ke`
3. Add the DNS records provided by Resend (MX, TXT/DKIM, SPF) to your domain DNS registrar (Cloudflare, cPanel, or GoDaddy).
4. Create an API Key in Resend.
5. In Supabase, fill in:
   - **Sender email**: `noreply@muncheez.co.ke` (or `marketing@muncheez.co.ke`)
   - **Sender name**: `Muncheez`
   - **Host**: `smtp.resend.com`
   - **Port**: `465` (SSL) or `587` (TLS)
   - **Minimum TLS version**: `TLSv1.2`
   - **Username**: `resend`
   - **Password**: `re_your_api_key_here`

### Alternative Provider: cPanel / Hostinger / Webmail
If using your hosting server's direct SMTP:
- **Sender email**: `noreply@muncheez.co.ke`
- **Sender name**: `Muncheez`
- **Host**: `mail.muncheez.co.ke` (or host server IP/domain)
- **Port**: `465` (SSL) or `587` (TLS)
- **Username**: `noreply@muncheez.co.ke`
- **Password**: `your_webmail_password`

### DNS Verification Checklist for `muncheez.co.ke`
To ensure 100% inbox delivery and avoid the spam folder:
- **SPF Record**: `v=spf1 include:resend.com ~all` (or your SMTP provider's SPF)
- **DKIM Record**: Provided in your SMTP provider dashboard (CNAME or TXT)
- **DMARC Record**: `TXT` record at `_dmarc.muncheez.co.ke`:
  ```
  v=DMARC1; p=none; rua=mailto:dmarc@muncheez.co.ke
  ```

---

## 4. Email Templates Catalog

All production-ready HTML files are saved in the project under `emailtemp/`.
Copy the contents of each file and paste it into the corresponding field in the Supabase Dashboard under:
**Authentication → Email Templates**

### Category A: Authentication Templates

| # | Template Name in Supabase | Subject Line | Source File | Variables Used |
|---|---------------------------|--------------|-------------|----------------|
| 1 | **Confirm sign up** | `Confirm your Muncheez account` | [`emailtemp/confirm_signup.html`](emailtemp/confirm_signup.html) | `{{ .ConfirmationURL }}`, `{{ .Token }}` |
| 2 | **Invite user** | `You're invited to join Muncheez` | [`emailtemp/invite_user.html`](emailtemp/invite_user.html) | `{{ .ConfirmationURL }}` |
| 3 | **Magic link or OTP** | `Your Muncheez sign-in link` | [`emailtemp/magic_link.html`](emailtemp/magic_link.html) | `{{ .ConfirmationURL }}`, `{{ .Token }}` |
| 4 | **Change email address** | `Confirm your new Muncheez email` | [`emailtemp/change_email.html`](emailtemp/change_email.html) | `{{ .ConfirmationURL }}` |
| 5 | **Reset password** | `Reset your Muncheez password` | [`emailtemp/reset_password.html`](emailtemp/reset_password.html) | `{{ .ConfirmationURL }}` |
| 6 | **Reauthentication** | `Re-authenticate your Muncheez identity` | [`emailtemp/reauthentication.html`](emailtemp/reauthentication.html) | `{{ .Token }}` |

---

### Category B: Security Templates

| # | Template Name in Supabase | Subject Line | Source File | Type |
|---|---------------------------|--------------|-------------|------|
| 7 | **Password changed** | `Security Alert: Muncheez password changed` | [`emailtemp/security_password_changed.html`](emailtemp/security_password_changed.html) | Transactional alert |
| 8 | **Email address changed** | `Security Alert: Muncheez email address updated` | [`emailtemp/security_email_changed.html`](emailtemp/security_email_changed.html) | Transactional alert |
| 9 | **Phone number changed** | `Security Alert: Muncheez phone number updated` | [`emailtemp/security_phone_changed.html`](emailtemp/security_phone_changed.html) | Transactional alert |
| 10 | **Sign-in method linked** | `Security Alert: Sign-in method linked` | [`emailtemp/security_signin_linked.html`](emailtemp/security_signin_linked.html) | Transactional alert |
| 11 | **Sign-in method removed** | `Security Alert: Sign-in method removed` | [`emailtemp/security_signin_removed.html`](emailtemp/security_signin_removed.html) | Transactional alert |
| 12 | **MFA method added** | `Security Alert: Two-factor authentication enabled` | [`emailtemp/security_mfa_added.html`](emailtemp/security_mfa_added.html) | Transactional alert |
| 13 | **MFA method removed** | `Security Alert: Two-factor authentication disabled` | [`emailtemp/security_mfa_removed.html`](emailtemp/security_mfa_removed.html) | Transactional alert |

---

## 5. Testing & Verification

1. **Sign up a test Customer**:
   - Go to `https://muncheez.co.ke/signup`
   - Fill in details and register
   - Check test inbox for *Confirm sign up* email
   - Click the button; verify it redirects via `/auth/callback` to `/login` or `/stores`.
2. **Sign up a test Merchant**:
   - Go to `https://muncheez.co.ke/merchant/signup`
   - Fill in details and register
   - Check test inbox; click confirmation link
   - Verify it redirects directly to `/merchant/onboarding` (or `/pending-approval`).
3. **Sign up a test Courier**:
   - Go to `https://muncheez.co.ke/rider/signup`
   - Fill in details and register
   - Check test inbox; click confirmation link
   - Verify it redirects directly to `/rider/onboarding` (or `/pending-approval`).
4. **Password Reset**:
   - Go to `https://muncheez.co.ke/auth/forgot-password`
   - Submit email; click link in inbox
   - Verify it redirects directly to `https://muncheez.co.ke/auth/reset-password`.
