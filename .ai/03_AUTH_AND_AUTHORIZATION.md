# Authentication, onboarding, roles and authorization

## Authentication UX
Implement supported options honestly:
- Email/password registration and sign-in.
- Password reset via verified provider flow.
- Show/hide password toggle.
- Confirm password on registration and change-password forms; do not store confirmation.
- Password strength and clear validation; never log passwords or tokens.
- Phone number in E.164 format with country selector; verification only if SMS provider is configured.
- Optional Google sign-in only if OAuth is correctly configured in the environment.
- Safe sign-out and session expiration handling.
- Generic login/reset messages where needed to reduce account enumeration.
- Rate limiting and abuse protection where supported.
- Accessible errors, focus states and loading indicators.

## Registration
- Do not allow public users to self-assign Super Administrator.
- Default new users to pending/no business privileges until a verified business/membership workflow grants access.
- Business owner creation should follow a documented safe flow.
- Email/phone verification status must be distinct from merely entering an address/number.
- Validate and normalize server-side as well as client-side.

## Authorization
Authorization must be enforced on server/API/database rules for every read and write. Client-side route guards are only UX.
- Super Administrator: platform-level administration only, with privileged actions audited and preferably step-up authentication.
- Business Owner: manage own business and memberships; cannot access unrelated businesses.
- Sender: create and manage dispatches only within assigned business and permitted workflow states.
- Receiver: view dispatches addressed to an authorized receiving business and submit receipt reports; cannot alter sender's original item quantities.
- Enforce membership status and tenant boundaries on every request.
- Avoid trusting role/business IDs sent by client without checking them against server-side membership records.
- Protect mass assignment: accept explicit fields, not arbitrary objects.
- Use least privilege and deny by default.

## Super-admin bootstrap
Provide a documented one-time server-side provisioning procedure:
1. Deploy/configure trusted backend.
2. Verify the intended operator identity using a secure deployment/admin process.
3. Create the platform admin claim/record using an administrative SDK or protected server command.
4. Require MFA/step-up authentication where supported.
5. Record an audit event.
6. Remove/disable temporary bootstrap capability.
Never embed a hardcoded master password, public bootstrap token, or universal admin backdoor in the client or source repository.

## Account recovery
- Use provider-issued, expiring, single-use reset links/codes.
- Do not reveal whether arbitrary email addresses exist.
- Avoid custom password-reset implementation unless securely supported.
- Revoke or refresh sessions appropriately after sensitive credential changes.
