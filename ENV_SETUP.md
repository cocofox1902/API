# 🔐 Environment Variables Setup

## For Local Development

Create a `.env` file in the API folder with:

```env
PORT=3000
NODE_ENV=development
JWT_SECRET=local-dev-secret-key
DATABASE_URL=postgresql://localhost:5432/budbeer_dev
```

⚠️ **Note:** For local dev with PostgreSQL, you need to:
1. Install PostgreSQL locally
2. Create a database: `createdb budbeer_dev`

**OR** use SQLite for local dev (rollback to previous version).

## For Render Production

In Render dashboard, add these environment variables:

```
PORT=3000
NODE_ENV=production
JWT_SECRET=YOUR_SUPER_SECRET_KEY_HERE
DATABASE_URL=[Render will auto-fill this from your PostgreSQL database]
```

⚠️ **IMPORTANT:** 
- Change `JWT_SECRET` to a random string (min 32 characters)
- Use Render's "Internal Database URL" for `DATABASE_URL`

## Security

✅ DO:
- Use strong random secrets in production
- Keep `.env` in `.gitignore`
- Use different secrets for dev/production

❌ DON'T:
- Commit `.env` to GitHub
- Use simple passwords like "admin123"
- Share your production secrets

