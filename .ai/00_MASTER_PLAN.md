# DispatchBridge Master Implementation Plan

## Mission
Continue the existing DispatchBridge application in place. The uploaded project/repository is the source of truth. Do not restart, replace the stack, or regenerate the application from scratch.

## Execution protocol
1. Inspect the actual repository, package/configuration files, route/page tree, design system, auth, persistence adapters, API/server routes, security rules, tests, PWA configuration, and this `.ai/` directory.
2. Read `README_FIRST.md`, `BUILD_STATE.md`, `01_PRODUCT_REQUIREMENTS.md`, `02_ARCHITECTURE_AND_DATA_MODEL.md`, `PROJECT_DECISIONS.md`, then the next phase document in full.
3. Compare code to requirements. Verify existing features rather than trusting historical notes.
4. Work in small, coherent changes; preserve working code and existing conventions.
5. After each phase, run relevant tests and available type-check/lint/build checks, fix failures, and update `.ai/BUILD_STATE.md` with exact evidence.
6. Continue through phases without asking for approval unless a real blocker requires credentials, external access, or an irreversible human decision.
7. Never claim tests, integrations, persistence, security, or deployment are verified unless actually tested in the current workspace.

## Phase order
1. `.ai/01_PRODUCT_REQUIREMENTS.md` — requirements and acceptance criteria.
2. `.ai/02_ARCHITECTURE_AND_DATA_MODEL.md` — architecture and domain model.
3. `.ai/03_AUTH_AND_AUTHORIZATION.md` — registration, sign-in, account recovery, membership-scoped authorization.
4. `.ai/04_DISPATCH_AND_RECONCILIATION.md` — dispatch, proof-of-view, receipt confirmation, reconciliation.
5. `.ai/05_NOTIFICATIONS_AND_AUDIT.md` — notification adapters, outbox, audit events.
6. `.ai/06_TABLET_FIRST_UI_UX_AND_ACCESSIBILITY.md` — tablet-first responsive redesign and all role pages.
7. `.ai/07_SECURITY_PRIVACY_AND_FAILURES.md` — threat model, validation, abuse prevention, failure behavior.
8. `.ai/08_TESTING_AND_ACCEPTANCE.md` — automated and manual test plan, including tablet viewport coverage.
9. `.ai/09_RELEASE_CHECKLIST.md` — staging/deployment readiness and honest release assessment.

## Definition of done for every phase
- All applicable required paths are implemented or explicitly blocked by a real external dependency.
- Server-side authorization protects all protected reads and mutations.
- Input validation and useful loading, empty, success, error, retry and permission-denied states exist.
- Tests were added and actually run where supported.
- Existing flows do not regress.
- `.ai/BUILD_STATE.md` and setup documentation are current.
- Demo/mock behavior is explicitly distinguished from real persistence and integrations.

## End-to-end target
A business owner can manage businesses, members, partners and locations; create a dispatch with multiple item lines, expected quantities, origin and destination snapshots; submit and share it; and see a proof-of-view only after an authorized recipient actually opens the detail page. The receiver reports per-line quantities, condition, discrepancy, notes and optional evidence. The sender reviews, acknowledges or disputes, and the parties see an auditable reconciled record. Notifications report actual provider status, never assumed delivery.

## Tablet-first UI acceptance gate
Treat tablet as a first-class layout target, not merely a stretched phone layout:
- Test at minimum 768x1024 portrait, 1024x768 landscape, 820x1180 portrait, 1180x820 landscape, plus mobile 390x844 and desktop 1440x900.
- Inspect every major route and every role dashboard at each representative breakpoint.
- Use responsive navigation appropriate to width: compact sidebar/rail or collapsible navigation on tablet, not phone-only bottom navigation stretched across a tablet.
- Use responsive grids, sane max-widths, readable typography, usable form columns, non-overflowing tables, and touch targets.
- Verify no horizontal page overflow, clipped dialogs, overlapping controls, excessive empty space, or cards that become too wide/tall.
- Use CSS Grid/Flexbox and content-driven breakpoints; do not rely only on device labels.
- Check touch interactions, keyboard access, focus visibility, orientation changes, zoom, and long labels/translations.
- Do not “fix” tablet layout by hiding essential functionality.

## Build-state discipline
`.ai/BUILD_STATE.md` must record:
- timestamp and runtime/platform;
- stack actually present;
- phase status and evidence;
- changed files;
- exact test/build commands and outcomes;
- features verified against real persistence vs sandbox/mock-only;
- tablet/mobile/desktop viewports checked;
- unresolved defects, external setup and secrets needed;
- exact next action for a new session.
