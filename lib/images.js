// Photos legeres. Pour chaque photo du catalogue il existe une version WebP de 480, 800 et 1200 px
// (vignettes et cartes, ecrans moyens, grande photo) dans public/uploads/w480, w800 et w1200.
// Si une version n'existe pas (photo ajoutee depuis l'admin, par exemple), on retombe sur l'original :
// le site ne casse jamais. Pour une nouvelle voiture : generer les 3 versions (voir workflow d'ajout).
const fs = require('fs');
const path = require('path');

const DOSSIER = path.join(__dirname, '..', 'public', 'uploads');
const LARGEURS = [480, 800, 1200];
const dispo = {};

for (const w of LARGEURS) {
  try {
    dispo[w] = new Set(fs.readdirSync(path.join(DOSSIER, 'w' + w)));
  } catch (e) {
    dispo[w] = new Set();
  }
}

const SUR = /^[A-Za-z0-9._-]+$/; // noms de fichiers « normaux » seulement

function variante(fichier, largeur) {
  if (!fichier || !SUR.test(fichier)) return null;
  const nom = fichier.replace(/\.[^.]+$/, '') + '.webp';
  return dispo[largeur] && dispo[largeur].has(nom) ? `/uploads/w${largeur}/${nom}` : null;
}

// Adresse de la photo a la largeur voulue (WebP si disponible, sinon l'original).
function photoUrl(fichier, largeur) {
  if (!fichier) return '/img/placeholder-car.svg';
  return variante(fichier, largeur) || '/uploads/' + fichier;
}

// Attribut srcset : le navigateur choisit la bonne taille selon l'ecran ; chaine vide si aucune version legere.
function photoSrcset(fichier) {
  return LARGEURS.map((w) => {
    const u = variante(fichier, w);
    return u && u + ' ' + w + 'w';
  }).filter(Boolean).join(', ');
}

module.exports = { photoUrl, photoSrcset };
