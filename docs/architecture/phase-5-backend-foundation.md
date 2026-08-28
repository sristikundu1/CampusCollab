# CampusCollab — Phase 5 Backend Foundation and Mongoose Models

**Status:** Implemented foundation  
**Boundary:** Infrastructure and Phase 3 Mongoose models only; no business APIs or authentication workflow  
**Runtime:** Node.js 24 available; project supports Node.js 22+  
**Package manager:** npm

## 1. Initial Workspace State

Before Phase 5 the workspace contained Phase 1–4 Markdown specifications, `.env.example`, and `.gitignore`. It had no `package.json`, lockfile, source code, tests, `.env`, or initialized Git repository. Node.js 24.13.1 and npm 11.8.0 were available. Existing documents and environment names were preserved. The implemented backend package now lives at `C:\CampusColab\server`.

## 2. Implemented Backend Structure

```text
src/
  app.js                         Express composition without network listening
  server.js                      Startup, MongoDB gate, HTTP server, shutdown
  models.js                      Explicit 27-model registry
  config/
    env.js                       Zod environment parsing and safe summary
    database.js                  Injectable singleton MongoDB manager
    logger.js                    Pino JSON logger with redaction
  errors/
    application-error.js         Foundational safe error taxonomy
  middleware/
    error-handler.js
    not-found.js
    request-context.js
    request-logger.js
    request-safety.js
    validate.js
  routes/
    v1.js                        Version root only; no feature routes
  lib/
    crypto/opaque-token.js       Random token, HMAC hash, constant-time compare
    mongo/schema-helpers.js      Shared strict schema primitives
    mongo/transaction.js         Reusable transaction boundary helper
  modules/
    auth/ university/ profiles/ skills/ gigs/ proposals/
    projects/ participation/ messaging/ files/ notifications/
    completion/ moderation/ audit/ users/
  events/outbox.js               Transaction-session-required enqueue primitive
scripts/
  check-project.js
  verify-database-indexes.js
tests/unit/
docs/openapi/phase-5-foundation.yaml
```

This follows Phase 4. `participation` combines Join Requests, Invitations, and Memberships because they share capacity invariants. Models live with the owning module rather than a global model directory; `src/models.js` is the explicit registration surface.

## 3. Installed Dependencies

| Package | Phase 5 responsibility |
|---|---|
| `express` | HTTP application/router foundation |
| `mongoose` | MongoDB connection, schemas, indexes, validation, transaction sessions |
| `zod` | Environment and future request contract validation |
| `dotenv` | Local `.env` loading only |
| `helmet` | Maintained secure HTTP header defaults |
| `cors` | Exact browser-origin response policy |
| `express-rate-limit` | Conservative single-process global abuse ceiling; Redis store deferred |
| `pino` | Structured JSON logs and redaction |

No authentication hash library is installed because registration/password handling is prohibited in Phase 5. No Redis, email, storage, Socket.IO, queue, OpenAPI UI, Docker, or business-feature dependency was added. npm audit reported zero known vulnerabilities at implementation time.

## 4. Configuration

`parseEnvironment()` reads and validates environment variables once. It returns an immutable normalized object. Secret-bearing values never appear in `safeConfigurationSummary()`.

Phase 5 boot requirements:

| Variable | Requirement |
|---|---|
| `MONGODB_URI` | Required; must use `mongodb://` or `mongodb+srv://`; placeholder rejected |
| `NODE_ENV` | `development`, `test`, or `production`; defaults to development |
| `PORT` | Integer 1–65535; defaults to 5000 |
| `CLIENT_URL` | Exact allowed browser origin; defaults to local Vite origin |
| `API_URL` | Public API origin; defaults to local backend origin |
| `LOG_LEVEL` | Structured log threshold |
| `TRUST_PROXY` | Explicit boolean; production value depends on hosting topology |

`SESSION_SECRET` and `CSRF_SECRET` are parsed only when real non-placeholder values exist, but they are not required until Phase 6. SMTP, Redis, and Cloudinary variables are not read by this foundation.

