# Supabase Email Templates — Muncheez

Configure these templates in the Supabase dashboard: **Authentication → Emails → Templates**.

Each template has a dedicated section. The design files already exist in `emailtemp/` (e.g. `welcome.html`).
Supabase supports HTML templates with `{{ .Email }}`, `{{ .Token }}`, `{{ .ConfirmationURL }}`, `{{ .ResetURL }}`, etc.

---

## 1. Confirm sign up
**Template name:** `confirmation`
**When:** User signs up (customer, merchant, or rider).
**Action:** Ask them to confirm their email address after signing up.
**Variables:** `{{ .ConfirmationURL }}`

```
Subject: Confirm your email — Muncheez
```

---

## 2. Invite user
**Template name:** `invite`
**When:** Admin invites someone to create an account (future feature).
**Action:** Invite someone to create an account.
**Variables:** `{{ .ConfirmationURL }}`

```
Subject: You're invited to join Muncheez
```

---

## 3. Magic link or OTP
**Template name:** `magic_link`
**When:** User requests a one-time sign-in link or OTP.
**Action:** Send a one-time sign-in link or one-time password.
**Variables:** `{{ .MagicLink }}` or `{{ .Token }}`

```
Subject: Your Muncheez sign-in link
```

---

## 4. Change email address
**Template name:** `email_change`
**When:** User changes their email address.
**Action:** Ask users to verify their new email address after changing it.
**Variables:** `{{ .ConfirmationURL }}`

```
Subject: Confirm your new email — Muncheez
```

---

## 5. Reset password
**Template name:** `recovery`
**When:** User clicks "Forgot password".
**Action:** Send a password reset link or code.
**Variables:** `{{ .ResetURL }}`

```
Subject: Reset your Muncheez password
```

---

## 6. Reauthentication
**Template name:** `reauthentication`
**When:** User needs to re-enter their password for a sensitive operation.
**Action:** Ask users to verify their identity before a sensitive operation.
**Variables:** `{{ .Token }}`

```
Subject: Re-authenticate to continue — Muncheez
```

---

## Security (transactional notifications)

### 7. Password changed
**Template name:** `password_changed` (custom — send via a database trigger or edge function)
**When:** User's password has changed.
**Notify users when their password has changed.**

### 8. Email address changed
**Template name:** `email_changed` (custom)
**When:** User's email address has changed.
**Notify users when their email address has changed.**

### 9. Phone number changed
**Template name:** `phone_changed` (custom)
**When:** User's phone number has changed.
**Notify users when their phone number has changed.**

### 10. Sign-in method linked
**Template name:** `sign_in_method_linked` (custom)
**When:** A sign-in method has been linked to their account.
**Notify users when a sign-in method has been linked to their account.**

### 11. Sign-in method removed
**Template name:** `sign_in_method_removed` (custom)
**When:** A sign-in method has been removed from their account.
**Notify users when a sign-in method has been removed from their account.**

### 12. MFA method added
**Template name:** `mfa_added` (custom)
**When:** An MFA method has been added to their account.
**Notify users when an MFA method has been added to their account.**

### 13. MFA method removed
**Template name:** `mfa_removed` (custom)
**When:** An MFA method has been removed from their account.
**Notify users when an MFA method has been removed from their account.**

---

## Sender details (Authentication → Emails → Configuration)

- **Sender email address:** `marketing@muncheez.co.ke`
- **Sender name:** `Muncheez :)`

## SMTP Settings (Authentication → Emails → SMTP Settings)

Enable custom SMTP if you want emails to land in the recipient's inbox
instead of Supabase's default delivery. Current dashboard values:

- **Host:** `Muncheez.co.ke`
- **Port:** `465`
- **Username:** `Muncheez`
- **Password:** (stored, hidden — enter a new one to replace)

## Routing per portal

All three signup flows (customer, merchant, rider) use the same Supabase Auth
user table, but the role is stored in `raw_user_meta_data.role` and in
`public.profiles.roles`. After the user clicks the confirmation link:

- `role = customer` → `/login`
- `role = merchant` → `/merchant/login`
- `role = courier` → `/rider/login`

This is handled in `src/pages/auth/AuthCallback.tsx` via `ROLE_DESTINATIONS`.