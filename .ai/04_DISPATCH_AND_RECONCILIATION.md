# Dispatch, recipient view, receipt and discrepancy workflow

## Create dispatch
- Select authorized sender business and origin location.
- Select an authorized partner/receiver and confirm full destination address.
- Record dispatched date/time; default from trusted server/current time but allow authorized correction with an audit event.
- Add one or more item lines; require item name, unit and quantitySent > 0. Reject NaN, infinity, negative values, and inappropriate precision.
- Provide review screen before submission.
- Generate unique reference on trusted backend; never trust a client-generated unique code alone.
- Snapshot origin/destination details and the sender identity at submission.
- Prevent duplicate submissions using idempotency key/transaction.
- Allow draft edits; submitted records should use versioned amendments or audited correction workflows.

## Delivery list and view receipt
- Notify the receiver after successful submission.
- Record “viewed” only when an authenticated, authorized receiver opens the dispatch details successfully.
- Use server timestamp where feasible. Keep firstViewedAt immutable; update lastViewedAt/viewCount if useful.
- Do not count a push/SMS/email preview, notification send, or sender viewing as receiver view.
- Show “Notification sent/delivered” only when the provider reports that exact state. Distinguish sent, delivered, opened/viewed, failed, and unknown.

## Receiver receipt report
- Present every dispatch line and expected quantity.
- Require an explicit choice for each line: full quantity received, partial quantity, not received, damaged/lost, or other discrepancy.
- Capture received quantity and condition separately. Quantity may be zero only with an explicit report that nothing was received.
- Validate received quantity and precision; overage is allowed only as a discrepancy, not silently coerced.
- Permit optional notes and evidence only with safe file type/size limits and authorized storage.
- Show a review/confirmation screen before submission.
- On submit, create immutable/versioned receipt report and calculate discrepancies.
- Do not allow the receiver to edit original quantitySent or sender's dispatch details.
- Prevent duplicate receipt reports on retries; use versioning for corrections.

## Reconciliation
Compare quantitySent with quantityReceived per line using unit-aware decimal-safe logic. Avoid floating-point drift for fractional units; use integer base units or decimal arithmetic.
- Full match: quantity and condition meet expected criteria.
- Shortage: received < sent.
- Overage: received > sent.
- Damaged: quantity may be present but condition is damaged.
- Lost/not received: explicit receiver declaration.
- Unreported: no report yet; never treat as confirmed zero.
- Discrepancy case should record responsible parties, evidence, status, notes and resolution.
- Sender can acknowledge or dispute; receiver can respond; resolution is versioned and audited.
- Both parties can see final outcome and timestamps.
- A reconciled record is not silently editable; corrections create new versions/events.

## Edge cases
- Receiver opens the dispatch more than once.
- Dispatch sent to a partner not yet registered.
- Notification provider unavailable.
- Offline or intermittent network.
- Duplicate tap, retry or request timeout after server commit.
- Sender changes partner/address after draft creation.
- Receiver submits partial report and resumes later.
- Some lines match and others differ.
- Dispatch cancellation after submission requires receiver notification and audit.
- Two users attempt updates concurrently; use optimistic version checks or transactions.
