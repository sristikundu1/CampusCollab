# CampusCollab Server Code Walkthrough

This guide is a simple presentation map for explaining the backend: how the server starts, where API endpoints are written, how requests reach MongoDB, and where each collection is defined.

## 1. Backend in one sentence

CampusCollab uses Node.js and Express for the REST API, Zod for request and environment validation, Mongoose for MongoDB, and opaque cookie-based sessions for authentication.

## 2. The request flow

```text
Browser request
    ↓
server/src/server.js             starts the process and connects MongoDB
    ↓
server/src/app.js                creates Express and applies middleware
    ↓
server/src/routes/v1.js          combines all /api/v1 feature routes
    ↓
*.routes.js                      matches HTTP method and URL
    ↓
*.validation.js                  validates params, query, and body
    ↓
*.controller.js                  handles HTTP request/response
    ↓
*.service.js                     applies business rules and database queries
    ↓
*.model.js                       defines the MongoDB schema and collection
```

The most useful way to explain the design is: **route → validation → controller → service → model → MongoDB**.

## 3. Where the server starts

### `server/src/server.js`

This is the local backend entry point. Show the `start()` function.

Important code:

```js
config = parseEnvironment();
await connectDatabase(config, logger);

const app = createApp({
  config,
  logger,
  databaseReadiness: getDatabaseReadiness,
});

server.listen(config.port, () =>
  logger.info({ port: config.port }, "CampusCollab API listening"),
);
```

Explanation:

1. Read and validate `server/.env`.
2. Connect to MongoDB.
3. Create the Express application.
4. Listen on port `5000` locally.
5. Handle graceful shutdown when the process stops.

### `server/api/index.js`

This is the Vercel/serverless backend entry point. Local development uses `src/server.js`; Vercel invokes `api/index.js`.

## 4. Where Express is configured

### `server/src/app.js`

This file creates the Express application and installs shared middleware.

Important code:

```js
app.use(requestContext);
app.use(createRequestLogger(logger, config.nodeEnv));
app.use(helmet());
app.use(cors({ /* exact frontend origin */ }));
app.use(rateLimit({ /* global request limit */ }));
app.use(express.json({ limit: "128kb", strict: true }));
```

It also exposes the basic status endpoints:

```js
app.get("/", /* API overview */);
app.get("/health", health);
app.get("/ready", ready);
```

All feature routes are mounted under `/api/v1`:

```js
app.use(
  "/api/v1",
  createV1Router({
    config,
    authService,
    profileService,
    skillService,
    gigService,
    proposalService,
    projectService,
    participationService,
  }),
);
```

Finally, unknown routes and application errors are handled centrally:

```js
app.use(notFoundHandler);
app.use(createErrorHandler({ logger, environment: config.nodeEnv }));
```

## 5. Where all feature routes are joined

### `server/src/routes/v1.js`

This file is the API route index.

```js
router.use("/auth", createAuthRouter(dependencies));
router.use(createProfileRouter(dependencies));
router.use("/skills", createSkillRouter(dependencies));
router.use(createGigRouter(dependencies));
router.use(createProposalRouter(dependencies));
router.use(createProjectRouter(dependencies));
router.use(createParticipationRouter(dependencies));
```

Because `app.js` adds `/api/v1`, an authentication route written as `/auth/login` becomes:

```text
POST /api/v1/auth/login
```

## 6. GET, POST, PUT, PATCH, and DELETE

| Method | Meaning in this project | Example |
|---|---|---|
| `GET` | Read one or more resources without changing them | Get published gigs |
| `POST` | Create a resource or run a named business command | Create a gig, publish a gig, accept a proposal |
| `PUT` | Replace a complete replaceable sub-resource | Replace the full profile skill list |
| `PATCH` | Partially update an existing resource | Change selected profile or gig fields |
| `DELETE` | Remove a resource or relationship | Delete a portfolio item or remove a bookmark |

### Route files containing these methods

