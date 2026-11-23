// Photos du permis de conduire (recto et verso) + selfie (photo du visage du locataire), envoyés avec le contrat.
// Elles ne sont JAMAIS gardées sur le serveur : on les vérifie, on les place dans la pièce jointe (dernière page) du PDF envoyé au proprio
// (lib/contrat-pdf.js), puis on les oublie. Le navigateur du client les a déjà réduites (JPEG, 1600 px au plus ; 1280 px pour le selfie).
// Seul le format JPEG est accepté : on ne « décode » jamais l'image sur le serveur (pas de risque de mémoire).
// Le selfie sert à comparer le visage avec la photo du permis, À L'ŒIL (aucune reconnaissance faciale automatique).
const MIN_OCTETS = 8 * 1024;      // en dessous : image vide ou minuscule
const MAX_OCTETS = 1200 * 1024;   // par photo du permis
const MAX_OCTETS_SELFIE = 900 * 1024;
const MAX_TOTAL = 3100 * 1024;    // les trois ensemble : le PDF du proprio reste sous la limite de 4 Mo d'une pièce jointe
const LONG_MIN = 700;             // pixels : en dessous, le texte du permis n'est pas lisible
const LONG_MIN_SELFIE = 600;      // le selfie peut venir d'une webcam 640 x 480
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

// Contrôles d'une photo. Renvoie { photo } ou { erreur }. `msg` : textes adaptés (permis ou selfie).
function controler(f, msg, maxOctets, longMin) {
  if (!f || !f.buffer || !f.buffer.length) return { erreur: msg.manque };
  const b = f.buffer;
  if (!estJpeg(b)) return { erreur: msg.invalide };
  if (b.length < MIN_OCTETS) return { erreur: msg.vide };
  if (b.length > maxOctets) return { erreur: msg.lourde };
  const dim = dimensionsJpeg(b);
  if (!dim) return { erreur: msg.illisible };
  const long = Math.max(dim.largeur, dim.hauteur);
  const court = Math.min(dim.largeur, dim.hauteur);
  if (long < longMin || court < COURT_MIN) return { erreur: msg.petite };
  if (long > LONG_MAX) return { erreur: msg.grande };
  return { photo: { buffer: b, largeur: dim.largeur, hauteur: dim.hauteur } };
}
const messagesPermis = (nom) => ({
  manque: `Ajoutez la photo ${nom} de votre permis.`,
  invalide: `La photo ${nom} n'est pas une image valide. Reprenez-la.`,
  vide: `La photo ${nom} est vide ou trop petite. Reprenez-la.`,
  lourde: `La photo ${nom} est trop lourde. Reprenez-la.`,
  illisible: `La photo ${nom} est illisible. Reprenez-la.`,
  petite: `La photo ${nom} est trop petite pour qu'on puisse lire le permis. Rapprochez-vous du permis et reprenez-la.`,
  grande: `La photo ${nom} est trop grande. Reprenez-la.`,
});
const MESSAGES_SELFIE = {
  manque: 'Ajoutez votre selfie (une photo de votre visage).',
  invalide: "Le selfie n'est pas une image valide. Reprenez-le.",
  vide: 'Le selfie est vide ou trop petit. Reprenez-le.',
  lourde: 'Le selfie est trop lourd. Reprenez-le.',
  illisible: 'Le selfie est illisible. Reprenez-le.',
  petite: 'Le selfie est trop petit. Reprenez-le.',
  grande: 'Le selfie est trop grand. Reprenez-le.',
};

// recto, verso, selfie : fichiers reçus du formulaire ({ buffer }) ou undefined/null.
// `selfie` === undefined : ancien appel sans selfie (2 photos seulement). Sinon le selfie est obligatoire.
// Renvoie { photos: { recto: {buffer, largeur, hauteur}, verso: {...}, selfie?: {...} } } ou { erreur: 'message pour le client' }.
async function verifier(recto, verso, selfie) {
  const recus = { recto, verso };
  const photos = {};
  let total = 0;
  for (const cote of ['recto', 'verso']) {
    const r = controler(recus[cote], messagesPermis(COTES[cote]), MAX_OCTETS, LONG_MIN);
    if (r.erreur) return r;
    photos[cote] = r.photo;
    total += r.photo.buffer.length;
  }
  if (photos.recto.buffer.equals(photos.verso.buffer)) {
    return { erreur: 'Le recto et le verso sont la même photo. Photographiez les deux côtés du permis.' };
  }
  if (selfie !== undefined) {
    const r = controler(selfie, MESSAGES_SELFIE, MAX_OCTETS_SELFIE, LONG_MIN_SELFIE);
    if (r.erreur) return r;
    if (r.photo.buffer.equals(photos.recto.buffer) || r.photo.buffer.equals(photos.verso.buffer)) {
      return { erreur: "Le selfie est la même photo que le permis. Prenez une photo de votre visage." };
    }
    photos.selfie = r.photo;
    total += r.photo.buffer.length;
  }
  if (total > MAX_TOTAL) return { erreur: 'Les photos sont trop lourdes. Reprenez-les.' };
  // Dernier contrôle : chaque photo doit pouvoir être placée dans un PDF (sinon la pièce jointe échouerait après coup).
  const { PDFDocument } = require('pdf-lib');
  const essai = await PDFDocument.create();
  for (const cote of Object.keys(photos)) {
    try {
      await essai.embedJpg(photos[cote].buffer);
    } catch (e) {
      return { erreur: cote === 'selfie' ? MESSAGES_SELFIE.illisible : `La photo ${COTES[cote]} est illisible. Reprenez-la.` };
    }
  }
  return { photos };
}

module.exports = { verifier, dimensionsJpeg, estJpeg, MAX_OCTETS, MAX_OCTETS_SELFIE, MAX_TOTAL, LONG_MIN, COURT_MIN };
