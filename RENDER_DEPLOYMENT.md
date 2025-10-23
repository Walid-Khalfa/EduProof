# 🚀 Déploiement Gratuit - EduProof (Render.com)

## ✅ Solution 100% Gratuite

- **Frontend** : Vercel (déjà configuré)
- **Backend API** : **Render.com** (plan gratuit)
- **Base de données** : Supabase (déjà configuré)

---

## 🎯 Déploiement Backend sur Render

### Étape 1 : Créer un compte Render

1. Allez sur https://render.com
2. Cliquez **Get Started for Free**
3. Connectez-vous avec **GitHub**

---

### Étape 2 : Créer un Web Service

1. Dans le dashboard Render, cliquez **New +** → **Web Service**
2. Connectez votre repository GitHub `EduProof`
3. Configurez le service :

**Configuration de base :**
```
Name: eduproof-api
Region: Frankfurt (EU) ou Oregon (US)
Branch: main
Root Directory: (laisser vide)
Runtime: Node
Build Command: pnpm install
Start Command: pnpm tsx server/index.ts
```

**Plan :**
- Sélectionnez **Free** (0$/mois)
- ⚠️ Note : Le service gratuit s'endort après 15 min d'inactivité (redémarre en ~30s au premier appel)

---

### Étape 3 : Variables d'Environnement

Dans **Environment** → **Environment Variables**, ajoutez :

```bash
# Port (Render l'assigne automatiquement)
PORT=10000

# Frontend URL (votre domaine Vercel)
FRONTEND_URL=https://votre-app.vercel.app

# Supabase (copiez depuis votre dashboard Supabase)
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Pinata IPFS (depuis pinata.cloud)
PINATA_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
PINATA_GATEWAY=gateway.pinata.cloud

# Blockchain RPC (CodeNut DevNet)
RPC_URL=https://devnet.codenut.dev
PRIVATE_KEY=votre_private_key_deploiement

# Contract addresses (depuis contracts/interfaces/metadata.json)
CERTIFICATE_CONTRACT=0x...
INSTITUTION_REGISTRY_CONTRACT=0x...
```

---

### Étape 4 : Déployer

1. Cliquez **Create Web Service**
2. Render va :
   - Cloner votre repo
   - Installer les dépendances (`pnpm install`)
   - Démarrer le serveur (`pnpm tsx server/index.ts`)
3. Attendez ~3-5 minutes

**Votre API sera disponible à :**
```
https://eduproof-api.onrender.com
```

---

### Étape 5 : Tester l'API

```bash
# Health check
curl https://eduproof-api.onrender.com/api/health

# Devrait retourner :
# {"status":"ok","timestamp":"2025-01-23T19:18:25.000Z"}
```

---

### Étape 6 : Connecter le Frontend

Dans votre projet Vercel, ajoutez la variable d'environnement :

**Vercel Dashboard** → **Settings** → **Environment Variables** :

```
VITE_API_URL=https://eduproof-api.onrender.com
```

Puis redéployez le frontend :
```bash
git commit --allow-empty -m "Update API URL"
git push
```

---

## 🔧 Fichiers à Modifier (si nécessaire)

### 1. Créer `server/package.json`

Si vous n'avez pas de `package.json` dans `/server`, créez-le :

```json
{
  "name": "eduproof-backend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "tsx index.ts",
    "dev": "tsx watch index.ts"
  },
  "dependencies": {
    "express": "^5.1.0",
    "cors": "^2.8.5",
    "dotenv": "^17.2.3",
    "ethers": "^6.15.0",
    "multer": "^2.0.2",
    "@supabase/supabase-js": "^2.75.0",
    "axios": "^1.12.2",
    "tsx": "^4.20.6"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### 2. Vérifier `.env.server.example`

Assurez-vous que ce fichier existe pour documenter les variables :

```bash
# Backend Environment Variables
PORT=3001
FRONTEND_URL=http://localhost:5173

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Pinata IPFS
PINATA_JWT=your_pinata_jwt
PINATA_GATEWAY=gateway.pinata.cloud

# Blockchain
RPC_URL=https://devnet.codenut.dev
PRIVATE_KEY=your_private_key

# Contracts
CERTIFICATE_CONTRACT=0x...
INSTITUTION_REGISTRY_CONTRACT=0x...
```

---

## 🎯 Checklist de Déploiement

- [ ] Compte Render créé et connecté à GitHub
- [ ] Web Service créé avec configuration Node
- [ ] Toutes les variables d'environnement ajoutées
- [ ] Build réussi (vérifier les logs Render)
- [ ] API accessible via `https://eduproof-api.onrender.com/api/health`
- [ ] Variable `VITE_API_URL` mise à jour sur Vercel
- [ ] Frontend redéployé et connecté à la nouvelle API
- [ ] Test end-to-end : upload certificat → validation AI → mint NFT

---

## 🐛 Troubleshooting

### Erreur : "Module not found"
**Solution :** Vérifiez que `pnpm install` s'exécute correctement dans les logs Render.

### Erreur : "Port already in use"
**Solution :** Render assigne automatiquement le port. Utilisez `process.env.PORT` dans votre code.

### API lente au premier appel
**Normal** : Le plan gratuit Render s'endort après 15 min. Le premier appel prend ~30s pour réveiller le service.

### CORS errors
**Solution :** Vérifiez que `FRONTEND_URL` dans Render correspond exactement à votre domaine Vercel.

---

## 💡 Alternatives Gratuites

Si Render ne fonctionne pas :

1. **Fly.io** : $5 de crédit gratuit/mois
2. **Koyeb** : 1 service gratuit permanent
3. **Vercel Serverless Functions** : Migrer Express vers API routes (plus complexe)

---

## 📊 Limites du Plan Gratuit Render

- ✅ 750h/mois (suffisant pour 1 service)
- ✅ 512 MB RAM
- ✅ Domaine HTTPS automatique
- ⚠️ Service s'endort après 15 min d'inactivité
- ⚠️ Redémarre en ~30 secondes

**Pour un hackathon, c'est parfait !** 🎉

---

## 🚀 Prochaines Étapes

1. Déployez le backend sur Render (suivez ce guide)
2. Mettez à jour `VITE_API_URL` sur Vercel
3. Testez l'application complète
4. Préparez votre démo avec `DEMO_PRESENTATION_SLIDES.md`

Besoin d'aide ? Vérifiez les logs Render pour diagnostiquer les erreurs.
