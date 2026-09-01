# CampusCollab Environment Variables and Manual Configuration

**Phase:** 4 — REST API Contract and Backend Architecture  
**Authentication decision:** opaque, revocable server-side sessions stored as hashed tokens; no JWT variables are used.  
**Rule:** `.env.example` contains names and placeholders only. Create `.env` locally yourself and never commit it.

During the current stabilization phase, `REQUIRE_EMAIL_VERIFICATION=false` permits accounts from active university domains to sign in without inbox verification. This is an explicit product limitation: a matching address domain does not prove mailbox ownership. Email verification and password recovery are deferred and must be reviewed before CampusCollab is opened to real university users.

`MONGODB_DB_NAME` explicitly selects the application database. Use `CampusCollab`; without an explicit database selection, MongoDB drivers commonly fall back to `test`.

> **Current runtime:** MongoDB, session, and CSRF values are required. Redis is optional for a single local process and required when `NODE_ENV=production`. SMTP is optional while email verification remains disabled. Cloudinary is not used by the implemented application.

## 1. Configuration classes

### PUBLIC / NON-SECRET CONFIGURATION

These values describe runtime behavior and may appear in deployment configuration. They are not credentials, although production infrastructure configuration should still be change-controlled.

| Variable | What it is / why needed | Where to obtain or choose it | In `.env`? | Commit real value? | Development vs. production |
|---|---|---|---|---|---|
| `NODE_ENV` | Runtime mode controlling safe errors, logging, and cookie policy. | Choose `development`, `test`, or `production`. | Yes | Yes, in non-secret deployment config; do not hard-code assumptions | Local `development`; deployed service `production`; tests `test`. |
| `PORT` | HTTP listen port. | Choose locally or use the hosting platform's injected port. | Yes | Usually safe | Common local value is `5000`; production may be platform-assigned. |
| `API_URL` | Public origin of the backend, used for links and origin validation. | Your local/backend deployment URL. | Yes | Yes | Local example `http://localhost:5000`; production must be its HTTPS origin, without a trailing path. |
| `CLIENT_URL` | Allowed frontend origin and base for verification/reset links. | Your Vite frontend or deployed web URL. | Yes | Yes | Local example `http://localhost:5173`; production must use HTTPS. |
| `LOG_LEVEL` | Minimum structured-log severity. | Choose `debug`, `info`, `warn`, or `error`. | Yes | Yes | `debug` locally; normally `info` in production. Never enable payload logging globally. |
| `TRUST_PROXY` | Whether Express trusts the deployment proxy for secure cookies and client IP. | Determine from hosting topology. | Yes | Yes | `false` locally; set the exact trusted hop count/network in implementation for production, not indiscriminate trust. |
| `SESSION_COOKIE_NAME` | Name of the opaque session cookie. | Project choice. | Yes | Yes | Keep stable per environment; never encode secrets in the name. |
| `SESSION_TTL_DAYS` | Maximum session lifetime before renewal/re-authentication. | Product/security policy. | Yes | Yes | Proposed MVP default is 30; production may shorten after risk review. |
| `SMTP_PORT` | SMTP service port. | Email provider documentation. | Yes | Yes | Commonly `587`; use the provider's exact value. |
| `SMTP_SECURE` | Whether TLS starts immediately on connection. | Email provider documentation. | Yes | Yes | Usually `false` for STARTTLS on 587 and `true` for implicit TLS on 465. |
| `EMAIL_FROM` | Verified sender identity displayed on CampusCollab mail. | Verify an address/domain with the chosen provider. | Yes | Usually safe | Local mail sandbox may use a test sender; production needs a verified domain/address. |
| `CLOUDINARY_CLOUD_NAME` | Public Cloudinary account namespace. | Cloudinary dashboard. | Yes | Generally safe, but do not confuse it with credentials | Use separate development and production accounts/folders when possible. |
| `CLOUDINARY_FOLDER` | Namespace for uploaded CampusCollab objects. | Choose a folder name. | Yes | Yes | Separate environments, for example provider-side folders, to avoid mixed data. |
| `MAX_UPLOAD_BYTES` | Server-side upper bound for an individual upload. | Security/product policy. | Yes | Yes | Proposed placeholder is 10 MiB; the attachment policy remains an approval item. |

### SECRET CONFIGURATION

Store these in local `.env`, a CI secret store, and the production platform's secret manager. Never commit real values, place them in screenshots, tickets, logs, or frontend variables.

| Variable | What it is / why needed | Where to obtain or generate it | In `.env`? | Commit real value? | Development vs. production |
|---|---|---|---|---|---|
| `MONGODB_URI` | Authenticated connection string for the MongoDB deployment containing CampusCollab data. | Manually create/configure MongoDB Atlas or another supported replica-set deployment, create a least-privilege database user, permit the backend network, and copy the driver connection URI. | Yes | **Never** | Use separate databases/users. Transactions require a replica set or sharded cluster; production TLS and backups are mandatory. |
| `SESSION_SECRET` | Cryptographic secret for signing/deriving opaque session security material. | Generate outside source control with an OS password/secret generator using cryptographically secure randomness; target at least 32 random bytes. | Yes | **Never** | Use a different value per environment. Rotation needs a planned invalidation or key-ring migration. |
| `CSRF_SECRET` | Independent key for CSRF token integrity. | Generate independently using the same secure process. Do not reuse `SESSION_SECRET`. | Yes | **Never** | Rotation can invalidate outstanding CSRF tokens; deploy deliberately. |
| `SMTP_HOST` | SMTP endpoint; sometimes operational rather than secret, but keep with provider configuration. | Chosen provider dashboard/documentation. | Yes | Avoid committing provider configuration | Local development may use a mail sandbox; production uses an approved provider. |
| `SMTP_USER` | SMTP username/account identifier. | Email provider. | Yes | **Never** | Use environment-specific credentials and least privilege. |
| `SMTP_PASSWORD` | SMTP password or provider-issued SMTP API key. | Email provider; never use a personal mailbox password when provider credentials are available. | Yes | **Never** | Rotate and revoke through provider tools. |
| `REDIS_URL` | Redis connection URI, usually containing credentials, for distributed rate limiting, jobs, caching, and later Socket.IO fan-out. | Provision Redis through a managed provider or local Redis and copy its URI. | Yes when enabled | **Never** | Optional for a single-process local backend; required before multi-instance production. Use TLS (`rediss://`) where supported. |
| `CLOUDINARY_API_KEY` | Cloudinary API account identifier used by the backend. | Cloudinary dashboard. | Yes | **Never** as a project rule | Server-side only. Use restricted/environment-specific credentials. |
| `CLOUDINARY_API_SECRET` | Secret authorizing Cloudinary signing and management calls. | Cloudinary dashboard. | Yes | **Never** | Never expose to React. Rotate immediately if leaked. |

