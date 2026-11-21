// Liens PRIVÉS vers la page de contrat des clients : https://locationybmtl.ca/contrat/<lien>
//
// Quand une réservation est confirmée, le proprio crée le lien de CETTE location et l'envoie lui-même au client :
//  - soit dans son panneau admin (Lien client) : le site signe alors le lien avec une clé secrète qu'il garde (HMAC) ;
//  - soit en demandant à Claude (outils-contrat/creer-lien.js) : le lien est alors signé avec la clé PRIVÉE du proprio
//    (Ed25519), gardée sur son ordinateur : ~/.ybmtl/cle-contrat-privee.pem (jamais dans GitHub, jamais sur Render).
// Dans les deux cas, la voiture, les dates, les heures, le tarif et le dépôt sont ÉCRITS DANS LE LIEN et signés :
// le client ne peut rien changer, et sans lien valide la page de contrat ne marche pas du tout.
//
// Aucun mot de passe n'est dans ce fichier. La clé PUBLIQUE ci-dessous ne sert qu'à VÉRIFIER les liens Ed25519 : elle peut
// être publique sans danger. Rien n'est gardé sur le serveur (l'hébergement gratuit efface ses fichiers à chaque mise à jour).
// Les deux sortes de liens se reconnaissent à la longueur de leur signature (86 caractères = Ed25519, 22 = HMAC).
// Si la clé privée est perdue ou doit être changée : en créer une nouvelle, mettre sa clé publique ici, redéployer
// (tous les liens Ed25519 cessent alors de marcher). Si la clé Brevo change, les liens faits depuis l'admin cessent de marcher.
//
// Forme du lien : voiture.départ.heure.retour.heure.prix.dépôt.expiration[.extra].signature
//  - sans « extra » (9 morceaux) : prix PAR SEMAINE, sans note (la forme d'origine : les anciens liens restent valides) ;
//  - avec « extra » (10 morceaux) : une lettre pour le type de prix (s = par semaine, j = par jour, f = prix spécial pour toute
//    la location), suivie de la note du proprio en base64url (facultative). Le tout est signé, comme le reste.
// Le prix est toujours AVANT taxes ; la TPS et la TVQ s'ajoutent (voir calculerLocation dans lib/contrat-pdf.js).
const crypto = require('crypto');
const config = require('../config');
const { todayMontreal } = require('./format');

const CLE_PUBLIQUE = 'MCowBQYDK2VwAyEA1GKZgTic4Hj0peen71xuKQ2GlAJUDOdajWc717-NGDI'; // Ed25519, SPKI/DER, base64url
const publique = crypto.createPublicKey({ key: Buffer.from(CLE_PUBLIQUE, 'base64url'), format: 'der', type: 'spki' });

const JOURS_MIN = 14;           // un lien dure au moins 14 jours...
const JOURS_APRES_DEPART = 3;   // ...et jusqu'à 3 jours après le départ.
const CENTS_MAX = 9999900;      // 99 999 $
const LONGUEUR_ED25519 = 86;    // 64 octets en base64url
const LONGUEUR_HMAC = 22;       // 16 octets en base64url
const SECRET_PAR_DEFAUT = 'changez-ce-secret-en-production';
const NOTE_MAX = 200;           // caractères de la note écrite sur le contrat
const TOKEN_MAX = 1000;         // longueur maximale d'un lien (une note de 200 caractères tient largement)
const MODES = ['semaine', 'jour', 'forfait'];
const LETTRE = { semaine: 's', jour: 'j', forfait: 'f' };
const MODE_DE_LETTRE = { s: 'semaine', j: 'jour', f: 'forfait' };

