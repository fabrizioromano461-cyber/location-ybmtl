// Signature PRÉFAITE du représentant de Location YBMTL (le propriétaire), apposée automatiquement sur les contrats
// signés à distance par les clients (page /contrat/<lien>).
//
// L'image n'est JAMAIS dans GitHub (le dépôt est public : n'importe qui pourrait la copier). Elle vient, dans cet ordre :
//  1. de la variable secrète de l'hébergement SIGNATURE_REPRESENTANT_B64 (le PNG écrit en base64) ;
//  2. d'un « fichier secret » de l'hébergement (Render > Environment > Secret Files) nommé signature-representant.b64
//     (le PNG écrit en base64, dans un fichier texte), lu dans /etc/secrets/ ou à la racine de l'application ;
//  3. sur l'ordinateur du proprio, du fichier ~/.ybmtl/signature-representant.png (outils-contrat/preparer-signature.py).
// Sans signature configurée (ou si elle est illisible), les contrats gardent la mention « à apposer à la remise du véhicule » :
// rien ne casse.
const fs = require('fs');
const os = require('os');
const path = require('path');

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const TAILLE_MAX = 200 * 1024;
let cache; // undefined = pas encore lue

const deBase64 = (texte) => Buffer.from(String(texte).replace(/\s+/g, ''), 'base64');

// Un PNG valide (en-tête reconnu, taille raisonnable) ou null.
function valider(buf) {
  if (!buf || buf.length < 100 || buf.length > TAILLE_MAX || !buf.subarray(0, 8).equals(PNG)) return null;
  return buf;
}

function lire() {
  const fichiersTexte = [
    process.env.SIGNATURE_REPRESENTANT_FICHIER, // chemin choisi (pour les essais)
    '/etc/secrets/signature-representant.b64',
    path.join(process.cwd(), 'signature-representant.b64'),
  ].filter(Boolean);
  const sources = [
    () => (process.env.SIGNATURE_REPRESENTANT_B64 || '').trim() ? deBase64(process.env.SIGNATURE_REPRESENTANT_B64) : null,
    ...fichiersTexte.map((f) => () => deBase64(fs.readFileSync(f, 'utf8'))),
    () => fs.readFileSync(path.join(os.homedir(), '.ybmtl', 'signature-representant.png')),
  ];
  for (const source of sources) {
    try {
      const png = valider(source());
      if (png) return png;
    } catch (e) { /* cette source n'existe pas : on essaie la suivante */ }
  }
  return null;
}

// Renvoie le PNG (Buffer) ou null s'il n'y a pas de signature préfaite configurée. Lue une seule fois.
function signatureRepresentant() {
  if (cache === undefined) cache = lire();
  return cache;
}

module.exports = { signatureRepresentant };
