# Project decisions and assumptions

The builder must confirm or update each decision after inspecting its real capabilities.

1. Platform: prefer native Android only if the builder genuinely supports generating/building native Android source. Otherwise build a mobile-first installable PWA and clearly label it as such.
2. Backend: prefer Firebase Authentication + Firestore + trusted server functions if supported and appropriate.
3. Auth methods: email/password baseline; Google sign-in only after OAuth setup; phone verification only after SMS provider setup.
4. Notifications: in-app baseline; email/SMS/push/WhatsApp only after a real provider is configured.
5. Roles: Super Administrator, Business Owner, Sender, Receiver. Business memberships are scoped and a user may have multiple memberships.
6. Audit: append-only from client perspective; server-authored for privileged actions.
7. Time: persist UTC/server timestamps; render in user/business timezone.
8. Evidence: optional and only when secure file storage and access rules exist.
9. Offline: do not promise full offline operation. Any offline draft must clearly indicate unsynchronized status and conflict behavior.
10. Compliance: local legal/privacy review is required before production use.
11. Quota handoff: use `.ai/BUILD_STATE.md` and `.ai/SESSION_HANDOFF_TEMPLATE.md` as the durable source of progress.