// Note du proprio (écrite sur le contrat) : une seule ligne, au plus NOTE_MAX caractères, et seulement des caractères que
// la police du PDF sait écrire (lettres accentuées comprises). Les émojis et symboles exotiques sont retirés, pour que le
// client voie à l'écran exactement ce qui sera imprimé.
const WINANSI_EN_PLUS = '€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ';
const imprimable = (ch) => {
  const c = ch.codePointAt(0);
  return (c >= 0x20 && c <= 0x7e) || (c >= 0xa1 && c <= 0xff && c !== 0xad) || WINANSI_EN_PLUS.includes(ch);
};
function nettoyerNote(v) {
  const s = String(v == null ? '' : v).normalize('NFC').replace(/[\s    ]+/g, ' ');
  let out = '';
  for (const ch of s) {
    if (imprimable(ch)) { out += ch; continue; }
    const base = ch.normalize('NFD').replace(/[̀-ͯ]/g, ''); // lettre accentuée rare : on garde la lettre
    if (base && [...base].every(imprimable)) out += base;
  }
  return [...out.replace(/\s{2,}/g, ' ').trim()].slice(0, NOTE_MAX).join('').trim();
}

// ---------- Petits outils de dates ----------
const dateOk = (iso) => typeof iso === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(iso) &&
  !isNaN(Date.parse(iso + 'T00:00:00Z')) && new Date(iso + 'T00:00:00Z').toISOString().slice(0, 10) === iso;
const heureOk = (h) => typeof h === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(h);
const ajouterJours = (iso, n) => {
  const t = new Date(iso + 'T00:00:00Z');
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
};
const jours = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);
const courtDate = (iso) => iso.slice(2, 4) + iso.slice(5, 7) + iso.slice(8, 10); // 2026-11-23 -> 261123
const longDate = (s) => '20' + s.slice(0, 2) + '-' + s.slice(2, 4) + '-' + s.slice(4, 6);

// ---------- Signature Ed25519 (liens créés avec la clé privée du proprio) ----------
const aSignerEd = (corps) => Buffer.from('lien-v2|' + corps);

function signerEd25519(corps, clePriveePem) {
  return crypto.sign(null, aSignerEd(corps), crypto.createPrivateKey(clePriveePem)).toString('base64url');
}
function ed25519Valide(corps, sig) {
  // Écriture canonique exigée : une seule façon d'écrire chaque signature (sinon on pourrait fabriquer des
  // « variantes » d'un même lien et contourner la limite d'utilisation par lien).
  if (!new RegExp('^[A-Za-z0-9_-]{' + LONGUEUR_ED25519 + '}$').test(sig)) return false;
  const octets = Buffer.from(sig, 'base64url');
  if (octets.length !== 64 || octets.toString('base64url') !== sig) return false;
  try { return crypto.verify(null, aSignerEd(corps), publique, octets); } catch (e) { return false; }
}

// ---------- Signature HMAC (liens créés par le site, depuis le panneau admin) ----------
// Clé = empreinte d'une clé secrète déjà présente sur le serveur (clé Brevo, jamais dans GitHub) et de SESSION_SECRET
// si elle est vraiment définie. Sans aucune clé secrète : fonction désactivée (jamais de clé « par défaut »).
function cleHmac() {
  const secretMail = config.mail.brevoApiKey || config.mail.pass || '';
  const secretSession = config.sessionSecret && config.sessionSecret !== SECRET_PAR_DEFAUT ? config.sessionSecret : '';
  if (!secretMail && !secretSession) return null;
  return crypto.createHash('sha256').update('ybmtl-contrat-lien-v1|' + secretMail + '|' + secretSession).digest();
}
const hmacDisponible = () => !!cleHmac();

function signerHmac(corps) {
  return crypto.createHmac('sha256', cleHmac()).update('lien|' + corps).digest().subarray(0, 16).toString('base64url');
}
function hmacValide(corps, sig) {
  if (!cleHmac() || !new RegExp('^[A-Za-z0-9_-]{' + LONGUEUR_HMAC + '}$').test(sig)) return false;
  // On compare avec la chaîne exacte attendue : une seule écriture possible de la signature (pas de variantes).
  const recu = Buffer.from(sig);
  const attendu = Buffer.from(signerHmac(corps));
  return recu.length === attendu.length && crypto.timingSafeEqual(recu, attendu);
}

