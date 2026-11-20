// Photos du permis de conduire (recto et verso) envoyées par le client avec son contrat à distance.
// Elles ne sont JAMAIS gardées sur le serveur : on les vérifie, on les place dans l'annexe du PDF envoyé au proprio
// (lib/contrat-pdf.js), puis on les oublie. Le navigateur du client les a déjà réduites (1600 px au plus, JPEG).
// Seul le format JPEG est accepté : on ne « décode » jamais l'image sur le serveur (pas de risque de mémoire).
const MIN_OCTETS = 8 * 1024;      // en dessous : image vide ou minuscule
const MAX_OCTETS = 1200 * 1024;   // par photo
const MAX_TOTAL = 2200 * 1024;    // les deux ensemble : le PDF du proprio reste bien sous la limite de 4 Mo d'une pièce jointe
const LONG_MIN = 700;             // pixels : en dessous, le texte du permis n'est pas lisible
const COURT_MIN = 400;
const LONG_MAX = 6000;            // au-dessus : image « piégée » (énorme une fois ouverte)

const COTES = { recto: 'du recto (devant)', verso: 'du verso (derrière)' };

const estJpeg = (b) => Buffer.isBuffer(b) && b.length > 4 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;

// Largeur et hauteur d'un JPEG, lues dans son en-tête (marqueurs SOF). Null si illisible.
function dimensionsJpeg(b) {
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) { i++; continue; }
    let m = b[i + 1];
    while (m === 0xff && i + 2 < b.length) { i++; m = b[i + 1]; } // octets de remplissage
    if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { i += 2; continue; } // marqueurs sans longueur
    if (m === 0xd9 || m === 0xda) break; // fin de l'image / début des données : plus d'en-tête à lire
    const longueur = b.readUInt16BE(i + 2);
    if (longueur < 2) return null;
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
      const hauteur = b.readUInt16BE(i + 5);
      const largeur = b.readUInt16BE(i + 7);
      return hauteur > 0 && largeur > 0 ? { largeur, hauteur } : null;
    }
    i += 2 + longueur;
  }
  return null;
}

// recto, verso : fichiers reçus du formulaire ({ buffer }) ou undefined.
// Renvoie { photos: { recto: {buffer, largeur, hauteur}, verso: {...} } } ou { erreur: 'message pour le client' }.
async function verifier(recto, verso) {
  const recus = { recto, verso };
  const photos = {};
  let total = 0;
  for (const cote of ['recto', 'verso']) {
    const f = recus[cote];
    const nom = COTES[cote];
    if (!f || !f.buffer || !f.buffer.length) return { erreur: `Ajoutez la photo ${nom} de votre permis.` };
    const b = f.buffer;
    if (!estJpeg(b)) return { erreur: `La photo ${nom} n'est pas une image valide. Reprenez-la.` };
    if (b.length < MIN_OCTETS) return { erreur: `La photo ${nom} est vide ou trop petite. Reprenez-la.` };
    if (b.length > MAX_OCTETS) return { erreur: `La photo ${nom} est trop lourde. Reprenez-la.` };
    const dim = dimensionsJpeg(b);
    if (!dim) return { erreur: `La photo ${nom} est illisible. Reprenez-la.` };
    const long = Math.max(dim.largeur, dim.hauteur);
    const court = Math.min(dim.largeur, dim.hauteur);
    if (long < LONG_MIN || court < COURT_MIN) {
      return { erreur: `La photo ${nom} est trop petite pour qu'on puisse lire le permis. Rapprochez-vous du permis et reprenez-la.` };
    }
    if (long > LONG_MAX) return { erreur: `La photo ${nom} est trop grande. Reprenez-la.` };
    total += b.length;
    photos[cote] = { buffer: b, largeur: dim.largeur, hauteur: dim.hauteur };
  }
  if (total > MAX_TOTAL) return { erreur: 'Les photos sont trop lourdes. Reprenez-les.' };
  if (photos.recto.buffer.equals(photos.verso.buffer)) {
    return { erreur: 'Le recto et le verso sont la même photo. Photographiez les deux côtés du permis.' };
  }
  // Dernier contrôle : chaque photo doit pouvoir être placée dans un PDF (sinon l'annexe échouerait après coup).
  const { PDFDocument } = require('pdf-lib');
  const essai = await PDFDocument.create();
  for (const cote of ['recto', 'verso']) {
    try {
      await essai.embedJpg(photos[cote].buffer);
    } catch (e) {
      return { erreur: `La photo ${COTES[cote]} est illisible. Reprenez-la.` };
    }
  }
  return { photos };
}

module.exports = { verifier, dimensionsJpeg, estJpeg, MAX_OCTETS, MAX_TOTAL, LONG_MIN, COURT_MIN };
