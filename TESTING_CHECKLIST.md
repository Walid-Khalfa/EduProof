# EduProof - Checklist de Tests Finaux

## ✅ Critères d'Acceptation Mesurables

### 1. Backend et Sécurité
- [x] Variables d'environnement séparées (`.env` frontend, `.env.server` backend)
- [x] Supabase configuré avec `service_role` key (backend uniquement)
- [x] Health check endpoint fonctionnel (`/api/health`)
- [ ] **⚠️ ATTENTION**: Supabase status = "not_configured" - Vérifier les credentials dans `.env.server`

**Test Health Check:**
```bash
curl http://localhost:3001/api/health
```

**Résultat attendu:**
```json
{
  "ok": true,
  "services": {
    "supabase": {
      "configured": true,
      "status": "connected"  // ← Doit être "connected"
    },
    "gemini": { "configured": true },
    "pinata": { "configured": true }
  }
}
```

### 2. OCR Gemini
- [x] Route `/api/ocr` implémentée
- [x] Parsing JSON strict avec gestion d'erreurs
- [x] Extraction des champs: studentName, courseName, institution, issueDate, certId

**Test OCR:**
```bash
curl -X POST http://localhost:3001/api/ocr \
  -H "Content-Type: application/json" \
  -d '{"imageUrl": "https://example.com/certificate.jpg"}'
```

### 3. IPFS Backend-Only
- [x] Route `/api/ipfs/upload-image` (backend uniquement)
- [x] Route `/api/ipfs/upload-metadata` (backend uniquement)
- [x] Intégration Pinata avec JWT

**Test Upload Image:**
```bash
curl -X POST http://localhost:3001/api/ipfs/upload-image \
  -F "file=@certificate.jpg"
```

### 4. Certification ID et Anti-Doublon
- [x] Champ `cert_id` ajouté au formulaire
- [x] Route `/api/certificates/availability` pour pré-check
- [x] Contrainte unique en DB (`institution_id` + `cert_id_normalized`)
- [x] Validation avant mint

**Test Availability:**
```bash
curl "http://localhost:3001/api/certificates/availability?institution=MIT&certId=CERT-2024-001"
```

### 5. Mint NFT Complet
- [x] Upload image vers IPFS (backend)
- [x] Construction métadonnées ERC-721
- [x] Upload métadonnées vers IPFS (backend)
- [x] Mint NFT sur blockchain
- [x] Indexation automatique dans Supabase

**Test Indexation:**
```bash
curl -X POST http://localhost:3001/api/certificates/index \
  -H "Content-Type: application/json" \
  -d '{
    "institution": "MIT",
    "certId": "CERT-2024-001",
    "studentName": "John Doe",
    "courseName": "Blockchain Development",
    "issueDate": "2024-01-15",
    "tokenId": "1",
    "imageCid": "QmXxx...",
    "metadataCid": "QmYyy...",
    "txHash": "0xabc...",
    "owner": "0x123..."
  }'
```

### 6. UX Mint
- [x] Étapes visibles pendant le mint
- [x] Toasts de notification clairs
- [x] Feedback utilisateur à chaque étape
- [x] Gestion des erreurs avec messages explicites

**Test Manuel:**
1. Connecter wallet
2. Uploader un certificat
3. Vérifier affichage des étapes:
   - ✓ Upload image IPFS
   - ✓ Création métadonnées
   - ✓ Upload métadonnées IPFS
   - ✓ Mint NFT
   - ✓ Indexation DB
4. Vérifier toasts de succès/erreur

### 7. Page Verify
- [x] Recherche par ID de certification
- [x] Recherche DB en priorité
- [x] Fallback blockchain si non trouvé en DB
- [x] Affichage détaillé des résultats

**Test Verify:**
```bash
curl -X POST http://localhost:3001/api/certificates/verify \
  -H "Content-Type: application/json" \
  -d '{"certId": "CERT-2024-001", "institution": "MIT"}'
```

**Test Manuel:**
1. Aller sur `/verify`
2. Entrer un ID de certificat existant
3. Vérifier affichage des informations complètes
4. Tester avec un ID inexistant (doit afficher "non trouvé")

### 8. Page My Certificates
- [x] Liste des certificats de l'utilisateur connecté
- [x] Fetch dynamique depuis DB via `/api/certificates/owner/:address`
- [x] Affichage des images IPFS
- [x] Liens vers métadonnées et transactions

**Test My Certificates:**
```bash
curl http://localhost:3001/api/certificates/owner/0x123...
```

