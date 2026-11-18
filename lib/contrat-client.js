// Contrat rempli PAR LE CLIENT, à distance, depuis un LIEN PRIVÉ que le proprio crée pour chaque location
// confirmée (panneau admin > « Lien client », voir lib/contrat-lien.js). La voiture, les dates, le tarif et le
// dépôt sont écrits dans le lien (signé : impossible à modifier) ; le client entre ses informations, lit TOUTES
// les conditions, coche « J'ai lu et j'accepte » et signe à l'écran. Sans lien valide, rien ne marche.
// Le PDF est créé en mémoire, puis envoyé par courriel au proprio (toujours) et au client (s'il a donné son
// courriel). Rien n'est gardé sur le serveur (l'hébergement gratuit efface ses fichiers) : le courriel est le classeur.
const multer = require('multer');
const db = require('../db');
const config = require('../config');
const { genererContrat, gabaritOk, calculerLocation, fmtDateHeure, argent, nombre } = require('./contrat-pdf');
const { envoyerContrat } = require('./contrat-mail');
const { todayMontreal } = require('./format');
const limites = require('./contrat-limites');
const lienPrive = require('./contrat-lien');
const { courrielValide, domaineCourrielExiste } = require('./courriel');
const { signatureRepresentant } = require('./signature-representant');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 400 * 1024, files: 1, fields: 30, fieldSize: 2 * 1024 },
}).single('sigLocataire');

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// Si un champ arrive en double, on garde le dernier.
const un = (v) => (Array.isArray(v) ? v[v.length - 1] : v);
const txt = (v, max) => String(un(v) == null ? '' : un(v)).replace(/\s+/g, ' ').trim().slice(0, max || 200);
const dateOk = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v + 'T00:00:00Z'));

function ageAu(naissance, jourIso) {
  const n = new Date(naissance + 'T00:00:00Z');
  const t = new Date(jourIso + 'T00:00:00Z');
  let age = t.getUTCFullYear() - n.getUTCFullYear();
  const m = t.getUTCMonth() - n.getUTCMonth();
  if (m < 0 || (m === 0 && t.getUTCDate() < n.getUTCDate())) age--;
  return age;
}

// La voiture du lien (jamais « bientôt disponible »).
const voiture = (id) => db.prepare('SELECT id, make, model, year FROM vehicles WHERE id = ? AND coming_soon = 0').get(id);

const message = {
  invalide: 'Ce lien n’est pas valide. Utilisez exactement le lien que Location YBMTL vous a envoyé.',
  expire: 'Ce lien a expiré. Appelez-nous pour en recevoir un nouveau.',
  voiture: 'Cette voiture n’est plus disponible à la location. Appelez-nous.',
};

// ---------- Page du client : GET /contrat/<lien> ----------
function invalide(res, raison, statut) {
  res.status(statut || 404).render('contrat/lien-invalide', {
    texte: message[raison] || message.invalide,
    tel: config.company.phone,
  });
}

function page(req, res) {
  const lien = txt(req.params.lien, 200);
  const r = lienPrive.verifier(lien, todayMontreal());
  if (!r.ok) return invalide(res, r.raison, r.raison === 'expire' ? 410 : 404);
  const v = voiture(r.loc.vehiculeId);
  if (!v) return invalide(res, 'voiture', 404);
  const calc = calculerLocation(r.loc.departDate, r.loc.retourDate, r.loc.tarifCents);
  res.render('contrat/client', {
    lien,
    tel: config.company.phone,
    tax: config.tax,
    texte: require('./contrat-texte'),
    depotTexte: nombre(r.loc.depotCents),
    // Lignes de la location (écrites par le proprio dans le lien) : affichées au client, jamais modifiables.
    lignes: [
      ['Voiture', `${v.make} ${v.model} (${v.year})`],
      ['Départ', fmtDateHeure(r.loc.departDate, r.loc.departHeure)],
      ['Retour', fmtDateHeure(r.loc.retourDate, r.loc.retourHeure)],
      ['Durée', `${calc.weeks} semaine${calc.weeks > 1 ? 's' : ''} à ${argent(r.loc.tarifCents)} par semaine (avant taxes)`],
      ['Total', `${argent(calc.total)} (taxes incluses)`],
      ['Dépôt', `${argent(r.loc.depotCents)} (non taxé)`],
    ],
  });
}

