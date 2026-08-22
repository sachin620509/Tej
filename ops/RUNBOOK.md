# InstaFrame operations runbook

## Backups

Prefer MongoDB Atlas continuous/cloud backups and the managed Redis provider's snapshot/PITR feature. The PowerShell scripts are for controlled self-hosted or pre-production environments where `mongodump`, `mongorestore`, and `redis-cli` are installed.

Run `./ops/backup.ps1 -BackupRoot D:\Backups\InstaFrame -RetentionDays 14` from a protected operations host. Copy completed directories to encrypted object storage with immutability/versioning. The local script writes SHA-256 checksums but does not encrypt files; never leave them on an unencrypted shared disk.

## Restore drill

Restore into an isolated non-production MongoDB target first:

```powershell
$env:MONGO_URI='mongodb://isolated-restore-target/instaframe'
./ops/restore.ps1 -BackupDirectory D:\Backups\InstaFrame\instaframe-YYYYMMDDTHHMMSSZ -ConfirmRestore RESTORE_INSTAFRAME
```

The script verifies every checksum before using `mongorestore --drop`. Never point a drill at production. Redis restoration is deliberately stopped after verification because managed providers have different import/PITR procedures.

After restore: start one API instance, check `/health`, authenticate a test account, verify posts/media references, confirm admin audit data, sample collection counts, then destroy the drill environment. Record restore time and date quarterly.

## Health, alerts, and retention

Use `/health/live` only for process liveness and `/health/ready` for traffic readiness. Alert on repeated readiness failures, elevated 5xx rates, failed retention/media jobs, push delivery rejection spikes, and backup age. Configure `OPERATIONS_ALERT_WEBHOOK_URL` with a restricted endpoint; alert payloads intentionally contain no media identifiers or user content.

The operations worker removes old notification, telemetry, error, and revoked/stale push-token records. `NOTIFICATION_RETENTION_DAYS` is configurable; MongoDB TTL indexes provide an additional safety net for telemetry. Review `JobRun` failures from the protected admin/operations environment. Run a restore drill quarterly and verify checksums before every restore.

## Secret rotation

1. Inventory MongoDB, Redis, JWT, Cloudinary, email, TURN and MFA-encryption secrets without copying values into tickets.
2. Create a new provider credential with overlapping validity where supported.
3. Deploy consumers with the new credential, confirm health/error rates, then revoke the old credential.
4. JWT signing-key rotation currently requires active sessions to sign in again; revoke sessions during the maintenance window.
5. Do not rotate `ADMIN_MFA_ENCRYPTION_KEY` until an offline re-encryption migration exists. Losing or replacing it directly invalidates all administrator MFA secrets and recovery-code hashes.
6. Record actor, time, affected secret identifier (never value), verification result and rollback status.

## Incident recovery

If credentials are exposed, revoke them first, invalidate sessions, rotate dependent secrets, review `AdminAction`/`AuditLog`, preserve evidence, and notify affected users where policy or law requires it.
