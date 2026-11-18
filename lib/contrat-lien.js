// Liens PRIVÉS vers la page de contrat des clients : https://locationybmtl.ca/contrat/<lien>
//
// Quand une réservation est confirmée, Claude crée le lien de CETTE location (outils-contrat/creer-lien.js) et le
// remet au proprio, qui l'envoie lui-même au client. La voiture, les dates, les heures, le tarif et le dépôt sont
// ÉCRITS DANS LE LIEN et signés : le client ne peut rien changer, et sans lien valide la page de contrat ne marche pas.
//
// Signature à clé PUBLIQUE (Ed25519) :
//  - la clé PRIVÉE (qui sert à CRÉER les liens) reste sur l'ordinateur du proprio : ~/.ybmtl/cle-contrat-privee.pem
//    (jamais dans GitHub, jamais sur Render) ;
//  - le site ne contient que la clé PUBLIQUE ci-dessous, qui ne sert qu'à VÉRIFIER : elle peut être publique sans danger ;
//  - aucun mot de passe, aucune variable secrète, rien n'est gardé sur le serveur (l'hébergement gratuit efface ses fichiers).
// Si la clé privée est perdue ou doit être changée : en créer une nouvelle, mettre sa clé publique ici, redéployer
// (tous les anciens liens cessent alors de marcher).
const crypto = require('crypto');
const { todayMontreal } = require('./format');

const CLE_PUBLIQUE = 'MCowBQYDK2VwAyEA1GKZgTic4Hj0peen71xuKQ2GlAJUDOdajWc717-NGDI'; // Ed25519, SPKI/DER, base64url
const publique = crypto.createPublicKey({ key: Buffer.from(CLE_PUBLIQUE, 'base64url'), format: 'der', type: 'spki' });

const JOURS_MIN = 14;           // un lien dure au moins 14 jours...
const JOURS_APRES_DEPART = 3;   // ...et jusqu'à 3 jours après le départ.
const CENTS_MAX = 9999900;      // 99 999 $
const LONGUEUR_SIGNATURE = 86;  // 64 octets en base64url

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

// ---------- Signature ----------
const aSigner = (corps) => Buffer.from('lien-v2|' + corps);

function signer(corps, clePriveePem) {
  return crypto.sign(null, aSigner(corps), crypto.createPrivateKey(clePriveePem)).toString('base64url');
}
function signatureValide(corps, sig) {
  // Écriture canonique exigée : une seule façon d'écrire chaque signature (sinon on pourrait fabriquer des
  // « variantes » d'un même lien et contourner la limite d'utilisation par lien).
  if (!new RegExp('^[A-Za-z0-9_-]{' + LONGUEUR_SIGNATURE + '}$').test(sig)) return false;
  const octets = Buffer.from(sig, 'base64url');
  if (octets.length !== 64 || octets.toString('base64url') !== sig) return false;
  try { return crypto.verify(null, aSigner(corps), publique, octets); } catch (e) { return false; }
}

// ---------- Validation d'une location (appelée avant de créer un lien) ----------
// entree = { vehiculeId, departDate, departHeure, retourDate, retourHeure, tarifCents, depotCents }
// Renvoie { erreur } ou { loc } (valeurs nettoyées).
function validerLocation(entree, aujourdhui) {
  const auj = aujourdhui || todayMontreal();
  const loc = {
    vehiculeId: parseInt(entree.vehiculeId, 10),
    departDate: entree.departDate, departHeure: entree.departHeure || '12:00',
    retourDate: entree.retourDate, retourHeure: entree.retourHeure || '12:00',
    tarifCents: entree.tarifCents, depotCents: entree.depotCents,
  };
  if (!(loc.vehiculeId > 0 && loc.vehiculeId < 100000)) return { erreur: 'Voiture invalide.' };
  if (!dateOk(loc.departDate) || !dateOk(loc.retourDate)) return { erreur: 'Dates invalides (format AAAA-MM-JJ).' };
  if (!heureOk(loc.departHeure) || !heureOk(loc.retourHeure)) return { erreur: 'Heures invalides (format HH:MM).' };
  if (loc.departDate < auj) return { erreur: 'La date de départ est déjà passée.' };
  if (loc.retourDate <= loc.departDate) return { erreur: 'Le retour doit être après le départ.' };
  if (jours(loc.departDate, loc.retourDate) > 365) return { erreur: 'Location de plus d’un an : faire le contrat à la main.' };
  const montantOk = (c) => Number.isInteger(c) && c >= 0 && c <= CENTS_MAX;
  if (!montantOk(loc.tarifCents) || loc.tarifCents <= 0) return { erreur: 'Tarif par semaine invalide.' };
  if (!montantOk(loc.depotCents)) return { erreur: 'Dépôt invalide (0 s’il n’y en a pas).' };
  return { loc };
}

