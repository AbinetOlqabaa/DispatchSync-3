# Architecture and data model

## Architecture principles
- Use the environment-supported stack, but prefer TypeScript, typed domain models, schema validation, server-side business logic, and a modular architecture.
- Keep UI, domain logic, persistence, notifications, and authorization separate.
- Use repositories/adapters so demo data cannot accidentally be mistaken for production persistence.
- Store timestamps as UTC/server timestamps and display in configured business/user timezone.
- Use stable IDs; never rely on display names as identifiers.
- Paginate queries; use bounded page sizes and server-side filters.
- Use idempotency keys or transaction guards for create/submit actions that may be retried.
- Define indexes for actual query patterns and document deployment/setup requirements.

## Suggested entities
- `User`: id, displayName, email, phoneE164, phoneVerified, status, createdAt, updatedAt, lastLoginAt.
- `Business`: id, legalOrDisplayName, registrationNumber optional, countryCode, address, status, ownerUserIds, createdAt.
- `Membership`: id, userId, businessId, role, status, permissions/overrides if needed, invitedBy, createdAt.
- `Partner`: id, owningBusinessId, partnerBusinessId optional, displayName, contactName, email optional, phoneE164 optional, countryCode, region, city, addressLines, postalCode optional, notes, verificationStatus, createdAt.
- `Location`: id, businessId, label, countryCode, region, city, addressLines, latitude/longitude optional, createdAt.
- `Dispatch`: id, referenceCode, senderBusinessId, senderUserId, receiverBusinessId or partnerId, originLocationSnapshot, destinationSnapshot, dispatchedAt, createdAt, status, note, version, idempotencyKey.
- `DispatchLine`: id, dispatchId, itemName, sku optional, unit, quantitySent, notes, ordinal.
- `ViewReceipt`: id, dispatchId, viewerUserId, viewerBusinessId, firstViewedAt, lastViewedAt, viewCount. Ensure only authorized receiver views count as recipient view.
- `ReceiptReport`: id, dispatchId, submittedBy, receiverBusinessId, submittedAt, status, note, version.
- `ReceiptLine`: id, receiptReportId, dispatchLineId, quantityReceived, condition, discrepancyType, notes, evidenceRefs optional.
- `DiscrepancyCase`: id, dispatchId, dispatchLineId optional, type, expectedQuantity, reportedQuantity, openedBy, status, resolution, resolvedBy, resolvedAt, notes.
- `Notification`: id, recipientUserId, businessId, eventType, channel, status, providerMessageId optional, attemptCount, lastErrorCode safe, createdAt, sentAt, readAt.
- `AuditEvent`: id, actorUserId, businessId optional, action, entityType, entityId, timestamp, request/correlation ID, safe metadata, before/after hashes or minimal diff where justified.
- `Invitation`: id, businessId, inviteeContact, proposedRole, tokenHash, expiresAt, status, invitedBy.
- `AppConfig`: restricted server-side settings only; never place secrets in client-readable configuration.

## Relationship and isolation rules
- A business can have many users via Membership.
- A user can belong to several businesses with different roles.
- A partner may be represented as an external contact before they register, but external contacts must not gain account access automatically.
- If a receiver account/business is not yet registered, use a secure invitation or limited one-time link design with expiry and anti-replay protection; do not expose the full dispatch publicly.
- Store origin/destination snapshots on dispatch so later address edits do not rewrite historical records.
- Receipt reports should be append-only or versioned; correction requires a new version/event, not silent replacement.
- Audit records should be append-only from the client perspective.

## Firestore-oriented collection option
If using Firestore, choose a structure that makes tenant authorization rules tractable. A possible structure:
`users/{uid}`, `businesses/{businessId}`, `businesses/{businessId}/memberships/{uid}`, `businesses/{businessId}/partners/{partnerId}`, `businesses/{businessId}/locations/{locationId}`, `dispatches/{dispatchId}`, `dispatches/{dispatchId}/lines/{lineId}`, `dispatches/{dispatchId}/viewReceipts/{receiptId}`, `dispatches/{dispatchId}/receiptReports/{reportId}`, `notifications/{notificationId}`, `auditEvents/{eventId}`.
Cross-business dispatch access must be carefully checked using sender/receiver business membership and immutable dispatch fields. Firestore rules do not automatically filter queries; queries must align with rules. Sensitive cross-tenant mutations should go through trusted server functions.

## Required technical choices to document
- Native Android versus PWA, based on actual builder support.
- Authentication provider(s) actually enabled.
- Data store and rules.
- Server-side runtime.
- File storage and evidence upload policy.
- Notification providers/channels.
- Deployment and secrets setup.
- Backup, retention, deletion and recovery policy.
