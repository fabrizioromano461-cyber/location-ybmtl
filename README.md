# Location YBMTL — Site web

Site vitrine de location de véhicules à Montréal : inventaire, tarifs, disponibilité
et formulaire de demande. **Aucun paiement en ligne** — les réservations sont confirmées
manuellement par téléphone ou courriel.

- **Guide d'utilisation au quotidien (non technique)** : voir [`GUIDE.md`](GUIDE.md)
- **Démarrer le site** : double-cliquez sur `demarrer.command`

---

## 1. La stack technique (et pourquoi) — en mots simples

J'ai volontairement choisi des outils **simples, stables et faciles à modifier**, plutôt
que les plus « à la mode ». Tout le site tient dans un seul petit programme.

| Outil | Rôle | Pourquoi ce choix |
|------|------|-------------------|
| **Node.js** | Le moteur qui fait tourner le site | Standard, gratuit, installé une seule fois |
| **Express** | Organise les pages et les formulaires | Léger, ultra répandu, facile à lire |
| **EJS** | Les pages HTML (avec vos données dedans) | Du HTML presque normal, **aucune étape de compilation** |
| **SQLite** | La base de données | Une **vraie** base de données, mais **un seul fichier** (`data/app.db`) — rien à installer ni administrer |
| **bcrypt** | Sécurise les mots de passe | Les mots de passe sont **hachés**, jamais stockés en clair |
| **express-session** | Garde la connexion admin | Connexion sécurisée par cookie |
| **multer** | Réception des photos | Téléversement de photos depuis le panneau admin |

**Pourquoi pas React / Next.js / WordPress ?** Vous avez demandé « le plus simple à
maintenir ». React/Next ajoutent une machinerie (build, compilation) inutile ici. WordPress
demande un serveur + une base MySQL + des mises à jour de sécurité constantes. Cette stack-ci
est plus légère, plus sûre et plus facile à faire évoluer pour vos besoins.

**C'est une vraie base de données multi-utilisateurs** : plusieurs employés peuvent avoir
leur propre compte (mots de passe hachés), comme demandé.

---

## 2. Structure du projet

```
site web YB/
├── demarrer.command          ← double-clic pour lancer le site
├── changer-mot-de-passe.command ← double-clic pour gérer les comptes admin
├── server.js                 ← point d'entrée
├── db.js                     ← base de données (tables)
├── seed.js                   ← données de départ (admin + Audi S5)
├── config.js / .env          ← réglages (port, secrets, coordonnées)
├── routes/                   ← pages publiques + panneau admin
├── views/                    ← les pages (HTML/EJS)
├── public/                   ← CSS, JavaScript, images, logo
│   └── uploads/              ← photos des véhicules
├── data/                     ← la base de données (app.db) + sessions
├── GUIDE.md                  ← guide d'utilisation non technique
└── README.md                 ← ce fichier
```

---

## 3. Installation / lancement (rappel)

Node.js est déjà installé dans votre dossier personnel (`~/.local/node`).

- **Lancer** : double-clic sur `demarrer.command`
- **Site public** : http://localhost:3000
- **Admin** : http://localhost:3000/admin (identifiant `admin`, mot de passe `ybmtl2026`)

En ligne de commande (pour une personne technique) :
```bash
export PATH="$HOME/.local/node/bin:$PATH"
npm install      # première fois seulement
npm start        # démarre le site
```

---

## 4. Changer le mot de passe admin / ajouter un employé

- **Le plus simple** : double-clic sur `changer-mot-de-passe.command`, puis suivez les questions.
  - Entrez un identifiant **existant** → vous changez son mot de passe.
  - Entrez un **nouvel** identifiant → vous créez un compte employé.
- En ligne de commande : `node tools/set-password.js`

> ⚠️ Changez le mot de passe `ybmtl2026` avant la mise en ligne.

---

## 5. Ajouter les 14 autres véhicules

Deux façons :

