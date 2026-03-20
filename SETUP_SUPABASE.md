# BudBeer API — Supabase setup (what the repo does vs what you do)

Everything in this folder that **can** be automated in Git is already there. The steps below are what **only you** can do in the browser and on your machine.

---

## Already in this repo (you do not need to recreate)

| Item | Location |
|------|-----------|
| Express API + Postgres via `pg` | `server.js`, `config/database.js` |
| SSL auto-detection for `*.supabase.co` | `config/database.js` |
| No in-app DDL on Supabase URLs (safe) | `RUN_API_DDL` default off when URL contains `supabase.co` |
| SQL schema (tables + optional RLS) | `supabase/migrations/001_init.sql` |
| Tables-only fallback (if RLS errors) | `supabase/migrations/001_tables_only.sql` |
| RLS-only optional script | `supabase/migrations/002_rls_bars_optional.sql` |
| Seed from `bar_final.json` | `npm run seed:bars` |
| Env template | `.env.example` |
| Full API docs | `README.md` |

**You do not need:** React, Vite, `@supabase/supabase-js`, or the Supabase “Framework” connect wizard for this API.  
**Optional later:** MCP / Agent Skills in Cursor — only for AI helpers, not required to run the server.

---

## What YOU must do (checklist)

### A. In Supabase (web)

1. **Create the project** (you did — e.g. “BudBeer”).
2. **Open SQL Editor**  
   - Left sidebar: **SQL Editor** → **New query**.
3. **Run the schema** (pick one path):
   - **Normal:** Open `supabase/migrations/001_init.sql` in your editor, copy **entire file**, paste, **Run**.
   - **If Run fails on `CREATE POLICY`:**  
     - Run `001_tables_only.sql` only, then **Run** again.  
     - Optionally run `002_rls_bars_optional.sql` if you want anon read of approved bars via Supabase Data API.
4. **Confirm tables exist**  
   - **Database → Schema Visualizer** or **Table Editor** — you should see `bars`, `reports`, `admin_users`, `banned_ips`, `rate_limit`.
5. **Copy the database password / URI**  
   - **Project Settings** (gear) → **Database**.  
   - Connection string: **URI**, direct, port **5432**.  
   - Replace `[YOUR-PASSWORD]` with your real DB password.

### B. On your computer

1. **Terminal → API folder**
   ```bash
   cd API
   npm install
   ```
2. **Create `.env`**
   ```bash
   cp .env.example .env
   ```
3. **Edit `.env`**
   - `DATABASE_URL=` paste the full URI (with password).
   - `JWT_SECRET=` any long random string (required for admin login tokens).
4. **Verify database**
   ```bash
   node scripts/verifyDatabase.js
   ```
   - ✅ = connection OK and `bars` exists.  
   - ❌ “does not exist” = run SQL migration in step A3.
5. **Create default admin user**
   ```bash
   npm run init-db
   ```
   Default: username `admin`, password `admin` — **change in production**.
6. **(Optional) Load all bars from JSON**
   ```bash
   CLEAR_BARS_BEFORE_SEED=true npm run seed:bars
   ```
   Use `CLEAR_BARS_BEFORE_SEED=true` only if you want to **wipe** existing `bars` first (also removes dependent reports).
7. **Start API**
   ```bash
   npm start
   ```
   Or `npm run dev` with nodemon.

### C. Quick manual test

- Browser or curl: `http://localhost:3000/api/health` → should return `ok`.
- `http://localhost:3000/api/bars` → JSON `{ "bars": [ ... ] }` (empty array if no approved rows yet).

---

## Troubleshooting

| Problem | What to try |
|---------|-------------|
| **`getaddrinfo ENOTFOUND` / `db.<ref>.supabase.co`** | DNS cannot resolve the host. **Re-copy** `DATABASE_URL` from **Project Settings → Database** (URI, direct). Check **General → Reference ID**: host must be exactly `db.<that-ref>.supabase.co`. Run `ping db.<ref>.supabase.co` — if ping fails, wrong ref, no internet, or broken DNS. On some networks the **direct** host is IPv6-only: use the **Session pooler** connection string (same page, port often **5432** or **6543**) which uses an IPv4-friendly hostname (`*.pooler.supabase.com`). |
| Schema Visualizer shows **no tables** | Run `001_init.sql` or `001_tables_only.sql` in **SQL Editor**. |
| Policy / RLS error | Use `001_tables_only.sql` first; skip or delay `002_rls_bars_optional.sql`. |
| `password authentication failed` | Reset DB password in Supabase **Database** settings; update `DATABASE_URL`. |
| `self-signed certificate` / SSL | For Supabase, SSL is handled automatically; do not set `DATABASE_SSL=false` unless local. |
| `GET /api/bars` is `[]` | No rows with `status = 'approved'`. Run seed or approve bars in admin. |

---

## After this phase

- **Admin panel (web):** update it to match DB field names / new `GET /api/bars` shape `{ bars: [...] }` when you’re ready.
- **iOS app:** point to your API base URL; parse `{ bars: [...] }` or call Supabase directly later with publishable key + RLS.

---

## Security reminder

- Never commit `.env` (it is in `.gitignore`).
- Do not paste real passwords or keys into public chats; rotate if exposed.
