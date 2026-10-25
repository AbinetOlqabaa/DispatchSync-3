# Focused Tablet Layout Audit and Fix Prompt

Audit and repair DispatchBridge's tablet UX in the existing codebase. This is an implementation task, not a design critique.

- First enumerate all routes and shared layout components.
- Inspect the current implementation and reproduce defects at 768x1024, 820x1180, 1024x768 and 1180x820. Also regression-check 390x844 and 1440x900.
- Cover registration/sign-in, all role dashboards, dispatch list/detail/create, receipt/reconciliation, partner/location directories, notifications, analytics, admin and settings routes that exist.
- Record concrete defect, route, viewport, root cause, fix and verification evidence.
- Fix shared root causes first: app shell, sidebar/navigation, page gutters/max-widths, responsive grid, form columns, table wrappers, dialogs/drawers, sticky/fixed elements, charts/maps and typography.
- Tablet should not be treated as a stretched phone. Use a deliberate tablet navigation pattern and content density. Keep core actions visible and reachable.
- Prevent page-level horizontal overflow. If a table needs scrolling, constrain scrolling to its own region and preserve important columns/actions or use an accessible responsive list.
- Ensure dialogs fit viewport height and scroll internally; controls respect safe areas and remain reachable in portrait/landscape.
- Use content-driven breakpoints and test long text, translated labels, large values, zoom, keyboard focus and touch targets.
- Remove only verified redundant starter cards/copy/components. Preserve workflow-critical controls, security notices and necessary developer diagnostics.
- Run tests/typecheck/build. If browser screenshot automation is available, capture screenshots at each viewport and inspect them; otherwise clearly state the limitation.
- Update `.ai/BUILD_STATE.md` and include the exact next task.
