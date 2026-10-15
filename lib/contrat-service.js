// Partie commune de la page « Nouveau contrat » :
// - /admin/contrat : proprio connecté à l'admin ;
// - /contrat       : accès par code envoyé au courriel du proprio (voir lib/contrat-acces.js).
// Le proprio entre les infos sur son cellulaire, le client signe au doigt, le PDF est créé puis envoyé
// par courriel (copie proprio + copie client). Rien n'est gardé sur le serveur.
const multer = require('multer');
const db = require('../db');
const { genererContrat, gabaritOk } = require('./contrat-pdf');
const { envoyerContrat } = require('./contrat-mail');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 600 * 1024, files: 2, fields: 40, fieldSize: 4 * 1024 },
}).fields([
  { name: 'sigLocataire', maxCount: 1 },
  { name: 'sigRepresentant', maxCount: 1 },
]);

// Refuse les envois venant d'un autre site (le formulaire peut envoyer des courriels).
function memeOrigine(req, res, next) {
  const origine = req.get('origin');
  if (origine) {
    let ok = false;
    try { ok = new URL(origine).host === req.get('host'); } catch (e) { ok = false; }
    if (!ok) return res.status(403).json({ erreur: 'Origine refusée.' });
  }
  next();
}

// ---------- Données de la page du formulaire ----------
// options.prefill = false : pas de préremplissage depuis les demandes de réservation (page /contrat :
// elle ne doit pas laisser lire les coordonnées des clients).
function donneesFormulaire(req, options) {
  const prefill = !options || options.prefill !== false;
  const vehicles = db
    .prepare(
      `SELECT id, make, model, year, weekly_rate, security_deposit, is_published
       FROM vehicles WHERE coming_soon = 0 ORDER BY make, model`
    )
    .all();

  // Préremplissage depuis une demande de réservation (bouton « Créer le contrat » dans Demandes).
  let pre = {};
  const demandeId = prefill ? parseInt(req.query.demande, 10) : 0;
  if (demandeId) {
    const r = db.prepare('SELECT * FROM requests WHERE id = ?').get(demandeId);
    if (r) {
      pre = {
        nom: r.name,
        telephone: r.phone,
        courriel: r.email,
        vehiculeId: r.vehicle_id,
        departDate: r.start_date || '',
        retourDate: r.end_date || '',
      };
    }
  }
  return { vehicles, pre, gabaritOk: gabaritOk(), texte: require('./contrat-texte') };
}

// ---------- Validation des champs du formulaire ----------
const TEXTE_MAX = 200;
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// Si un champ arrive en double, on garde le dernier.
const un = (v) => (Array.isArray(v) ? v[v.length - 1] : v);
const txt = (v, max) => String(un(v) == null ? '' : un(v)).replace(/\s+/g, ' ').trim().slice(0, max || TEXTE_MAX);
const dateOk = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v + 'T00:00:00Z'));
const heureOk = (v) => /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
const cents = (v) => {
  const n = parseFloat(String(un(v) == null ? '' : un(v)).replace(',', '.').replace(/[^\d.]/g, ''));
  return isNaN(n) || n < 0 || n > 99999 ? null : Math.round(n * 100);
};

