# 🎬 Script de Démo EduProof (3-5 minutes)
**Format:** Enregistrement Loom avec voix-off

---

## 📋 Préparation Avant Enregistrement

### ✅ Checklist Technique
- [ ] Wallet MetaMask connecté avec ETH Sepolia testnet
- [ ] Application ouverte sur `https://preview-dd6a73f5-6622-48d5-bbc7-00e416f12c6e.codenut.dev`
- [ ] PDF de certificat prêt (exemple: `demo.pdf`)
- [ ] Onglets navigateur fermés (sauf l'application)
- [ ] Mode plein écran navigateur (F11)
- [ ] Notifications système désactivées

### 🎯 Objectif de la Démo
Montrer comment EduProof sécurise les certificats académiques sur la blockchain en 4 étapes simples.

---

## 🎬 SCRIPT DÉTAILLÉ

### **[0:00 - 0:30] INTRODUCTION (30 secondes)**

**🎤 Voix-off:**
> "Bonjour ! Aujourd'hui, je vais vous présenter **EduProof**, une solution blockchain qui permet de créer, vérifier et gérer des certificats académiques infalsifiables.
>
> Le problème actuel ? Les faux diplômes coûtent des millions aux entreprises chaque année. EduProof résout ce problème en ancrant chaque certificat sur la blockchain Ethereum.
>
> Regardons comment ça fonctionne en pratique."

**🖱️ Actions:**
- Montrer la page d'accueil EduProof
- Pointer le logo et le titre
- Montrer brièvement les 4 onglets de navigation

---

### **[0:30 - 2:00] PARTIE 1: MINT - Créer un Certificat NFT (90 secondes)**

**🎤 Voix-off:**
> "Première étape : **Créer un certificat**. Je vais minter un certificat pour un étudiant fictif."

**🖱️ Actions:**
1. **Connecter le wallet** (si pas déjà connecté)
   - Cliquer sur "Connect Wallet"
   - Sélectionner MetaMask
   - Approuver la connexion

**🎤 Voix-off:**
> "Je connecte mon wallet MetaMask. Notez que nous sommes sur le réseau **Sepolia testnet** - un environnement de test Ethereum."

2. **Remplir le formulaire**
   - **Student Name:** "Alice Dupont"
   - **Course Name:** "Master en Intelligence Artificielle"
   - **Institution:** "Université Paris-Saclay"
   - **Issue Date:** Sélectionner la date du jour
   - **Upload PDF:** Glisser-déposer `demo.pdf`

**🎤 Voix-off:**
> "Je remplis les informations du certificat : nom de l'étudiant, cours, institution, et date de délivrance. J'uploade également le PDF du certificat original."

3. **Mint le certificat**
   - Cliquer sur "Mint Certificate"
   - Attendre l'upload IPFS (barre de progression)
   - Approuver la transaction MetaMask
   - Attendre la confirmation blockchain

**🎤 Voix-off:**
> "En cliquant sur 'Mint Certificate', trois choses se passent :
> 1. Le PDF est uploadé sur **IPFS** - un stockage décentralisé permanent
> 2. Un **NFT unique** est créé sur la blockchain Ethereum
> 3. Le certificat est **indexé** dans notre base de données pour une recherche rapide
>
> Voilà ! Le certificat est maintenant ancré sur la blockchain de manière permanente et infalsifiable."

4. **Montrer le modal de succès**
   - Pointer le Transaction Hash
   - Pointer le lien Etherscan (optionnel: cliquer pour montrer)
   - Fermer le modal

---

### **[2:00 - 2:45] PARTIE 2: MY CERTIFICATES - Voir Ses Certificats (45 secondes)**

**🎤 Voix-off:**
> "Maintenant, voyons comment un étudiant peut consulter ses certificats."

**🖱️ Actions:**
1. Cliquer sur l'onglet **"My Certificates"**
2. Montrer la carte du certificat qui vient d'être minté

**🎤 Voix-off:**
> "Dans l'onglet 'My Certificates', l'étudiant voit tous ses certificats blockchain. Chaque certificat affiche :
> - Le nom du cours
> - L'institution émettrice
> - La date de délivrance
> - Un lien vers le PDF original sur IPFS
> - Un lien vers la transaction blockchain sur Etherscan
>
> Tout est transparent et vérifiable publiquement."

3. **Montrer les détails** (survoler/cliquer sur la carte)
   - Pointer les informations clés
   - Montrer le badge de statut "Active"

---

### **[2:45 - 3:30] PARTIE 3: VERIFY - Vérifier un Certificat (45 secondes)**

**🎤 Voix-off:**
> "Passons maintenant à la vérification - la fonctionnalité clé pour les employeurs."

**🖱️ Actions:**
1. Cliquer sur l'onglet **"Verify"**
2. Sélectionner la méthode **"Certificate ID + Institution"**

**🎤 Voix-off:**
> "Un employeur peut vérifier l'authenticité d'un certificat de deux façons. Utilisons la méthode par ID de certificat."

3. **Remplir le formulaire de vérification**
   - Retourner à "My Certificates" pour copier le Certificate ID
   - Revenir à "Verify"
   - Coller le Certificate ID
   - Entrer l'institution: "Université Paris-Saclay"
   - Cliquer sur "Verify Certificate"

**🎤 Voix-off:**
> "Je copie l'ID du certificat depuis 'My Certificates', je le colle ici avec le nom de l'institution, et je clique sur 'Verify'."

4. **Montrer le résultat de vérification**
   - Pointer le badge "✓ Verified"
   - Montrer les détails du certificat
   - Pointer les sources de vérification (Blockchain + Database)

**🎤 Voix-off:**
> "Et voilà ! Le certificat est **vérifié authentique**. Le système confirme que ce certificat existe bien sur la blockchain et correspond aux informations fournies. Un faux certificat serait immédiatement détecté."

---

### **[3:30 - 4:30] PARTIE 4: ADMIN - Gestion des Institutions (60 secondes)**

**🎤 Voix-off:**
> "Enfin, voyons le panneau d'administration pour gérer les institutions autorisées."

**🖱️ Actions:**
1. Cliquer sur l'onglet **"Admin"**
2. Montrer la liste des institutions

**🎤 Voix-off:**
> "Le panneau admin permet de gérer les institutions qui peuvent émettre des certificats. Seuls les administrateurs autorisés y ont accès."

3. **Montrer les fonctionnalités** (sans forcément tout exécuter)
   - Pointer le bouton "Add Institution"
   - Montrer les filtres (Search, Status)
   - Pointer les actions (Edit, Activate/Deactivate)

**🎤 Voix-off:**
> "Ici, on peut :
> - Ajouter de nouvelles institutions
> - Activer ou désactiver des institutions
> - Filtrer et rechercher dans la liste
> - Modifier les informations d'une institution
>
> Cela garantit que seules les institutions légitimes peuvent émettre des certificats sur la plateforme."

4. **Optionnel: Ajouter une institution rapidement**
   - Cliquer "Add Institution"
   - Remplir rapidement: "École Polytechnique" + wallet address
   - Sauvegarder
   - Montrer qu'elle apparaît dans la liste

---

### **[4:30 - 5:00] CONCLUSION (30 secondes)**

**🎤 Voix-off:**
> "En résumé, **EduProof** offre une solution complète pour sécuriser les certificats académiques :
>
> ✅ **Création** de certificats NFT infalsifiables sur blockchain
> ✅ **Stockage** permanent et décentralisé sur IPFS
> ✅ **Vérification** instantanée pour les employeurs
> ✅ **Gestion** centralisée des institutions autorisées
>
> Tout est transparent, vérifiable, et impossible à falsifier grâce à la blockchain Ethereum.
>
> Merci d'avoir regardé cette démo ! Pour plus d'informations, consultez notre documentation sur GitHub."

**🖱️ Actions:**
- Retourner à la page d'accueil
- Montrer brièvement le logo EduProof
- Fin de l'enregistrement

---

## 🎯 Points Clés à Mentionner

### Avantages Techniques
- ✅ **Blockchain Ethereum** - Sécurité et immutabilité
- ✅ **IPFS** - Stockage décentralisé permanent
- ✅ **NFT ERC-721** - Certificats uniques et traçables
- ✅ **Vérification instantanée** - Pas besoin de contacter l'institution

### Cas d'Usage
- 🎓 Universités et écoles
- 💼 Employeurs vérifiant les diplômes
- 🏢 Plateformes de formation en ligne (Coursera, Udemy)
- 🌍 Reconnaissance internationale des diplômes

---

## 💡 Conseils pour l'Enregistrement Loom

### 🎙️ Voix et Ton
- Parler clairement et à un rythme modéré
- Être enthousiaste mais professionnel
- Faire des pauses entre les sections
- Éviter les "euh" et hésitations

### 🖱️ Mouvements de Souris
- Utiliser le curseur pour pointer les éléments importants
- Ne pas bouger la souris trop rapidement
- Faire des cercles autour des éléments clés
- Laisser le curseur immobile pendant les explications

### 🎬 Montage (si nécessaire)
- Couper les temps morts trop longs
- Accélérer légèrement les transactions blockchain (x1.5)
- Ajouter des annotations texte sur les points clés
- Ajouter une intro/outro avec logo si possible

### ⏱️ Timing
- **Version courte (3 min):** Sauter la partie Admin ou accélérer
- **Version complète (5 min):** Suivre le script complet
- **Astuce:** Faire 2-3 prises et garder la meilleure

---

## 📝 Checklist Post-Enregistrement

- [ ] Vérifier la qualité audio
- [ ] Vérifier que tout le texte est lisible
- [ ] Couper le début/fin si nécessaire
- [ ] Ajouter un titre descriptif
- [ ] Ajouter une description avec liens
- [ ] Partager le lien Loom

---

## 🔗 Liens à Inclure dans la Description Loom

```
🎓 EduProof - Certificats Académiques sur Blockchain

📺 Cette démo montre comment créer, vérifier et gérer des certificats académiques infalsifiables sur la blockchain Ethereum.

🔗 Liens utiles:
- Application: https://preview-dd6a73f5-6622-48d5-bbc7-00e416f12c6e.codenut.dev
- GitHub: [votre repo]
- Documentation: [lien vers docs]
- Etherscan Sepolia: https://sepolia.etherscan.io

⏱️ Chapitres:
0:00 - Introduction
0:30 - Mint: Créer un certificat NFT
2:00 - My Certificates: Consulter ses certificats
2:45 - Verify: Vérifier l'authenticité
3:30 - Admin: Gérer les institutions
4:30 - Conclusion

#Blockchain #Ethereum #NFT #Education #Web3
```

---

## 🎬 Bon enregistrement ! 🚀
