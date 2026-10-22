# Testing strategy and acceptance tests

## Test layers
Use the test tools available in the chosen stack. Prefer unit tests for domain rules, integration tests for APIs/database rules, and end-to-end tests for critical user journeys. If emulator/browser/device testing is unavailable, say so and give exact manual steps.

## Unit tests
- Quantity validation and decimal precision.
- Reconciliation calculation for exact match, shortage, overage, damaged, lost, not received and unreported.
- Dispatch state transition validity.
- Role/membership permission decisions.
- Timezone display conversion.
- Notification status mapping.
- Idempotency behavior.

## Security tests
- Sender from Business A cannot read/update Business B's dispatch.
- Receiver from unrelated Business C cannot read a dispatch.
- Receiver cannot change original sent quantities or sender identity.
- Sender cannot forge receiver view receipt.
- Public user cannot grant self a role or make self super-admin.
- Client cannot write audit events or privileged fields.
- Expired/replayed invitation and reset tokens fail.
- Unauthorized export and attachment access fail.

## Integration tests
- Registration/sign-in/reset flow using provider emulator or configured test account.
- Business membership and role assignment.
- Create dispatch with multiple lines.
- Notification failure does not corrupt dispatch.
- Recipient opens detail and view receipt is recorded once correctly.
- Receiver submits report; server calculates discrepancies.
- Sender disputes/acknowledges and resolves.
- Retry after timeout does not duplicate records.
- Pagination and filters return only authorized data.

## End-to-end acceptance scenarios
A. Owner creates business, adds partner and location, adds sender/receiver membership.
B. Sender creates dispatch with two or more item lines, reviews and submits.
C. Receiver gets in-app notification, opens detail; system records a genuine view timestamp.
D. Receiver reports one exact line and one shortage/damaged line.
E. Sender sees discrepancy and responds; parties reach a recorded resolution.
F. Admin suspends a test user and action is audited; user cannot continue privileged actions.
G. Unauthorized users attempting cross-tenant IDs receive safe denial.
H. Network failure and duplicate taps do not create duplicate dispatches/reports.
I. Mobile layout works at narrow viewport, with bounded scroll and pagination.
J. Password reset and sign-out/session expiration work with configured auth provider.

## Verification reporting
For each test group record:
- exact command or manual steps;
- environment (unit/emulator/browser/device);
- result: PASS, FAIL, BLOCKED, or NOT RUN;
- failure details and fixes;
- limitations.
Never label a test PASS based solely on code inspection.