Production configuration rejects non-HTTPS frontend/backend origins. Startup failure shows variable names and safe reasons, never values.

## 5. Express and Middleware

Middleware order is:

1. Request ID creation/validation and `X-Request-Id`
2. Structured completion logging
3. Helmet and fingerprint reduction
4. Exact-origin credentialed CORS
5. Conservative global in-memory rate ceiling
6. 100 KiB JSON and 20 KiB URL-encoded parser limits
7. Duplicate scalar query-parameter rejection
8. Recursive `$`/`.` document-key rejection
9. Versioned `/api/v1` router
10. 404 normalization
11. Centralized safe error serialization

The in-memory limiter is foundation-only. Phase 6 sensitive limits and any multi-instance deployment require the Phase 4 Redis design.

## 6. Health and Readiness

| Route | Meaning |
|---|---|
| `GET /health` | Phase 5 liveness alias: process can serve HTTP |
| `GET /ready` | Phase 5 readiness alias: required MongoDB connection is available |
| `GET /health/live` | Canonical Phase 4 liveness path |
| `GET /health/ready` | Canonical Phase 4 readiness path |

Readiness returns `503` when MongoDB is unavailable. Responses expose only `available`/`unavailable`, not topology, hosts, URI, database, credentials, errors, or stack traces.

## 7. MongoDB Connection and Shutdown

- Exactly one Mongoose connection pool is reused per process.
- Default maximum pool size is 20, minimum is 0, with bounded selection/connect/wait timeouts.
- Models register before connection so development `autoIndex` can initialize declared indexes. Production disables automatic index builds; a controlled deployment process must manage them.
- Initial MongoDB failure prevents the HTTP server from listening. External orchestration may restart with backoff; the process does not create an internal reconnect storm.
- Mongoose topology reconnection handles runtime transient failures and readiness follows the live connection state.
- `SIGINT` and `SIGTERM` stop accepting requests, allow a bounded 15-second drain, disconnect MongoDB, and exit with an appropriate status.
- Connection logs contain state and error class only, never `MONGODB_URI`.

`withTransaction(work)` supplies a short Mongoose session using primary reads, snapshot read concern, majority writes, and bounded commit time. It contains no business transaction.

## 8. Error and Validation Foundation

Implemented errors: `ApplicationError`, `RequestValidationError`, `AuthenticationError`, `AuthorizationError`, `NotFoundError`, `ConflictError`, and `RateLimitError`. The last four business-oriented classes are contract primitives only; no authentication or business controller uses them yet.

Expected errors produce the Phase 4 envelope. Malformed JSON maps to `400`; oversized payload maps to `413`; unknown routes map to `404`; unexpected errors map to `500 INTERNAL_ERROR`. Production responses exclude stacks, file paths, driver errors, index/collection names, secrets, and configuration.

`validateRequest(schema)` parses `{params, query, body}` with a route-owned Zod schema and attaches only parsed data as `request.validated`. Feature-specific schemas remain deferred.

## 9. Implemented Mongoose Collections

All 27 Phase 3 MVP collections are registered:

| Domain | Models / exact collections |
|---|---|
| Identity | `User/users`, `Session/sessions`, `VerificationChallenge/verificationChallenges` |
| University | `University/universities`, `UniversityDomain/universityDomains`, `UniversityAffiliation/universityAffiliations` |
| Profiles | `Profile/profiles`, `Skill/skills`, `PortfolioItem/portfolioItems` |
| Gigs | `Gig/gigs`, `Proposal/proposals`, `Bookmark/bookmarks` |
| Collaboration | `Project/projects` with embedded Openings, `JoinRequest/joinRequests`, `Invitation/invitations`, `ProjectMembership/projectMemberships` |
| Messaging | `Conversation/conversations` with embedded Participants, `Message/messages`, `Attachment/attachments` |
| Operations | `Notification/notifications`, `CompletionRecord/completionRecords`, `Report/reports` |
| Moderation | `ModerationCase/moderationCases`, `ModerationAction/moderationActions`, `AuditEvent/auditEvents` |
| Reliability | `OutboxEvent/outboxEvents`, `AccountDeletionJob/accountDeletionJobs` |