// ---------- Validation de ce que le client a rempli ----------
// `loc` et `v` viennent du lien vérifié, JAMAIS du formulaire (le client ne peut pas changer la location).
function valider(body, fichier, ip, loc, v) {
  // Champ-piège invisible pour les humains : un robot le remplit.
  if (txt(body.site_web)) return { erreur: 'Envoi refusé.' };

  const d = {
    nom: txt(body.nom, 120),
    adresse: txt(body.adresse, 200),
    telephone: txt(body.telephone, 40),
    courriel: txt(body.courriel, 120),
    naissance: txt(body.naissance, 10),
    permis: txt(body.permis, 40),
  };

  const manque = [];
  if (d.nom.length < 3) manque.push('votre nom complet');
  if (d.adresse.length < 6) manque.push('votre adresse');
  if (d.telephone.replace(/\D/g, '').length < 7) manque.push('votre numéro de téléphone');
  if (!d.courriel) manque.push('votre courriel (vous y recevrez votre copie)');
  if (d.permis.length < 4) manque.push('votre numéro de permis de conduire');
  if (manque.length) return { erreur: 'Il manque : ' + manque.join(', ') + '.' };

  // Le courriel est OBLIGATOIRE : la copie du contrat y est envoyée.
  if (!courrielValide(d.courriel)) {
    return { erreur: 'Votre courriel ne semble pas valide. Vérifiez-le (exemple : nom@gmail.com).' };
  }
  const aujourdhui = todayMontreal();
  if (!dateOk(d.naissance)) return { erreur: 'Votre date de naissance est invalide.' };
  const age = ageAu(d.naissance, aujourdhui);
  if (age < 18 || age > 100) return { erreur: 'Vérifiez votre date de naissance.' };

  if (un(body.accepte) !== '1') return { erreur: 'Cochez « J’ai lu et j’accepte les conditions du contrat de location ».' };
  if (!fichier || !fichier.buffer || !fichier.buffer.subarray(0, 8).equals(PNG)) {
    return { erreur: 'Signature manquante ou invalide. Signez dans le cadre.' };
  }

  return {
    d: Object.assign(d, {
      vehicule: `${v.make} ${v.model}`,
      annee: String(v.year),
      // Plaque, kilométrage et état : notés à la remise du véhicule (mention grise sur le PDF).
      plaque: '', km: '', etat: '',
      lieu: 'En ligne (à distance)',
      recap: true,
      // Location, tarif et dépôt : TOUJOURS ceux du lien signé par Location YBMTL.
      departDate: loc.departDate, departHeure: loc.departHeure,
      retourDate: loc.retourDate, retourHeure: loc.retourHeure,
      tarifCents: loc.tarifCents,
      depotCents: loc.depotCents,
      distance: true,
      moinsDe25: age < 25,
      ip: ip && ip !== 'inconnue' ? ip : '',
      sigLocataire: fichier.buffer,
      sigModeLocataire: un(body.sigModeLocataire) === 'clavier' ? 'clavier' : 'dessin',
      sigRepresentant: null, // le représentant contresigne à la remise du véhicule
    }),
  };
}

// ---------- Création du contrat : POST /contrat/generer ----------
function genererHandler(req, res) {
  upload(req, res, async (err) => {
    if (err) {
      console.error('[contrat] Envoi refusé :', err.code || err.message);
      return res.status(400).json({ erreur: 'Signature invalide ou trop lourde. Refaites-la.' });
    }
    try {
      // 1. Le lien : sans lien valide, on s'arrête tout de suite (aucun courriel, aucun calcul).
      const lien = txt((req.body || {}).lien, 200);
      const r = lienPrive.verifier(lien, todayMontreal());
      if (!r.ok) return res.status(403).json({ erreur: r.raison === 'expire' ? message.expire : message.invalide });
      const v = voiture(r.loc.vehiculeId);
      if (!v) return res.status(403).json({ erreur: message.voiture });

      if (!gabaritOk()) {
        console.error('[contrat] Le PDF du contrat a changé : création refusée.');
        return res.status(503).json({ erreur: `Service momentanément indisponible. Appelez-nous au ${config.company.phone}.` });
      }

      // 2. Ce que le client a rempli.
      const ip = limites.ipDe(req);
      const val = valider(req.body || {}, req.file, ip, r.loc, v);
      if (val.erreur) return res.status(400).json({ erreur: val.erreur });
      // Le domaine du courriel doit exister et recevoir du courriel (attrape « gmail.con », « hotmial.ccom »…).
      if (!(await domaineCourrielExiste(val.d.courriel))) {
        return res.status(400).json({ erreur: 'Ce courriel ne semble pas exister (domaine introuvable). Vérifiez-le : vous y recevrez votre copie du contrat.' });
      }

      // 3. Limites anti-abus.
      const cleLien = lienPrive.cleLimite(lien);
      const lim = limites.verifier(ip, val.d.courriel, undefined, cleLien);
      if (!lim.ok) return res.status(429).json({ erreur: lim.message });
      limites.enregistrer(ip, val.d.courriel, undefined, cleLien);

      // 4. Le PDF, puis les courriels.
      // Signature préfaite du représentant (si elle est configurée ; sinon le contrat garde « à apposer à la remise »).
      val.d.sigRepresentantPrefaite = signatureRepresentant();
      const out = await genererContrat(val.d);
      val.d.repSignee = out.repSignee; // vrai si la signature a bien été apposée
      const mail = await envoyerContrat({
        d: val.d,
        ref: out.ref,
        calc: out.calc,
        nomFichier: out.nomFichier,
        pdf: out.bytes,
        copieClient: true, // le courriel du client est obligatoire : il reçoit toujours sa copie
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
      console.error('[contrat] Échec de la création du PDF :', e.message);
      res.status(500).json({ erreur: `Impossible de créer le contrat pour le moment. Réessayez ou appelez-nous au ${config.company.phone}.` });
    }
  });
}

module.exports = { page, invalide, genererHandler, valider };
