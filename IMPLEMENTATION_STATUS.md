# InstaFrame implementation status

Last audited: 2026-08-09 against the master product prompt.

## Implemented foundation

- Shared Express/MongoDB REST API for web and Expo clients
- JWT access tokens, rotating refresh sessions, Argon2 passwords and device session management
- Registration/login/logout plus password recovery and hashed, expiring email-verification tokens
- Profiles, manual social links, public/private accounts, follows and follow requests
- Consent-off-by-default InstaFrame Scan on web/mobile with camera/gallery UX, strict temporary uploads, opt-in index filtering, block/privacy checks, daily/cooldown controls, audit logs and a safe placeholder matcher boundary
- Posts, Cloudinary signed uploads, verified/replay-protected Cloudinary webhooks, media quarantine enforcement, feed pagination, likes, bookmarks, comments and replies
- Reels API plus native Expo playback, paging, views, likes, saves, shares and reports
- Search, Explore, notifications, real-time text messaging and WebRTC signaling
- Web WebRTC calls and mobile call history/incoming signaling boundary
- Reports, verification requests, roles, admin statistics, moderation queue and platform settings
- Blocks, mutes, data export, account deletion queue, retrying Cloudinary media cleanup worker, admin failure monitoring and discovery/session cleanup
- Responsive web application and Expo mobile application sharing contracts and backend rules
- Phase 17 privacy-first AI gateway with provider abstraction, explicit draft consent, caption/bio/hashtag/translation/alt-text/summary tools, sensitive-data exclusions, rate limits, usage auditing and web/mobile creator studios

## Important incomplete work

### P0 — required before production

1. Configure production SMTP credentials and verify domain deliverability; SMTP transport is implemented while development remains console-only.
2. Configure a production malware/content-scanning provider; webhook-driven quarantine and publish enforcement are implemented.
3. Redis-backed distributed rate limits, multi-instance Socket.IO scaling and trusted-origin CSRF controls are implemented; production Redis provisioning/load testing remains.
4. Connect managed automated backups/PITR and execute recorded restore drills; guarded backup/restore scripts, secret-rotation runbook, authenticator MFA, CI, deployment manifests and first-admin bootstrap are implemented.

### P1 — acceptance features still partial

- Mobile WebRTC audio/video streams need a native module and real-device development build.
- Push notifications and notification preferences are not implemented.
- Messaging lacks image/video/voice attachments, reactions, delete-for-user, presence/last-seen UI and group management UI.
- Posts lack edit caption, archive/restore and comments-enable management UI/API; mobile composer currently uploads one image.
- Reels lack comments, follow-creator action, progress UI, creation on mobile and generated-thumbnail workflow.
- Feed recommendations, suggested users, persistent hide/not-interested preferences and ranking feedback are incomplete.
- Search lacks reels, server-side pagination and suggested searches.
- Explore lacks popular reels, categories and configurable category management.
- User verification-request UI is incomplete even though moderation endpoints/models exist.
- Admin content/media/category/hashtag/banned-word management is not comprehensive.
- Legal routes currently use placeholder content rather than reviewed policy documents.
- Google OAuth remains optional and unimplemented.

### P2 — polish and scale

- Dark mode, skeleton coverage, accessibility audit and keyboard/screen-reader testing
- Responsive Cloudinary URL helpers and systematic low-bandwidth transformations
- Persistent caching, offline behavior and more virtualized list tuning
- Broader analytics/observability and independent storage usage reconciliation
- Formal retention policy execution for messages, audit logs and deleted media

## Privacy boundary

Production face identification is intentionally not implemented. The current safe placeholder searches only opted-in InstaFrame profiles and does not analyze or identify non-consenting people. Any future matching provider requires a privacy/security review, encrypted embeddings, deletion guarantees, access controls and abuse testing.