No Payment, Review/Rating, AI, Organization, Recommendation Snapshot, or exact Message Receipt collection was created.

### 9.1 Schema behavior

- Mutable records use strict schemas, timestamps, and explicit non-negative integer `version`.
- Append-oriented Bookmark, Message, Moderation Action, and Audit Event preserve their Phase 3 timestamp/mutation semantics.
- Stable identifiers and ownership/source references are immutable where Phase 3 requires.
- Arrays have caps and important identity arrays enforce within-document uniqueness.
- User-authored text is normalized, null-byte stripped, trimmed, and bounded.
- Major state fields use the Phase 3 enums and defaults.
- Soft-delete/account lifecycle fields exist on User and historical lifecycle/status fields exist on business records. No deletion workflow is implemented.

## 10. Indexes

The model registry currently declares 79 explicitly named index definitions. This count combines Phase 3 query indexes and unique constraints; overlapping requirements use one physical named index.

Implemented categories:

- Unique email, token hashes, normalized university/domain/skill identities, Profile owner, Bookmark relation, storage key, Conversation context, Message client identity, Notification event identity, Completion context, Outbox event identity, and accepted-source identity.
- Partial unique current Verification Challenge, active Affiliation, active Proposal, pending Join Request, pending Invitation, active Membership, and active Deletion Job.
- Cursor/query indexes for marketplace, project participation, messages, notifications, moderation, audit, outbox, and deletion jobs.
- TTL indexes only on `sessions.expiresAt` and `verificationChallenges.expiresAt`, both `expireAfterSeconds: 0`.
- Invitations are indexed for an expiry sweep but not TTL-deleted.
- The provisional processed-Outbox TTL was not created because Phase 3 leaves its retention duration unapproved.
- Atlas Search definitions cannot be created by Mongoose and remain an Atlas deployment task after the search index mapping is approved.

`npm run check` validates model/index registration without MongoDB. After configuring a non-production database and starting once so development indexes initialize, `npm run db:verify-indexes` performs a read-only comparison between declared named indexes and MongoDB's actual indexes. Production index rollout requires a separately approved migration/deployment process.

**Implementation caveat carried from Phase 3:** the selected MongoDB version must be verified for `$in` support in partial-filter expressions used by active Proposal and active Deletion Job indexes. The architecture was not silently changed.

## 11. Sensitive-Data Foundation

- `passwordHash`, session/challenge token hashes, internal decision notes, private message bodies, report evidence/identity, audit metadata, storage keys, and other critical fields use `select: false` by default.
- The model layer never accepts or stores `password`, `rawToken`, or provider credentials.
- `generateOpaqueToken`, `hashOpaqueToken`, and constant-time `opaqueTokenMatches` prepare Phase 6 session/challenge handling. Only HMAC hashes belong in Session/Challenge documents.
- Password hashing remains Phase 6; an adaptive password library will be selected then. The current User model accepts only an already-derived `passwordHash`.
- Audit Events expose no ordinary update/delete utility. Direct database privileges must still enforce append-only operational policy.
- Strict schemas and unsafe-key middleware reduce mass assignment/operator injection, but future services must still build allowlisted commands and repository filters.

## 12. Outbox Foundation

`OutboxEvent` implements the Phase 3 collection, idempotency index, claim queue index, statuses, attempts, and safe error category. `enqueueOutboxEvent(event, session)` requires an existing MongoDB transaction session so future code cannot casually dual-write outside the business transaction. No worker, consumer, notification, Redis, or BullMQ implementation exists.

## 13. Testing Foundation

