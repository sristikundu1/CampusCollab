# CampusCollab

![CampusCollab logo](docs/brand/campuscollab-logo-concept.png)

CampusCollab is a full-stack university collaboration marketplace where students can showcase their skills, discover paid gigs, submit proposals, create collaborative projects, recruit teammates, and manage participation from one workspace.

The application is organized as a React single-page application and a modular Express API backed by MongoDB. Authentication uses revocable server-side sessions rather than browser-stored JWTs.

## Features

### Accounts and profiles

- University-domain registration, login, logout, and persistent sessions
- Profile onboarding and profile-completion tracking
- Academic identity, headline, bio, links, skills, and availability
- Portfolio entries and public student profiles
- Password recovery and email-verification flows, ready for SMTP configuration

### Gig marketplace

- Create, edit, publish, close, archive, restore, start, or cancel gigs
- Browse and filter published opportunities
- Bookmark gigs for later
- Submit, revise, and withdraw proposals
- Review applicants for an owned gig
- Shortlist, accept, or reject proposals

### Collaboration projects

- Create, publish, edit, and manage projects
- Add and manage project openings
- Open or close recruitment
- Request to join an opening and track the request
- Invite candidates and accept, reject, or revoke invitations
- Manage project membership and member departures

### Platform foundations

- Responsive React interface with protected and public routes
- Versioned REST API under `/api/v1`
- Schema validation and consistent API error responses
- Opaque HTTP-only session cookies and CSRF protection
- Exact-origin credentialed CORS
- Rate limiting, security headers, request IDs, and structured logging
- MongoDB transactions, lifecycle rules, audit/outbox models, and named indexes
- Automated frontend and backend tests

## Technology stack

| Layer | Technology |
|---|---|
| Frontend | React 19, React Router, Vite, Tailwind CSS |
| Forms and validation | React Hook Form, Zod |
| HTTP client | Axios |
| Backend | Node.js 22+, Express 5 |
| Database | MongoDB, Mongoose |
| Authentication | Opaque server-side sessions, HTTP-only cookies, CSRF tokens |
| Email | Nodemailer/SMTP (optional in the current development configuration) |
| Testing | Node test runner, Vitest, Testing Library, jsdom |
| Deployment | Separate Vercel projects for `client/` and `server/` |

## Architecture

```mermaid
flowchart LR
    U[Browser] -->|React routes| C[React + Vite client]
    C -->|Axios, JSON, session cookie, CSRF token| A[Express REST API]
    A --> M[Authentication and middleware]
    M --> AUTH
    M --> PROFILE
    M --> GIG
    M --> PROJECT

    subgraph MODULES[Modular monolith]
      AUTH[Auth]
      PROFILE[Profiles and skills]
      GIG[Gigs and proposals]
      PROJECT[Projects and participation]
    end

    AUTH --> DB[(MongoDB)]
    PROFILE --> DB
    GIG --> DB
    PROJECT --> DB
    AUTH -. optional email .-> SMTP[SMTP provider]
```

The frontend never receives database, session, or SMTP secrets. It knows only the public API base URL. The backend validates its environment at startup, establishes the database connection, then starts accepting HTTP requests.

### Repository layout

```text
CampusCollab/
├── client/                     React/Vite application
│   ├── public/                 Static browser assets
│   ├── src/
│   │   ├── components/         Reusable UI and feature components
│   │   ├── context/            Authentication and toast state
│   │   ├── layouts/            Application and authentication layouts
│   │   ├── pages/              Route-level screens
│   │   ├── routes/             Route guards
│   │   └── services/           API client
│   └── .env.example            Public frontend configuration template
├── server/                     Express/Mongoose application
│   ├── api/                    Vercel serverless entry point
│   ├── scripts/                Diagnostics, checks, seeds, and migrations
│   ├── src/
│   │   ├── config/             Environment, database, and logging
│   │   ├── middleware/         Security, validation, and error handling
│   │   ├── modules/            Domain controllers, services, models, routes
│   │   └── routes/             Versioned API composition
│   ├── tests/                  Backend unit and API tests
│   └── .env.example            Backend configuration template
└── docs/                       Requirements, architecture, API, setup, and QA
```

## Run locally

### Prerequisites

- **Node.js 22 or newer.** npm is included with the normal Node.js installation. The backend rejects older Node versions.
- **Git**, when cloning and pulling the repository. Downloading a ZIP works for a one-time copy but does not support `git pull`.
- **A modern browser**, such as current Chrome, Edge, or Firefox.
- **A MongoDB Atlas account and cluster**, or another MongoDB replica set that supports transactions. MongoDB does not need to be installed locally when Atlas is used.
- **A terminal**, such as PowerShell, Windows Terminal, Terminal, Bash, or the terminal inside a code editor.
- **A code editor** such as Visual Studio Code is recommended but not required.

