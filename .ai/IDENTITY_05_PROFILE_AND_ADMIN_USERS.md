# Profile and user management

## Profile on all dashboards
Show photo/default initials, full name, masked mobile number, active business and role. Never show FAN/FIN on dashboard cards.

## Profile management
Provide a Profile & Security screen; edit permitted profile fields; upload/change/remove photo with preview, progress, cancel/retry and default avatar. Store images in private object storage if supported, not large base64 blobs in user documents. If upload fails, retain the previous image. Authorize every read/write.

## Administrator user management
Use real backend data with server-side pagination, search and filters. Show only safe metadata. Support suspend/reactivate with reason, confirmation and audit event; membership/role changes must be scoped and validated. Never allow normal admins to promote users to super-admin unless a separate audited privileged workflow exists. Prevent locking out the final active super-admin. Recovery sends a provider-backed challenge; admins cannot see or set users’ passwords.
