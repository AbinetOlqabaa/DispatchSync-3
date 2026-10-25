# Phase 6 — Tablet-First UI/UX, Responsive Design and Accessibility

## Critical goal
The current product is reported to work better on mobile than tablet. Fix tablet experience systematically across the whole application while preserving mobile usability and desktop productivity. Do not merely scale the mobile screen up.

## First inspect, then implement
1. Enumerate every route, page, dialog, drawer, table, dashboard and reusable component. Map each to its owning role and user journey.
2. Run the app and inspect screenshots/browser behavior where tooling exists. Measure actual layout defects at the viewport matrix below. Do not assume the prior build-state report is current.
3. Identify shared root causes (shell width, navigation, breakpoints, grids, forms, tables, overlays, sticky elements) and fix shared components before adding page-specific patches.
4. Implement in place and keep a concise defect-to-fix record in `.ai/BUILD_STATE.md`.

## Required viewport matrix
- Mobile portrait: 390x844 and 360x800.
- Tablet portrait: 768x1024 and 820x1180.
- Tablet landscape: 1024x768 and 1180x820.
- Desktop: 1280x800 and 1440x900.
If exact screenshot/browser tooling is unavailable, use the closest available test method and explicitly document the limitation.

## Layout requirements
- Tablet is a first-class target. Choose a tablet shell intentionally: compact collapsible sidebar/rail or responsive top navigation, with usable content width and no mobile bottom-nav stretched awkwardly across the screen.
- Use content-driven CSS breakpoints; avoid assuming all tablets are 768px wide or all devices are portrait.
- Establish consistent page gutters, max-widths, spacing scale, typography scale and grid rules.
- At tablet portrait, dashboards should use a balanced 2-column metric/card grid where content supports it; at landscape, use available width without making cards excessively wide.
- Forms should use one column on narrow screens and a balanced two-column layout only when controls fit. Group related fields and keep labels/errors visible.
- Tables: use responsive column priority, horizontal scroll only inside a clearly bounded table region when needed, or an accessible card/list transformation. Never create page-level horizontal overflow. Keep essential actions reachable.
- Dialogs/drawers: fit within viewport height with internal scrolling, safe-area padding, visible action buttons, and predictable close behavior.
- Charts/maps: resize without clipping; preserve readable legends and controls. Do not rely on color alone.
- Long partner names, addresses, translated labels, large numbers and error messages must wrap safely.
- Navigation, menus and filter controls must not overlap; respect device safe areas and orientation changes.
- Use a minimum 44x44 CSS px target where practical, clear focus indicators, keyboard navigation, semantic headings/labels, accessible contrast and reduced-motion preferences.
- Loading, empty, error, permission-denied, offline/unsynced and retry states must be responsive and consistent.
- Do not hide essential controls or important data just to make a screenshot look cleaner.
- Avoid excessive empty space, oversized cards, redundant explanatory copy, duplicate summary cards and decorative components that crowd operational tasks.

## Visual cleanup and removal policy
- Remove starter/kernel banners, generic placeholder cards, redundant explanatory text, fake metrics, unused navigation items, demo-only controls and scaffold components from the final user experience when no longer needed.
- Before removing a component, search for references and confirm it is not required by a real workflow or test.
- Keep truthful environment/configuration status available in an admin/developer diagnostics area; do not misrepresent mocks as production features.
- Do not remove security warnings or disclose hidden technical details to ordinary users. Keep setup guidance in documentation or restricted admin diagnostics.
- Use consistent component patterns and real product language rather than starter-template language.

## Acceptance checklist
- Every route renders at all required breakpoints without page-level horizontal overflow.
- Tablet portrait and landscape both feel deliberately designed and operational.
- Registration/sign-in, forms, dashboard, dispatch list/detail, receipt, reconciliation, partners, locations, notifications, analytics, admin and settings are included if present in the project.
- No clipped content, unreachable actions, overlapping navigation, unusable modals, or unreadable tables.
- Verify touch, keyboard, focus, zoom and orientation as far as tooling permits.
- Capture and inspect screenshots if browser automation is available; document exact viewport and route coverage.
- Add responsive regression tests where practical and update `.ai/BUILD_STATE.md`.
