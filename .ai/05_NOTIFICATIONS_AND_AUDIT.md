# Phase 5 — Notifications, Outbox and Audit

## Notifications
- In-app notifications are the baseline. Provide inbox, unread/read state, preferences where appropriate, pagination, and retryable failures.
- Email/SMS/push/WhatsApp must use explicit provider adapters and real configured credentials. If not configured, show “not configured” or “pending”; never report sent/delivered without provider evidence.
- Use an outbox/retry strategy where supported, idempotency, bounded retry/backoff and safe error codes. Avoid duplicate messages.
- Keep delivery status separate from dispatch view and receipt status.

## Audit
- Record consequential events: membership/invitation changes, dispatch create/submit/cancel, recipient view, receipt submission, discrepancy resolution, role/admin actions, exports, security-sensitive changes.
- Audit entries are server-authored and append-only from client perspective. Include actor, active business if applicable, action, entity ID/type, server timestamp, correlation/request ID and minimal safe metadata.
- Do not store passwords, tokens, private keys, full evidence blobs or unnecessary sensitive data in logs.
- Restrict audit queries to authorized roles; paginate and filter.

## Deliverables
- Verify notification state is truthful and tied to actual adapter outcomes.
- Add tests for outbox retry/idempotency, read state, authorization and audit append-only behavior.
- Document external setup and update `.ai/BUILD_STATE.md`.
