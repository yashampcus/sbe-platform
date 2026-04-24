# SBE Platform — Technical Documentation

A decoupled assessment platform: a Next.js frontend for respondents and admins, and an Express API backed by Neon Postgres that owns authentication, assessment authoring, submissions, and report generation.

---

## 1. Architecture

```
┌─────────────────────────┐         ┌──────────────────────────┐         ┌──────────────┐
│  Next.js 14 (App Router)│  HTTPS  │  Express API (Railway)   │   SQL   │  Neon        │
│  React 18 + Tailwind    │ ──────▶ │  aiforms-api/            │ ──────▶ │  Postgres    │
│  shadcn/ui + Radix      │ cookies │  JWT + bcrypt + Neon SDK │         │  (serverless)│
└─────────────────────────┘         └──────────────────────────┘         └──────────────┘
```

- **Frontend** renders public assessment pages, a login flow, and an admin console.
- **Backend** is a stateless Express service. Auth is a `HttpOnly` JWT cookie on the API domain; the Next.js [middleware.ts](middleware.ts) is intentionally a no-op, and auth is enforced client-side via [contexts/AuthContext.tsx](contexts/AuthContext.tsx) plus server-side on every API route.
- **Database** is Neon serverless Postgres accessed through `@neondatabase/serverless` tagged-template queries.

---

## 2. Repository Layout

```
sbe-platform/
├── app/                          Next.js App Router
│   ├── layout.tsx                Root layout, wraps <Providers/>
│   ├── page.tsx                  Landing
│   ├── login/                    Auth page
│   ├── assessment/               Respondent-facing assessment flow
│   ├── check-results/            Results lookup
│   └── admin/                    Admin console (layout guarded by AuthContext)
│       ├── layout.tsx
│       ├── page.tsx              Dashboard
│       ├── assessments/          List/manage submitted assessments
│       ├── categories/           Manage categories per assessment type
│       ├── questions/            Manage questions
│       ├── users/                Manage users & roles
│       ├── settings/             App-wide settings
│       └── types/                Manage assessment types
├── components/
│   ├── Assessment.tsx            Main respondent form component
│   ├── Providers.tsx             Branding + Auth context wrapper
│   ├── admin/                    AdminNav, TableSkeleton
│   ├── assessment/               Assessment sub-components
│   ├── common/
│   └── ui/                       shadcn/ui primitives
├── contexts/
│   ├── AuthContext.tsx           Client-side auth state (calls /auth/me)
│   └── BrandingContext.tsx       Dynamic branding from /config
├── lib/
│   ├── api.ts                    Fetch wrapper, sets credentials: 'include'
│   ├── sanitize.ts               sanitize-html wrapper for rich text
│   └── utils.ts                  cn() and other helpers
├── middleware.ts                 No-op (see §3 Auth)
├── tailwind.config.ts
├── components.json               shadcn config
└── aiforms-api/                  Backend (separate deploy)
    ├── src/
    │   ├── index.ts              Express bootstrap, CORS, route mount
    │   ├── lib/
    │   │   ├── db.ts             `neon(DATABASE_URL)` export
    │   │   ├── auth.ts           JWT sign/verify + cookie helpers (jose)
    │   │   └── adminAuth.ts      requireAuth + requireAdmin middleware
    │   ├── routes/
    │   │   ├── auth.ts           /login /signup /me /logout
    │   │   ├── config.ts         Public branding/config
    │   │   ├── assessmentTypes.ts
    │   │   ├── questions.ts
    │   │   ├── assessment.ts     Submit + fetch results
    │   │   └── admin/
    │   │       ├── index.ts      Mounts admin sub-routers behind requireAdmin
    │   │       ├── stats.ts
    │   │       ├── appSettings.ts
    │   │       ├── users.ts
    │   │       ├── assessmentTypes.ts
    │   │       ├── categories.ts
    │   │       ├── questions.ts
    │   │       └── assessments.ts
    │   └── utils/
    │       └── reportGenerator.ts  Score computation + report payload
    ├── railway.json              Railway deploy config
    └── package.json
```

