# Guide de Mise à Jour du Repository GitHub

## 🎯 Objectif
Mettre à jour le repository https://github.com/Walid-Khalfa/EduProof avec la version actuelle du code tout en conservant le README.md existant.

## ⚠️ Important : Sauvegarder le README

Avant de commencer, **téléchargez le README.md actuel** depuis GitHub :
https://github.com/Walid-Khalfa/EduProof/blob/main/README.md

## 📋 Étapes de Mise à Jour

### Étape 1 : Initialiser Git (si nécessaire)

```bash
# Vérifier si git est initialisé
git status

# Si pas initialisé, initialiser
git init
```

### Étape 2 : Configurer le Remote

```bash
# Ajouter le remote GitHub
git remote add origin https://github.com/Walid-Khalfa/EduProof.git

# Ou si déjà configuré, vérifier
git remote -v

# Si besoin de changer l'URL
git remote set-url origin https://github.com/Walid-Khalfa/EduProof.git
```

### Étape 3 : Récupérer le README depuis GitHub

```bash
# Récupérer uniquement le README de la branche main
git fetch origin main

# Extraire le README
git checkout origin/main -- README.md
```

**OU** manuellement :
1. Télécharger le README depuis GitHub
2. Remplacer le fichier local `README.md`

### Étape 4 : Vérifier les Fichiers Sensibles

**CRITIQUE** : Vérifier que `.env` et `.env.server` sont bien ignorés :

```bash
# Vérifier le statut
git status

# Si .env ou .env.server apparaissent, les supprimer du tracking
git rm --cached .env
git rm --cached .env.server
```

### Étape 5 : Ajouter Tous les Fichiers

```bash
# Ajouter tous les fichiers (sauf ceux dans .gitignore)
git add .

# Vérifier ce qui sera commité
git status
```

### Étape 6 : Créer le Commit

```bash
# Créer le commit avec message descriptif
git commit -m "Update to latest version with CodeNut DevNet deployment

- Updated smart contracts for CodeNut DevNet (chainId 20258)
- Enhanced frontend with improved UI/UX
- Added comprehensive backend with Supabase integration
- Implemented AI-powered OCR with Google Gemini
- Added IPFS storage via Pinata
- Configured for Vercel deployment
- Updated documentation and deployment guides
- Preserved original README.md"
```

### Étape 7 : Pousser vers GitHub

**Option A : Force Push (Recommandé si vous voulez remplacer complètement)**

```bash
# Force push vers main (écrase l'historique)
git push -f origin main
```

**Option B : Push Normal (Si vous voulez garder l'historique)**

```bash
# Pull d'abord pour fusionner
git pull origin main --allow-unrelated-histories

# Résoudre les conflits si nécessaire
# Puis push
git push origin main
```

## 🔒 Sécurité : Vérification Finale

### Vérifier qu'aucun fichier sensible n'est commité

```bash
# Vérifier les fichiers trackés
git ls-files | grep -E '\\.env'

# Si des fichiers .env apparaissent, les supprimer immédiatement
git rm --cached .env .env.server
git commit -m "Remove sensitive environment files"
git push origin main
```

### Fichiers qui NE DOIVENT JAMAIS être sur GitHub

- ❌ `.env`
- ❌ `.env.server`
- ❌ `.env.local`
- ❌ `.env.production`
- ❌ Tout fichier contenant des clés API
- ❌ Fichiers de logs (*.log, *.pid)

### Fichiers qui DOIVENT être sur GitHub

- ✅ `.env.example` (template sans valeurs réelles)
- ✅ `.gitignore` (mis à jour)
- ✅ `README.md` (version à jour de GitHub)
- ✅ Code source (src/, contracts/, server/)
- ✅ Configuration (package.json, vite.config.ts, etc.)
- ✅ Documentation (*.md)

## 📝 Créer .env.example pour les Contributeurs

```bash
# Créer un template .env.example
cat > .env.example << 'EOF'
# Frontend Environment Variables
VITE_CHAIN=devnet
VITE_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
VITE_OCR_PROVIDER=gemini
VITE_API_URL=http://localhost:3000

# Note: Copy this file to .env and fill in your actual values
EOF

# Créer un template .env.server.example
cat > .env.server.example << 'EOF'
# Backend Environment Variables
PORT=3000

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# AI OCR
GEMINI_API_KEY=your_gemini_api_key

# IPFS
PINATA_JWT=your_pinata_jwt

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173

# Note: Copy this file to .env.server and fill in your actual values
EOF

# Ajouter ces templates au commit
git add .env.example .env.server.example
git commit -m "Add environment variable templates"
git push origin main
```

## ✅ Checklist Finale

Avant de pousser vers GitHub, vérifier :

- [ ] README.md est la version à jour de GitHub
- [ ] `.env` et `.env.server` sont dans `.gitignore`
- [ ] `.env.example` et `.env.server.example` sont créés
- [ ] Aucun fichier sensible dans `git status`
- [ ] Build fonctionne : `pnpm run build`
- [ ] Pas d'erreurs TypeScript : `pnpm run type-check`
- [ ] Documentation à jour

## 🚀 Après le Push

1. **Vérifier sur GitHub** : https://github.com/Walid-Khalfa/EduProof
2. **Configurer Vercel** :
   - Importer le repo
   - Ajouter les variables d'environnement
   - Déployer

3. **Mettre à jour le README** avec :
   - Nouveau lien de démo Vercel
   - Instructions de déploiement
   - Badges de statut

## 🆘 En Cas de Problème

### Si vous avez accidentellement commité des fichiers sensibles

```bash
# Supprimer du dernier commit
git rm --cached .env .env.server
git commit --amend -m "Remove sensitive files"
git push -f origin main

# Si déjà poussé, changer IMMÉDIATEMENT toutes les clés API
```

### Si le push est rejeté

```bash
# Force push (attention : écrase l'historique distant)
git push -f origin main
```

### Si vous voulez recommencer

```bash
# Supprimer le remote
git remote remove origin

# Recommencer depuis l'étape 2
```

## 📚 Ressources

- [GitHub Docs - Ignoring Files](https://docs.github.com/en/get-started/getting-started-with-git/ignoring-files)
- [Git Docs - git-rm](https://git-scm.com/docs/git-rm)
- [Vercel Deployment](https://vercel.com/docs)
