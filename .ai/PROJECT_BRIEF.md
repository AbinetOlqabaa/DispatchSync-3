# DispatchBridge — Product Brief

DispatchBridge is a multi-business dispatch, proof-of-view, receipt-confirmation and item-reconciliation system.

## Roles
- Super Administrator
- Business Owner
- Sender
- Receiver

Users may have different roles in multiple businesses. Active business context must be explicit and permissions membership-scoped.

## Core flow
Business/member/partner/location setup → dispatch draft with item lines → review and submit → notify/share → authenticated recipient opens details (proof-of-view) → receiver reports per-line received quantity/condition/discrepancies → sender reviews/resolves → shared reconciled record, notifications and audit history.

## Platform and architecture constraints
Prefer the stack actually supported by the builder. Current supplied build-state describes a Node/Express TypeScript backend and React/Vite PWA with in-memory sandbox persistence. Verify this against the project. Do not claim native Android, production database, provider delivery, or deployment without evidence.

## Priority issue
Tablet UX is worse than mobile. Treat tablet portrait and landscape as first-class acceptance targets. Audit the entire route/component set and fix shared layout causes before page-specific work.
