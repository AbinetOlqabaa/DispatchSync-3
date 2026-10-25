# Phase 3 — Authentication, Registration and Authorization

## Objective
Audit and complete authentication and membership-scoped authorization without replacing working systems unnecessarily.

## Required user journeys
- Registration with name, mobile number (E.164), password, confirm-password validation, password visibility toggle, active business creation, and Fayda e-ID national ID verification (16-digit FAN, 12-digit FIN) with live SMS OTP verification.
- Administrator and Super Administrator roles strictly removed from public self-registration (enforced on both client and server).
- One-time cryptographically random timing-safe bootstrap token mechanism for first super-admin provisioning; audit and invalidate immediately after use.
- Sign in with mobile number + password, session expiry/refresh behavior, generic invalid-credential errors that do not leak account existence.
- Forgot password recovery requiring mobile number + matching FAN + FIN followed by OTP challenge to the account's registered phone.
- Signed-in user profile management: profile photo upload/preview/removal (max 2MB, image MIME type validation), and password change requiring current password and a step-up OTP challenge.
- Role-aware dashboards/navigation for Super Administrator, Business Owner, Sender, Receiver.
- Administrator User Governance (`/api/admin/users`): search by name/phone/FAN, role filter, status filter, audited suspension with justification, reactivation, and last active super-admin lockout protection.

## Authorization rules
- Treat UI route guards as usability, not security. Enforce authorization in server routes/functions and database rules.
- Resolve permissions from authenticated identity + active business membership + resource relationships. Never trust role/business IDs supplied by client without checking them.
- A user may hold different roles in different businesses. Do not rely on one global role string.
- Deny by default and test IDOR/cross-tenant attempts for reads, writes, exports, uploads and nested resources.
- Fayda national ID numbers (FAN/FIN) are strictly protected: masked on server, never exposed in plain text in client storage or on dashboard cards.
- Fayda verification uses an adapter pattern: developer simulation badge (`[SIMULATION / DEV MODE]`) in test/sandbox; production fails closed if provider is unconfigured.
- OTP challenges are cryptographically generated, single-use, purpose-bound, 5-minute expiry, 30s resend cooldown, max 5 attempts with auto-revocation, rate-limited by phone.
- Account suspension immediately invalidates all active session tokens and blocks subsequent authentication.

## Deliverables
- Implement/fix applicable auth and onboarding pages and server-side checks.
- Document provider setup and environment variables in `.env.example` without real secrets.
- Add tests for authentication state, membership switching, role permission boundaries, invitation expiry/replay, reset flows, Fayda verification, OTP lifecycle, and admin user governance.
- Update `.ai/BUILD_STATE.md`; identify which flows are real, mocked, or blocked by provider configuration.
