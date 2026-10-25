# DispatchBridge AI Build Kit

This bundle contains the supplied project context plus an execution prompt, quota-continuation prompt, tablet audit prompt, phase specifications and a session handoff template.

## Recommended use in Google AI Studio
1. Open the existing project or upload/extract your latest project ZIP. Do not start from a blank app if you already have a project.
2. Ensure the `.ai/` directory from this kit is at the project root. If the ZIP already has newer `.ai/` files, compare before replacing; keep the most current, project-specific build state and decisions.
3. Send `.ai/EXECUTE_PROJECT_PROMPT.md` as the instruction to execute. Tell the model to read the file and follow it exactly.
4. For a tablet-only pass, use `.ai/TABLET_AUDIT_PROMPT.md`.
5. If quota ends, require the model to update `.ai/BUILD_STATE.md`, export/download the entire project ZIP, then upload that ZIP in the next account/session and send `.ai/CONTINUE_AFTER_QUOTA_PROMPT.md`.
6. If continuing from GitHub, provide the exact repository URL and branch/commit. Never ask the model to guess a repository.
7. After each session, download/export the updated project and preserve a backup.

## Important truth about the supplied build state
The supplied `BUILD_STATE.md` describes a project that reportedly has an Express 4 + React 19 + Vite 8 PWA and an in-memory `sandboxStore`; it reports 23 passing tests and “ready for staging.” Those are historical claims from the file, not independent verification by this kit. The agent must inspect the actual uploaded project and rerun the tests/build. In-memory persistence and unconfigured external providers are not production persistence/integrations.

## Files
- `.ai/00_MASTER_PLAN.md`: execution order and definition of done.
- `.ai/01_PRODUCT_REQUIREMENTS.md`, `.ai/02_ARCHITECTURE_AND_DATA_MODEL.md`: supplied requirements and architecture.
- `.ai/03...09...`: phase-specific instructions.
- `.ai/EXECUTE_PROJECT_PROMPT.md`: main instruction for a full development pass.
- `.ai/CONTINUE_AFTER_QUOTA_PROMPT.md`: resume from ZIP or exact repository after quota/session change.
- `.ai/TABLET_AUDIT_PROMPT.md`: focused responsive tablet remediation.
- `.ai/BUILD_STATE.md`: supplied state snapshot; must be updated based on verified work.
- `.ai/SESSION_HANDOFF_TEMPLATE.md`: durable handoff template.

## Safety
Do not commit secrets, real API keys, service-account credentials or production personal data. Keep real provider integrations disabled until configured. Never claim production readiness from demo-only tests.
