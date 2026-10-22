# UI, dashboard and accessibility requirements

## Visual direction
Modern, trustworthy, business-focused, clean and elegant. Use a consistent spacing scale, restrained colors, readable typography, clear status chips, strong contrast, and clear primary actions. Avoid decorative clutter and excessive gradients. Support small Android screens and desktop.

## App shell
- Mobile: compact top bar, bottom navigation or accessible drawer, safe-area awareness, thumb-friendly actions.
- Desktop: sidebar and content area.
- Keep content inside viewport with internal scrolling; avoid unbounded vertical page growth.
- Paginate tables/lists and preserve filters/sort when navigating back.
- Long tables may scroll horizontally inside a bounded container.
- Never use color alone to convey status; pair with text/icon.
- Confirm destructive or consequential actions.
- Show unsaved-change warnings when appropriate.

## Screens
1. Welcome/onboarding.
2. Registration, sign-in, reset password, verification status.
3. Business setup and business switcher.
4. Role-specific dashboard.
5. Partners list/detail/create/edit.
6. Locations list/detail/create/edit.
7. Dispatch list with filters, pagination, status, search.
8. Create/edit draft dispatch with dynamic item lines and review step.
9. Dispatch detail with timeline, item lines, recipient view receipt and notification status.
10. Receiver receipt report and review/submit.
11. Discrepancy review/dispute/resolution.
12. Notification inbox and preferences.
13. Membership/team management and invitations.
14. Reports/export.
15. Profile/security settings.
16. Super-admin user/business/audit/configuration screens.
17. Connection/configuration health screen for administrators/developers.

## Dashboard differences
- Owner: business overview, active dispatches, unresolved discrepancies, partner management, members, reports.
- Sender: drafts, dispatches sent, awaiting view/receipt, discrepancy responses.
- Receiver: incoming dispatches, unviewed lists, receipts pending, discrepancies needing response.
- Super Administrator: platform-level user/business overview, audit/security events, configuration status. Avoid unnecessary access to business payloads.

## State design
Every async screen must handle:
- loading/skeleton;
- no data/empty state with next action;
- validation errors near the field;
- recoverable error with retry;
- permission denied;
- offline/network timeout where applicable;
- success confirmation;
- stale/conflicting version;
- duplicate submission prevention.
Never leave a button visually active while a request is in flight if repeated action could cause duplicates.

## Accessibility
Use semantic headings/labels, keyboard navigation where relevant, visible focus, adequate contrast, accessible control names, screen-reader announcements for important status changes, and scalable text. Do not rely only on hover. Respect reduced-motion preferences.