| Feature | Route file | Methods used |
|---|---|---|
| Authentication | `server/src/modules/auth/auth.routes.js` | GET, POST |
| Profiles and portfolios | `server/src/modules/profiles/profile.routes.js` | GET, POST, PUT, PATCH, DELETE |
| Skills | `server/src/modules/skills/skill.routes.js` | GET, POST |
| Gigs and bookmarks | `server/src/modules/gigs/gig.routes.js` | GET, POST, PATCH, DELETE |
| Proposals | `server/src/modules/proposals/proposal.routes.js` | GET, POST, PATCH |
| Projects and openings | `server/src/modules/projects/project.routes.js` | GET, POST, PATCH |
| Join requests, invitations, membership | `server/src/modules/participation/participation.routes.js` | GET, POST |

## 7. Implemented endpoint groups

Every endpoint below has the `/api/v1` prefix.

### Authentication

File: `server/src/modules/auth/auth.routes.js`

```text
POST /auth/register
POST /auth/login
POST /auth/logout
GET  /auth/me
POST /auth/verify-email
POST /auth/verification/resend
POST /auth/password/forgot
POST /auth/password/reset
```

Related files:

- `auth.validation.js` validates email, password, tokens, and request bodies.
- `auth.controller.js` sets/clears the HTTP-only session cookie.
- `auth.service.js` creates users and sessions and verifies credentials.
- `auth.middleware.js` authenticates the session and checks CSRF tokens.
- `user.model.js`, `session.model.js`, and `verification-challenge.model.js` define the main collections.

### Profiles, skills, and portfolios

Files:

- `server/src/modules/profiles/profile.routes.js`
- `server/src/modules/skills/skill.routes.js`

Key endpoints:

```text
GET    /profiles/me
POST   /profiles/me
PATCH  /profiles/me
PUT    /profiles/me/skills
PATCH  /profiles/me/availability
GET    /profiles/:userId
GET    /profiles/me/portfolio-items
POST   /profiles/me/portfolio-items
PATCH  /portfolio-items/:itemId
DELETE /portfolio-items/:itemId
GET    /skills
POST   /skills
```

### Gigs and bookmarks

File: `server/src/modules/gigs/gig.routes.js`

```text
POST   /gigs
GET    /gigs
GET    /gigs/mine
GET    /gigs/:gigId
PATCH  /gigs/:gigId
DELETE /gigs/:gigId
POST   /gigs/:gigId:publish
POST   /gigs/:gigId:close
POST   /gigs/:gigId:archive
POST   /gigs/:gigId:restore
POST   /gigs/:gigId:start
POST   /gigs/:gigId:cancel
POST   /gigs/:gigId/bookmark
DELETE /gigs/:gigId/bookmark
GET    /users/me/bookmarked-gigs
```

### Proposals

File: `server/src/modules/proposals/proposal.routes.js`

```text
POST  /gigs/:gigId/proposals
GET   /proposals/mine
GET   /gigs/:gigId/proposals
GET   /proposals/:proposalId
PATCH /proposals/:proposalId
POST  /proposals/:proposalId:withdraw
POST  /proposals/:proposalId:shortlist
POST  /proposals/:proposalId:accept
POST  /proposals/:proposalId:reject
```

### Projects and openings

File: `server/src/modules/projects/project.routes.js`

```text
POST  /projects
GET   /projects
GET   /projects/mine
GET   /projects/:projectId
PATCH /projects/:projectId
POST  /projects/:projectId:publish
POST  /projects/:projectId:transition
PATCH /projects/:projectId/recruitment
POST  /projects/:projectId/openings
PATCH /projects/:projectId/openings/:openingId
POST  /projects/:projectId/openings/:openingId:close
POST  /projects/:projectId/openings/:openingId:reopen
```

### Participation

File: `server/src/modules/participation/participation.routes.js`

This module contains join requests, invitations, candidate discovery, and project membership endpoints. Its main URL groups are:

