# Phase 9 — Release and Staging Checklist

## Build and quality
- [ ] Install from lockfile using documented command.
- [ ] Run lint/typecheck, unit/integration tests and production build; record exact output and exit status.
- [ ] Verify supported runtime and PWA install/update behavior. Do not claim native APK unless built and tested.
- [ ] Test supported browsers and target tablet/mobile/desktop viewports.

## Identity, data and security
- [ ] Real authentication provider configured; recovery and session behavior verified.
- [ ] Production database and restrictive rules configured; no in-memory store used as production persistence.
- [ ] Server-side authorization and tenant isolation tested.
- [ ] Secrets supplied through secure environment; no secrets in repository/client bundle.
- [ ] Backup, restore, retention, deletion and incident-response procedures defined.
- [ ] Evidence storage is private and access-controlled if enabled.
- [ ] Super-admin bootstrap/rotation/recovery documented and tested.

## Integrations and operations
- [ ] Email/SMS/push/WhatsApp providers configured only where needed; provider delivery outcomes verified.
- [ ] Monitoring, structured logs, alerting, health checks and error tracking configured.
- [ ] Rate limits, abuse protection and operational support procedures reviewed.
- [ ] Data migration and rollback plan documented.
- [ ] Privacy notice, terms, consent and applicable local legal/privacy review completed.
- [ ] Domain, TLS, CORS/CSP, PWA caching and deployment settings reviewed.

## Product quality
- [ ] All role workflows tested end to end.
- [ ] No starter/kernel placeholder content or unnecessary demo UI remains in normal production experience.
- [ ] Demo data and sandbox status are unmistakable in development/staging and absent or disabled in production.
- [ ] Responsive acceptance passed at mobile, tablet portrait, tablet landscape and desktop.
- [ ] Accessibility and keyboard/touch interaction reviewed.
- [ ] Known defects and limitations disclosed.

## Verdict rules
Choose one and justify it with evidence:
- NOT READY — build, critical workflow or critical security gate fails.
- READY FOR STAGING — build/tests pass, but production credentials, provider setup, operational controls, legal review or other external staging gates remain.
- READY FOR PRODUCTION REVIEW — release gates appear satisfied, but human security/privacy/operational review is still required.
Never claim “production ready” solely because demo tests pass.
