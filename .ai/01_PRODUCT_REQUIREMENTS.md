# Product requirements and acceptance criteria

## Product
A multi-business dispatch, proof-of-view, receipt-confirmation, and item reconciliation system. It must work well on mobile screens and remain usable on desktop.

## Roles
- **Super Administrator**: platform-level operator. Can manage platform configuration, suspend/reactivate users or businesses with audit trail, review security/audit events, and provision another admin only through controlled privileged workflows. Must not be an undocumented backdoor.
- **Business Owner**: manages one or more business profiles, business members, partners, locations, dispatches, notifications and business-level reports.
- **Sender**: creates/submits dispatches for an authorized business, tracks view/receipt status, and responds to discrepancies if permitted.
- **Receiver**: sees dispatches addressed to them/their business, records actual received quantities and condition, adds notes/evidence, and submits a receipt report.
- A user may have multiple business memberships/roles. The active business context must be explicit and permissions evaluated against membership, not a single global role string.

## Core workflows
1. Registration and sign-in.
2. Password reset, password visibility toggle, confirm-password validation, phone capture and optional verification.
3. Business profile creation and membership invitations/assignment.
4. Partner directory: partner business/person name, verified contact channels, full address, country/region/city and optional GPS coordinates; avoid requiring GPS.
5. Location directory for dispatch origin.
6. Create dispatch with unique human-readable reference, origin, destination partner, dispatch date/time, expected delivery details, optional reference/note, and one or more item lines.
7. Each item line: item/product name, optional SKU/code, unit of measure, quantity sent (positive finite decimal or integer as appropriate), optional packaging/condition/notes.
8. Review and submit dispatch; show a clear confirmation before sending.
9. Share/notify receiver through configured channels. In-app status must not falsely imply that an SMS/email/WhatsApp was delivered if the provider did not confirm it.
10. Record view receipt only when the authenticated recipient actually opens the dispatch detail view. Store first viewed time and optionally last viewed time; use server timestamps where feasible. Do not mark “seen” merely because a notification was sent.
11. Receiver confirms receipt per item line: quantity received, status, condition, loss/damage/shortage/overage, notes, and optional evidence attachments if storage is configured.
12. Reconcile expected versus received quantity; calculate differences server-side or with validated shared logic. Handle full, partial, not arrived, loss, damaged, excess, and count mismatch without destructive edits.
13. Sender reviews the report, acknowledges or disputes discrepancies, and both parties see the final status.
14. Search/filter/paginate dispatches and partners. Do not render unbounded lists or make pages grow indefinitely.
15. Notifications inbox with read/unread status, retryable failures, preferences, and clear channel/provider status.
16. Audit timeline for consequential events.
17. Admin dashboard for users/businesses, system health/configuration, audit review, and support operations.
18. Export reports only through authorized, validated, audited routes.

## Dispatch status model
Use a documented finite-state machine rather than arbitrary strings. Suggested states:
- draft
- submitted
- viewed
- in_transit (optional, only if tracked)
- receipt_submitted
- discrepancy_review
- reconciled
- cancelled

Store view receipt, delivery/receipt status, and discrepancy resolution as separate facts when that is clearer than overloading one status. A dispatch can be viewed without delivered, and can be delivered with a discrepancy.

## Receipt outcome model
Per item line, record:
- expectedQuantity
- receivedQuantity (nullable until receiver reports)
- condition: good, damaged, lost, unknown, other
- discrepancyType: none, shortage, overage, damaged, lost, not_received, count_mismatch, other
- notes
- submittedBy and submittedAt

Do not represent “not arrived” as zero confirmed quantity unless the receiver explicitly submits that report. Distinguish “not yet reported” from “reported not received”.

## Acceptance criteria
- A user cannot view another unrelated business's dispatches by changing an ID in a URL/API request.
- Sender can create a dispatch with multiple item lines and correct origin/destination.
- Receiver sees only dispatches addressed to an authorized business/account.
- “Seen” time is recorded only after a real authenticated detail view and is clearly distinguished from message delivery.
- Quantities and discrepancies are validated and auditable.
- Retried submissions do not duplicate dispatches or receipt reports.
- Notifications reflect actual provider outcomes or are explicitly labeled pending/failed.
- All list screens paginate and support loading, empty, error and retry states.
- Role-specific dashboards and navigation are useful, but server-side checks remain authoritative.
