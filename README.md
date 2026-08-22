# InstaFrame

Production architecture and launch gates are documented in [docs/architecture-final.md](docs/architecture-final.md) and [docs/production-readiness.md](docs/production-readiness.md).

InstaFrame is a consent-first social platform monorepo. The web app and Expo mobile app are clients of the same Express/MongoDB API and share TypeScript contracts.

> Status: executable MVP foundation, not production-ready. The shared API, responsive web client, and protected Expo client cover authentication, feeds, posts, profiles, discovery controls, messaging, signaling, search/explore, reels, privacy, and moderation foundations. Production face matching, email delivery, mobile push notifications, native media playback/calling, and full end-to-end coverage remain incomplete.

## Structure

```text
apps/
  api/       Express, Mongoose, Socket.IO, Cloudinary
  web/       React, Vite, responsive original UI
  mobile/    Expo Router, React Native
packages/
  contracts/ Shared API and domain types
```

## Setup

Requirements: Node 20+, npm 10+, and MongoDB 7+ (local or Atlas). Copy `.env.example` to `.env`, replace every secret, then run:

```bash
npm install
npm run dev
```

The API runs on `http://localhost:4000`, the web app on `http://localhost:5173`, and Expo is started separately with `npm run start -w @instaframe/mobile`.

For mobile devices, set `EXPO_PUBLIC_API_URL` to the computer's LAN address rather than localhost. Native access tokens remain in memory and rotating refresh tokens are stored in the device keychain through Expo SecureStore. Browser clients continue to use an HTTP-only refresh cookie. Both clients use the same API and business rules.

## Environment

Required in production: `MONGO_URI`, two independent 32+ character JWT secrets, `CLIENT_URL`, `MOBILE_APP_URL`, all three Cloudinary values, production SMTP settings, and an HTTPS-compatible cookie policy. Set `EMAIL_DELIVERY_MODE=smtp`; console delivery is rejected in production. STUN is configurable; reliable production calling generally also needs TURN credentials and paid bandwidth. Google OAuth values are optional and not yet wired.

Cloudinary upload signatures authorize a narrow user/folder target. Clients must still enforce the returned byte cap. Verified webhooks enforce quarantine decisions, account deletion queues retrying background cleanup, repeated failures can trigger an operations webhook, and administrators can monitor provider usage without exposing credentials.

## Implemented API surface

All responses follow `{ success, data }` or `{ success: false, message, code }`.

| Method | Route | Purpose |
|---|---|---|
| GET | `/health` | Liveness |
| POST | `/api/auth/register` | Register, issue access token and secure refresh cookie |
| POST | `/api/auth/login` | Login with brute-force throttling |
| POST | `/api/auth/refresh` | Rotate refresh session; replay revokes user sessions |
| POST | `/api/auth/logout` | Revoke current session |
| GET | `/api/auth/sessions` | List active devices |
| GET | `/api/profiles/:username` | Privacy-filtered profile |
| PATCH | `/api/profiles/me` | Edit the authenticated profile and user-provided links |
| PATCH | `/api/profiles/me/privacy` | Privacy controls |
| POST/DELETE | `/api/profiles/:userId/follow` | Follow, request access, or unfollow |
| GET | `/api/follow-requests` | List pending private-account follow requests |
| POST/DELETE | `/api/follow-requests/:requestId/accept` or `/:requestId` | Accept or decline an owned request |
| GET/POST | `/api/posts/feed`, `/api/posts` | Visibility-aware cursor feed and post creation |
| DELETE | `/api/posts/:postId` | Owner-only soft deletion |
| POST/DELETE | `/api/posts/:postId/like` | Idempotent like toggle |
| POST/DELETE | `/api/posts/:postId/save` | Idempotent bookmark toggle |
| POST | `/api/uploads/signature` | User-scoped signed Cloudinary upload parameters |
| GET/POST | `/api/posts/:postId/comments` | Comments and one-level replies |
| DELETE | `/api/comments/:commentId` | Author-only soft deletion |
| GET | `/api/notifications` | Cursor-paginated interaction notifications |
| PATCH | `/api/notifications/read` | Mark current-user notifications read |
| GET/POST | `/api/conversations` | List or create direct/group conversations |
| GET/POST | `/api/conversations/:id/messages` | Membership-gated history and sending |
| PATCH | `/api/conversations/:id/read` | Mark conversation messages read |
| GET | `/api/messages/search?q=` | Search only joined conversations |
| GET | `/api/calls/config` | STUN/TURN ICE configuration |
| GET/POST | `/api/calls` | Call history and privacy-checked creation |
| PATCH | `/api/calls/:id` | Participant-authorized lifecycle updates |
| GET | `/api/search?q=&type=` | Privacy-filtered users, public posts, and hashtags |
| GET | `/api/explore` | Diverse public posts, trends, and suggested users |
| GET/POST | `/api/reels` | Cursor feed and validated reel creation |
| POST | `/api/reels/upload-signature` | User-scoped Cloudinary reel upload |
| POST | `/api/reels/:id/view` | Unique member view tracking |
| POST/DELETE | `/api/reels/:id/like` or `/save` | Reel engagement toggles |
| GET | `/api/settings`, `/api/blocks`, `/api/mutes` | Privacy and relationship controls |
| POST/DELETE | `/api/blocks/:userId`, `/api/mutes/:userId` | Block or mute management |
| DELETE | `/api/sessions/:sessionId` | Owner-scoped device revocation |
| GET | `/api/account/export` | Download authenticated-user data |
| POST | `/api/account/delete` | Password-confirmed anonymization and cleanup queue |
| GET | `/api/admin/media-usage` | MFA-admin-only Cloudinary usage and quota snapshot |
| GET | `/api/admin/stats`, `/users`, `/reports` | Role-gated operations and moderation data |
| PATCH | `/api/admin/reports/:id` | Logged moderation action workflow |
| GET/PATCH | `/api/admin/verification/:id?` | Verification queue and decisions |
| GET/PATCH | `/api/admin/settings` | Global controls; writes require super-admin |
| GET | `/api/admin/actions` | Administrator audit history |
| PUT | `/api/discovery/settings` | Enable with approved photos or remove index on disable |
| POST | `/api/discovery/search` | Legacy audited safe-placeholder discovery request |
| POST | `/api/discovery/scan` | Authenticated multipart scan with strict image validation, cooldown/daily limits and opt-in-only results |
| POST | `/api/ai/assist` | Explicit-consent caption, hashtag, bio, translation, alt-text, summary and writing assistance |
| GET/DELETE | `/api/ai/consent` | View or withdraw stored AI consent acknowledgement |
| GET | `/api/admin/ai/usage` | MFA-admin aggregate AI operations metrics without draft/output contents |
| POST | `/api/reports` | Submit safety report |
| GET | `/api/admin/reports` | Moderation queue by role |

