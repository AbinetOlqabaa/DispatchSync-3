# Sensitive identity data security

FAN and FIN must be treated as high-impact personal data.

Do: use TLS; perform checks on trusted server; encrypt retained values with managed keys where available; use keyed HMAC tokens for equality lookup if appropriate; mask values; restrict access; minimize provider payload retention; redact logs/analytics/traces; define consent, purpose, retention, correction and deletion policy; review local privacy requirements before production.

Never: put FAN/FIN in URLs, route parameters, notifications, analytics, logs or localStorage; use them as primary keys, passwords, OTPs or sole recovery factors; expose them by default to administrators; hardcode production secrets, admin credentials, OTP bypasses or provider keys.

Profile photo uploads: authenticated and authorized, image-only MIME and signature checks where supported, conservative size limit, safe decoding, generated object names, private storage access and EXIF/geolocation stripping where feasible.
