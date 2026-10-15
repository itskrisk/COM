# MUNCHEEZ IMPLEMENTATION PLAN

## Global Rules

- Inspect the existing code before making changes. Never assume how the application is structured.
- Work on one task at a time, in the order listed below.
- Use the existing React, TypeScript, Vite and Supabase setup wherever possible.
- Maintain one shared application and one Supabase source of truth for all user roles.
- Remove mock data from production features and replace it with real, persisted data.
- Enforce permissions and access control on the backend, including Supabase RLS policies.
- Never expose secrets, disable RLS, reset the database or delete real data.
- Do not make destructive changes or introduce major new dependencies without approval.
- Do not modify or import anything from `COMEAROUND/`. It is archived.
- Preserve existing functionality and design unless a change is necessary.
- After each task, provide a report and stop. Wait for Kris to review and approve before continuing.

## Task 1: Audit the Existing Project

Inspect the repository, application structure, routes, components, authentication, Supabase configuration, database schema, migrations, integrations and existing tests.

Identify what works, what is incomplete, what uses mock data and what is broken. Document the findings in `docs/MUNCHEEZ_AUDIT.md`.

Do not modify application code during this task.

## Task 2: Establish the Testing Baseline

Run the available build, TypeScript, linting and test commands. Record existing errors and warnings before making changes.

Identify missing tests and establish a reliable way to verify future changes. Do not hide existing failures or overwrite uncommitted work.

## Task 3: Audit the Database and Security

Review Supabase tables, relationships, authentication, RLS policies, storage permissions, database functions and triggers.

Confirm that customers, merchants, riders and administrators can only access and modify information permitted by their roles. Make only necessary, safe corrections that fit the existing architecture.

## Task 4: Fix Authentication and Sessions

Implement and verify registration, login, email confirmation, session restoration, logout, password recovery and session expiration.

Ensure protected routes work correctly and users cannot access dashboards belonging to other roles. Administrative privileges must be verified securely on the backend, not through frontend role checks alone.

## Task 5: Complete Merchant and Rider Onboarding

Make merchant and rider registration functional, including required forms, document uploads, validation and submission.

Persist applications in Supabase and display their actual verification status. Prevent unapproved accounts from accessing restricted features while allowing applicants to see their application status.

## Task 6: Complete Admin Approvals

Allow administrators to review submitted merchant and rider applications, inspect relevant information, approve or reject applications, and request corrections where supported.

Persist every decision and ensure approval status controls access to the appropriate dashboard and functionality.

## Task 7: Connect Public Stores and Products

Replace mock storefront data with actual Supabase records.

Ensure visitors can browse approved stores and available products, view product details and use existing search, category, filtering and sorting features. Product images, availability and prices must reflect stored data.

Keep public browsing accessible without requiring customers to sign in.

## Task 8: Complete Cart, Checkout and Orders

Implement a functional cart and checkout process, with orders saved to Supabase and linked to the correct customer.

Validate product availability, quantities, prices and totals on the server. Prevent duplicate orders and unauthorized access to another customer's orders. Ensure order details remain consistent throughout the workflow.

## Task 9: Implement Real Payments

Inspect the existing payment configuration and determine which payment providers are actually connected.

Implement the required payment flow, including transaction references, callback verification, idempotency and payment status updates. Never mark an order as paid based solely on a frontend response.

If credentials, provider approval or external configuration are missing, document the blocker. Do not simulate a successful payment.

## Task 10: Complete the Merchant Dashboard

Allow approved merchants to manage their stores, products, prices, inventory and incoming orders.

Ensure changes are saved to Supabase and immediately reflected in the relevant customer-facing pages. Display genuine order and sales metrics derived from available records rather than hardcoded figures.

## Task 11: Complete the Rider Dashboard

Allow approved riders to view eligible deliveries, manage assigned orders and update delivery progress through valid status transitions.

Persist updates and ensure customers, merchants and administrators see the correct order status. Prevent conflicting assignments and unauthorized changes. Calculate earnings only from actual recorded data.

## Task 12: Complete Admin Operations and Cross-Role Synchronization

Ensure administrators can manage relevant users, stores, products, orders, applications and operational issues according to their permissions.

Test the complete workflow from customer order placement through merchant processing, rider delivery and final order completion. All dashboards must use the same underlying records and reflect changes consistently.

## Task 13: Complete Accounts, Forms and Cookie Preferences

Review customer profiles, account settings, support forms, partnership applications, careers forms, footer links and other existing site forms.

Ensure forms validate inputs, provide clear success and error messages, and persist submissions where required. Implement meaningful cookie preference controls and secure handling of uploaded documents.

Do not leave visible controls that appear functional but do nothing.

## Task 14: Fix Responsive Design and Routing

Review the application on mobile, tablet and desktop screen sizes.

Fix broken layouts, overflow, inconsistent spacing, inaccessible controls and navigation issues. Verify the admin dashboard, profile interfaces, store navigation and existing routes, including relevant query parameters.

Preserve the existing homepage navbar and unrelated navigation unless a specific defect requires a change.

## Task 15: Production Readiness Review

Perform a final review of security, authentication, database permissions, mock data, error handling, performance, accessibility, SEO, responsive design, integrations and critical user journeys.

Verify builds and tests, review database migration safety, and identify backup and deployment requirements. Test the main workflows end to end wherever the available environment permits.

Create `docs/MUNCHEEZ_PRODUCTION_READINESS_REPORT.md` containing verified results, remaining defects, external blockers and anything requiring manual configuration or testing. Do not claim production readiness while critical issues remain unresolved.

## Required Report After Every Task

After completing each task, provide:

1. **Status:** READY FOR REVIEW, BLOCKED or FAILED.
2. **Findings:** What was discovered and what was addressed.
3. **Files changed:** List the important files created or modified.
4. **Database and configuration changes:** Explain any changes and their risks.
5. **Verification:** Commands run, tests performed and their actual results.
6. **Manual checks:** Anything Kris needs to verify personally.
7. **Remaining issues:** Known defects, limitations and external dependencies.
8. **Acceptance criteria:** Which requirements have been met and which remain incomplete.
9. **Next task:** Name the next task without executing it.

## Final Execution Rule

Complete exactly one task per run. Do not start the next task automatically. Stop after presenting the report and wait for Kris's explicit approval before proceeding.