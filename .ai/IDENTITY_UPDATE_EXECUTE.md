# Execution prompt — identity, mobile login, recovery, profile and admin

You are continuing development of an existing Business Dispatch & Delivery Reconciliation application. This is an additive change request, not permission to regenerate the app.

## First
- Inspect the actual source tree, framework, auth provider, backend, database, tests, routes, UI conventions and `.ai/BUILD_STATE.md`.
- Read `.ai/IDENTITY_01_REQUIREMENTS_AND_UX.md` through `.ai/IDENTITY_07_MIGRATION_AND_RELEASE.md`.
- Compare requirements to code, then implement in place. Preserve dispatch, partner, reconciliation, notification, audit and role-dashboard features.
- Update `.ai/BUILD_STATE.md` and the existing `.ai/03_AUTH_AND_AUTHORIZATION.md`, `.ai/02_ARCHITECTURE_AND_DATA_MODEL.md`, `.ai/07_SECURITY_PRIVACY_AND_FAILURES.md`, and `.ai/08_TESTING_AND_ACCEPTANCE.md`.

## Required changes
1. Remove Administrator/Super Administrator from public registration choices. Enforce this server-side too.
2. Securely provision the first super-admin through a one-time server-side bootstrap/deployment process. No fixed default password or universal credential in source, client code or seed data. Require immediate password change and MFA/step-up where supported; audit and disable bootstrap after use.
3. Add FAN (exactly 16 numeric digits) and FIN (exactly 12 numeric digits) for non-admin registration. Preserve leading zeros by treating them as strings. Validate client- and server-side.
4. Add a provider adapter boundary for Fayda identity verification. Mock/simulation only in local/test mode, using synthetic fixtures and visible “Simulation” labels. Do not imply real Fayda API access. Production must fail closed if real verification is required but not configured.
5. Enforce unique linkage of verified phone, FAN and FIN on the server/database using atomic constraints/transactions. Use an opaque internal user ID as the primary key, not phone/FAN/FIN. Handle races and duplicates without revealing another account’s details.
6. Change sign-in to mobile number + password. Resolve mobile-to-account securely on the server using the actual auth provider’s supported flow. Never use FAN/FIN as passwords or expose the account mapping. Use generic errors, rate limits and secure session controls.
7. Implement registration and recovery OTP through a provider abstraction. Fixed test OTP is permitted only in isolated local/test mode and must be visibly labeled as simulated; reject it in production. Production OTP must be server-generated, short-lived, single-use, purpose-bound, rate-limited, and never logged.
8. Signed-in password change: require current password and OTP/step-up, then use the auth provider’s secure update API. Forgot password: mobile + FAN + FIN can initiate protected identity checks, followed by OTP to the phone already bound to the account and provider-native recovery. FAN/FIN alone must never reset a password. Avoid account enumeration.
9. Add secure profile picture upload/change/remove, a modern profile page and profile summary on each dashboard: avatar/default initials, full name, masked phone, business membership and role. Do not show FAN/FIN on dashboards.
10. Implement real server-backed administrator user management: search/filter/paginate; safe account status and verification metadata; activate/suspend; manage allowed memberships/roles; initiate recovery/invitations. All privileged actions require server authorization and audit logs. Never reveal passwords or OTPs. Protect the last super-admin from accidental lockout.
11. Add robust validation, graceful error/retry states, rate limits, duplicate-submit protection, concurrency handling and tests.
12. Update docs and build state. Run actual available tests/build/type-check/lint and report exact commands/results. Clearly distinguish simulation from production-backed features.

## Keep working
Do not stop for approval after each phase. Make safe, reversible decisions and document assumptions. Stop only for genuine blockers such as missing provider credentials or unsupported capabilities; complete independent work and document exact human steps.

## Done means
Follow `.ai/IDENTITY_06_TESTS_AND_ACCEPTANCE.md` and `.ai/IDENTITY_07_MIGRATION_AND_RELEASE.md`. Do not claim production identity verification or production security unless actually configured and tested.