```text
/projects/:projectId/openings/:openingId/join-requests
/join-requests/...
/projects/:projectId/openings/:openingId/invitations
/invitations/...
/projects/:projectId/members/...
/projects/:projectId/invite-candidates
```

## 8. A complete example: creating a gig

Use this section to demonstrate one request through every backend layer.

### Step 1: Route

File: `server/src/modules/gigs/gig.routes.js`

```js
router.post(
  "/gigs",
  auth.authenticate,
  auth.requireCsrf,
  validateRequest(createGigRequest),
  controller.create,
);
```

Explanation: the route accepts `POST /api/v1/gigs`, requires login, checks CSRF, validates the body, and calls the controller.

### Step 2: Validation

File: `server/src/modules/gigs/gig.validation.js`

Show `createGigRequest`. It defines which body fields are accepted and rejects invalid or unknown input before business logic runs.

### Step 3: Controller

File: `server/src/modules/gigs/gig.controller.js`

```js
create: async (request, response) =>
  respond(
    response,
    request,
    {
      gig: await gigService.create(
        request.auth.user._id,
        request.validated.body,
      ),
    },
    201,
  ),
```

Explanation: the controller takes the authenticated user ID and validated body, calls the service, and returns HTTP `201 Created`.

### Step 4: Service and database write

File: `server/src/modules/gigs/gig.service.js`

Show the `create()` function around the `GigModel.create()` call:

```js
const gig = await GigModel.create({
  ownerId: userId,
  ownerSnapshot: {
    displayName: context.profile.displayName,
    universityId: context.affiliation?.universityId,
  },
  ...input,
  deadlineAt: dateValue(input.deadlineAt),
});
```

Explanation: the service applies ownership and business rules, then writes the document. The client is not allowed to choose `ownerId`; it comes from the authenticated session.

### Step 5: Model and collection

File: `server/src/modules/gigs/gig.model.js`

At the bottom of the file:

```js
export const Gig = model("Gig", gigSchema, "gigs");
```

Explanation:

- `Gig` is the JavaScript/Mongoose model name.
- `gigSchema` defines fields, validation, timestamps, and indexes.
- `gigs` is the exact MongoDB collection name.

## 9. How reads and updates reach MongoDB

File: `server/src/modules/gigs/gig.service.js`

Examples you can show:

```js
// GET/list: read many documents
const found = await GigModel.find(filter)
  .sort({ createdAt: -1, _id: -1 })
  .limit(input.limit + 1)
  .lean();

// GET/detail: read one document by ID
const gig = await GigModel.findById(gigId).lean();

// PATCH: find the owner's document, change allowed fields, then save
const gig = await GigModel.findOne({ _id: gigId, ownerId: userId });
await gig.save();

// DELETE: delete only when ID and owner match
await GigModel.deleteOne({ _id: gigId, ownerId: userId });
```

The service layer—not the route—is where ownership, lifecycle, visibility, and cross-collection rules are enforced.

## 10. MongoDB collection definitions

### Central model registry

File: `server/src/models.js`

This file imports and exports all 27 registered Mongoose models so schemas and indexes are registered when the server starts.

### Collections used by implemented APIs

| Collection | Model file | Purpose |
|---|---|---|
| `users` | `modules/auth/user.model.js` | Accounts, password hash, status, capabilities |
| `sessions` | `modules/auth/session.model.js` | Revocable authenticated sessions |
| `verificationChallenges` | `modules/auth/verification-challenge.model.js` | Email verification and password-reset challenges |
| `universities` | `modules/university/university.model.js` | Supported universities |
| `universityDomains` | `modules/university/university-domain.model.js` | Allowed student email domains |
| `universityAffiliations` | `modules/university/university-affiliation.model.js` | User-to-university affiliation |
| `profiles` | `modules/profiles/profile.model.js` | Student profile, skills, links, availability |
| `skills` | `modules/skills/skill.model.js` | Canonical and user-created skills |
| `portfolioItems` | `modules/profiles/portfolio-item.model.js` | Profile portfolio entries |
| `gigs` | `modules/gigs/gig.model.js` | Gig details and lifecycle state |
| `bookmarks` | `modules/gigs/bookmark.model.js` | User-to-gig bookmarks |
| `proposals` | `modules/proposals/proposal.model.js` | Gig applications, revisions, decisions |
| `projects` | `modules/projects/project.model.js` | Collaboration projects and embedded openings |
| `joinRequests` | `modules/participation/join-request.model.js` | Student requests to join openings |
| `invitations` | `modules/participation/invitation.model.js` | Owner invitations to candidates |
| `projectMemberships` | `modules/participation/project-membership.model.js` | Accepted project members |

