# Production readiness and launch checklist

## Required before launch

- Provision isolated production MongoDB, Redis, Cloudinary, push gateway, SMTP, alerting and TURN services with least-privilege identities.
- Generate fresh JWT and MFA-encryption keys in a secret manager. Record rotation owner/date; never paste values into tickets or source control.
- Configure TLS API, web and admin domains, `COOKIE_SECURE=true`, exact CORS origins and network allow-lists where supported.
- Run `npm ci`, `npm run release:check`, `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` from a clean checkout.
- Build/sign Android and iOS with the production EAS profile. Verify camera, microphone, gallery and notification consent on physical devices.
- Complete Play Console/App Store privacy labels: account data, user content, diagnostics, identifiers, deletion, photo discovery consent and AI processing.
- Configure Google Play/App Store products and signed server-notification verification. Test purchase, renewal, grace period, cancellation, refund and restore flows in store sandboxes.
- Publish reviewed Privacy Policy, Terms, Community Guidelines, copyright process and data-retention policy; existing placeholder legal copy is not launch-approved.
- Complete a staging restore drill, document RPO/RTO, verify backup encryption/immutability and test rollback to the previous API/mobile-compatible release.
- Run staged rollout: internal staff, consented beta cohort, 5%, 25%, 50%, 100%. Gate increases on crash-free sessions, API error rate, latency, abuse reports and push health.

## Security review record

Reviewed: authentication/session rotation, origin-based CSRF, server-side ownership, private content, blocks, signed media, notification privacy, discovery consent, staff RBAC/MFA and audit logging. MongoDB injection and XSS exposure are reduced through validation/sanitization and React escaping. Outbound provider URLs are operator configuration, not user input.

Repository history was unavailable in this workspace, so historical secret exposure could not be proven or ruled out. Treat every development credential as exposed and rotate it before production. The local `.env` and runtime logs are ignored but should be removed from release artifacts and protected on developer machines.

## Known limitations

- Photo matching remains a safe no-match placeholder until a separately reviewed privacy-preserving provider exists.
- Workers currently share the API runtime; use a single scheduler owner or dedicated worker service at horizontal scale.
- Admin sign-in still receives a short-lived access token from the existing secure auth flow; production should move fully to HttpOnly admin-session cookies/SSO.
- Real FCM/APNs, TURN capacity, provider failover and app-store builds require external production accounts and physical-device validation.
- Dependency advisory lookup requires registry access; CI/provider dependency scanning should remain enabled and findings triaged before release.
- Legal text requires qualified policy/legal review.
