# Notifications, event handling and audit

## Notification channels
Implement only channels that are actually configured. Typical adapters:
- In-app notification inbox (baseline).
- Email via a configured provider.
- SMS via a configured provider.
- Push notifications if supported by the chosen client platform and credentials.
- WhatsApp only through an approved provider/API and properly authorized business account; do not automate consumer accounts or imply support without setup.

## Events to notify
- Dispatch submitted/shared.
- Recipient viewed dispatch (optional sender notification).
- Receipt report submitted.
- Discrepancy opened, disputed, commented on, or resolved.
- Dispatch cancelled or amended.
- Invitation created/accepted/expired.
- Account/security events and important administrator actions.

## Reliability
- Create domain event/notification records transactionally where feasible, then deliver through a server-side worker/queue or retryable function.
- Use idempotency keys to avoid duplicate sends.
- Track channel, status (queued/sending/sent/delivered/failed/unknown/read as applicable), provider ID, attempts, timestamps and safe error code.
- Use exponential backoff with bounded retries and dead-letter/manual retry handling where available.
- Never display “delivered” if the provider only accepted the request.
- Do not block a successful dispatch transaction indefinitely because an external notification provider is down.
- Store secrets in managed environment secrets, never client code.
- Respect opt-in/consent and local communication laws; provide channel preferences and quiet hours if relevant.

## Audit
Audit consequential actions: business/member changes, dispatch create/submit/amend/cancel, recipient view, receipt submission/correction, discrepancy resolution, admin actions, permission changes, export and security events.
Each event should include actor, business context if any, action, entity, server timestamp, correlation ID, and minimal safe metadata.
- Append-only from client access.
- Do not log passwords, access tokens, reset links, sensitive attachments, or unnecessary personal data.
- Restrict audit viewing and exports.
- Ensure client users cannot write arbitrary audit entries or erase them.