---

## 3. Authentication & Authorization

**Token**
- Algorithm: HS256 via `jose`.
- Payload: `{ userId, email }`.
- Expiry: 7 days.
- Secret: `JWT_SECRET` env var.

**Cookie**
- Name: `token`, `HttpOnly`, `Secure`, `SameSite=None`, `Path=/`, `Max-Age=604800`.
- Issued by the Express API; because it sits on the Railway API domain, the Next.js middleware cannot read it — hence [middleware.ts](middleware.ts) is a pass-through and route protection runs client-side (redirect on `/auth/me` 401) plus server-side on every protected endpoint.

**Middleware chain (backend)**
- `requireAuth` — verifies JWT, loads the user row, attaches to `res.locals.user`.
- `requireAdmin` — same, then checks `user.role ∈ { 'admin', 'admin-viewer' }`.
- All `/admin/*` routes mount behind `requireAdmin` in [aiforms-api/src/routes/admin/index.ts](aiforms-api/src/routes/admin/index.ts).

**Password storage** — `bcryptjs` with salt rounds = 10.

**Roles** — `user`, `admin`, `admin-viewer` (read-only admin).

---

## 4. API Surface

Base URL: `https://<railway-host>`. All routes are registered **twice** for back-compat: once under `/api/*` and once at the root (`/auth`, `/config`, etc.). The frontend currently uses the unprefixed form.

### Public
| Method | Path                       | Purpose                               |
|--------|----------------------------|---------------------------------------|
| GET    | `/health`                  | Liveness probe                        |
| GET    | `/config`                  | Branding + public flags               |
| GET    | `/assessment-types`        | List active assessment types          |
| GET    | `/assessment-types/:id`    | Assessment type + categories/questions|
| GET    | `/questions`               | Questions (filtered by type/category) |
| POST   | `/assessment/submit`       | Submit answers, persist + score       |
| GET    | `/assessment/:id`          | Fetch a submitted assessment + report |

### Auth
| Method | Path            | Purpose                                      |
|--------|-----------------|----------------------------------------------|
| POST   | `/auth/login`   | Email + password → sets `token` cookie       |
| POST   | `/auth/signup`  | Create user → sets `token` cookie            |
| GET    | `/auth/me`      | Current user (`requireAuth`)                 |
| POST   | `/auth/logout`  | Clears cookie                                |
| DELETE | `/auth/logout`  | Clears cookie                                |

### Admin (all behind `requireAdmin`)
| Path prefix                 | Resource                                 |
|-----------------------------|------------------------------------------|
| `/admin/stats`              | Dashboard counters                       |
| `/admin/app-settings`       | Global settings (branding, toggles)      |
| `/admin/users`              | CRUD users + role assignment             |
| `/admin/assessment-types`   | CRUD assessment types                    |
| `/admin/categories`         | CRUD categories per type                 |
| `/admin/questions`          | CRUD questions per category              |
| `/admin/assessments`        | View/delete submitted assessments        |

---

## 5. Data Model (inferred from queries)

```
users
  id, name, email (unique), password_hash, role

assessment_types
  id, name, ...

categories
  id, assessment_type_id → assessment_types.id, name, ...

questions
  id, category_id → categories.id, question_code (unique per type),
  question_text, question_type, ...

assessments                          -- a single submission
  id, assessment_type_id, email, name, created_at

assessment_answers                   -- one row per answered question
  assessment_id → assessments.id,
  question_id   → questions.id (nullable for orphaned codes),
  question_code, question_text, category_name,
  answer_value  (JSON-encoded)

app_settings                         -- singleton key/value config
```