// ---------- Validation d'une location (appelée avant de créer un lien) ----------
// entree = { vehiculeId, departDate, departHeure, retourDate, retourHeure, tarifCents, depotCents, mode, note }
//   mode : 'semaine' (défaut : tarifCents = prix par semaine), 'jour' (prix par jour) ou 'forfait' (prix spécial pour toute
//          la location) ; note : texte libre écrit sur le contrat (facultatif).
// Renvoie { erreur } ou { loc } (valeurs nettoyées).
function validerLocation(entree, aujourdhui) {
  const auj = aujourdhui || todayMontreal();
  const loc = {
    vehiculeId: parseInt(entree.vehiculeId, 10),
    departDate: entree.departDate, departHeure: entree.departHeure || '12:00',
    retourDate: entree.retourDate, retourHeure: entree.retourHeure || '12:00',
    tarifCents: entree.tarifCents, depotCents: entree.depotCents,
    mode: MODES.includes(entree.mode) ? entree.mode : 'semaine',
    note: nettoyerNote(entree.note),
  };
  if (!(loc.vehiculeId > 0 && loc.vehiculeId < 100000)) return { erreur: 'Voiture invalide.' };
  if (!dateOk(loc.departDate) || !dateOk(loc.retourDate)) return { erreur: 'Dates invalides (format AAAA-MM-JJ).' };
  if (!heureOk(loc.departHeure) || !heureOk(loc.retourHeure)) return { erreur: 'Heures invalides (format HH:MM).' };
  if (loc.departDate < auj) return { erreur: 'La date de départ est déjà passée.' };
  if (loc.retourDate <= loc.departDate) return { erreur: 'Le retour doit être après le départ.' };
  if (jours(loc.departDate, loc.retourDate) > 365) return { erreur: 'Location de plus d’un an : faire le contrat à la main.' };
  const montantOk = (c) => Number.isInteger(c) && c >= 0 && c <= CENTS_MAX;
  if (!montantOk(loc.tarifCents) || loc.tarifCents <= 0) {
    return { erreur: { jour: 'Prix par jour invalide.', forfait: 'Prix spécial invalide.' }[loc.mode] || 'Tarif par semaine invalide.' };
  }
  if (!montantOk(loc.depotCents)) return { erreur: 'Dépôt invalide (0 s’il n’y en a pas).' };
  return { loc };
}

// ---------- Création d'un lien ----------
// loc = résultat de validerLocation. La partie signée (« corps ») est la même pour les deux sortes de liens.
function corpsDuLien(loc, aujourdhui) {
  const auj = aujourdhui || todayMontreal();
  const apres = ajouterJours(loc.departDate, JOURS_APRES_DEPART);
  const mini = ajouterJours(auj, JOURS_MIN);
  const expire = apres > mini ? apres : mini;
  const champs = [
    loc.vehiculeId,
    courtDate(loc.departDate), loc.departHeure.replace(':', ''),
    courtDate(loc.retourDate), loc.retourHeure.replace(':', ''),
    loc.tarifCents, loc.depotCents,
    courtDate(expire),
  ];
  // Prix par jour, prix spécial ou note : un morceau de plus (sinon, la forme d'origine, plus courte).
  const mode = MODES.includes(loc.mode) ? loc.mode : 'semaine';
  const note = nettoyerNote(loc.note);
  if (mode !== 'semaine' || note) champs.push(LETTRE[mode] + Buffer.from(note, 'utf8').toString('base64url'));
  return { corps: champs.join('.'), expire };
}

// Lien signé avec la clé PRIVÉE du proprio (outils-contrat/creer-lien.js, sur son ordinateur). Renvoie { token, expire }.
function creer(loc, aujourdhui, clePriveePem) {
  const { corps, expire } = corpsDuLien(loc, aujourdhui);
  return { token: corps + '.' + signerEd25519(corps, clePriveePem), expire };
}

