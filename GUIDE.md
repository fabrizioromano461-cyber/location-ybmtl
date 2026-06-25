# Guide d'utilisation — Location YBMTL

Ce guide explique, en mots simples, comment utiliser votre site au quotidien.
Aucune connaissance technique requise.

---

## 1. Démarrer le site sur votre ordinateur

Double-cliquez sur le fichier **`demarrer.command`** (dans le dossier du site).

- Une fenêtre noire (le « Terminal ») s'ouvre — **c'est normal, ne la fermez pas** tant que vous utilisez le site.
- Votre navigateur s'ouvre tout seul sur le site.
- Adresses :
  - **Site public** (ce que voient les clients) : http://localhost:3000
  - **Panneau admin** (votre espace privé) : http://localhost:3000/admin

Pour **arrêter** le site : fermez simplement la fenêtre noire du Terminal.

> La première fois, si macOS dit « impossible d'ouvrir car développeur non identifié » :
> faites un **clic droit** sur `demarrer.command` → **Ouvrir** → **Ouvrir**. À refaire une seule fois.

---

## 2. Se connecter au panneau admin

1. Allez sur http://localhost:3000/admin
2. Entrez vos identifiants :
   - **Identifiant** : `admin`
   - **Mot de passe** : `ybmtl2026`  ← *(à changer, voir section 6)*

---

## 3. Ajouter un véhicule

1. Dans le panneau admin, cliquez sur **« Véhicules »** (en haut), puis **« + Ajouter un véhicule »**.
2. Remplissez les champs : marque, modèle, année, tarif hebdomadaire, transmission,
   nombre de portes, politique de kilométrage, description.
3. Dans **« Ajouter des photos »**, sélectionnez une ou plusieurs photos d'un coup
   (maintenez la touche ⌘ pour en choisir plusieurs).
4. Cliquez sur **« Créer le véhicule »**.
5. Vous arrivez sur la page de modification : vous y voyez vos photos.
   - La **première photo** devient automatiquement la photo principale (celle de la carte).
   - Pour changer : cliquez sur **« Définir principale »** sous une autre photo.
   - Pour retirer une photo : **« Supprimer »**.

> Pour **modifier** un véhicule plus tard : Véhicules → bouton **« Modifier »**.
> Pour le **retirer** du site sans le supprimer : décochez **« Publié sur le site »**.

---

## 4. Bloquer / libérer des dates (disponibilité)

C'est **vous** qui gérez la disponibilité à la main, après avoir confirmé une location
par téléphone. Le site ne réserve jamais tout seul.

1. Panneau admin → **« Véhicules »** → bouton **« Disponibilité »** du véhicule concerné.
   *(ou, depuis la page d'un véhicule, le bouton « Gérer la disponibilité ».)*
2. Un calendrier s'affiche.
   - **Cliquez sur une journée** pour la **bloquer** (le client la verra « indisponible »).
   - **Cliquez de nouveau** dessus pour la **libérer**.
   - Utilisez les flèches **‹ ›** pour changer de mois.
3. **Aucun bouton « Enregistrer » à cliquer** : chaque clic est sauvegardé immédiatement.

Sur le site public, les dates bloquées apparaissent en gris dans le calendrier du véhicule,
et la carte affiche le badge **« Loué actuellement »** si la voiture est bloquée *aujourd'hui*.

---

## 5. Voir et traiter les demandes des clients

Quand un client remplit le formulaire **« Demander cette voiture »**, sa demande arrive
dans votre panneau.

1. Panneau admin → **« Demandes »**.
2. Vous voyez : nom, téléphone (cliquable), courriel (cliquable), véhicule demandé,
   dates souhaitées, message, et la date de la demande.
3. Les nouvelles demandes sont en haut avec une pastille bleue **« Nouvelle »**.
4. Après avoir rappelé le client, cliquez sur **« Marquer traitée »**.
5. Vous pouvez aussi **« Supprimer »** une demande.

> Rappel : il n'y a **pas de paiement en ligne**. Vous confirmez tout par téléphone ou courriel.

---

## 6. Changer votre mot de passe (important !)

Le mot de passe par défaut doit être changé. Deux options :

**Option simple (recommandée) — me redemander** de le changer pour vous, ou suivre ceci :

1. Ouvrez le fichier **`changer-mot-de-passe.command`** *(voir README si absent)*, ou
2. Demandez à votre personne technique d'exécuter la commande indiquée dans le `README.md`,
   section « Changer le mot de passe admin ».

Un mot de passe robuste = au moins 12 caractères, mélange de lettres, chiffres et symboles.

---

## 7. Ajouter vos employés (plusieurs comptes)

Le site est prêt pour plusieurs comptes admin. La création de comptes supplémentaires
se fait actuellement par commande (voir `README.md`). Dites-moi si vous voulez un bouton
« Ajouter un utilisateur » directement dans le panneau, je peux l'ajouter.

---

## Besoin d'aide ?

Notez ce qui bloque (avec une capture d'écran si possible) et recontactez-moi.
Tout est modifiable.