Socket.IO authenticates with the access token in `handshake.auth.token`. It provides membership-checked conversation rooms, durable message sending, live delivery, typing state, and `call:offer`, `call:answer`, `call:ice-candidate`, `call:reject`, and `call:end` signaling. WebRTC media remains peer-to-peer where networking permits; TURN service costs are external.

## Data models

Current Mongoose models: `User`, `Session`, `Post`, `Like`, `Bookmark`, `Comment`, `Notification`, `Follow`, `Conversation`, `Message`, `Call`, `ProfilePhotoIndex`, `AuditLog`, and `Report`. They include compound uniqueness, cursor/feed indexes, TTL session expiry, private/select-hidden secrets, consent defaults, and moderation roles. Planned domain models include richer reactions, reels, blocks/mutes, verification requests, admin settings/actions, hashtags, and deletion jobs.

## Privacy and security

- Photo discovery defaults off. Enabling requires explicitly approved profile photo IDs. InstaFrame Scan checks both profile/photo consent flags, the active index, account status and blocks before returning any public profile fields.
- Disabling deletes the discovery-index record immediately; account deletion orchestration remains planned.
- Search never accesses external platforms and never returns embeddings. The current matcher intentionally returns no candidates.
- External links are user-supplied and only returned when their visibility is public.
- Passwords use Argon2. Refresh values are hashed, rotated, stored in HTTP-only SameSite cookies, and replay-sensitive.
- Helmet, strict CORS, request size limits, validation, sanitization, general/login/discovery rate limits, role checks, and centralized production-safe errors are enabled.
- Before launch: add CSRF tokens if cookie-authenticated mutation endpoints expand, Redis-backed distributed limits, email verification/reset, MFA for admins, encryption/KMS for any future embeddings, malware/media scanning, abuse heuristics, immutable audit storage, backups, retention jobs, and a formal privacy/security review.

## Build and test

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

The automated suite covers critical validators, privacy permissions, discovery behavior, auth utilities, signaling authorization, search ranking, comments, reels, settings, admin policy, and database-backed registration/session/CSRF flows. Integration tests use a unique `instaframe_integration_*` database under `TEST_MONGO_URI` and drop only that database after each suite. Broader database-backed coverage and real-device tests are still required before launch.

## Deployment

1. Build `packages/contracts`, then deploy `apps/api` to a Node-compatible host with a MongoDB Atlas connection and Cloudinary secrets.
2. Configure HTTPS, trusted proxy behavior, exact CORS origins, secure cookies, health monitoring, backups, and a TURN provider.
3. Deploy `apps/web/dist` to Vercel or another static host; point its API/Socket.IO URL at the API.
4. Configure Expo environment/build profiles and use EAS only after real-device camera, permissions, push, deep-link, and WebRTC testing.
5. Create the first `SUPER_ADMIN` through a controlled one-time operations script (not a public endpoint), rotate that access, and require MFA before production admin use.

Free tiers and quotas change and are not assumed unlimited. MongoDB, Redis, Cloudinary, hosting, TURN bandwidth, email, and push delivery must be capacity-planned.

### First administrator

Create the first super-administrator only once, from a protected operations shell. Set the four `BOOTSTRAP_ADMIN_*` variables and run `npm run bootstrap:admin -w @instaframe/api`. The script requires a 16+ character mixed-complexity password and refuses to run if any super-administrator already exists. Remove the bootstrap variables and rotate the password after use.

### Container and CI

`Dockerfile.api` builds the shared contracts and API into a non-root production image. `render.yaml` is a starting blueprint; complete every secret and URL in the hosting dashboard before deployment. `.github/workflows/ci.yml` runs typecheck, lint, tests, and builds on pushes and pull requests. Administrator roles must enroll authenticator MFA at `/admin/mfa-setup`; generate `ADMIN_MFA_ENCRYPTION_KEY` as 32 random bytes encoded in base64. MongoDB/Redis backups, restore drills, secret rotation, controlled MFA recovery, and external uptime monitoring remain mandatory production operations.

Backup, restore-drill and credential-rotation procedures are documented in `ops/RUNBOOK.md`. Restore is destructive and requires the literal confirmation value `RESTORE_INSTAFRAME`; always use an isolated target first.