function valider(body, files) {
  const d = {
    nom: txt(body.nom),
    adresse: txt(body.adresse),
    telephone: txt(body.telephone, 40),
    courriel: txt(body.courriel, 120),
    naissance: txt(body.naissance, 10),
    permis: txt(body.permis, 40),
    vehicule: txt(body.vehicule),
    annee: txt(body.annee, 10),
    plaque: txt(body.plaque, 20),
    km: txt(body.km, 12),
    etat: txt(body.etat),
    departDate: txt(body.departDate, 10),
    departHeure: txt(body.departHeure, 5),
    retourDate: txt(body.retourDate, 10),
    retourHeure: txt(body.retourHeure, 5),
    lieu: txt(body.lieu, 60) || 'Montréal',
    recap: un(body.recap) === '1',
    tarifCents: cents(body.tarifHebdo),
    depotCents: cents(body.depot),
  };

  const manque = [];
  if (!d.nom) manque.push('le nom');
  if (!d.adresse) manque.push("l'adresse");
  if (!d.telephone) manque.push('le téléphone');
  if (!d.permis) manque.push('le numéro de permis');
  if (!d.vehicule) manque.push('le véhicule');
  if (!d.annee) manque.push("l'année");
  if (!d.plaque) manque.push('la plaque');
  if (manque.length) return { erreur: 'Il manque : ' + manque.join(', ') + '.' };

  if (!dateOk(d.naissance)) return { erreur: 'La date de naissance est invalide.' };
  if (d.courriel && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.courriel)) {
    return { erreur: "Le courriel du client n'est pas valide." };
  }
  if (!dateOk(d.departDate) || !dateOk(d.retourDate) || !heureOk(d.departHeure) || !heureOk(d.retourHeure)) {
    return { erreur: 'Les dates ou les heures sont invalides.' };
  }
  if (Date.parse(d.retourDate) <= Date.parse(d.departDate)) {
    return { erreur: 'Le retour doit être après le départ.' };
  }
  if (d.tarifCents == null || d.depotCents == null) {
    return { erreur: 'Le tarif et le dépôt doivent être des montants valides.' };
  }
  if (un(body.accepte) !== '1') return { erreur: 'Le locataire doit accepter le contrat.' };

  const sigL = files && files.sigLocataire && files.sigLocataire[0];
  const sigR = files && files.sigRepresentant && files.sigRepresentant[0];
  if (!sigL) return { erreur: 'La signature du locataire est manquante.' };
  if (!sigR) return { erreur: 'La signature du représentant est manquante.' };
  if (!sigL.buffer.subarray(0, 8).equals(PNG) || !sigR.buffer.subarray(0, 8).equals(PNG)) {
    return { erreur: 'Signature invalide. Refaites-la.' };
  }
  d.sigLocataire = sigL.buffer;
  d.sigRepresentant = sigR.buffer;
  // Façon de signer : « dessin » (au doigt) ou « clavier » (nom tapé) ; le PDF le mentionne.
  d.sigModeLocataire = un(body.sigModeLocataire) === 'clavier' ? 'clavier' : 'dessin';
  d.sigModeRepresentant = un(body.sigModeRepresentant) === 'clavier' ? 'clavier' : 'dessin';
  return { d, copieClient: un(body.envoyerClient) === '1' };
}

// ---------- Création du contrat (POST /generer) ----------
function genererHandler(req, res) {
  upload(req, res, async (err) => {
    if (err) {
      console.error('[contrat] Envoi refuse :', err.code || err.message, err.field || '');
      return res.status(400).json({ erreur: 'Signature invalide ou trop lourde. Refaites-la.' });
    }
    try {
      const v = valider(req.body || {}, req.files);
      if (v.erreur) return res.status(400).json({ erreur: v.erreur });

      const out = await genererContrat(v.d);
      const mail = await envoyerContrat({
        d: v.d,
        ref: out.ref,
        calc: out.calc,
        nomFichier: out.nomFichier,
        pdf: out.bytes,
        copieClient: v.copieClient,
      });

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${out.nomFichier}"`,
        'Cache-Control': 'no-store',
        'X-Reference': out.ref,
        'X-Nom-Fichier': out.nomFichier,
        'X-Courriel-YB': mail.yb,
        'X-Courriel-Client': mail.client,
      });
      res.send(out.bytes);
    } catch (e) {
      console.error('[contrat] Echec de la création du PDF:', e.message);
      res.status(500).json({ erreur: 'Impossible de créer le PDF. Réessayez dans un instant.' });
    }
  });
}

module.exports = { memeOrigine, donneesFormulaire, genererHandler, valider };
