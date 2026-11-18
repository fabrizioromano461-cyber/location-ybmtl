// Signature PRÉFAITE du représentant de Location YBMTL (le propriétaire), apposée automatiquement sur les contrats
// signés à distance par les clients (page /contrat/<lien>).
//
// L'image n'est JAMAIS dans GitHub (le dépôt est public : n'importe qui pourrait la copier). Elle vient :
//  - de la variable secrète de l'hébergement SIGNATURE_REPRESENTANT_B64 (le PNG écrit en base64), ou
//  - sur l'ordinateur du proprio, du fichier ~/.ybmtl/signature-representant.png (outils-contrat/preparer-signature.py).
// Sans signature configurée (ou si elle est illisible), les contrats gardent la mention « à apposer à la remise du véhicule » :
// rien ne casse.
const fs = require('fs');
const os = require('os');
const path = require('path');

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const TAILLE_MAX = 200 * 1024;
let cache; // undefined = pas encore lue

function lire() {
  let buf = null;
  const b64 = process.env.SIGNATURE_REPRESENTANT_B64;
  if (b64 && b64.trim()) {
    buf = Buffer.from(b64.replace(/\s+/g, ''), 'base64');
  } else {
    try { buf = fs.readFileSync(path.join(os.homedir(), '.ybmtl', 'signature-representant.png')); } catch (e) { buf = null; }
  }
  if (!buf || buf.length < 100 || buf.length > TAILLE_MAX || !buf.subarray(0, 8).equals(PNG)) return null;
  return buf;
}

// Renvoie le PNG (Buffer) ou null s'il n'y a pas de signature préfaite configurée. Lue une seule fois.
function signatureRepresentant() {
  if (cache === undefined) cache = lire();
  return cache;
}

module.exports = { signatureRepresentant };
