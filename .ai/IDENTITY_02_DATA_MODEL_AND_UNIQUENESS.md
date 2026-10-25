# Data model, linkage and uniqueness

Use an opaque immutable internal user ID as the primary key. Phone, FAN and FIN are sensitive external identifiers, not primary keys.

Keep identity claims separate from public profile where feasible: internalUserId, normalized phoneE164, phoneVerifiedAt, protected FAN/FIN values or keyed lookup tokens, Fayda verification state (unverified/simulated/verified/failed/pending_review), safe provider reference, timestamps and verification method.

Rules:
- Phone is normalized to E.164.
- FAN exactly 16 digits; FIN exactly 12 digits. Store as strings to preserve leading zeros.
- One active account per verified phone, FAN and FIN, with linkage consistency. Enforce atomically on trusted server/database; a preflight read alone is not enough because concurrent requests race.
- Do not reveal which identifier is already registered or who owns it.
- Never automatically merge accounts based on partial matches.
- Document treatment of suspended/deleted accounts and audited identity correction/rebinding.
- If using lookup HMAC, keep the key in managed secrets and support key versioning; plain hashes of structured identifiers may be guessable.
- Prefer not to retain raw FAN/FIN after provider verification if a verified claim/reference suffices. If retained, encrypt at rest, tightly restrict access, mask in UI, and define retention/deletion policy.
- Never put FAN/FIN in URLs, logs, analytics, notifications, crash reports or client local storage.

Migration: inspect existing records, do not fabricate identifiers, detect duplicates with masked reports, and add constraints only after remediation.
