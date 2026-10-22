# Release and deployment checklist

## Build and code quality
- [ ] Build/type-check/lint passes in the actual project environment.
- [ ] Relevant unit and integration tests pass.
- [ ] Critical end-to-end flows verified or clearly marked not run.
- [ ] No hardcoded secrets or test credentials.
- [ ] Dependencies reviewed; lockfile committed if applicable.
- [ ] Error, loading, empty and permission-denied states tested.
- [ ] Mobile layout, keyboard/screen-reader basics, and horizontal overflow tested.
- [ ] Demo data and mock adapters clearly separated from production data.

## Identity and security
- [ ] Authentication providers configured in their real console.
- [ ] Email/phone verification behavior confirmed.
- [ ] Super-admin provisioned using secure server-side procedure.
- [ ] Database rules and server authorization deployed and tested.
- [ ] Rate limits, abuse protections and App Check configured where supported.
- [ ] Secret storage and least-privilege service identities configured.
- [ ] Recovery, session revocation and account suspension tested.
- [ ] Privacy notice, retention/deletion and incident contact reviewed.

## Data and operations
- [ ] Production database and indexes configured.
- [ ] Backup/restore plan documented and restore tested.
- [ ] Monitoring, alerting and safe structured logs configured.
- [ ] Notification providers configured; delivery states tested.
- [ ] File storage rules and size/type limits configured if attachments exist.
- [ ] Timezone and date display confirmed.
- [ ] Export/report permissions tested.
- [ ] Migration/rollback plan documented.

## Platform and release
- [ ] Confirmed whether deliverable is native Android, PWA, or another platform.
- [ ] If native Android: build/signing, package ID, permissions, privacy disclosures and device testing completed.
- [ ] If PWA: manifest, icons, HTTPS, service worker behavior and installability tested; do not call it a native APK.
- [ ] Production deployment performed by authorized operator.
- [ ] Actual deployment URL/build artifact recorded only after verified.
- [ ] Local legal/privacy review completed for operating countries and communication channels.

## Release verdict
Use exactly one:
- NOT READY — critical implementation or security gaps remain.
- READY FOR STAGING — core flows work but production setup/review remains.
- READY FOR PRODUCTION REVIEW — tests and setup are verified, but final human/security/legal approval remains.
Do not declare production-ready solely because the UI looks complete.
