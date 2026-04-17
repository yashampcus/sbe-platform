# Backend Placeholder

The backend API will be built separately (Vercel serverless, Neon DB, jose JWT).

## Planned API Endpoints

### Auth
- `POST /auth/login` — Login, sets httpOnly cookie `token`
- `POST /auth/logout` — Clears cookie
- `GET /auth/me` — Returns current user from cookie

### Config
- `GET /config` — Returns app branding (appName, primaryColor, secondaryColor, logoUrl)

### Assessment Types
- `GET /assessment-types` — List all active types
- `GET /assessment-types/:id` — Get type with nested categories + questions
- `GET /assessment-types/slug/:slug` — Get by slug

### Assessment
- `POST /assessment/submit` — Submit answers (maps sequential keys → question codes)
- `GET /assessment/:id?format=detailed` — Get assessment results
- `POST /assessment/search` — Search by email/name

### Admin (requires admin cookie)
- `GET /admin/stats`
- Full CRUD for users, assessments, assessment-types, categories, questions
- `GET/PATCH /admin/app-settings`

## Auth Spec
- JWT stored in httpOnly cookie named `token`
- `jose` library (HS256, 7d expiry)
- CORS: `Access-Control-Allow-Credentials: true`, explicit origin
- All fetches use `credentials: 'include'`

## Tech Stack
- Vercel Serverless Functions (`@vercel/node`)
- `@neondatabase/serverless` (Neon HTTP driver)
- `jose` for JWT
- `bcryptjs` for passwords