The project uses Node's built-in `node:test`, avoiding an unnecessary test-runner dependency. Current unit/foundation coverage includes:

- Required/placeholder/production environment validation and safe configuration summaries
- Injectable MongoDB manager connection success, connection failure, reuse, readiness, and disconnect
- Health/readiness behavior
- Phase 4 404/error envelope
- Helmet headers, fingerprint removal, and exact-origin CORS
- Request size rejection
- Reusable Zod request parsing
- Registration of all 27 exact collections
- User required-field and enum validation
- Sensitive credential selection behavior
- Session/Challenge TTL definitions
- Proposal partial uniqueness
- Globally unique explicit index names

These are not feature tests. A real MongoDB integration suite remains necessary for unique/partial index enforcement, transactions, and concurrency.

## 14. Database Test Environment Recommendation

Use a dedicated local or CI MongoDB replica set with disposable test data. The simplest reliable choices are:

1. A dedicated MongoDB Atlas development/test cluster and database user, or
2. A local MongoDB replica set already managed by the developer.

A test container is attractive for repeatable CI but Docker was explicitly excluded from Phase 5. `mongodb-memory-server` was not added because it downloads/manages database binaries and can differ operationally from the selected deployment. Never point destructive integration tests at production; require a test database name/allowlist guard before adding database-cleanup tests.

No local `mongod` executable and no real `MONGODB_URI` were available during Phase 5, so external connection and physical index verification were not run. Connection behavior is covered through the injectable adapter tests; actual database verification is a manual next step.

## 15. OpenAPI Foundation

`docs/openapi/phase-5-foundation.yaml` documents only liveness/readiness. It establishes OpenAPI 3.1 without installing Swagger UI or duplicating the 126 Phase 4 endpoint contracts prematurely.

## 16. Local Run Instructions

1. Change directory to `C:\CampusColab\server`.
2. Copy `.env.example` to `.env` locally.
3. Set Phase 5 variables, especially a real development/test `MONGODB_URI`. Do not send it through chat.
4. Ensure the MongoDB deployment is a replica set or Atlas cluster so future transaction tests are valid.
5. Run `npm install`.
6. Run `npm test` and `npm run check`.
7. Run `npm run dev`.
8. Request `GET http://localhost:5000/health`; expect `200` and `alive`.
9. Request `GET http://localhost:5000/ready`; expect `200` only after MongoDB connects.
10. Run `npm run db:verify-indexes` against the non-production database to compare physical and declared indexes.

Without a valid `MONGODB_URI`, startup intentionally fails before listening. Do not replace it with invented credentials.

## 17. Phase Boundary Confirmation

No registration, login/logout, university-verification workflow, Profile/Gig/Proposal/Project/participation/Messaging/Notification/Completion/Moderation/Admin API, controller, business service, email, storage integration, Socket.IO, Redis worker, or background worker was implemented.

## 18. Phase 5 Exit Status

- [x] npm backend foundation and lockfile exist
- [x] Express composition/startup and graceful shutdown exist
- [x] Central configuration uses exact `MONGODB_URI`
- [x] MongoDB manager, readiness, bounded pool, and safe connection logging exist
- [x] Health/readiness aliases and canonical Phase 4 routes exist
- [x] Helmet, CORS, size limits, request IDs, safety checks, global limiter, and redacted logs exist
- [x] Central errors and Zod validation infrastructure exist
- [x] All 27 Phase 3 Mongoose models and named index definitions exist
- [x] Only approved Session and Challenge TTL indexes exist
- [x] Sensitive fields are excluded by default and raw secret field names are absent
- [x] Transaction and outbox foundations exist without business workflows
- [x] Unit/foundation tests and OpenAPI seed exist
- [x] No `.env` or real credentials exist
- [ ] Live MongoDB connectivity and physical index verification — requires user-provided local `MONGODB_URI`

**Recommended next phase after manual MongoDB verification:** Phase 6 — Authentication, Sessions, and Account Lifecycle. Do not begin automatically.