## 2. Mandatory manual setup

### 2.1 MongoDB and `MONGODB_URI`

You must manually create or select a MongoDB deployment and database. Do not invent credentials in project files.

1. Create an Atlas project/cluster or provision a supported MongoDB replica set.
2. Create a dedicated CampusCollab database user with only the permissions the backend needs.
3. Configure network access for the backend environment; do not allow the entire internet unless a controlled platform design requires it.
4. Enable TLS, backups, monitoring, and production alerts.
5. Copy the driver URI and replace each placeholder locally.

Placeholder structure only:

```text
mongodb+srv://<database-user>:<url-encoded-password>@<cluster-host>/<database-name>?retryWrites=true&w=majority
```

If the password contains reserved URL characters, encode it. Never paste the resolved URI into documentation, Git, issue trackers, or logs. Phase 3 transactions require a deployment that supports MongoDB transactions.

### 2.2 Session and CSRF secrets

Generate two different cryptographically random values outside the repository. A password manager, operating-system cryptographic generator, or production secret manager is appropriate. Do not use a memorable phrase, UUID alone, sample value, or value generated by an online page of uncertain trust. The project intentionally does not generate production secrets.

### 2.3 Email credentials

Choose an SMTP-capable transactional provider or a development mail sandbox. Obtain the host, port, TLS mode, username, password/API key, and verified sender. Configure SPF, DKIM, and DMARC for the production sending domain. Email is required for university verification and password reset; development may use a sandbox that never delivers to real recipients.

### 2.4 Cloudinary/object storage

File uploads are not implemented in the current application. Do not provision Cloudinary for this stabilization phase. Revisit storage credentials, upload limits, signed delivery, deletion, and malware scanning only when file uploads become an approved feature.

### 2.5 Redis

Redis is optional for a single-process local implementation. It is mandatory when `NODE_ENV=production` because authentication, proposal, participation, and global rate limits must share state across instances. Local development can use the in-memory fallback; production should use an authenticated TLS `rediss://` connection and separate environments.

### 2.6 Application URLs

- `CLIENT_URL` is the browser application's origin. It controls CORS and is used to construct frontend verification/reset links.
- `API_URL` is the externally reachable backend origin.
- Local examples are `http://localhost:5173` and `http://localhost:5000`.
- Production values must be exact HTTPS origins. Do not use wildcard credentialed CORS.
- Preview deployments need an explicit allowlist design; do not turn every subdomain into a trusted origin by string suffix matching.

## 3. Creating local `.env`

1. Copy `C:\CampusColab\server\.env.example` to `C:\CampusColab\server\.env` manually.
2. Replace required placeholders only in `.env`.
3. Keep `.env` out of Git; `.gitignore` excludes `.env` and `.env.*` while allowing `.env.example`.
4. Start-up configuration validation must fail fast for missing, placeholder, malformed, or unsafe production values.
5. Never prefix backend secrets with frontend exposure conventions such as `VITE_`.

Do not create `.env` until you have the values. CampusCollab currently has no `.env` file by design.

## 4. Secret lifecycle and deployment

- **Development:** use separate low-privilege sandbox credentials. Never share one developer's `.env` through chat or Git.
- **Production:** inject secrets at runtime from the hosting platform or secret manager. Restrict who can read or rotate them.
- **CI/CD:** store test/deployment secrets in protected environment-scoped secret variables. Prevent forked/untrusted jobs from reading them and mask exact values in logs.
- **Docker:** pass environment variables or mount orchestrator-managed secret files at runtime. Never bake `.env` or credentials into an image layer.
- **Rotation:** document owner, creation date, last rotation, expiry, dependents, rollback, and emergency revocation. Rotate immediately after suspected exposure.
- **Session-secret rotation:** either accept global logout or implement a short key-ring migration; never silently keep compromised keys indefinitely.
- **Database/email/storage rotation:** create the replacement, deploy it, verify use, revoke the old credential, then audit access.

## 5. Pre-deployment checklist

- [ ] Exact production `API_URL` and `CLIENT_URL` selected
- [ ] MongoDB deployment, least-privilege user, network controls, TLS, backups, and `MONGODB_URI` configured
- [ ] Independent `SESSION_SECRET` and `CSRF_SECRET` generated securely
- [ ] Email provider credentials and verified `EMAIL_FROM` configured
- [ ] Cloudinary account, credentials, delivery policy, and upload restrictions configured
- [ ] Redis TLS URL configured for multi-instance production
- [ ] Production log level and proxy trust configured
- [ ] Secrets stored in the deployment secret manager, not repository variables
- [ ] Configuration validation and secret-redaction tests pass
- [ ] No `.env`, credentials, or secret-bearing logs exist in Git history
