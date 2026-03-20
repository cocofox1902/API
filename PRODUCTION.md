# Production — BudBeer API

| Item | Value |
|------|--------|
| **Public URL** | https://budbeer-api.onrender.com |
| **Health** | https://budbeer-api.onrender.com/api/health |
| **Public bars** | https://budbeer-api.onrender.com/api/bars → `{ "bars": [ ... ] }` |
| **Host** | [Render](https://render.com) Web Service |
| **Database** | **Supabase** Postgres (`DATABASE_URL` = pooler URI in Render env) |

## Render environment variables (required)

- `DATABASE_URL` — Supabase **session pooler** connection string (with password).
- `JWT_SECRET` — long random string (must match what you expect for signing admin JWTs).
- `NODE_ENV` — `production` (optional but recommended).

Do **not** commit secrets to Git.

## One-time after first deploy

1. `npm run init-db` once (Render **Shell** or local with prod `DATABASE_URL`) → creates admin `admin` / `admin` unless already present.
2. Optional: `npm run seed:bars` (with `CLEAR_BARS_BEFORE_SEED=true` if replacing data).

## Clients

- **iOS:** `APIService.swift` → `baseURL` = `https://budbeer-api.onrender.com/api`
- **Admin (Netlify/local):** `REACT_APP_API_URL=https://budbeer-api.onrender.com/api`

## Deploy updates

Push to the connected Git branch → Render auto-deploys.  
Deploy ref example: `3d59052` (document your release in git tags or Render deploy log).