// ---------- Création d'un lien (SEULEMENT avec la clé privée, sur l'ordinateur du proprio) ----------
// loc = résultat de validerLocation. Renvoie { token, expire }.
function creer(loc, aujourdhui, clePriveePem) {
  const auj = aujourdhui || todayMontreal();
  const apres = ajouterJours(loc.departDate, JOURS_APRES_DEPART);
  const mini = ajouterJours(auj, JOURS_MIN);
  const expire = apres > mini ? apres : mini;
  const corps = [
    loc.vehiculeId,
    courtDate(loc.departDate), loc.departHeure.replace(':', ''),
    courtDate(loc.retourDate), loc.retourHeure.replace(':', ''),
    loc.tarifCents, loc.depotCents,
    courtDate(expire),
  ].join('.');
  return { token: corps + '.' + signer(corps, clePriveePem), expire };
}

// ---------- Vérification d'un lien (sur le site) ----------
// Renvoie { ok: true, loc, expire } ou { ok: false, raison: 'invalide' | 'expire' }.
function verifier(token, aujourdhui) {
  const non = { ok: false, raison: 'invalide' };
  if (typeof token !== 'string' || token.length > 200) return non;
  const p = token.split('.');
  if (p.length !== 9) return non;
  const corps = p.slice(0, 8).join('.');
  if (!signatureValide(corps, p[8])) return non;

  const [v, d, dh, r, rh, tarif, depot, e] = p;
  if (!/^\d{1,5}$/.test(v) || !/^\d{6}$/.test(d) || !/^\d{4}$/.test(dh) || !/^\d{6}$/.test(r) ||
      !/^\d{4}$/.test(rh) || !/^\d{1,7}$/.test(tarif) || !/^\d{1,7}$/.test(depot) || !/^\d{6}$/.test(e)) return non;
  const loc = {
    vehiculeId: parseInt(v, 10),
    departDate: longDate(d), departHeure: dh.slice(0, 2) + ':' + dh.slice(2),
    retourDate: longDate(r), retourHeure: rh.slice(0, 2) + ':' + rh.slice(2),
    tarifCents: parseInt(tarif, 10), depotCents: parseInt(depot, 10),
  };
  const expire = longDate(e);
  if (!dateOk(loc.departDate) || !dateOk(loc.retourDate) || !dateOk(expire) ||
      !heureOk(loc.departHeure) || !heureOk(loc.retourHeure) || loc.retourDate <= loc.departDate) return non;
  if ((aujourdhui || todayMontreal()) > expire) return { ok: false, raison: 'expire', expire };
  return { ok: true, loc, expire };
}

// Clé courte pour limiter combien de contrats un même lien peut produire (calculée sur la partie signée du lien).
const cleLimite = (token) =>
  crypto.createHash('sha256').update(String(token).split('.').slice(0, 8).join('.')).digest('hex').slice(0, 16);

module.exports = { creer, verifier, validerLocation, cleLimite, JOURS_MIN, JOURS_APRES_DEPART };
