# 🚀 Déploiement de l'API BudBeer sur Railway

## Étape 1 : Pousser ton code sur GitHub

```bash
# Dans le dossier API
cd /Users/colasrenard/Desktop/Work/dev\ colas/BudBeer_all/API

# Initialiser git (si pas déjà fait)
git init

# Ajouter tous les fichiers
git add .

# Commit
git commit -m "Ready for deployment"

# Créer un repo sur GitHub puis :
git remote add origin https://github.com/TON_USERNAME/budbeer-api.git
git branch -M main
git push -u origin main
```

## Étape 2 : Déployer sur Railway

### A. Créer un compte Railway
1. Va sur https://railway.app
2. Clique sur "Start a New Project"
3. Connecte-toi avec GitHub

### B. Déployer le projet
1. Clique sur "Deploy from GitHub repo"
2. Sélectionne ton repository `budbeer-api`
3. Railway va détecter automatiquement Node.js

### C. Configurer les variables d'environnement
Dans l'interface Railway :
1. Va dans l'onglet "Variables"
2. Ajoute ces variables :

```
NODE_ENV=production
JWT_SECRET=CHANGE_THIS_TO_RANDOM_STRING_123456789
PORT=3000
```

**⚠️ IMPORTANT :** Change `JWT_SECRET` par une vraie clé secrète aléatoire !

### D. Configurer le Start Command
1. Va dans "Settings" → "Deploy"
2. Dans "Start Command", mets :
```
npm run init-db && npm start
```

ℹ️ Ceci va initialiser la DB avec l'admin au premier déploiement

### E. Obtenir ton URL
Railway va générer une URL comme :
```
https://budbeer-api-production.up.railway.app
```

## Étape 3 : Tester l'API déployée

```bash
# Test health
curl https://TON_URL.railway.app/api/health

# Test login
curl -X POST https://TON_URL.railway.app/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}'

# Test get bars
curl https://TON_URL.railway.app/api/bars
```

## Étape 4 : Mettre à jour l'Admin Panel

Dans `AdminPanel/src/config.js` :
```javascript
const API_URL = process.env.REACT_APP_API_URL || "https://TON_URL.railway.app/api";
```

Ou configure la variable d'environnement sur Vercel :
```
REACT_APP_API_URL=https://TON_URL.railway.app/api
```

## 🔄 Mises à jour futures

Chaque fois que tu push sur GitHub :
```bash
git add .
git commit -m "Update API"
git push
```

Railway va automatiquement redéployer ! 🎉

## 💰 Coûts

- **Gratuit** : $5/mois de crédit (largement suffisant pour commencer)
- Si tu dépasses : ~$5-10/mois pour une petite app

## 🆘 Problèmes courants

### La DB se réinitialise à chaque deploy ?
Railway garde la DB automatiquement dans un volume persistant. Si ça arrive :
1. Va dans Settings
2. Vérifie que "Persistent Volume" est activé

### CORS errors ?
L'API a déjà CORS activé, mais assure-toi que ton Admin Panel utilise la bonne URL.

### Variables d'environnement ne fonctionnent pas ?
Redéploie après avoir ajouté les variables (bouton "Redeploy" dans Railway).

## ✅ Checklist avant déploiement

- [ ] `.gitignore` contient `.env` et `*.db`
- [ ] Code poussé sur GitHub
- [ ] Variables d'environnement configurées sur Railway
- [ ] Start command configuré : `npm run init-db && npm start`
- [ ] Test de l'URL Railway
- [ ] Admin Panel mis à jour avec la nouvelle URL

