# 🚀 Déploiement API sur Render

## ✅ Modifications effectuées

- ✅ SQLite → PostgreSQL
- ✅ Code compatible avec Render
- ✅ Conversion automatique des requêtes SQL

## Étape 1 : Pousser le code sur GitHub

```bash
cd /Users/colasrenard/Desktop/Work/dev\ colas/BudBeer_all/API

# Initialiser git (si pas déjà fait)
git init

# Ajouter tous les fichiers
git add .

# Commit
git commit -m "Ready for Render deployment with PostgreSQL"

# Créer un repo sur GitHub puis :
git remote add origin https://github.com/TON_USERNAME/budbeer-api.git
git branch -M main
git push -u origin main
```

## Étape 2 : Créer un compte Render

1. Va sur https://render.com
2. Clique sur "Get Started" (gratuit)
3. Connecte-toi avec GitHub

## Étape 3 : Créer la base de données PostgreSQL

### A. Créer la database
1. Dans le dashboard Render, clique sur "New +" → "PostgreSQL"
2. Configuration :
   - **Name:** `budbeer-db`
   - **Database:** `budbeer`
   - **User:** (auto-généré)
   - **Region:** Choisis la région la plus proche (Frankfurt pour l'Europe)
   - **PostgreSQL Version:** 15 ou plus récent
   - **Plan:** **Free** (important!)

3. Clique sur "Create Database"
4. Attends 2-3 minutes pour la création

### B. Copier l'URL de connexion
1. Une fois créé, va dans l'onglet "Info"
2. Cherche "Internal Database URL"
3. **COPIE cette URL** (tu en auras besoin!)
   - Elle ressemble à : `postgresql://user:password@hostname/database`

## Étape 4 : Créer le Web Service (API)

### A. Créer le service
1. Clique sur "New +" → "Web Service"
2. Choisis "Build and deploy from a Git repository"
3. Connecte ton repo GitHub `budbeer-api`

### B. Configuration

**Remplis ces champs :**

- **Name:** `budbeer-api`
- **Region:** Même région que ta database (ex: Frankfurt)
- **Branch:** `main`
- **Root Directory:** (laisse vide)
- **Runtime:** `Node`
- **Build Command:** `npm install`
- **Start Command:** `npm run init-db && npm start`
- **Plan:** **Free** ⭐ (IMPORTANT!)

### C. Variables d'environnement

Clique sur "Advanced" puis "Add Environment Variable". Ajoute ces variables :

1. **DATABASE_URL**
   - **Value:** `[COLLE l'Internal Database URL que tu as copiée]`

2. **JWT_SECRET**
   - **Value:** `budbeer-production-secret-key-CHANGE-THIS-123456`
   - ⚠️ Change pour une vraie clé aléatoire en production!

3. **NODE_ENV**
   - **Value:** `production`

4. **PORT**
   - **Value:** `3000`

### D. Déployer !

1. Clique sur "Create Web Service"
2. Render va :
   - Cloner ton repo
   - Installer les dépendances (`npm install`)
   - Initialiser la database (`npm run init-db`)
   - Démarrer le serveur (`npm start`)

3. **Attends 5-10 minutes** pour le premier déploiement

## Étape 5 : Vérifier le déploiement

### A. Obtenir ton URL
Une fois déployé, tu auras une URL comme :
```
https://budbeer-api.onrender.com
```

### B. Tester l'API

**Test 1 : Health check**
```bash
curl https://TON_URL.onrender.com/api/health
```

Réponse attendue :
```json
{"status":"ok","message":"BudBeer API is running"}
```

**Test 2 : Login admin**
```bash
curl -X POST https://TON_URL.onrender.com/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}'
```

Réponse attendue :
```json
{"token":"eyJhbGciOiJIUzI1NiIsInR5...", "username":"admin"}
```

**Test 3 : Get bars**
```bash
curl https://TON_URL.onrender.com/api/bars
```

Réponse attendue :
```json
[
  {
    "id": 1,
    "name": "Le Café des Sports",
    ...
  }
]
```

## Étape 6 : Connecter avec l'Admin Panel (Netlify)

1. Va sur ton dashboard Netlify
2. Clique sur ton site "budbeer-admin"
3. Va dans "Site settings" → "Environment variables"
4. Clique sur "Add a variable"
5. Ajoute :
   - **Key:** `REACT_APP_API_URL`
   - **Value:** `https://TON_URL.onrender.com/api`

6. Redéploie :
   - Va dans "Deploys"
   - Clique sur "Trigger deploy" → "Clear cache and deploy site"

7. Attends 2 minutes

## ✅ C'EST FINI !

Ton architecture complète :

```
Admin Panel (Netlify)
    ↓
API (Render)
    ↓
PostgreSQL (Render)
```

**URLs finales :**
- Admin Panel : `https://budbeer-admin.netlify.app`
- API : `https://budbeer-api.onrender.com`

**Coût : 0€ total!**

## 🔄 Mises à jour futures

Pour mettre à jour l'API :
```bash
git add .
git commit -m "Update API"
git push
```

Render redéploie automatiquement ! 🎉

## ⚠️ IMPORTANT : Limitations du plan gratuit

### Mise en veille
- ⏰ L'API s'endort après **15 minutes d'inactivité**
- ⏱️ Premier appel après sommeil = **~30 secondes de réveil**
- 💡 Solutions :
  - Utilise un service de "ping" gratuit (UptimeRobot)
  - Ou accepte le délai (c'est OK pour un projet perso)

### Base de données
- 📦 500 MB de stockage (largement suffisant)
- 🕐 Expiration après 90 jours d'inactivité (gratuit)
- 💡 Utilise l'app régulièrement pour éviter l'expiration

## 🆘 Problèmes courants

### Build échoue ?
- Vérifie que `package.json` contient bien `"pg": "^8.11.3"`
- Vérifie la commande de build : `npm install`

### Database connection error ?
- Vérifie que `DATABASE_URL` est bien configurée
- Utilise "Internal Database URL" (pas "External")

### API ne démarre pas ?
- Vérifie les logs dans Render dashboard
- Cherche "Error" dans les logs

### CORS errors ?
- L'API a déjà CORS activé
- Vérifie l'URL dans Netlify : `REACT_APP_API_URL`

## 📝 Notes

- ✅ PostgreSQL est mieux que SQLite pour la production
- ✅ Render gratuit = parfait pour projets perso
- ✅ Auto-deploy sur chaque push GitHub
- ✅ HTTPS automatique
- ✅ Logs en temps réel

🎉 Profite de ton app !

