# Configuration Supabase pour EduProof

## Étapes de configuration manuelle

### 1. Créer un projet Supabase gratuit

1. Allez sur https://supabase.com
2. Connectez-vous avec GitHub ou email
3. Cliquez sur "New Project"
4. Remplissez :
   - **Organization** : Créez-en une si première fois
   - **Project Name** : `eduproof-demo`
   - **Database Password** : Choisissez un mot de passe fort (SAUVEGARDEZ-LE)
   - **Region** : Choisissez la région la plus proche
5. Cliquez "Create new project" et attendez 1-2 minutes

### 2. Récupérer les credentials

Une fois le projet créé :

1. Allez dans **Project Settings** (icône engrenage en bas à gauche)
2. Cliquez sur **API** dans le menu latéral
3. Copiez ces deux valeurs :
   - **Project URL** → `SUPABASE_URL`
   - **service_role key** (secret) → `SUPABASE_SERVICE_ROLE`

⚠️ **IMPORTANT** : Utilisez la clé `service_role`, PAS la clé `anon` !

### 3. Configurer .env.server

Ajoutez les credentials dans `.env.server` :

```bash
# Supabase (Database)
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_SERVICE_ROLE=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4. Exécuter le schéma SQL

1. Dans Supabase, allez dans **SQL Editor** (icône base de données)
2. Cliquez sur **New Query**
3. Copiez-collez le contenu de `supabase/migrations/20240101000000_create_eduproof_tables.sql`
4. Cliquez sur **Run** (ou Ctrl+Enter)
5. Vérifiez que les 3 tables sont créées : `institutions`, `certificates`, `verifications`

### 5. Vérifier les tables

Dans **Table Editor**, vous devriez voir :
- ✅ `institutions` (avec colonnes : id, name, name_normalized, wallet_address, verified, created_at, updated_at)
- ✅ `certificates` (avec contrainte UNIQUE sur cert_id_normalized + institution_id)
- ✅ `verifications`

### 6. Redémarrer le backend

```bash
cd /workspace/dd6a73f5-6622-48d5-bbc7-00e416f12c6e
pnpm run dev:server
```

### 7. Tester les routes

```bash
# Health check
curl http://localhost:3001/health

# Availability check
curl "http://localhost:3001/api/certificates/availability?institution=MIT&certId=CERT-001"
```

## Schéma SQL à exécuter

Le fichier `supabase/migrations/20240101000000_create_eduproof_tables.sql` contient :

- **Table `institutions`** : Stocke les institutions éducatives
  - Contrainte UNIQUE sur `name_normalized` (anti-doublon insensible à la casse)
  
- **Table `certificates`** : Stocke les certificats mintés
  - Contrainte UNIQUE sur `(cert_id_normalized, institution_id)` (un ID par institution)
  - Références IPFS (image + metadata)
  - Données blockchain (token_id, tx_hash, minter_address)
  
- **Table `verifications`** : Track les vérifications de certificats

## Sécurité

✅ Les credentials Supabase sont dans `.env.server` (backend uniquement)
✅ Jamais exposés au frontend
✅ La clé `service_role` permet les opérations admin côté serveur
✅ Les routes API backend utilisent `supabaseSrv` avec auth désactivée

## Troubleshooting

**Erreur 503 "DATABASE_NOT_CONFIGURED"** :
- Vérifiez que `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE` sont bien dans `.env.server`
- Redémarrez le serveur backend

**Erreur "relation does not exist"** :
- Exécutez le schéma SQL dans Supabase SQL Editor

**Erreur "duplicate key value violates unique constraint"** :
- Normal ! C'est la protection anti-doublon qui fonctionne
- Changez le `certId` ou l'`institution`
