# ⚡ DÉPLOIEMENT RAPIDE - API SUR RENDER

## 📋 Checklist avant de commencer

- [ ] Compte GitHub créé
- [ ] Compte Render.com créé (gratuit)
- [ ] Code modifié pour PostgreSQL ✅ (déjà fait!)

## 🚀 Étapes (15 minutes)

### 1️⃣ Push sur GitHub (2 min)

```bash
cd API
git init
git add .
git commit -m "API ready for Render with PostgreSQL"
git remote add origin https://github.com/TON_USERNAME/budbeer-api.git
git branch -M main
git push -u origin main
```

### 2️⃣ Créer PostgreSQL sur Render (3 min)

1. https://render.com → New + → PostgreSQL
2. Name: `budbeer-db`
3. Plan: **Free**
4. Create Database
5. **COPIE** l'URL "Internal Database URL"

### 3️⃣ Créer Web Service sur Render (5 min)

1. New + → Web Service
2. Connect ton repo `budbeer-api`
3. Configuration :
   - Name: `budbeer-api`
   - Build: `npm install`
   - Start: `npm run init-db && npm start`
   - Plan: **Free**

4. Environment Variables :
   ```
   DATABASE_URL = [colle l'URL de l'étape 2]
   JWT_SECRET = budbeer-secret-2024
   NODE_ENV = production
   PORT = 3000
   ```

5. Create Web Service

### 4️⃣ Attendre le déploiement (5 min)

Render va build et déployer. Surveille les logs!

### 5️⃣ Tester (1 min)

```bash
# Remplace TON_URL par ton URL Render
curl https://TON_URL.onrender.com/api/health
```

Si tu vois `{"status":"ok"}` → C'EST BON! ✅

### 6️⃣ Connecter Netlify (2 min)

1. Netlify dashboard → Site settings → Environment variables
2. Ajoute: `REACT_APP_API_URL` = `https://TON_URL.onrender.com/api`
3. Trigger deploy

## ✅ FINI !

**Teste tout :**
- Admin Panel : Login avec admin/admin
- Dashboard : Voir les stats
- API : https://TON_URL.onrender.com/api/bars

## 📚 Documentation complète

Voir `RENDER_DEPLOYMENT.md` pour plus de détails.

## 🆘 Problème ?

**Build échoue :**
- Vérifie que `pg` est dans `package.json`

**Database connection error :**
- Vérifie `DATABASE_URL` dans les variables
- Utilise "Internal" URL (pas "External")

**API ne répond pas :**
- Première requête = 30 sec (réveil du sommeil)
- Attends et réessaye

---

**Coût : 0€** 🎉

