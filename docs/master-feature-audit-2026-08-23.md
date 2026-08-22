# InstaFrame master feature audit

Audited on 2026-08-23 against the A-to-Z master prompt. This is a source-code and automated-check audit, not a claim that external providers or real-device flows are production verified.

## Current architecture

- `apps/api`: Express 5, TypeScript, Mongoose/MongoDB, Socket.IO, Cloudinary signing/webhooks, Redis adapters, background jobs, REST APIs.
- `apps/web`: React 19, Vite, TypeScript responsive user client.
- `apps/mobile`: Expo 54/React Native 0.81, Expo Router, shared API, camera/media clients, native WebRTC dependency.
- `apps/admin`: separate React/Vite admin client.
- `packages/contracts`: shared TypeScript API contracts.
- `ops` and `.github`: local runbooks, release checks, backup/restore scripts and CI/deployment foundations.

The web and mobile clients use the same API and MongoDB models. There is no second mobile database or duplicated backend.

## Verification evidence

| Check | Result | Meaning |
| --- | --- | --- |
| API and web lint | PASS | No lint errors in configured workspaces |
| All workspace TypeScript checks | PASS | API, web, mobile, admin and contracts compile at type level |
| Production build | PASS | Contracts, API, web and admin built successfully |
| Unit tests | PASS (73) | Validators, privacy helpers, AI, media safety, ranking and operations units passed |
| Database/realtime integration tests | PASS (75) | An isolated in-memory MongoDB harness now runs database and Socket.IO suites without touching Atlas/production data |
| Browser cross-user E2E | PASS | Registration, private follow approval, realtime DM, two-browser WebRTC call, report and block pass in Chromium |
| Real-device/E2E tests | MISSING | No verified Android/iOS camera, push, background, media or WebRTC run is recorded |

All 148 automated tests now pass. Real-device/provider checks are still required, so the repository is not yet a production-release candidate.

## Feature matrix

| Feature area | Web | Mobile | Backend/DB | Realtime/provider | Tests | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Email/password auth, refresh sessions, recovery, verification | DONE | DONE | DONE | SMTP config required | PARTIAL | PARTIAL |
| Phone OTP, Google/Apple OAuth, full account recovery | MISSING | MISSING | PARTIAL abstraction | Providers missing | MISSING | MISSING |
| Authenticator MFA and admin MFA boundary | PARTIAL | PARTIAL | DONE | — | UNIT | PARTIAL |
| Profiles, privacy, avatar, social links, QR | DONE | DONE | DONE | Cloudinary required | PARTIAL | PARTIAL |
| Follow graph, private requests, block, mute | DONE | DONE | DONE | Notifications hooks | BLOCKED integration | PARTIAL |
| Restrict account semantics | PARTIAL | PARTIAL | MISSING dedicated model/policies | — | MISSING | MISSING |
| Feed, posts, likes, saves, comments/replies | PARTIAL | PARTIAL | DONE foundation | Cloudinary required | BLOCKED integration | PARTIAL |
| Carousel/mixed-media editor, drafts, scheduling, collaboration/tag approval | PARTIAL | MISSING/PARTIAL | PARTIAL | Worker missing | MISSING | MISSING |
| Stories: image/video/text, views, reactions, expiry | DONE foundation | DONE foundation | DONE foundation | Expiry job present | BLOCKED integration | PARTIAL |
| Advanced story stickers, polls, questions, music, highlights | MISSING | MISSING | MISSING | Licensed providers missing | MISSING | MISSING |
| Reels feed/playback/interactions/analytics foundation | PARTIAL | PARTIAL | DONE foundation | Transcoding provider missing | BLOCKED integration | PARTIAL |
| Adaptive streaming, multi-resolution transcoding, generated covers | MISSING | MISSING | PARTIAL hooks | Media worker/provider missing | MISSING | MISSING |
| Global search, recent search, people/content suggestions | PARTIAL | PARTIAL | PARTIAL | Dedicated search engine absent | UNIT | PARTIAL |
| Location pages/maps and audio discovery | MISSING | MISSING | MISSING | Maps/licensed audio providers missing | MISSING | MISSING |
| One-to-one text messaging, requests, typing/read | DONE foundation | DONE foundation | DONE foundation | Socket.IO present | BLOCKED integration | PARTIAL |
| DM attachments/reactions/edit/forward/pin/search/disappearing messages | PARTIAL | MISSING/PARTIAL | PARTIAL | Object storage present | BLOCKED integration | PARTIAL |
| Groups and announcement channels | PARTIAL | PARTIAL | DONE foundation | Shared messaging stack | BLOCKED integration | PARTIAL |
| Web one-to-one audio/video calls | PARTIAL | — | DONE signaling/history | WebRTC + TURN required | BLOCKED integration | PARTIAL |
| Mobile audio/video media calls | — | BLOCKED | DONE signaling/history | Custom EAS build + TURN required | MISSING real-device | BLOCKED |
| Group calls | MISSING | MISSING | Architecture hook only | SFU provider required | MISSING | MISSING |
| Live streaming | MISSING | MISSING | MISSING | Streaming provider required | MISSING | MISSING |
| In-app notifications/preferences/tokens | PARTIAL | PARTIAL | DONE foundation | Push provider not configured | BLOCKED integration | PARTIAL |
| Admin RBAC/moderation/verification/settings | PARTIAL | N/A | DONE foundation | Separate admin app | BLOCKED integration | PARTIAL |
| Creator/business profiles and subscriptions | PARTIAL | PARTIAL | DONE foundation | Billing verification provider required | BLOCKED integration | PARTIAL |
| Ads, payouts, tips, paid content | MISSING | MISSING | Promotion foundation only | Payment/ad providers missing | MISSING | MISSING |
| AI assistance | DONE UI foundation | DONE UI foundation | DONE privacy/provider abstraction | AI provider not configured | UNIT | PARTIAL |
| Opt-in photo scan | DONE safe UX | DONE safe UX | DONE consent/rate/audit boundary | Real matcher intentionally absent | BLOCKED integration | PARTIAL |
| Analytics/health/jobs/backups | PARTIAL | PARTIAL telemetry | PARTIAL | Production services/drills required | UNIT | PARTIAL |
| Legal/data export/deletion/copyright workflow | PARTIAL | PARTIAL | PARTIAL | Legal review required | PARTIAL | PARTIAL |
| Accessibility/i18n/dark mode/offline resilience | PARTIAL | PARTIAL | — | — | MISSING systematic QA | PARTIAL |

