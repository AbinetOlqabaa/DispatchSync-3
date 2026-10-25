# Identity & Authentication Enhancement — Start Here

This is an additive change pack for the existing Business Dispatch & Delivery Reconciliation project, not a replacement project.

## Use
1. Back up/export the working project.
2. Merge this ZIP's `.ai/` folder into the existing project root. Preserve existing files; these `IDENTITY_*` names avoid most collisions.
3. Read and execute `.ai/IDENTITY_UPDATE_EXECUTE.md`.
4. Follow the files it references in order.
5. Update `.ai/BUILD_STATE.md` and the main authentication, architecture, security and testing docs after implementation.

## Security decisions
- Never hardcode fixed administrator credentials in source code or the client bundle. Use a one-time, server-side provisioning command/setup flow, a developer-supplied secret, immediate password change, MFA/step-up where supported, audit logging, and disable bootstrap after use.
- Build a Fayda provider adapter with a development-only simulation. Do not claim real government identity verification without an authorized, configured and tested provider integration. Use synthetic test identities only.
- FAN and FIN are sensitive identity data. Do not expose them on dashboards, in logs, URLs, notifications, analytics or client storage.
