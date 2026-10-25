# Mobile authentication, Fayda adapter and OTP

Define provider boundaries for identity verification, OTP send/verify, mobile account resolution and profile storage. Keep mock behavior isolated from production code paths.

## Fayda simulation
Use synthetic fixtures with a visible Simulation label. Do not use real people’s identity data or claim the government provider was contacted. Test match, mismatch, duplicate claim, timeout, unavailable provider, malformed response and rate limiting. If production requires provider verification but configuration is absent, do not silently succeed.

## OTP
Generate secure random codes server-side; store only protected challenge data/hash where feasible. Bind challenge to normalized phone, purpose, account/session, expiry and attempt count. Single-use; rate-limit sends and attempts; cooldown resends; never log OTP. Fixed test OTP only in local/test mode, visibly labeled, rejected in production and not returned by production APIs.

## Mobile + password
Use the real auth provider’s supported mechanism. If it only supports email/password, do not pretend it natively supports phone/password; build a secure server-side resolver/bridge only if supported and reviewed. Do not store passwords in the app database or roll custom password handling unnecessarily.

## Recovery
Forgot password: mobile + FAN + FIN -> protected server-side identity/provider checks -> OTP to the already verified bound phone -> provider-native reset/update. Generic external responses; no enumeration. Identity numbers alone never reset credentials.

Signed-in change: current password -> OTP/step-up -> provider-native update. Securely revoke/refresh sessions where supported. Record security events without sensitive values.
