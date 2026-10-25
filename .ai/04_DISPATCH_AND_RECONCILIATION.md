# Phase 4 — Dispatch, Proof-of-View, Receipt and Reconciliation

## Dispatch creation
Implement a validated draft → review → submit flow. Support unique human-readable reference, origin location, destination partner/business, dispatch date/time, expected delivery details, notes, and one or more item lines. Each line has item name, optional SKU, unit, positive finite quantity, packaging/condition/notes and stable ID. Snapshot origin/destination details so later directory edits do not alter history.

## Proof-of-view
- Record a view receipt only when the authenticated, authorized recipient opens the dispatch detail view.
- Store server timestamp, viewer identity/business, first viewed time and optionally last viewed time/count.
- Sending a notification or opening a public landing page must not itself count as a view.
- Any external share link must be high entropy, scoped, revocable/expiring, anti-replay where relevant, and must not expose full details to unauthenticated users. If safe recipient verification is not configured, clearly mark the capability as blocked/limited.

## Receipt confirmation
- Receiver sees only authorized incoming dispatches.
- Capture received quantity per dispatch line, condition (`good`, `damaged`, `lost`, `unknown`, `other`), discrepancy type, notes and optional evidence only if secure storage/rules are configured.
- Distinguish “not yet reported” from a submitted “not received” report. Do not silently convert a missing report to zero.
- Make submissions idempotent and prevent duplicate reports from retries.
- Preserve the original sender manifest. Corrections must create a new version/event rather than silently overwriting history.

## Reconciliation
- Calculate expected vs received quantities using validated shared logic or server-side calculations.
- Handle full, partial, not received, shortage, overage, damaged, lost, and count mismatch.
- Let the sender review, acknowledge, dispute or resolve discrepancies with reason and audit event. Make final state visible to both parties.
- Use a documented finite-state machine and reject invalid transitions server-side.

## Deliverables
- Complete the end-to-end dispatch → authorized view receipt → receipt report → sender review/resolution workflow.
- Add tests for quantity boundaries, decimal precision, duplicate submissions, illegal transitions, cross-tenant access, immutable manifests and audit completeness.
- Update `.ai/BUILD_STATE.md` with verified flows and blockers.
