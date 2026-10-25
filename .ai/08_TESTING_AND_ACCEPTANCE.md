# Phase 8 — Testing and Acceptance

## Rules
Inspect existing test tooling first. Reuse it. Never claim a command passed unless it was run in the current workspace. If a tool is unavailable, say so and give a manual alternative.

## Test layers
- Unit: validation, quantity arithmetic/decimal precision, state transitions, permission helpers, locale formatting, FAN/FIN format validation and masking.
- Integration: auth/session, membership authorization, dispatch creation, idempotency, view receipt, receipt submission, discrepancy review, notification outbox, audit, mobile auth, OTP challenge lifecycle, end-to-end registration with Fayda, forgot password recovery, and signed-in password change with step-up OTP.
- Security: cross-tenant IDOR, unauthorized role actions, forged business IDs, mass assignment, expired/replayed invitation/share tokens, file access, export access, duplicate/replayed writes, public super-admin registration prevention, admin lockout protection, and suspension enforcement.
- Admin Governance: `/api/admin/users` pagination, search, role filtering, status filtering, suspension with audited reason, and reactivation.
- UI/component: validation feedback, loading/empty/error/retry states, navigation, responsive components, profile modal, photo upload, and tablet-first responsive layouts.
- End-to-end: registration/sign-in → onboarding/business selection → partner/location → dispatch with multiple lines → submit/share → recipient authenticated detail view → proof-of-view → receipt report → sender review/resolution → audit and notifications.
- Regression: all previously working features, including map/telemetry, scanner/checkpoints, PDF manifest, CSV import/export, analytics, languages and theme.

## Responsive test matrix
At minimum check 390x844, 768x1024, 820x1180, 1024x768 and 1440x900. Prefer also 360x800, 1180x820 and 1280x800. Test every major route for both tablet orientations. Record routes, viewports, methods and results.

## Release gates
- Lint/typecheck/build passes (`npm run lint` -> 0 errors, `compile_applet` -> SUCCESS).
- Automated tests pass: **38/38 PASS (0 failed)** via `npm test` (`tsx test/runTests.ts`).
- No known critical security issue left unacknowledged.
- All required flows work with real configured persistence, or sandbox-only limitations are clearly documented.
- No false provider delivery claims; Fayda and OTP dev simulations are transparently labeled.
- Tablet layouts pass the viewport matrix (768x1024, 820x1180 portrait; 1024x768, 1180x820 landscape) with no horizontal overflow.
- No critical flow is implemented as a fake success.
