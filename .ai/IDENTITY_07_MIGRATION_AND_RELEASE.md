# Migration and release

Before schema changes, inspect current auth/database and user records, back up where supported, create reversible migrations, never fabricate identity data, detect duplicates before unique constraints, and preserve dispatch history/memberships.

Separate development/test/staging/production configuration:
- Fayda mock only in development/test.
- Fixed OTP only in test mode.
- Production identity-dependent registration must fail closed if required provider config is absent.
- Never commit administrator credentials, provider keys, OTP secrets, encryption keys or OAuth secrets.

Checklist:
- Public registration cannot grant admin role.
- One-time super-admin bootstrap tested and disabled after use.
- Mobile/password uses the actual configured auth provider.
- OTP and Fayda simulation clearly labeled; production provider tested if configured.
- FAN/FIN uniqueness, masking and access controls tested.
- No sensitive values in logs/client storage/URLs.
- Private profile uploads and genuine admin user management verified.
- Tests run and results recorded; privacy/legal review completed.

Verdict must be NOT READY, READY FOR STAGING, or READY FOR PRODUCTION REVIEW. Do not declare production-ready while Fayda or OTP is simulated or server/database security is unverified.
