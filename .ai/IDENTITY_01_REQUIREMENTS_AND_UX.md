# Identity requirements and UX

## Registration
Offer only permitted business roles such as Business Owner, Sender and Receiver, subject to the app's membership policy. Never offer Administrator/Super Administrator. If membership is invite-only, enforce it.

Fields: full name, country selector + mobile number, password + confirm password, FAN (16 digits), FIN (12 digits), privacy/processing notice, and optional profile photo. Show field-level validation. Preserve leading zeros. After submission, mask FAN/FIN; do not echo them in ordinary screens.

Flow: validate on client for UX; normalize/validate on server; atomically claim unique identifiers; run simulated Fayda check only in development/test with synthetic fixtures; send/simulate OTP; show OTP entry, expiry, resend cooldown, attempt limits and change-number flow; complete registration only after successful OTP and required identity check. Duplicate/provider mismatch errors must not reveal another account’s details.

## Sign-in
Use mobile number + password with country selector, show/hide password, generic invalid-credential message, rate limiting/backoff and session controls. Client-side role guards are not authorization. FAN/FIN must not be used as password substitutes.

## Password flows
Signed-in change: current password, new/confirm password, fresh OTP or step-up, provider-native password update, session revocation where supported, and notification. Do not repeatedly collect FAN/FIN unless risk policy requires it.

Forgot password: mobile + FAN + FIN may initiate protected server-side identity checks; send OTP only to the phone already verified/bound to that account. Use provider-native recovery. Generic responses must not confirm account existence. FAN/FIN alone is insufficient. Challenges expire, are single-use, purpose-bound and rate-limited.

## Profile
Display image/default initials, full name, masked phone, active business and role. Provide edit profile, upload/change/remove photo, preview, progress, size/type validation, cancel/retry and fallback avatar. Never show FAN/FIN on dashboard cards.

## Admin user management
Search/filter/paginate; show safe metadata, masked phone, memberships, verification status and account status. Support audited suspend/reactivate, allowed membership changes and recovery/invitation flows. High-risk actions require confirmation and step-up. Never expose password, OTP, reset tokens, raw FAN/FIN or secrets.