Verify the required command-line tools before cloning:

```bash
node --version
npm --version
git --version
```

`node --version` must report `v22` or newer. If one of these commands is not recognized, install that tool and open a new terminal before continuing.

No global React, Vite, Express, MongoDB, or database-GUI installation is required. `npm ci` installs the exact project dependencies from each lockfile.

### 1. Clone the repository

```bash
git clone https://github.com/sristikundu1/CampusCollab.git
cd CampusCollab
```

### 2. Install dependencies

Install each application independently:

```bash
npm --prefix server ci
npm --prefix client ci
```

### 3. Create the environment files

The real `.env` files are intentionally ignored by Git. Every developer must create them after cloning.

PowerShell:

```powershell
Copy-Item server\.env.example server\.env
Copy-Item client\.env.example client\.env
```

macOS/Linux:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

The files must be located exactly at:

```text
CampusCollab/server/.env
CampusCollab/client/.env
```

Edit `server/.env` and replace these required placeholders:

```env
MONGODB_URI=mongodb+srv://YOUR_USER:YOUR_URL_ENCODED_PASSWORD@YOUR_CLUSTER/YOUR_DATABASE?retryWrites=true&w=majority
SESSION_SECRET=YOUR_RANDOM_SESSION_SECRET_OF_AT_LEAST_32_CHARACTERS
CSRF_SECRET=YOUR_DIFFERENT_RANDOM_CSRF_SECRET_OF_AT_LEAST_32_CHARACTERS
```

You can generate independent local secrets with Node.js:

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

Run that command twice and use a different output for each secret. Never commit or send real secrets through Git.

The local public settings should remain:

```env
# server/.env
NODE_ENV=development
PORT=5000
API_URL=http://localhost:5000
CLIENT_URL=http://localhost:5173
REQUIRE_EMAIL_VERIFICATION=false
```

```env
# client/.env
VITE_API_URL=http://localhost:5000/api/v1
```

For MongoDB Atlas, create a database user and allow the developer's current IP in Atlas Network Access. URL-encode reserved characters in the database password.

### 4. Initialize a new database

If this is a new or empty database, run the seed commands once from `server/` after configuring `server/.env`:

```bash
cd server
npm run db:seed:uiu
npm run db:seed:skills
```

These commands are safe to run again: they update or reuse the bootstrap records instead of intentionally creating duplicates. The university seed enables registration for the configured UIU student domain, and the skills seed creates the initial skill catalogue. Skip this step only when connecting to an existing CampusCollab database that has already been seeded.

### 5. Start the backend

Open a terminal in `server/`:

```bash
npm run dev
```

A successful startup includes these messages:

```text
MongoDB connected
CampusCollab API listening
```

Useful checks:

- API overview: <http://localhost:5000/>
- API v1: <http://localhost:5000/api/v1>
- Liveness: <http://localhost:5000/health>
- Database readiness: <http://localhost:5000/ready>

### 6. Start the frontend

Keep the backend running and open another terminal in `client/`:

```bash
npm run dev
```

Open <http://localhost:5173>.

## Environment variables

### Required backend variables

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | Authenticated MongoDB connection string |
| `SESSION_SECRET` | Secret used by the server-side session system; minimum 32 characters |
| `CSRF_SECRET` | Independent CSRF integrity secret; minimum 32 characters |

### Important backend settings

| Variable | Local default | Purpose |
|---|---|---|
| `NODE_ENV` | `development` | Runtime behavior and secure-cookie policy |
| `PORT` | `5000` | Backend HTTP port |
| `MONGODB_DB_NAME` | `CampusCollab` | Explicit database name |
| `MONGODB_DNS_SERVERS` | empty | Optional comma-separated DNS resolver IPs for Atlas SRV troubleshooting |
| `CLIENT_URL` | `http://localhost:5173` | Exact frontend origin allowed by CORS |
| `API_URL` | `http://localhost:5000` | Public backend origin |
| `REQUIRE_EMAIL_VERIFICATION` | `false` | Require inbox verification before login |

SMTP settings are needed only when email delivery is enabled. Cloudinary variables are reserved for later upload work and are not used by the current application. See [the environment guide](docs/setup/environment-variables.md) for the complete reference.

## Main user flows

### Gig proposal flow

1. An owner creates and publishes a gig from **Dashboard → My gigs**.
2. Another student opens the gig and selects **Apply to this Gig**.
3. The applicant tracks it under **Dashboard → My proposals**.
4. The owner opens **Dashboard → My gigs → Proposals**.
5. The owner reviews, shortlists, accepts, or rejects each proposal.

### Project recruitment flow

1. An owner creates a project and adds one or more openings.
2. The owner publishes the project and enables recruitment.
3. Students request to join an opening, or the owner sends an invitation.
4. Both sides track actions through their join-request or invitation inbox.
5. Accepted participants appear in project membership management.

