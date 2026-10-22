# Master implementation plan

## Execution protocol
Work sequentially. Before each phase, read its context file. After each phase:
- implement the code and required configuration;
- run relevant tests and a build/type-check/lint command where available;
- fix failures before proceeding;
- update `.ai/BUILD_STATE.md`;
- record deviations and external setup tasks honestly.

If the project already has equivalent functionality, verify it and improve it rather than duplicating it.

## Phase order
1. `.ai/01_PRODUCT_REQUIREMENTS.md` — confirm roles, workflows, acceptance criteria.
2. `.ai/02_ARCHITECTURE_AND_DATA_MODEL.md` — app structure, entities, relationships, timestamps, state machine.
3. `.ai/03_AUTH_AND_AUTHORIZATION.md` — identity, roles, onboarding, super-admin provisioning, permissions.
4. `.ai/04_DISPATCH_AND_RECONCILIATION.md` — dispatch creation, recipient viewing, receipt confirmation and discrepancy resolution.
5. `.ai/05_NOTIFICATIONS_AND_AUDIT.md` — notification adapters, event rules, audit log.
6. `.ai/06_UI_UX_AND_ACCESSIBILITY.md` — responsive screens, role dashboards, loading/empty/error states.
7. `.ai/07_SECURITY_PRIVACY_AND_FAILURES.md` — threat model, validation, abuse protection, graceful failures.
8. `.ai/08_TESTING_AND_ACCEPTANCE.md` — unit, integration, rules, workflow and end-to-end test strategy.
9. `.ai/09_RELEASE_CHECKLIST.md` — deployment/configuration and honest release assessment.

## Definition of done for each phase
- All required user paths are implemented or explicitly marked blocked by a real dependency.
- Server-side authorization is in place for protected data mutations.
- Validation and useful error feedback exist.
- Tests have been added and actually run where tools support them.
- No obvious regression in previously working flows.
- Build state and setup instructions are updated.

## End-to-end target
A business owner can create a partner and dispatch, list multiple item types and quantities, set dispatch origin and recipient details, send/share the dispatch, and see a reliable view receipt when the partner actually opens it while authenticated. The receiver can confirm quantities received per line, mark full/partial/not received, damaged/lost or other discrepancy, add notes and optional evidence, and submit. Both parties see the same reconciled record and receive supported notifications. All important actions are permission-checked and audited.

## Build-state discipline
`.ai/BUILD_STATE.md` must include:
- current date/time and project/runtime type;
- stack and architecture actually present;
- current phase and completed phases;
- changed files;
- exact test/build commands and pass/fail/skipped status;
- working flows versus mock-only flows;
- unresolved defects and external setup requirements;
- exact next action for a new session.
