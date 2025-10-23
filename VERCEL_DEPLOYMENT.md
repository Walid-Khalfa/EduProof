# 🚀 Guide de Déploiement Vercel - EduProof Frontend

## Prérequis

- Compte Vercel (gratuit) : https://vercel.com/signup
- Compte GitHub avec le repo EduProof
- Variables d'environnement prêtes

---

## Étape 1 : Connexion à Vercel

1. Allez sur https://vercel.com
2. Cliquez sur **Sign Up** ou **Log In**
3. Choisissez **Continue with GitHub**
4. Autorisez Vercel à accéder à vos repos

---

## Étape 2 : Import du Projet

1. Sur le dashboard Vercel, cliquez **Add New... → Project**
2. Cherchez `EduProof` dans la liste de vos repos
3. Cliquez **Import**

---

## Étape 3 : Configuration du Build

### Framework Preset
- **Framework Preset** : `Vite`
- **Root Directory** : `./` (racine)
- **Build Command** : `pnpm run build`
- **Output Directory** : `dist`
- **Install Command** : `pnpm install`

### Variables d'Environnement

Cliquez sur **Environment Variables** et ajoutez :

```bash
# Blockchain Configuration
VITE_CHAIN=devnet

# Supabase
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre_anon_key

# Backend API
VITE_API_URL=https://votre-backend.railway.app

# Pinata IPFS
VITE_PINATA_GATEWAY=https://gateway.pinata.cloud/ipfs

# WalletConnect (optionnel)
VITE_WALLETCONNECT_PROJECT_ID=ac9166dd615752bda362b92887c6a1ad
```

**Important** : Remplacez les valeurs par vos vraies clés.

---

## Étape 4 : Déploiement

1. Cliquez **Deploy**
2. Attendez 2-3 minutes (build + déploiement)
3. Vercel vous donnera une URL : `https://eduproof.vercel.app`

---

## Étape 5 : Configuration du Domaine Personnalisé (Optionnel)

### Ajouter un domaine

1. Dans votre projet Vercel, allez dans **Settings → Domains**
2. Entrez votre domaine : `eduproof.com` ou `app.eduproof.com`
3. Suivez les instructions DNS :
   - **Type A** : pointez vers l'IP Vercel
   - **Type CNAME** : pointez vers `cname.vercel-dns.com`

### DNS Configuration Example

```
Type    Name    Value
A       @       76.76.21.21
CNAME   www     cname.vercel-dns.com
```

---

## Étape 6 : Déploiement Automatique

Vercel déploie automatiquement à chaque push sur `main` :

```bash
git add .
git commit -m "Update frontend"
git push origin main
```

Vercel détecte le push et redéploie en 2 minutes.

---

## Étape 7 : Vérification

1. Visitez votre URL Vercel
2. Connectez MetaMask
3. Testez le mint d'un certificat
4. Vérifiez la validation AI

---

## Résolution de Problèmes

### Build échoue

**Erreur** : `Module not found`

**Solution** :
```bash
# Localement, vérifiez que tout build
pnpm install
pnpm run build
```

Puis commitez et pushez.

---

### Variables d'environnement manquantes

**Erreur** : `VITE_SUPABASE_URL is not defined`

**Solution** :
1. Allez dans **Settings → Environment Variables**
2. Ajoutez la variable manquante
3. Cliquez **Redeploy** dans l'onglet **Deployments**

---

### CORS Errors

**Erreur** : `CORS policy: No 'Access-Control-Allow-Origin'`

**Solution** : Configurez votre backend pour autoriser votre domaine Vercel :

```javascript
// server/index.ts
app.use(cors({
  origin: [
    'https://eduproof.vercel.app',
    'https://app.eduproof.com'
  ]
}));
```

---

## Performance & Optimisation

### Edge Network
Vercel déploie automatiquement sur son CDN global (150+ régions).

### Analytics
Activez Vercel Analytics :
1. **Settings → Analytics**
2. Activez **Web Analytics**
3. Suivez les performances en temps réel

### Caching
Vercel cache automatiquement les assets statiques (JS, CSS, images).

---

## Commandes Utiles

### Redéployer manuellement
```bash
vercel --prod
```

### Voir les logs
```bash
vercel logs https://eduproof.vercel.app
```

### Rollback vers un déploiement précédent
1. Allez dans **Deployments**
2. Trouvez le déploiement stable
3. Cliquez **⋯ → Promote to Production**

---

## Checklist Finale

- [ ] Build réussit sans erreur
- [ ] Toutes les variables d'environnement configurées
- [ ] MetaMask se connecte correctement
- [ ] Mint de certificat fonctionne
- [ ] Validation AI retourne des résultats
- [ ] IPFS affiche les certificats
- [ ] Domaine personnalisé configuré (optionnel)
- [ ] Analytics activé

---

## Support

- Documentation Vercel : https://vercel.com/docs
- Support Vercel : https://vercel.com/support
- Community Discord : https://vercel.com/discord

---

**Votre frontend EduProof est maintenant live 24/7 avec SSL, CDN global, et déploiement automatique !** 🎉