All model paths above are relative to `server/src/`.

### Collections currently prepared as foundations only

These schemas and indexes exist, but this version does not yet expose complete controllers/services/routes for the feature:

| Collection | Model file | Future area |
|---|---|---|
| `conversations` | `modules/messaging/conversation.model.js` | Messaging |
| `messages` | `modules/messaging/message.model.js` | Messaging |
| `attachments` | `modules/files/attachment.model.js` | File attachments |
| `notifications` | `modules/notifications/notification.model.js` | Notifications |
| `completionRecords` | `modules/completion/completion-record.model.js` | Work completion |
| `reports` | `modules/moderation/report.model.js` | User/content reports |
| `moderationCases` | `modules/moderation/moderation-case.model.js` | Moderation cases |
| `moderationActions` | `modules/moderation/moderation-action.model.js` | Moderation decisions |
| `auditEvents` | `modules/audit/audit-event.model.js` | Immutable audit history |
| `outboxEvents` | `modules/audit/outbox-event.model.js` | Reliable event publication foundation |
| `accountDeletionJobs` | `modules/users/account-deletion-job.model.js` | Account-deletion workflow |

## 11. Important shared files

| File | What to explain |
|---|---|
| `server/src/config/env.js` | Validates environment variables and prevents startup with missing secrets |
| `server/src/config/database.js` | Connects Mongoose and reports database readiness |
| `server/src/config/logger.js` | Structured logging and secret-field redaction |
| `server/src/middleware/validate.js` | Runs Zod validation for params, query, and body |
| `server/src/middleware/error-handler.js` | Converts errors into a safe, consistent JSON response |
| `server/src/middleware/request-context.js` | Adds a request ID for tracing |
| `server/src/middleware/request-safety.js` | Blocks duplicate query parameters and unsafe MongoDB keys |
| `server/src/middleware/idempotency.js` | Requires idempotency keys for sensitive repeated commands |
| `server/src/modules/auth/auth.middleware.js` | Reads the session cookie, authenticates, and enforces CSRF |
| `server/src/lib/mongo/transaction.js` | Runs multi-document operations inside MongoDB transactions |

## 12. Five-minute explanation script

You can explain the current backend like this:

> The backend is a modular Express application. `server.js` validates the environment, connects MongoDB, creates the Express app, and starts port 5000. `app.js` installs security, CORS, JSON parsing, logging, and error middleware, then mounts all business routes under `/api/v1`. Each feature is separated into route, validation, controller, service, and model files. The route chooses the HTTP endpoint, Zod validates the request, the controller translates HTTP data, the service enforces ownership and lifecycle rules, and the Mongoose model reads or writes a named MongoDB collection. The implemented feature modules are authentication, profiles, skills, gigs, proposals, projects, and participation. Other collections such as messaging and notifications are currently database foundations for future implementation.

For a live code example, open these files in order:

1. `server/src/server.js`
2. `server/src/app.js`
3. `server/src/routes/v1.js`
4. `server/src/modules/gigs/gig.routes.js`
5. `server/src/modules/gigs/gig.validation.js`
6. `server/src/modules/gigs/gig.controller.js`
7. `server/src/modules/gigs/gig.service.js`
8. `server/src/modules/gigs/gig.model.js`

That sequence demonstrates the complete journey of one request without needing to explain every backend file.
