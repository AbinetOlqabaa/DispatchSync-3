# Security, privacy and graceful failure requirements

## Threat model
Protect against cross-tenant data access, IDOR, privilege escalation, fake view receipts, forged receipt reports, mass assignment, duplicate requests, spam/invitation abuse, credential attacks, malicious uploads, insecure exports, and secrets leakage.

## Required controls
- Server-side authorization and restrictive database security rules, default deny.
- Validate every input on the server with typed schemas and explicit allowed fields.
- Normalize phone/email and validate quantities, units, timestamps, country/address fields.
- Protect tenant boundaries on all reads and writes.
- Rate limit login, reset, invitation, dispatch submission and notification endpoints where supported.
- Use secure provider-managed sessions, secure cookies where applicable, CSRF protection when relevant, and appropriate CORS configuration.
- Use App Check/device attestation where supported, but do not treat it as a replacement for authorization.
- Apply least privilege to service accounts and deployment identities.
- Keep secrets in managed secret storage/environment configuration.
- Avoid exposing internal stack traces, database paths, tokens or personal information in client errors.
- Use safe logging, correlation IDs and redaction.
- Validate file type, size and authorization; do not accept executable files as evidence. Use signed/short-lived access URLs when supported.
- Protect exports with authorization, pagination/limits and audit records.
- Add dependency/security checks where tooling supports them.
- Provide privacy notice, data retention/deletion policy, contact and consent where appropriate.
- Do not assume compliance with any country’s laws; document that local legal/privacy review is required.

## Graceful failure
- Use centralized error handling and user-friendly messages.
- Distinguish validation, permission, not-found, conflict, rate-limit, network and server errors.
- Retry only safe/idempotent operations automatically.
- For timeouts after a possible commit, check transaction state before resubmitting.
- Preserve form input after recoverable errors where safe.
- Handle offline mode explicitly; do not show unsaved offline changes as synchronized.
- Provide retry and support/correlation reference.
- Prevent sensitive information from appearing in logs or error UI.
- Add error boundaries for UI crashes where supported.

## Data integrity
- Use server timestamps and transactions for state transitions.
- Use optimistic concurrency/version checks on edits.
- Do not allow client to write privileged fields like roles, verified status, audit actor, reference code, server timestamps, or super-admin flags.
- Maintain immutable/versioned records for submitted dispatch and receipt reports.
- Backups and restore tests are a deployment responsibility; document the actual configuration.
