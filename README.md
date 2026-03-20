# BudBeer API

REST API for bar submissions, admin approval, reports, IP/device banning, and JWT admin auth.

**First time with Supabase?** Follow **[SETUP_SUPABASE.md](SETUP_SUPABASE.md)**.

**Deploy the API (free):** **[RENDER_DEPLOYMENT.md](RENDER_DEPLOYMENT.md)** and root [`render.yaml`](../render.yaml) for Render + Supabase.

**Live production URL:** **[PRODUCTION.md](PRODUCTION.md)** (`https://budbeer-api.onrender.com`).

## Tech stack

- **Node.js** + **Express**
- **PostgreSQL** via `pg` (local or **Supabase**)
- **JWT** + **bcrypt** for admin auth
- **CORS** enabled

## Supabase setup (recommended for production)

See **[SETUP_SUPABASE.md](SETUP_SUPABASE.md)** for the full step-by-step.

Short version:

1. Create a Supabase project and copy the **Database** connection URI (direct, port `5432`).
2. In **SQL Editor**, run [`supabase/migrations/001_init.sql`](supabase/migrations/001_init.sql) once. If the **policy** step fails, run [`001_tables_only.sql`](supabase/migrations/001_tables_only.sql) then optionally [`002_rls_bars_optional.sql`](supabase/migrations/002_rls_bars_optional.sql).
3. Copy [`.env.example`](.env.example) to `.env` and set `DATABASE_URL` and `JWT_SECRET`.
4. Run `npm run verify:db` to confirm the connection and that `bars` exists.

**Important:** If `DATABASE_URL` contains `supabase.co`, the API **does not** run in-app `CREATE TABLE` / `ALTER` DDL (`RUN_API_DDL` defaults to off). Schema changes go through SQL migrations in the dashboard.

**SSL:** Enabled automatically for Supabase hosts. See `.env.example` for overrides.

### Local PostgreSQL (no Supabase)

- Set `DATABASE_URL` to your local connection string.
- Either run the same `001_init.sql` in `psql`, or leave `RUN_API_DDL` at default **true** so the API creates tables on startup (legacy behavior).

## Environment variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection URI (required) |
| `JWT_SECRET` | Secret for signing admin JWTs (required in production) |
| `PORT` | Server port (default `3000`) |
| `NODE_ENV` | `production` enables stricter SSL behavior with some hosts |
| `RUN_API_DDL` | `true` / `false` — force on/off in-app DDL (default: **off** if URL contains `supabase.co`) |
| `DATABASE_SSL` | `true` / `false` — override SSL detection |
| `CLEAR_BARS_BEFORE_SEED` | Set to `true` when running `npm run seed:bars` to truncate `bars` (and dependent rows) first |

Optional (for a future mobile/admin Supabase client — **not** used by Express today):

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` (publishable / anon key)

## Installation

```bash
cd API
npm install
cp .env.example .env
# Edit .env: DATABASE_URL, JWT_SECRET
```

### Create admin user (after DB exists)

```bash
npm run init-db
```

Default credentials (change immediately in production):

- Username: `admin`
- Password: `admin`

### Seed bars from `bar_final.json`

```bash
# Idempotent only if you clear first (or empty DB)
CLEAR_BARS_BEFORE_SEED=true npm run seed:bars
```

Without `CLEAR_BARS_BEFORE_SEED`, rows are **appended** (duplicates possible).

### Run the server

```bash
npm start
# or
npm run dev
```

Base URL: `http://localhost:3000` (or your `PORT`).

---

## Public API

### `GET /api/bars`

Returns **approved** bars in the same **shape as** [`bar_final.json`](bar_final.json) (envelope + nested `location`).

**Response (breaking change vs old flat array):**

```json
{
  "bars": [
    {
      "name": "La Panthère Ose",
      "location": { "latitude": 48.8792864, "longitude": 2.3458252 },
      "prixPinte": 6.5,
      "prixPinteHappyHour": 5,
      "startHappyHour": "15:00",
      "endHappyHour": "21:00"
    }
  ]
}
```

Admin panel and any old clients expecting a **raw array** of DB rows must be updated (planned separately).

### `POST /api/bars`

Submit a bar (status `pending`). Body can use **either** the legacy flat fields **or** `bar_final`-style fields:

**Flat (legacy):**

```json
{
  "name": "New Bar",
  "latitude": 48.8566,
  "longitude": 2.3522,
  "regularPrice": 5.5,
  "happyHourPrice": 4,
  "deviceId": "optional"
}
```

**Nested (bar_final-style):**

```json
{
  "name": "New Bar",
  "location": { "latitude": 48.8566, "longitude": 2.3522 },
  "prixPinte": 5.5,
  "prixPinteHappyHour": 4,
  "startHappyHour": "17:00",
  "endHappyHour": "20:00",
  "deviceId": "optional"
}
```

Optional happy-hour times are stored when provided.

### `POST /api/bars/:id/report`

Report a bar (rate limit middleware present; currently passes through).

---

## Admin API (`Authorization: Bearer <token>`)

- `POST /api/admin/login` — body: `{ "username", "password" }`
- `GET /api/admin/bars` — query `?status=pending|approved|rejected`; returns **database rows** (lowercase keys from Postgres), not the `bar_final` shape. **Admin UI updates are a separate task.**
- `PATCH /api/admin/bars/:id/approve` | `.../reject`
- `PUT /api/admin/bars/:id` — update name, coordinates, `regularPrice`, `happyHourPrice`
- `DELETE /api/admin/bars/:id`
- `POST /api/admin/bars/:id/ban` — ban submitter IP/device
- `GET /api/admin/stats`, `GET /api/admin/reports`, etc.
- Banned list: `GET /api/admin/banned`, `POST /api/admin/ban`, `DELETE /api/admin/banned/:id`, `DELETE /api/admin/banned-ips/:ip`

See [`routes/admin.js`](routes/admin.js) for the full set.

---

## Database schema (Supabase migration)

Canonical DDL: [`supabase/migrations/001_init.sql`](supabase/migrations/001_init.sql).

Postgres stores **lowercase** identifiers; `node-pg` returns keys like `regularprice`, `createdat`, `barid`, etc.

Main tables:

- **bars** — `regularprice`, `happyhourprice`, `happyhourstart`, `happyhourend`, `status`, `submittedbyip`, `deviceid`, `createdat`
- **reports** — `barid` FK → `bars.id`
- **admin_users** — `twofactorsecret`, `twofactorenabled`, …
- **banned_ips**, **rate_limit**

Direct connections with the `postgres` user **bypass RLS**. RLS policies apply to Supabase **anon / authenticated** roles using the Data API.

---

## Scripts

| Script | Purpose |
|--------|---------|
| `npm start` | Run API |
| `npm run dev` | Nodemon |
| `npm run init-db` | Ensure admin user + minor migrations |
| `npm run migrate-2fa` | 2FA column migration |
| `npm run seed:bars` | Import [`bar_final.json`](bar_final.json) |

---

## Security notes

- Change **JWT_SECRET** and default **admin** password in production.
- Do not commit `.env` (see [`.gitignore`](.gitignore)).
- The **database password** and **service role** key must never ship inside a public mobile app; use **anon key + RLS** for client-side Supabase access when you add it.

## License

MIT