## Available commands

### Frontend (`client/`)

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite development server |
| `npm run build` | Create a production build |
| `npm run preview` | Preview the production build locally |
| `npm test` | Run frontend tests once |
| `npm run format:check` | Check frontend formatting |

### Backend (`server/`)

| Command | Description |
|---|---|
| `npm run dev` | Start the API with Node watch mode |
| `npm start` | Start the API without watch mode |
| `npm test` | Run all backend tests |
| `npm run test:unit` | Run backend unit tests |
| `npm run check` | Check required files, models, indexes, and ignore rules |
| `npm run db:verify-indexes` | Verify database indexes against MongoDB |
| `npm run db:seed:uiu` | Seed UIU university/domain reference data |
| `npm run db:seed:skills` | Seed the canonical skills catalog |

## Troubleshooting

### Environment values are `undefined`

Confirm that the files are named exactly `.env`, not `.env.txt`, and are inside `server/` and `client/`. Restart both development servers after changing an environment file.

From `server/`, this check reports only whether required values exist:

```bash
node --input-type=module -e "import 'dotenv/config'; console.log({mongodb:!!process.env.MONGODB_URI,session:!!process.env.SESSION_SECRET,csrf:!!process.env.CSRF_SECRET})"
```

### The frontend says it cannot connect

1. Confirm the backend terminal says `CampusCollab API listening`.
2. Open <http://localhost:5000/health> and expect `status: alive`.
3. Open <http://localhost:5000/ready> and expect `status: ready`.
4. Confirm `client/.env` contains `VITE_API_URL=http://localhost:5000/api/v1`.
5. Confirm `server/.env` contains `CLIENT_URL=http://localhost:5173`.
6. Restart Vite after changing `client/.env`.

### MongoDB Atlas reports `querySrv ETIMEOUT` or `ECONNREFUSED`

Run this from `server/`:

```bash
node scripts/diagnose-mongodb.js
```

Check the local DNS/firewall, Atlas Network Access, and the cluster hostname. `MONGODB_DNS_SERVERS` can contain reachable resolver IPs, but it should remain empty when the system resolver works. If the network blocks SRV lookups, obtain the equivalent standard multi-host `mongodb://` connection string from the Atlas connection tools rather than committing a machine-specific address.

### Port already in use

Stop the older development-server process before starting another one. The frontend expects port `5173`, and the backend expects port `5000` by default.

## Testing and quality checks

Before committing:

```bash
cd server
npm test
npm run check
npm run format:check

cd ../client
npm test
npm run build
npm run format:check
```

Manual acceptance cases are available in [docs/testing/manual-user-acceptance-test-cases.md](docs/testing/manual-user-acceptance-test-cases.md).

## Deployment

The client and server deploy as separate Vercel projects.

Frontend environment:

```env
VITE_API_URL=https://YOUR_API_DOMAIN/api/v1
```

Backend environment:

```env
NODE_ENV=production
CLIENT_URL=https://YOUR_CLIENT_DOMAIN
API_URL=https://YOUR_API_DOMAIN
MONGODB_URI=YOUR_PRODUCTION_MONGODB_URI
SESSION_SECRET=YOUR_PRODUCTION_SESSION_SECRET
CSRF_SECRET=YOUR_PRODUCTION_CSRF_SECRET
TRUST_PROXY=true
```

Production URLs must use HTTPS. Because Vite embeds `VITE_API_URL` at build time, redeploy the frontend after changing it. Store all secrets in the deployment platform's encrypted environment configuration.

## Documentation

- [Requirements specification](docs/requirements/phase-1-requirements-specification.md)
- [Domain model](docs/architecture/phase-2-domain-model.md)
- [Database architecture](docs/architecture/phase-3-database-architecture.md)
- [API and backend architecture](docs/architecture/phase-4-api-and-backend-architecture.md)
- [Backend foundation](docs/architecture/phase-5-backend-foundation.md)
- [Server code walkthrough](docs/architecture/server-code-walkthrough.md)
- [Environment configuration](docs/setup/environment-variables.md)
- [OpenAPI specification](docs/openapi/phase-5-foundation.yaml)
- [Manual acceptance tests](docs/testing/manual-user-acceptance-test-cases.md)

## Security notes

- Never commit `.env`, database credentials, session secrets, CSRF secrets, or SMTP credentials.
- Use separate credentials and databases for development and production.
- Rotate any secret immediately if it is accidentally shared or committed.
- Keep `CLIENT_URL` exact; do not replace credentialed CORS with a wildcard.
- Use HTTPS and secure cookies in production.
- Treat the current email-verification-disabled mode as development-only.

## Contributing

Create a focused branch, keep changes scoped, run the validation commands above, and include or update tests for behavior changes. Do not include generated output, dependency directories, or local environment files in commits.