Submission flow ([aiforms-api/src/routes/assessment.ts](aiforms-api/src/routes/assessment.ts)):
1. Validate `assessment_type_id` and `answers` shape.
2. Resolve `answers`' question codes → question rows (joined with category) for metadata.
3. Insert an `assessments` row.
4. Insert `assessment_answers` rows (skipping empty values), snapshotting `question_text` and `category_name` so historical submissions survive question edits.
5. Run [aiforms-api/src/utils/reportGenerator.ts](aiforms-api/src/utils/reportGenerator.ts) to compute the report.

---

## 6. Frontend Conventions

- **State** — React Context for auth + branding; local component state otherwise. No Redux / Zustand.
- **API calls** — centralized in [lib/api.ts](lib/api.ts); always sets `credentials: 'include'` so the JWT cookie travels.
- **Styling** — Tailwind + `cn()` helper (`clsx` + `tailwind-merge`). Components from [components/ui/](components/ui/) follow shadcn's CVA pattern.
- **Animations** — `motion` (Framer Motion v12).
- **Rich text** — user-authored HTML passes through [lib/sanitize.ts](lib/sanitize.ts) (`sanitize-html`) before render.
- **Admin guard** — [app/admin/layout.tsx](app/admin/layout.tsx) uses `AuthContext` to redirect unauthenticated/non-admin users.

---

## 7. Environment Variables

### Backend (`aiforms-api/`)
| Var            | Purpose                                         |
|----------------|-------------------------------------------------|
| `DATABASE_URL` | Neon Postgres connection string                 |
| `JWT_SECRET`   | HS256 signing key for auth tokens               |
| `FRONTEND_URL` | Comma-separated origins allowed by CORS         |
| `PORT`         | Listen port (defaults to 3001)                  |

### Frontend
| Var                  | Purpose                                   |
|----------------------|-------------------------------------------|
| `NEXT_PUBLIC_API_URL`| Base URL of the Express API               |

---

## 8. Local Development

```bash
# Backend
cd aiforms-api
npm install
# set DATABASE_URL, JWT_SECRET, FRONTEND_URL=http://localhost:3000
npm run dev                   # tsx watch, :3001

# Frontend (repo root)
npm install
# set NEXT_PUBLIC_API_URL=http://localhost:3001
npm run dev                   # next dev, :3000
```

Cross-origin cookies require `SameSite=None; Secure`, which browsers only accept over HTTPS. For local development you either (a) run both ends behind a single origin / proxy, or (b) use a local HTTPS tunnel.

---

## 9. Deployment

- **Backend** — Railway, config in [aiforms-api/railway.json](aiforms-api/railway.json). Build: `tsc` → `dist/`; start: `node dist/index.js`.
- **Frontend** — Any Next.js host (Vercel-compatible). `next build` → `next start`.
- **Database** — Neon (serverless Postgres), connected via `@neondatabase/serverless` — no pool management needed.

---

## 10. Security Notes

- Passwords hashed with bcrypt (cost 10).
- JWT is `HttpOnly` + `Secure` + `SameSite=None` — not reachable by JS, delivered over TLS only.
- CORS origin is explicit (`FRONTEND_URL`); `credentials: true` required for cookie transport.
- JSON body limit is 1 MB to bound payload size.
- All user-generated HTML is sanitized before render.
- Every admin route re-checks role on the server — the client-side guard is a UX convenience, not the security boundary.
- Generic error envelopes (`{ error: 'Internal server error' }`) avoid leaking stack traces; detailed errors are logged server-side.

---

## 11. Known Technical Debt

- **Dual route mounting** (`/api/*` + `/*`) exists for a frontend migration; the duplicate should be removed once all callers move to `/api`.
- **No-op middleware** — [middleware.ts](middleware.ts) could be deleted or replaced with edge-side token verification if the cookie ever moves to a shared parent domain.
- **Per-row inserts** on submit — [aiforms-api/src/routes/assessment.ts](aiforms-api/src/routes/assessment.ts) loops `INSERT` for each answer instead of a single multi-row insert; fine today but worth batching if assessments grow beyond ~50 questions.
