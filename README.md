# SBE Platform

A form/assessment platform. Respondents fill out assessments and get a report; admins manage assessment types, categories, questions, users and branding.

- **Frontend** – Next.js 14 (App Router), Tailwind, Radix UI. Repo root.
- **Backend** – Express + TypeScript API in [`aiforms-api/`](aiforms-api/).
- **Database** – Neon serverless Postgres.
- **Hosting** – Vercel (frontend), Render (API), Neon (DB).

For architecture, auth, API routes and known tech debt, see [TECHNICAL.md](TECHNICAL.md).

## Live deployment

| Piece | Where | URL |
|---|---|---|
| Frontend | Vercel (project `sbe-platform`) | https://sbe-platform.vercel.app |
| API | Render (service `aiforms-api`) | https://aiforms-api.onrender.com (health: `/health`) |
| Database | Neon (project `SBE-Form`) | via `DATABASE_URL` |

Deploys are automatic: pushing to `master` on GitHub rebuilds both Vercel and Render.

## How the pieces connect

```
Browser ──> Vercel (Next.js) ──/api-proxy/*──> Render (Express API) ──> Neon (Postgres)
```

The browser only talks to the frontend domain. `next.config.mjs` rewrites `/api-proxy/*` to the API.
The frontend calls the API through `NEXT_PUBLIC_API_URL=/api-proxy`.

## Environment variables

### API (`aiforms-api/`, set in Render)

| Var | Purpose |
|---|---|
| `DATABASE_URL` | Neon connection string (`postgresql://...`). Must be the actual URL, not a command. |
| `JWT_SECRET` | Signing key for login tokens. Any long random string. Changing it logs everyone out. |
| `FRONTEND_URL` | Allowed CORS origin(s), comma-separated. Production: `https://sbe-platform.vercel.app` (no trailing slash). |
| `PORT` | Optional. Defaults to 3001 (Render sets it itself). |

### Frontend (set in Vercel)

| Var | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | Set to `/api-proxy`. |
| `API_PROXY_TARGET` | The API's URL, e.g. `https://aiforms-api.onrender.com`. |

> **Gotcha:** `API_PROXY_TARGET` is baked in at **build time**. After changing it you must redeploy
> *without build cache* (Vercel → Deployments → ⋯ → Redeploy, untick "Use existing Build Cache", or `vercel --prod --force`).
> If unset, it falls back to an old, dead Railway URL and every API call returns "Application not found".

## Run locally

Requires Node 20.19+ (22 recommended).

```bash
# 1. API
cd aiforms-api
npm install
# create aiforms-api/.env with DATABASE_URL, JWT_SECRET, FRONTEND_URL=http://localhost:3000, PORT=3001
npm run build
node --env-file=.env dist/index.js        # http://localhost:3001/health

# 2. Frontend (new terminal, repo root)
npm install
API_PROXY_TARGET=http://localhost:3001 NEXT_PUBLIC_API_URL=/api-proxy npm run dev
```

On PowerShell set the variables first: `$env:API_PROXY_TARGET="http://localhost:3001"; $env:NEXT_PUBLIC_API_URL="/api-proxy"; npm run dev`.

The API does not load `.env` by itself (no dotenv); `node --env-file=.env` does that.
If port 3000 is busy, run `npx next dev -p 3100` and set `FRONTEND_URL` to match.

You can get the Neon connection string from the Neon dashboard (project → Connect) or with the Neon CLI:
`neon connection-string --project-id <id> --org-id <org>`.

## Deploying from scratch

1. **Neon** – create a project, copy the connection string. The schema is not in this repo; use the existing database (it is not created by the app).
2. **Render** – New → Blueprint → select this repo and branch `master`. [`render.yaml`](render.yaml) defines the `aiforms-api` service
   (root `aiforms-api`, build `npm ci --include=dev && npm run build`, start `node dist/index.js`, health check `/health`).
   Set `DATABASE_URL` and `FRONTEND_URL`; `JWT_SECRET` is generated.
3. **Vercel** – import the repo, set `NEXT_PUBLIC_API_URL=/api-proxy` and `API_PROXY_TARGET=<render url>` **before the first build**.
4. Put the Vercel URL into Render's `FRONTEND_URL` (Render redeploys automatically).

## Things to know

- **Render free tier sleeps** after ~15 min idle; the first request then takes 30–60 s. Fix: Render Starter plan (~$7/mo),
  or an uptime monitor (e.g. UptimeRobot) pinging `/health` every 5–10 minutes. `/health` does not touch the database.
- **Auth** – JWT in an HttpOnly cookie; roles are `user`, `admin`, `admin-viewer` (read-only admin). Passkey (WebAuthn) login is supported.
  Admin pages are under `/admin`.
- **Question types** – the API whitelist is in [`aiforms-api/src/routes/admin/questions.ts`](aiforms-api/src/routes/admin/questions.ts) and
  must match the frontend list in `app/admin/questions/page.tsx`. (`group` was once missing from the API, which caused "Invalid question_type" on save.)
- **Security** – `npm audit` reports known vulnerabilities in both packages; run `npm audit` and update dependencies before wider use.
- `backend/README.md` is a leftover planning note from before the API was built; the real API lives in `aiforms-api/`.

## Scripts

| Where | Command | What |
|---|---|---|
| root | `npm run dev` / `build` / `start` / `lint` | Next.js |
| `aiforms-api/` | `npm run build` | compile TypeScript to `dist/` |
| `aiforms-api/` | `npm start` | run `dist/index.js` |
| `aiforms-api/` | `npm run dev` | `tsx watch` (needs env vars exported in your shell) |
