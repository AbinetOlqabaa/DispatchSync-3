# Business Dispatch & Delivery Reconciliation — AI Build Context

## Purpose
This folder is the persistent implementation brief for building a secure, production-minded, mobile-first application for businesses that send items to business partners and reconcile deliveries.

## How to use
1. Create the starter/kernel project using `STARTER_PROMPT.md`.
2. Export/download the project as a ZIP.
3. Upload/extract the project into the next Google AI Studio Build session, ensuring this `.ai/` directory is at the project root.
4. Send the continuation prompt from `CONTINUE_IN_NEW_SESSION_PROMPT.md`.
5. In the same session, ask the model to execute `.ai/00_MASTER_PLAN.md` and follow the file references in order.
6. At each milestone, require the model to update `.ai/BUILD_STATE.md`, run available tests, fix errors, and continue until it reaches a real blocker or the environment's limits.
7. Before deployment, complete the release checklist in `.ai/09_RELEASE_CHECKLIST.md`.

## Non-negotiable engineering rules
- Do not claim a feature, test, security rule, build, or deployment passed unless it was actually run and verified.
- Never put secrets, private service-account keys, API keys, or privileged credentials in client code or committed files.
- Use server-side authorization and database security rules. Hiding a button is not authorization.
- Do not silently overwrite or recreate an existing project. Inspect it first and preserve working code.
- Keep changes small and coherent; run the most relevant tests after each phase.
- When a tool/quota limit interrupts work, update `.ai/BUILD_STATE.md` with exact completed work, current files, tests and outcomes, known issues, and the next action.
- If the builder cannot perform an action (e.g. deploy cloud infrastructure, access credentials, run emulator tests), document the limitation and provide exact human steps; do not simulate success.
- Do not make up real addresses, partner records, delivery evidence, or notification results. Seed data must be clearly marked as demo data.
- Use a consistent timezone strategy: store timestamps as UTC and display them in the user's/business's configured timezone.
- For consequential actions, provide clear confirmation, error recovery, and an audit record.