## Broken or release-blocking items

1. Mobile calls expose signaling/history but cannot accept or originate media in Expo Go. The custom development/release build and real-device WebRTC flow remain unverified.
2. SMTP delivery has previously returned `501 Bad sender address syntax`; real registration verification is not release-ready until the sender/domain is corrected and tested.
3. Push, TURN, AI, billing, media-safety and production Redis behavior depends on unconfigured external providers.
4. The scan service is a privacy-safe placeholder matcher. It must not be represented as real facial identification.
5. No production-grade transcoding/HLS worker is present; uploaded video compatibility depends largely on Cloudinary delivery transformations.
6. Legal pages and policies require real legal review; source placeholders cannot be used as production policy.
7. The entire repository is currently untracked in Git (`git status` reports all files as new), so there is no reliable baseline, review history or safe rollback point.

## Duplicate/conflicting implementation risks

- `apps/admin/src/main.tsx` and generated-looking `apps/admin/src/main.js` coexist and can drift.
- Root and app-level package lockfiles coexist; dependency resolution can diverge across installs.
- Some concepts use embedded media records plus separate media models, increasing cleanup/counter consistency risk.
- Older status documentation overstates completion compared with the A-to-Z acceptance rule; it must not be used as release evidence.
- API routes are mounted under `/api`, while the master prompt proposes `/api/v1`; a deliberate versioning/migration decision is still needed.

## Main schema/API gaps

Missing or incomplete dedicated domains include restrictions, Close Friends membership, highlights, collections, tag approval, collaboration, audio catalogue, hashtag follows, locations, drafts, scheduled publications, live sessions, ad campaigns/creatives, payments/payouts and copyright counter-notifications. These are not equivalent to existing hooks or UI labels.

## Prioritized implementation roadmap

### P0 — establish a trustworthy release gate

1. DONE: integration tests are self-contained and all 148 tests pass against isolated temporary databases.
2. PARTIAL: browser E2E now covers register/login, search/private-follow approval, cross-user DM, report/block and two-browser web calls. Post/reel media playback fixtures remain.
3. Add real-device Android/iOS smoke tests for auth, camera/gallery, uploads, video playback, push/deep links and WebRTC.
4. Configure and validate production SMTP, Redis, Cloudinary, TURN, push and monitoring; record backup restore drill.
5. Create a Git baseline and CI protected release workflow after secrets are audited.

### P1 — close core social-product gaps

1. Finish DM attachments, reactions, edit/unsend, reply/forward/pin/search and robust offline delivery across web/mobile.
2. Finish mobile native voice/video calls and incoming-call behavior in a custom EAS build; add TURN-based cross-network tests.
3. Complete post/reel creation parity, carousel editing, thumbnail/transcoding pipeline and retryable background uploads.
4. Complete follower/follow-request/profile action surfaces, persistent hide/not-interested/restrict/mute semantics and notification delivery.
5. Complete stories with Close Friends and highlights before adding optional interactive stickers.

### P2 — discovery, creator and operational completeness

1. Add scalable indexed search, hashtag/location pages and recommendation feedback/diversity controls.
2. Complete creator/business analytics, scheduling/drafts, collections, collaboration and tag approval.
3. Complete admin content/media/hashtag/banned-word/copyright workflows and least-privilege evidence review.
4. Complete accessibility, Hindi localization, dark/system theme, offline queues and low-bandwidth media variants.

### P3 — provider-dependent expansion

1. Live streaming through a dedicated provider, not the normal Socket.IO server.
2. Licensed music/audio catalogue and attribution.
3. Store-compliant billing, ads, payouts/tips and fraud operations.
4. A real opt-in photo matcher only after biometric privacy, encryption, deletion, consent and abuse review; never public/non-consensual identification.

## Recommended next implementation unit

Continue P0 item 2 with deterministic post/reel media playback fixtures, then perform real-device mobile testing. Unit, API integration and the primary cross-user browser flow are green.
