# CampusCollab

CampusCollab is a MERN university marketplace and collaboration platform. The current MVP includes session-based authentication, profiles, skills, availability, portfolios, gigs, proposals, projects, join requests, invitations, and project membership.

## Project structure

- `client/` — React and Vite frontend
- `server/` — Express, Mongoose, and MongoDB backend
- `docs/` — requirements, architecture, API, and environment documentation

## Local setup

1. Copy `server/.env.example` to `server/.env` and provide local values. Never commit `.env`.
2. Keep `REQUIRE_EMAIL_VERIFICATION=false` during the current development phase.
3. Install dependencies with `npm ci` inside both `server/` and `client/`.
4. Start the API with `npm run dev` in `server/`.
5. Start the frontend with `npm run dev` in `client/`.

The default frontend is `http://localhost:5173` and the API is `http://localhost:5000/api/v1`.

## Validation

Run these before committing a meaningful feature or stabilization change:

```text
cd server
npm test
npm run check

cd ../client
npm test
npm run build
```

MongoDB, session, CSRF, and other secret values belong only in the deployment platform's encrypted environment configuration. The current MVP uses in-memory request rate limits and does not require Redis.

## Deployment

- Frontend: Vercel using `client/vercel.json`
- Backend: Vercel using `server/vercel.json`

See `docs/setup/environment-variables.md` for configuration details.