1. **Via le panneau admin** (recommandé) : Véhicules → « + Ajouter un véhicule ».
   Voir [`GUIDE.md`](GUIDE.md) section 3. C'est la méthode prévue pour vous.
2. **En lot** (pour une personne technique) : on peut écrire un petit script qui lit un
   fichier Excel/CSV (une ligne par véhicule + dossier de photos) et remplit la base
   automatiquement. Dites-moi si vous voulez que je le prépare quand vous aurez la liste.

La structure de la base est déjà prévue pour un nombre illimité de véhicules et de photos.

---

## 6. Mettre le site en ligne (déploiement)

Pour l'instant le site tourne sur votre ordinateur. Pour que vos clients y accèdent depuis
Internet, il faut **un hébergement** + **un nom de domaine**. Voici mes recommandations,
de la plus simple à la plus économique.

### A. Le nom de domaine
- Achetez un domaine, p. ex. **`locationybmtl.ca`** (~15–25 $/an).
- Registraires fiables : **Namecheap**, **Cloudflare Registrar** (prix coûtant), ou un
  registraire canadien pour un `.ca` (ex. **Namespro**, **Webnames**).

### B. L'hébergement — 3 options selon votre budget/confort

| Option | Coût | Pour qui | Notes |
|--------|------|----------|-------|
| **Render.com** (recommandé pour démarrer) | ~7 $US/mois | Le plus simple | Déploiement en quelques clics, certificat HTTPS gratuit, bonne doc. Avec un **disque persistant** pour garder la base SQLite et les photos. |
| **Railway.app** | ~5 $US/mois | Simple aussi | Très rapide à mettre en place, ajouter un « Volume » pour les données. |
| **Petit serveur (VPS) Hostinger / DigitalOcean** | ~5–7 $US/mois | Si vous voulez tout contrôler | Un peu plus technique (installer Node, configurer). Moins cher à long terme. |

> Cette application est un serveur Node classique : **elle fonctionne sur n'importe quel
> hébergement qui accepte Node.js**. Comme la base est un simple fichier, il faut juste
> s'assurer que l'hébergeur offre un **stockage persistant** (un « disque » ou « volume »)
> pour ne pas perdre les données à chaque redémarrage.

### C. Les étapes (je peux les faire avec vous)
1. **Acheter le domaine** (5 min).
2. **Mettre le code sur GitHub** (gratuit) — sert de sauvegarde et de source pour l'hébergeur.
3. **Créer le service sur Render** (ou Railway) et le connecter à GitHub.
4. Régler les **variables d'environnement** sur l'hébergeur : `SESSION_SECRET` (une longue
   chaîne aléatoire), `ADMIN_USERNAME`, `ADMIN_PASSWORD`, vos coordonnées.
5. Ajouter un **disque persistant** monté sur le dossier `data/` (et idéalement `public/uploads/`).
6. **Brancher le domaine** : pointer `locationybmtl.ca` vers l'hébergeur (HTTPS automatique).
7. Tester, puis communiquer l'adresse à vos clients. 🎉

**Coût total réaliste : environ 7 à 10 $US/mois + ~20 $/an pour le domaine.**

> Recommandation : **Render + Cloudflare/Namecheap pour le domaine**. C'est le meilleur
> compromis simplicité/prix pour une petite entreprise. Quand vous serez prêt, je vous
> accompagne pas à pas pour la mise en ligne.

### Note technique pour la production
Pour un trafic plus important plus tard, on peut basculer SQLite vers **PostgreSQL**
(base hébergée) sans réécrire le site — la logique reste la même. Inutile au début.

---

## 7. Sauvegardes

Vos données importantes sont dans **deux endroits** :
- `data/app.db` → tous les véhicules, disponibilités et demandes.
- `public/uploads/` → les photos des véhicules.

**Conseil** : copiez régulièrement ces deux éléments sur une clé USB ou un nuage (Google
Drive, iCloud). Une fois en ligne, l'hébergeur s'occupe d'une partie des sauvegardes, mais
gardez quand même une copie des photos originales de votre côté.