// Lien signé par le site (panneau admin). Renvoie { token, expire } ou null si la clé secrète du serveur est absente.
function creerHmac(loc, aujourdhui) {
  if (!cleHmac()) return null;
  const { corps, expire } = corpsDuLien(loc, aujourdhui);
  return { token: corps + '.' + signerHmac(corps), expire };
}

// ---------- Vérification d'un lien (sur le site) ----------
// Renvoie { ok: true, loc, expire } ou { ok: false, raison: 'invalide' | 'expire' }.
// loc.mode = 'semaine' | 'jour' | 'forfait' ; loc.note = la note du proprio ('' s'il n'y en a pas).
function verifier(token, aujourdhui) {
  const non = { ok: false, raison: 'invalide' };
  if (typeof token !== 'string' || token.length > TOKEN_MAX) return non;
  const p = token.split('.');
  if (p.length !== 9 && p.length !== 10) return non;
  const corps = p.slice(0, -1).join('.');
  const sig = p[p.length - 1];
  const signatureOk = sig.length === LONGUEUR_ED25519 ? ed25519Valide(corps, sig)
    : sig.length === LONGUEUR_HMAC ? hmacValide(corps, sig) : false;
  if (!signatureOk) return non;

  const [v, d, dh, r, rh, tarif, depot, e] = p;
  if (!/^\d{1,5}$/.test(v) || !/^\d{6}$/.test(d) || !/^\d{4}$/.test(dh) || !/^\d{6}$/.test(r) ||
      !/^\d{4}$/.test(rh) || !/^\d{1,7}$/.test(tarif) || !/^\d{1,7}$/.test(depot) || !/^\d{6}$/.test(e)) return non;
  const loc = {
    vehiculeId: parseInt(v, 10),
    departDate: longDate(d), departHeure: dh.slice(0, 2) + ':' + dh.slice(2),
    retourDate: longDate(r), retourHeure: rh.slice(0, 2) + ':' + rh.slice(2),
    tarifCents: parseInt(tarif, 10), depotCents: parseInt(depot, 10),
    mode: 'semaine', note: '',
  };
  if (p.length === 10) {
    // Type de prix + note. Une seule écriture possible (pas de « variantes » d'un même lien).
    const m = /^([sjf])([A-Za-z0-9_-]*)$/.exec(p[8]);
    if (!m) return non;
    loc.mode = MODE_DE_LETTRE[m[1]];
    if (m[2]) {
      const octets = Buffer.from(m[2], 'base64url');
      if (octets.toString('base64url') !== m[2]) return non;
      loc.note = nettoyerNote(octets.toString('utf8'));
    }
    if (loc.mode === 'semaine' && !loc.note) return non; // ce cas s'écrit toujours sous la forme courte
  }
  const expire = longDate(e);
  if (!dateOk(loc.departDate) || !dateOk(loc.retourDate) || !dateOk(expire) ||
      !heureOk(loc.departHeure) || !heureOk(loc.retourHeure) || loc.retourDate <= loc.departDate) return non;
  if ((aujourdhui || todayMontreal()) > expire) return { ok: false, raison: 'expire', expire };
  return { ok: true, loc, expire };
}

// Clé courte pour limiter combien de contrats un même lien peut produire (calculée sur la partie signée du lien,
// c'est-à-dire tout sauf la signature : pour les liens d'origine, ce sont les mêmes 8 morceaux qu'avant).
const cleLimite = (token) =>
  crypto.createHash('sha256').update(String(token).split('.').slice(0, -1).join('.')).digest('hex').slice(0, 16);

module.exports = {
  creer, creerHmac, hmacDisponible, verifier, validerLocation, cleLimite, nettoyerNote,
  JOURS_MIN, JOURS_APRES_DEPART, NOTE_MAX, TOKEN_MAX, MODES,
};
