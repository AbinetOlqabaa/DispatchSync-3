You are the lead engineer and product designer building a real, secure, full-stack Business Dispatch & Delivery Reconciliation application. First create a small but architecturally sound kernel that can be extended in later sessions using the `.ai/` context files.

PRODUCT OUTCOME
Businesses can register and manage partners, create dispatches describing items sent from a location to a partner, share delivery lists, know when a partner has viewed a list, record receipt outcomes, reconcile quantities and losses, notify both parties, and retain a tamper-resistant audit history.

FIRST: inspect the capabilities of this builder and the existing workspace. Determine whether this environment supports a native Android project or primarily a web application. If native Android is genuinely supported, use the supported native stack. Otherwise create a responsive, installable mobile-first PWA and clearly document that it is not a native APK. Do not claim native capabilities without evidence.

DEFAULT ARCHITECTURE
Prefer a maintainable, full-stack design using the builder's supported stack. If supported, use a TypeScript React client, server-side functions/API, Firebase Authentication, Cloud Firestore, Firebase App Check where applicable, and server-side notification adapters. If these are unsupported, choose the closest secure supported alternative and document the deviation in `.ai/BUILD_STATE.md`. All privileged operations must be server-side. Never expose service-account credentials or secrets in the client.

KERNEL SCOPE
1. Modern responsive application shell with accessible typography, navigation, loading states, empty states, error states, and mobile-friendly layouts.
2. Sign-in, registration, password reset, password visibility toggle, confirm-password validation, phone number capture and verification-ready flow, and clear sign-out.
3. Role-aware navigation and dashboard shells for Super Administrator, Business Owner, Sender, and Receiver.
4. A secure route/page structure and an authorization service abstraction; role checks must not rely on client UI alone.
5. Initial data model and a documented adapter for authentication/database services.
6. A dispatch list page and a basic create-dispatch form using validation and clearly labeled demo/local data only if backend credentials are not yet configured.
7. A visible configuration/status page explaining what is connected, what is mock/demo-only, and what setup remains.
8. Tests and scripts supported by the workspace; ensure the project builds before stopping.

IMPORTANT
- Do not build the entire product in this first kernel task. Build a stable, runnable foundation for the staged implementation in `.ai/00_MASTER_PLAN.md`.
- Do not create fake “successful” authentication, notification, or persistence flows. If using a temporary mock, label it prominently and isolate it behind an adapter.
- Never hardcode the super-administrator password or create a publicly known backdoor. The first super-admin must be provisioned through a documented secure, server-side, one-time process.
- Use least privilege, server-side validation, secure session handling, rate limiting where supported, audit logs, and restrictive database rules.
- All consequential actions must have loading, success, failure, retry, and duplicate-submission handling.
- Do not stop to ask for approval between phases if work can safely continue. Make reasonable decisions, record assumptions, and continue. Stop only for a genuine blocker such as missing credentials, unsupported tooling, or an irreversible action requiring human approval.
- Read `.ai/README_FIRST.md`, `.ai/00_MASTER_PLAN.md`, and `.ai/01_PRODUCT_REQUIREMENTS.md` if those files are already present. If they are not present yet, create the kernel first and leave a clear extension point for them.

DELIVERABLE
Produce a working kernel in the current workspace, not merely a plan. Run the available lint/type-check/tests/build. Report exact commands and truthful results. Update `.ai/BUILD_STATE.md` if the folder exists; otherwise create a concise `BUILD_STATE.md` in the project root and later move/merge it into `.ai/BUILD_STATE.md` when context files are uploaded.
