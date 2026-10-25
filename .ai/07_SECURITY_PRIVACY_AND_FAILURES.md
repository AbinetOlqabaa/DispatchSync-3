# Phase 7 — Security, Privacy, Validation and Failure Handling

## Threat model and isolation
Inspect actual auth, APIs, database rules, storage, file uploads, exports, share links, background jobs and secrets. Document trust boundaries and likely abuse paths. Deny by default. Enforce tenant/resource authorization server-side and in database rules where applicable; UI hiding is not security.

## Required controls
- Validate and normalize all untrusted input at server boundaries using the stack's schema-validation approach.
- Protect against IDOR, cross-tenant data leaks, privilege escalation, mass assignment, injection, unsafe file uploads, replay/duplicate submissions and race conditions.
- Sensitive national identity data protection: Fayda FAN (16 digits) and FIN (12 digits) are masked (`•••• •••• •••• 1234`), never logged, never returned in API payloads, never stored unencrypted, and never shown on dashboard cards.
- OTP Challenge Security: 6-digit cryptographic OTPs with SHA-256 storage, single-use enforcement, 5-minute expiry, 30s resend cooldown, max 5 attempts with auto-revocation, and phone-based rate limits.
- Account suspension: Suspended users are denied authentication, and active session tokens are rejected immediately at the auth middleware level.
- Lockout protection: Platform prevents deleting, suspending, or demoting the last remaining active Super Administrator.
- File upload restrictions: Profile photos limited to 2MB, validated for safe image MIME types (JPEG, PNG, WebP), stored securely with default initials fallback.
- Use idempotency/transaction guards for consequential writes.
- Keep secrets only in supported secret management/server environment; provide `.env.example` placeholders only.
- Use secure session/cookie/token practices, expiry/revocation where supported, CSRF protection where relevant, rate limiting and abuse controls where supported.
- Limit upload types/size, verify ownership/access on download, and avoid public evidence URLs unless explicitly safe.
- Add security headers and restrictive CORS/Content Security Policy where compatible with deployment.
- Avoid sensitive values in logs/errors; return useful but non-revealing error messages.
- Apply pagination and bounded filters to list/export endpoints.
- Use UTC/server timestamps, explicit retention/deletion/backup behavior and minimal data collection.
- Offline data must be labeled unsynced and handle conflicts; do not promise unsupported offline capabilities.

## Failure behavior
Every consequential action needs loading, success, failure, retry, and duplicate-submission behavior. Handle network loss, provider outage, expired session, stale form/version conflicts, missing configuration and permission denial honestly.

## Deliverables
Add/adjust threat-model notes and automated tests for security boundaries and failure cases. Record issues that require professional review or external setup. Never claim a compliance certification from these checks.
