# CaseSync — Backup & Retention Policy

Status: active operating policy. Applies to the MVP stack: MongoDB Atlas plus
local-disk attachment storage.

**Baseline:** 2026-10-31. Legal/records-retention requirements from AICTE take
precedence when they differ; the values below are the engineering defaults until written
AICTE policy is recorded.

## 1. Data covered

| Data | Location | Contains PII? | Backup owner |
|---|---|---|---|
| Cases, actions, assignments, relationships, merge groups, assessments | MongoDB Atlas | Yes | Platform operator |
| Institutions, regions, bureaus, categories, users, sessions, notifications, SLA configs | MongoDB Atlas | Yes | Platform operator |
| `audit_log` and `job_runs` | MongoDB Atlas | Yes (actor identities) | Platform operator |
| Attachments | `ATTACHMENT_STORAGE_DIR` (default `storage/attachments`) | Potentially | Platform operator |
| Application secrets and `.env` | Secret manager / deployment host | No PII, high sensitivity | Security owner |

Attachments are stored under a per-case directory with a random UUID filename. The
database stores the original filename, MIME type, size, SHA-256 checksum, uploader,
visibility, and relative storage path. A database backup alone is **not** a complete
restore: the attachment volume must be backed up with a consistent timestamp and
restored to the same relative layout.

## 2. Targets

| Measure | Target | Notes |
|---|---|---|
| Recovery point objective (RPO) | 24 hours by default; ≤ 15 minutes when Atlas continuous backup/PITR is enabled | Demo/dev may use the RPO that matches the cluster tier |
| Recovery time objective (RTO) | 4 hours for API + database + attachment volume | Excludes Atlas regional outage recovery |
| Backup retention | 30 daily snapshots, 12 monthly snapshots, 7 yearly snapshots | Adjust to AICTE records policy |
| Restore test | Quarterly, plus before major releases | Record result and elapsed time |
| Attachment integrity check | Monthly and after every restore | Compare database `checksum` to restored file SHA-256 |

Atlas shared/free tiers may not offer continuous backup. Production must use a tier with
cloud backup and point-in-time recovery, or an equivalent self-managed backup with
tested restore. A local single-disk attachment directory is acceptable only for
development; production requires a durable attached volume or object storage.

## 3. Backup schedule

### MongoDB Atlas

1. Enable **Cloud Backup** (continuous backup with PITR where available).
2. Take a daily snapshot outside the `0 2 * * *` SLA scan window, for example 01:00 IST.
3. Retain snapshots according to the table above.
4. Enable backup access logging and alert on failed snapshots.

If PITR is unavailable, schedule `mongodump --gzip --archive` from a network location
with read access at least once every 24 hours and copy it to encrypted off-host storage.
Never treat a replica-set member's local disk as the only backup.

### Attachments

Take a filesystem/volume snapshot of `ATTACHMENT_STORAGE_DIR` at the same time as the
database snapshot, or no later than the database snapshot. If using object storage,
enable versioning and lifecycle rules matching the retention table. Store snapshots
encrypted at rest and in transit.

Do **not** put `.env`, API keys, session tokens, or Better Auth secrets in the same
backup bucket as application data. Restore secrets from the secret manager.

## 4. Restore procedure

1. Declare an incident and freeze writes (stop the API or put it in maintenance mode).
2. Restore the MongoDB snapshot/PITR point immediately before the incident.
3. Restore the attachment volume/snapshot to a staging path.
4. Verify counts and scopes:
   - `cases`, `case_actions`, `case_assignments`, `case_relationships`,
     `case_merge_groups`, `audit_log`;
   - users and active sessions (revoke all sessions after a suspected compromise);
   - attachment rows versus files on disk.
5. Verify a sample of attachment checksums against the restored files.
6. Point `ATTACHMENT_STORAGE_DIR` at the restored volume and start the API.
7. Run `GET /health`, sign in as an admin, load the dashboard, open a case with an
   attachment, and confirm the SLA job scheduler starts when `CRON_ENABLED=true`.
8. Re-enable writes, notify stakeholders, and record the restore in the incident log.

If the database and attachment volume have different recovery points, prefer the older
consistent pair. A missing file is recoverable from the next snapshot; a file without
database metadata is orphaned and should be quarantined, not served.

## 5. Retention and deletion

| Record | Default retention | Deletion method |
|---|---|---|
| Cases and case actions | 7 years after final disposal, or per AICTE records schedule | Formal records-disposition approval; never ad hoc |
| `case_merge_groups` | 7 years after the group is reverted or its canonical case is disposed | Same as cases; keep reverted groups for audit and suppression |
| `audit_log` | 7 years | Same as cases; append-only |
| Attachments | Same as the parent case | Delete with the approved case disposition only |
| Notifications | 2 years | Scheduled cleanup after retention review |
| `job_runs` | 1 year | Scheduled cleanup |
| Sessions | Until expiry/revocation | Better Auth expiry and deactivation cleanup |
| Backups | Per snapshot schedule above | Expire automatically; confirm deletion certificates |

Legal holds override the table: suspend deletion for any case, institution, or user under
investigation or litigation. User deactivation must not delete their case/audit history.
Anonymization, if approved, replaces identity fields while retaining case and audit
integrity; it is not implemented in the MVP.

## 6. Access, encryption, and monitoring

- Encrypt Atlas storage and backups at rest; require TLS for client connections.
- Encrypt attachment volumes/object buckets at rest; restrict write access to the API
  service account and restore access to the platform operator.
- Keep backup credentials separate from runtime credentials and rotate them.
- Alert on failed backups, missing snapshots, attachment-volume capacity, and checksum
  mismatches.
- Restrict audit-log reads to `ADMIN`, `SENIOR_MANAGEMENT`, `COMPETENT_AUTHORITY`, and
  `VIEWER`; downloads remain scoped to case access.

## 7. Known gaps

- No automated restore drill or backup verification job exists yet.
- The default attachment directory is local disk; production durability depends on the
  deployment volume/object-store choice.
- Retention values require AICTE legal/records approval before production use.
- Encryption/key-management specifics depend on the selected Atlas tier and hosting
  environment.
