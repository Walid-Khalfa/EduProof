# Guide de Déploiement Vercel - EduProof

## 🚀 Déploiement Frontend sur Vercel

### Étape 1 : Préparer le projet

Votre projet est déjà configuré avec :
- ✅ `vercel.json` - Configuration Vercel
- ✅ `.vercelignore` - Fichiers à exclure
- ✅ Build optimisé pour production

### Étape 2 : Déployer sur Vercel

#### Option A : Via Interface Web (Recommandé)

1. **Aller sur Vercel** : https://vercel.com
2. **Se connecter** avec GitHub
3. **Importer le projet** :
   - Cliquer "Add New Project"
   - Sélectionner votre repository GitHub
4. **Configurer** :
   - Framework Preset: **Vite**
   - Build Command: `pnpm run build`
   - Output Directory: `dist`
   - Install Command: `pnpm install`

5. **Variables d'environnement** (Settings → Environment Variables) :
   ```
   VITE_CHAIN=devnet
   VITE_WALLETCONNECT_PROJECT_ID=ac9166dd615752bda362b92887c6a1ad
   VITE_OCR_PROVIDER=gemini
   VITE_API_URL=https://votre-backend.railway.app
   ```

6. **Déployer** : Cliquer "Deploy"

#### Option B : Via CLI Vercel

```bash
# Installer Vercel CLI
npm i -g vercel

# Se connecter
vercel login

# Déployer
vercel

# Suivre les instructions :
# - Set up and deploy? Yes
# - Which scope? Votre compte
# - Link to existing project? No
# - Project name? eduproof
# - Directory? ./
# - Override settings? No

# Configurer les variables d'environnement
vercel env add VITE_CHAIN
# Entrer: devnet

vercel env add VITE_WALLETCONNECT_PROJECT_ID
# Entrer: ac9166dd615752bda362b92887c6a1ad

vercel env add VITE_OCR_PROVIDER
# Entrer: gemini

vercel env add VITE_API_URL
# Entrer: URL de votre backend

# Redéployer avec les variables
vercel --prod
```

### Étape 3 : Déployer le Backend (Optionnel)

#### Sur Railway.app (Gratuit)

1. **Aller sur Railway** : https://railway.app
2. **Se connecter** avec GitHub
3. **New Project** → **Deploy from GitHub repo**
4. **Sélectionner** votre repository
5. **Configurer** :
   - Root Directory: `server`
   - Start Command: `node index.js`
   
6. **Variables d'environnement** :
   ```
   PORT=3000
   SUPABASE_URL=votre_url_supabase
   SUPABASE_SERVICE_ROLE_KEY=votre_clé
   GEMINI_API_KEY=votre_clé_gemini
   PINATA_JWT=votre_jwt_pinata
   FRONTEND_URL=https://votre-app.vercel.app
   ```

7. **Déployer** et copier l'URL générée

8. **Retourner sur Vercel** :
   - Settings → Environment Variables
   - Modifier `VITE_API_URL` avec l'URL Railway
   - Redéployer

### Étape 4 : Vérification

1. **Frontend** : https://votre-app.vercel.app
2. **Backend** : https://votre-backend.railway.app/health
3. **Tester** :
   - Connexion wallet
   - Upload certificat
   - Mint NFT
   - Vérification

## 🔧 Configuration Post-Déploiement

### Mettre à jour FRONTEND_URL dans le backend

Si vous déployez le backend après le frontend :

```bash
# Sur Railway, ajouter/modifier la variable :
FRONTEND_URL=https://votre-app.vercel.app
```

### Activer les domaines personnalisés (Optionnel)

**Sur Vercel** :
- Settings → Domains
- Ajouter votre domaine personnalisé

## 📝 Checklist de Déploiement

- [ ] Repository GitHub créé et code pushé
- [ ] Frontend déployé sur Vercel
- [ ] Variables d'environnement frontend configurées
- [ ] Backend déployé sur Railway (si nécessaire)
- [ ] Variables d'environnement backend configurées
- [ ] VITE_API_URL mis à jour sur Vercel
- [ ] Test de connexion wallet
- [ ] Test de mint NFT
- [ ] Test de vérification

## 🎯 URLs Finales

Après déploiement, vous aurez :

- **Frontend** : `https://eduproof.vercel.app` (ou votre domaine)
- **Backend** : `https://eduproof-backend.railway.app` (si déployé)
- **Contrats** : CodeNut DevNet (chainId 20258)
- **Database** : Supabase (déjà configuré)

## ⚡ Déploiement Rapide (Frontend uniquement)

Si vous voulez juste déployer le frontend sans backend :

1. Aller sur https://vercel.com
2. Importer votre repo GitHub
3. Ajouter les variables d'environnement :
   ```
   VITE_CHAIN=devnet
   VITE_WALLETCONNECT_PROJECT_ID=ac9166dd615752bda362b92887c6a1ad
   VITE_OCR_PROVIDER=gemini
   ```
4. Déployer

**Note** : Sans backend, certaines fonctionnalités (OCR, indexation) ne fonctionneront pas.

## 🆘 Dépannage

### Build échoue sur Vercel
- Vérifier que toutes les dépendances sont dans `package.json`
- Vérifier les variables d'environnement

### App ne charge pas
- Vérifier la console navigateur
- Vérifier que `VITE_CHAIN=devnet`

### Wallet ne se connecte pas
- Vérifier `VITE_WALLETCONNECT_PROJECT_ID`
- Vérifier la configuration réseau dans `chainConfig.ts`

### Backend inaccessible
- Vérifier l'URL dans `VITE_API_URL`
- Tester `/health` endpoint

## 📚 Ressources

- [Documentation Vercel](https://vercel.com/docs)
- [Documentation Railway](https://docs.railway.app)
- [Vite Deployment](https://vitejs.dev/guide/static-deploy.html)
