# InstaFrame production architecture

## Runtime boundaries

- `apps/web`: React/Vite public web client. Access tokens remain in memory; refresh tokens use origin-checked HttpOnly cookies.
- `apps/mobile`: Expo/React Native client. Refresh tokens use device secure storage and all business rules remain server-side.
- `apps/admin`: separately built staff console. Staff access requires backend RBAC and MFA; privileged tokens are memory-only.
- `apps/api`: Express API, Socket.IO signaling/realtime, security middleware and provider abstractions.
- MongoDB: primary transactional/document store with ownership, compound uniqueness, TTL and pagination indexes. This project does not use PostgreSQL/Supabase, so RLS is not applicable; equivalent authorization is enforced in API policies and tested.
- Redis: production distributed rate limiting and Socket.IO coordination.
- Cloudinary: signed media uploads, transformations/CDN and deletion workflows. MongoDB contains metadata, never media blobs.
- Workers: story expiry, media cleanup and privacy-retention jobs run from the API process today. Jobs use idempotent state and bounded batches; split them into a dedicated worker deployment before sustained multi-instance scale.
- Notifications: centralized service creates deduplicated in-app records and sends minimum-data push payloads through a server-only gateway.
- Monetization: configurable plans, store-product mappings, server verification adapters, subscriptions and time-bounded entitlements. Store tokens are hashed; safety/privacy features are outside paid authorization.
- Operations: liveness/readiness endpoints, privacy-safe telemetry/error records, alerts, job runs, backup/restore scripts and runbook.

## Trust and data flow

Clients authenticate to the API; they never connect directly to MongoDB or privileged providers. The API validates input, derives ownership from the token, enforces blocks/privacy, and returns only authorized projections. Socket connections authenticate using the same access-token trust boundary. Cloudinary upload signatures are short-lived and folder-scoped. Discovery searches only consented active members and the default matcher intentionally returns no identity result.

## Environments and scaling

Development, staging and production require distinct MongoDB clusters/databases, Redis instances, Cloudinary clouds/folders, push credentials, alert destinations, API/admin origins and analytics datasets. Never copy production user data into lower environments. Stateless API replicas sit behind TLS/load balancing; Redis coordinates realtime and rate limits. MongoDB and Cloudinary use managed backups/versioning. Use `/health/live` for restart decisions and `/health/ready` for load-balancer admission.

## Security decisions

Helmet, strict CORS, bounded bodies, sanitization, validation, Argon2, rotating refresh sessions, CSRF origin checks, MFA-gated staff permissions, abuse limits and server-side media validation are enabled. Sensitive model fields use `select:false`. Production startup rejects missing Redis, media, MFA, alerting, push and secure-cookie configuration. Secrets belong only in environment/secret managers.

## Release gates

CI installs from lockfiles, type-checks, lints, runs all tests, builds every web/API artifact, checks mobile TypeScript, scans tracked source for common secret forms and builds the production container. A release additionally requires staging smoke tests, backup restore drill, notification delivery tests on physical Android/iOS devices, store privacy declarations and operational sign-off.
