# Release blockers

The source builds and automated tests pass, but public release must wait until these external services are configured and real-device checks pass:

- MongoDB production database and backups
- Cloudinary credentials for posts, avatars, stories, reels and message attachments
- HTTPS API deployment and exact CORS origins
- Redis for distributed rate limits and Socket.IO scaling
- TURN credentials and capacity for reliable calls
- Android/iOS push credentials
- SMTP or approved transactional email provider
- EAS project/account and store signing credentials
- Reviewed Privacy Policy, Terms, Community Guidelines and copyright process
- Real-device tests for camera, scanner, media, background notifications and WebRTC

Do not call the build production-ready until this checklist is closed.
