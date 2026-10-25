# Test plan

Registration/roles:
- Admin absent from registration choices; crafted API request for super-admin rejected server-side.
- FAN 16 digits, FIN 12 digits, leading zeros preserved; invalid phone rejected.
- Duplicate phone/FAN/FIN rejected atomically, including concurrent attempts.
- Provider mismatch/timeout/malformed response fails safely.
- Simulation visibly labeled and impossible in production.

Sign-in/OTP:
- Correct mobile/password authenticates correct account; wrong/unknown credentials give generic error.
- Rate limits/backoff work.
- OTP expires, is single-use, purpose-bound and cannot be replayed; resend/attempt limits work.
- Test OTP rejected in production; FAN/FIN not used as passwords.
- Sessions refreshed/revoked after credential change where supported.

Recovery:
- Signed-in change requires current password and OTP/step-up.
- Forgot-password requires identity checks plus OTP to previously verified bound phone.
- FAN/FIN alone cannot reset password; responses avoid account enumeration.
- Expired/replayed challenges fail.

Data protection:
- FAN/FIN absent from logs, URLs, analytics, notifications, dashboard cards and client storage.
- Raw identity access restricted; encryption/retention documented.
- Profile upload rejects malformed/oversized/non-image files; unrelated users cannot access private photos.
- Failed upload preserves prior valid image.

Admin:
- One-time bootstrap protected and disabled after use; no default password in source/client.
- Admin mutations server-authorized and audited.
- Final super-admin lockout prevention works.
- Normal users cannot access admin APIs by changing routes/payloads.

Record exact commands and actual results. Mark unsupported tests BLOCKED or NOT RUN, never PASS by inspection alone.
