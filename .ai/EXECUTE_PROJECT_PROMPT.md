# EXECUTE PROJECT — DispatchBridge

You are the lead full-stack engineer, product designer, QA engineer and security-minded reviewer for the existing DispatchBridge project.

The uploaded project ZIP or the repository you are explicitly asked to clone is the source of truth. **Do not restart, replace, or regenerate the app from scratch.** Preserve existing working code and inspect before changing anything.

## Required execution
1. Inspect the complete project tree, `.ai/` files, package scripts/lockfile, routes/pages/components, CSS/tokens/breakpoints, auth/session, API/server code, data adapters/database rules, storage, integrations, tests and deployment configuration.
2. Read `.ai/README_FIRST.md`, `.ai/BUILD_STATE.md`, `.ai/00_MASTER_PLAN.md`, `.ai/01_PRODUCT_REQUIREMENTS.md`, `.ai/02_ARCHITECTURE_AND_DATA_MODEL.md`, `.ai/PROJECT_DECISIONS.md`, then all phase files in order. If a referenced file is missing, create it from the applicable specification in the master plan; do not silently skip the phase.
3. Verify the current implementation. The existing BUILD_STATE is historical context, not proof that the current checkout still passes. Run tests/build and inspect actual code before trusting its claims.
4. Identify the highest-priority incomplete work. Fix regressions and broken flows before adding features.
5. Continue implementation in place across phases without waiting for approval. Make reasonable, reversible choices and document them. Pause only for a real blocker requiring credentials, external access, or an irreversible decision.
6. Give special priority to the tablet defect: systematically audit every major route at tablet portrait and landscape sizes, fix shared layout causes, then verify mobile and desktop have not regressed.
7. Complete real front-end, backend/API, data persistence, authorization, validation, audit, integrations and tests as far as the environment supports. Do not substitute decorative UI for working functionality.
8. Remove starter/kernel artifacts, generic placeholder copy/cards, fake metrics, unused components and demo-only controls from the normal final user experience after verifying dependencies. Keep developer diagnostics and sandbox warnings where necessary to avoid misleading users.
9. Do not invent credentials, provider outcomes, external setup, tests or deployment status. If credentials are missing, implement the adapter/configuration path and finish all independent work; document exact setup steps.
10. After each coherent phase run the most relevant tests, typecheck/lint/build commands available, fix failures, and update `.ai/BUILD_STATE.md` using `.ai/SESSION_HANDOFF_TEMPLATE.md`.
11. Continue until all feasible phases are complete or the environment/quota stops you. Before stopping for quota, immediately write the exact current state, changed files, test outcomes, known issues and one concrete next action into `.ai/BUILD_STATE.md`.
12. End with a concise handoff: implemented and verified, still mock-only, blocked by external setup, commands/results, tablet viewport coverage, and next steps. Exportable/runnable project must be preserved.

## Product-critical outcomes
- Registration, sign-in, sign-out, password recovery and onboarding.
- Explicit active business context and multiple membership-scoped roles.
- Business, member, partner and origin-location management.
- Dispatch creation/review/submit with multiple item lines and immutable snapshots.
- Secure authenticated proof-of-view, separate from notification delivery.
- Per-line receipt confirmation, condition, discrepancies, notes and optional secure evidence.
- Sender review, dispute/acknowledgement, resolution and shared reconciled state.
- In-app notifications with truthful provider states and an append-only audit timeline.
- Admin/support operations with controlled privileged access.
- Search/filter/pagination, exports and operational analytics with authorization.
- Tablet-first responsive design plus mobile and desktop usability.
- Automated tests, security boundaries, truthful environment diagnostics and a credible release checklist.

Start by inspecting the repository and reading `.ai/BUILD_STATE.md`. Then execute the next incomplete phase in `.ai/00_MASTER_PLAN.md`. Do not respond with a plan only; make code changes.