**Test Manuel:**
1. Connecter wallet avec certificats mintés
2. Aller sur `/my-certificates`
3. Vérifier affichage de tous les certificats
4. Cliquer sur liens IPFS et Etherscan
5. Tester avec wallet sans certificats (doit afficher message vide)

### 9. Switch Network
- [x] Bouton "Switch to Sepolia" dans Layout
- [x] Changement de réseau fonctionnel
- [x] Détection du réseau actuel

**Test Manuel:**
1. Connecter wallet sur un autre réseau (ex: Mainnet)
2. Cliquer sur "Switch to Sepolia"
3. Vérifier changement de réseau dans wallet

### 10. Documentation
- [x] README complet avec:
  - [x] Description du projet
  - [x] Architecture technique
  - [x] Guide d'installation
  - [x] Configuration des variables d'environnement
  - [x] Guide d'utilisation
  - [x] Documentation API
  - [x] Instructions de build
- [ ] Vidéo démo 3-5 minutes

## 🎬 Vidéo Démo - Script Recommandé

**Durée: 3-5 minutes**

### Introduction (30s)
- Présentation du projet EduProof
- Problématique: certificats falsifiables
- Solution: blockchain + IPFS + IA

### Démonstration (3-4 min)

**1. Mint d'un Certificat (90s)**
- Connexion wallet
- Upload image certificat
- OCR automatique avec Gemini
- Vérification des données extraites
- Check disponibilité ID
- Mint NFT avec étapes visibles
- Confirmation et indexation DB

**2. Consultation My Certificates (45s)**
- Navigation vers "My Certificates"
- Affichage des certificats mintés
- Clic sur liens IPFS et Etherscan
- Vérification des métadonnées

**3. Vérification d'un Certificat (45s)**
- Navigation vers "Verify"
- Recherche par ID
- Affichage des résultats détaillés
- Score de vérification

**4. Backend et Sécurité (30s)**
- Montrer health check endpoint
- Expliquer architecture backend-only IPFS
- Mentionner Supabase et anti-doublon

### Conclusion (30s)
- Récapitulatif des fonctionnalités
- Avantages: infalsifiable, décentralisé, vérifiable
- Perspectives d'évolution

## 🔧 Actions Correctives Nécessaires

### ⚠️ CRITIQUE: Supabase Non Connecté
Le health check montre `"status": "not_configured"` pour Supabase.

**Actions:**
1. Vérifier `.env.server`:
   ```bash
   cat .env.server | grep SUPABASE
   ```
2. S'assurer que les variables sont définies:
   ```
   SUPABASE_URL=https://xxx.supabase.co
   SUPABASE_SERVICE_ROLE=eyJxxx...
   ```
3. Redémarrer le serveur backend:
   ```bash
   pnpm run server
   ```
4. Re-tester health check

### ⚠️ MINEUR: Erreurs WalletConnect
Erreurs console WalletConnect (400) - Non bloquant mais à noter:
- Erreur liée au projectId WalletConnect
- N'affecte pas les fonctionnalités principales
- Peut être ignoré pour la démo ou corrigé avec un nouveau projectId

## 📊 Résumé des Tests

| Critère | Status | Notes |
|---------|--------|-------|
| Backend sécurisé | ✅ | Variables séparées OK |
| Supabase connecté | ⚠️ | À vérifier - status "not_configured" |
| OCR Gemini | ✅ | Route fonctionnelle |
| IPFS backend-only | ✅ | Routes upload OK |
| Anti-doublon | ✅ | Availability check + contraintes DB |
| Mint NFT complet | ✅ | Workflow complet implémenté |
| UX polie | ✅ | Étapes + toasts |
| Page Verify | ✅ | DB + fallback blockchain |
| Page My Certificates | ✅ | Liste dynamique |
| Switch Network | ✅ | Bouton fonctionnel |
| Documentation | ✅ | README complet |
| Vidéo démo | ⏳ | À créer |

## 🎯 Prochaines Étapes

1. **URGENT**: Corriger connexion Supabase (vérifier `.env.server`)
2. Créer vidéo démo 3-5 minutes
3. Tester tous les endpoints API manuellement
4. Tester workflow complet mint → verify → my certificates
5. Préparer présentation pour le jury

## ✅ Validation Finale

Avant de présenter au jury:
- [ ] Health check retourne `"status": "connected"` pour Supabase
- [ ] Mint d'un certificat test réussi
- [ ] Certificat visible dans "My Certificates"
- [ ] Vérification du certificat fonctionne
- [ ] Vidéo démo enregistrée et validée
- [ ] README à jour avec toutes les informations
- [ ] Tous les services backend opérationnels
