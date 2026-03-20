# Deploy BudBeer API on Render (Supabase + free web service)

The API uses **PostgreSQL on Supabase**, not Render’s Postgres. Render only runs **Node/Express**.

## Architecture

```
iOS app / Admin panel
        ↓ HTTPS
   Render Web Service  (this API)
        ↓ DATABASE_URL (SSL)
   Supabase Postgres
```

---

## Before you deploy

1. **Supabase** — Tables exist (`001_init.sql` or `001_tables_only.sql` already run).
2. **Connection string** — Use the **Session pooler** URI (same as local if that worked). Render’s servers must reach Supabase over the internet (pooler works reliably).
3. **Git** — Code is pushed to **GitHub** (Render pulls from Git).

---

## Option A — Blueprint (`render.yaml` at repo root)

The repo includes [`render.yaml`](../render.yaml) at **`BudBeer_all/render.yaml`** with:

- `rootDir: API` (monorepo: service runs from the `API` folder)
- `buildCommand: npm install`
- `startCommand: npm start` (see below why **not** `init-db` here)

1. [render.com](https://render.com) → **New +** → **Blueprint**.
2. Connect the **BudBeer_all** GitHub repo (parent of `API/`).
3. Render detects `render.yaml`.
4. When prompted, add **Environment variables** (or set after create):
   - **`DATABASE_URL`** — full Supabase pooler URI with password.
   - **`JWT_SECRET`** — long random string (can match local or a new one for production).

5. **Create** and wait for the first deploy.

---

## Option B — Manual Web Service

1. **New +** → **Web Service** → select your Git repository.

2. **Settings**

   | Field | Value |
   |--------|--------|
   | **Name** | e.g. `budbeer-api` |
   | **Root Directory** | `API` ← **required** if the repo is `BudBeer_all` (not API-only repo) |
   | **Runtime** | Node |
   | **Build Command** | `npm install` |
   | **Start Command** | `npm start` |
   | **Plan** | Free |

3. **Environment**

   | Key | Value |
   |-----|--------|
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | `postgresql://...` (Supabase **pooler** URI) |
   | `JWT_SECRET` | Long random secret |

   **Do not** set `PORT` unless Render docs ask — Render injects `PORT` automatically.

---

## First deploy only: create admin user

**Do not** put `npm run init-db && npm start` as the start command:

- Every restart would run `init-db`, which **clears `banned_ips`** and is unnecessary noise.

Instead, **once** after the first successful deploy:

1. Render dashboard → your service → **Shell** (if available on your plan) **or** run locally with production env:

   ```bash
   cd API
   DATABASE_URL="your-supabase-uri" JWT_SECRET="same-as-render" npm run init-db
   ```

2. Default admin: **`admin` / `admin`** — change password in production.

---

## Optional: seed bars on production

From Shell or your machine (with prod `DATABASE_URL`):

```bash
cd API
export DATABASE_URL="..."
# Optional: wipe bars + reports first
CLEAR_BARS_BEFORE_SEED=true npm run seed:bars
```

---

## Verify

Replace `YOUR_SERVICE` with your Render hostname, e.g. `budbeer-api.onrender.com`.

```bash
curl https://YOUR_SERVICE.onrender.com/api/health
```

```bash
curl https://YOUR_SERVICE.onrender.com/api/bars
```

Expected: `{"bars":[...]}` (maybe empty until you seed or approve bars).

```bash
curl -X POST https://YOUR_SERVICE.onrender.com/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}'
```

---

## Point the admin panel / app

Set the API base URL to:

`https://YOUR_SERVICE.onrender.com`

(Include `/api` in the client only if your frontend expects a path prefix — e.g. `REACT_APP_API_URL=https://....onrender.com/api`.)

---

## Free tier notes

- Service **spins down** after ~15 minutes idle; first request can take **~30–60+ seconds**.
- **Auto-deploy** on push to the connected branch.

---

## Troubleshooting

| Issue | What to check |
|--------|----------------|
| Build fails | **Root Directory** = `API` for monorepo; `package.json` in that folder. |
| DB connection | `DATABASE_URL` = **pooler** URI; password URL-encoded if it has special characters. |
| Crash on boot | Logs in Render → **Logs**; ensure `JWT_SECRET` is set. |
| CORS | API uses `cors()` open by default; restrict later if needed. |

---

## Old Render Postgres path (deprecated for this project)

Earlier docs described creating **PostgreSQL on Render**. You are using **Supabase** instead — ignore Render Postgres; only the **Web Service** runs on Render.
