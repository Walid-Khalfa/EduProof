# 🚀 Guide de Déploiement Backend - EduProof API

Ce guide couvre le déploiement de votre backend Node.js sur **Railway** (recommandé) ou **Render**.

---

## Option 1 : Railway (Recommandé) ⚡

### Pourquoi Railway ?
- ✅ Déploiement en 2 minutes
- ✅ $5 de crédit gratuit/mois
- ✅ Logs en temps réel
- ✅ Variables d'environnement faciles
- ✅ Domaine HTTPS automatique

---

### Étape 1 : Préparation du Code

Vérifiez que votre `server/package.json` contient :

```json
{
  "name": "eduproof-backend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node index.js",
    "build": "tsc",
    "dev": "tsx watch index.ts"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

---

### Étape 2 : Créer un Compte Railway

1. Allez sur https://railway.app
2. Cliquez **Login with GitHub**
3. Autorisez Railway

---

### Étape 3 : Nouveau Projet

1. Cliquez **New Project**
2. Sélectionnez **Deploy from GitHub repo**
3. Choisissez `Walid-Khalfa/EduProof`
4. Railway détecte automatiquement Node.js

---

### Étape 4 : Configuration

#### Root Directory
- Allez dans **Settings**
- **Root Directory** : `server`
- **Start Command** : `node index.js`

#### Variables d'Environnement

Cliquez sur **Variables** et ajoutez :

```bash
# Port
PORT=3001

# Supabase
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_SERVICE_KEY=votre_service_key

# Pinata IPFS
PINATA_API_KEY=votre_pinata_key
PINATA_SECRET_KEY=votre_pinata_secret
PINATA_JWT=votre_pinata_jwt

# Gemini AI
GEMINI_API_KEY=votre_gemini_key
GEMINI_MODEL=gemini-2.5-flash

# CORS (ajoutez votre domaine Vercel)
ALLOWED_ORIGINS=https://eduproof.vercel.app,https://app.eduproof.com

# Node Environment
NODE_ENV=production
```

---

### Étape 5 : Déploiement

1. Cliquez **Deploy**
2. Railway build et démarre votre serveur
3. Vous obtenez une URL : `https://eduproof-backend-production.up.railway.app`

---

### Étape 6 : Domaine Personnalisé (Optionnel)

1. Dans **Settings → Networking**
2. Cliquez **Generate Domain**
3. Ou ajoutez votre domaine : `api.eduproof.com`

---

### Étape 7 : Vérification

Testez votre API :

```bash
curl https://eduproof-backend-production.up.railway.app/health
```

Réponse attendue :
```json
{
  "status": "ok",
  "timestamp": "2025-01-23T19:00:00.000Z"
}
```

---

## Option 2 : Render 🎨

### Pourquoi Render ?
- ✅ Plan gratuit permanent
- ✅ SSL automatique
- ✅ Déploiement Git automatique
- ⚠️ Plus lent que Railway (cold starts)

---

### Étape 1 : Créer un Compte

1. Allez sur https://render.com
2. **Sign Up with GitHub**

---

### Étape 2 : Nouveau Web Service

1. Dashboard → **New +** → **Web Service**
2. Connectez votre repo `EduProof`
3. Configurez :

```
Name: eduproof-backend
Region: Frankfurt (EU) ou Oregon (US)
Branch: main
Root Directory: server
Runtime: Node
Build Command: npm install
Start Command: node index.js
```

---

### Étape 3 : Plan

- **Free** : 750h/mois gratuit (suffisant pour démo)
- **Starter** : $7/mois (pas de cold start)

---

### Étape 4 : Variables d'Environnement

Ajoutez les mêmes variables que Railway (voir ci-dessus).

---

### Étape 5 : Déploiement

1. Cliquez **Create Web Service**
2. Render build et déploie (5-10 min)
3. URL : `https://eduproof-backend.onrender.com`

---

### Étape 6 : Vérification

```bash
curl https://eduproof-backend.onrender.com/health
```

---

## Configuration CORS Backend

Mettez à jour `server/index.ts` pour autoriser votre frontend Vercel :

```typescript
import cors from 'cors';

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:5173',
  'https://eduproof.vercel.app',
  'https://app.eduproof.com'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
```

Commitez et pushez :

```bash
git add server/index.ts
git commit -m "Configure CORS for production"
git push origin main
```

Railway/Render redéploie automatiquement.

---

## Mise à Jour du Frontend

Mettez à jour votre `.env` Vercel avec l'URL backend :

```bash
VITE_API_URL=https://eduproof-backend-production.up.railway.app
```

Ou pour Render :

```bash
VITE_API_URL=https://eduproof-backend.onrender.com
```

Puis redéployez Vercel.

---

## Monitoring & Logs

### Railway
- **Logs** : Onglet **Deployments** → cliquez sur le déploiement
- **Metrics** : CPU, RAM, Network en temps réel

### Render
- **Logs** : Onglet **Logs** (streaming en direct)
- **Metrics** : Dashboard → **Metrics**

---

## Résolution de Problèmes

### Build échoue

**Erreur** : `Cannot find module 'tsx'`

**Solution** :
```bash
cd server
npm install tsx --save-dev
git add package.json package-lock.json
git commit -m "Add tsx dependency"
git push
```

---

### CORS Errors

**Erreur** : `Access-Control-Allow-Origin missing`

**Solution** : Vérifiez que `ALLOWED_ORIGINS` contient votre domaine Vercel.

---

### Cold Start (Render Free)

**Problème** : Première requête prend 30-60 secondes.

**Solution** :
- Utilisez Railway (pas de cold start)
- Ou passez à Render Starter ($7/mois)

---

### Variables d'environnement manquantes

**Erreur** : `GEMINI_API_KEY is not defined`

**Solution** :
1. Ajoutez la variable dans Railway/Render
2. Redémarrez le service

---

## Checklist Finale

- [ ] Backend déployé sur Railway ou Render
- [ ] Toutes les variables d'environnement configurées
- [ ] `/health` endpoint répond 200 OK
- [ ] CORS configuré pour Vercel
- [ ] Frontend Vercel mis à jour avec `VITE_API_URL`
- [ ] Test complet : mint + validation AI
- [ ] Logs accessibles et sans erreur

---

## Comparaison Railway vs Render

| Feature | Railway | Render |
|---------|---------|--------|
| **Prix gratuit** | $5 crédit/mois | 750h/mois |
| **Cold start** | ❌ Non | ✅ Oui (plan gratuit) |
| **Vitesse déploiement** | ⚡ 2 min | 🐢 5-10 min |
| **Logs temps réel** | ✅ Oui | ✅ Oui |
| **Domaine custom** | ✅ Gratuit | ✅ Gratuit |
| **Recommandation** | ⭐ Meilleur pour prod | ✅ OK pour démo |

---

## Support

- **Railway** : https://docs.railway.app
- **Render** : https://render.com/docs
- **Discord Railway** : https://discord.gg/railway
- **Discord Render** : https://discord.gg/render

---

**Votre backend EduProof est maintenant live 24/7 avec HTTPS et déploiement automatique !** 🎉
