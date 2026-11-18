// Pages admin du contrat (proprio connecté à l'admin).
// Monté dans routes/admin.js sous /admin/contrat (après la vérification de connexion).
//  - /admin/contrat       : « Nouveau contrat » (tu remplis sur ton cellulaire, le client signe dessus)
//  - /admin/contrat/lien  : « Lien client » (tu crées un lien PRIVÉ pour une location confirmée ; le client
//                           remplit et signe lui-même, à distance : voir routes/contrat.js)
const express = require('express');
const router = express.Router();
const db = require('../db');
const service = require('../lib/contrat-service');
const lienPrive = require('../lib/contrat-lien');
const { calculerLocation, fmtDateHeure, argent } = require('../lib/contrat-pdf');
const { todayMontreal } = require('../lib/format');

router.get('/', (req, res) => {
  res.render('admin/contrat', Object.assign(service.donneesFormulaire(req), {
    mode: 'admin',
    actionGenerer: '/admin/contrat/generer',
    urlAccueil: '/admin/contrat',
    urlConnexion: '/admin/connexion',
  }));
});

router.post('/generer', service.memeOrigine, service.genererHandler);

// ---------- Lien client ----------
const un = (v) => (Array.isArray(v) ? v[v.length - 1] : v);
const txt = (v) => String(un(v) == null ? '' : un(v)).trim();
const cents = (v) => {
  const s = txt(v).replace(/\s/g, '').replace(',', '.').replace(/[^\d.]/g, '');
  if (s === '') return null;
  const n = parseFloat(s);
  return isNaN(n) || n < 0 ? null : Math.round(n * 100);
};

router.get('/lien', (req, res) => {
  const vehicles = db
    .prepare(
      `SELECT id, make, model, year, weekly_rate, security_deposit, is_published
       FROM vehicles WHERE coming_soon = 0 ORDER BY make, model`
    )
    .all();
  // Préremplissage depuis une demande de réservation (bouton « Lien client » dans Demandes).
  let pre = {};
  const demandeId = parseInt(req.query.demande, 10);
  if (demandeId) {
    const r = db.prepare('SELECT vehicle_id, start_date, end_date FROM requests WHERE id = ?').get(demandeId);
    if (r) pre = { vehiculeId: r.vehicle_id, departDate: r.start_date || '', retourDate: r.end_date || '' };
  }
  res.render('admin/contrat-lien', { vehicles, pre, actif: lienPrive.hmacDisponible(), aujourdhui: todayMontreal() });
});

router.post('/lien', service.memeOrigine, (req, res) => {
  const body = req.body || {};
  const erreur = (msg) => res.status(400).json({ erreur: msg });
  if (!lienPrive.hmacDisponible()) return res.status(503).json({ erreur: 'Les liens ne sont pas disponibles : la clé secrète du site est absente.' });

  const vehiculeId = parseInt(txt(body.vehiculeId), 10);
  const v = vehiculeId
    ? db.prepare('SELECT id, make, model, year FROM vehicles WHERE id = ? AND coming_soon = 0').get(vehiculeId)
    : null;
  if (!v) return erreur('Choisissez la voiture.');
  if (!txt(body.departDate) || !txt(body.retourDate)) return erreur('Choisissez la date de départ et la date de retour.');
  const tarifCents = cents(body.tarifHebdo);
  const depotCents = cents(body.depot);
  if (tarifCents == null || tarifCents <= 0) return erreur('Indiquez le tarif par semaine.');
  if (depotCents == null) return erreur('Indiquez le dépôt (0 s’il n’y en a pas).');

  const auj = todayMontreal();
  const r = lienPrive.validerLocation({
    vehiculeId: v.id,
    departDate: txt(body.departDate), departHeure: txt(body.departHeure),
    retourDate: txt(body.retourDate), retourHeure: txt(body.retourHeure),
    tarifCents, depotCents,
  }, auj);
  if (r.erreur) return erreur(r.erreur);

  const lien = lienPrive.creerHmac(r.loc, auj);
  const calc = calculerLocation(r.loc.departDate, r.loc.retourDate, r.loc.tarifCents);
  // Les clients reçoivent toujours l'adresse officielle du site (jamais l'adresse Render).
  const hote = req.get('host') || '';
  const base = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(hote) ? 'http://' + hote : 'https://locationybmtl.ca';
  res.set('Cache-Control', 'no-store');
  res.json({
    url: `${base}/contrat/${lien.token}`,
    expire: lien.expire,
    resume: [
      ['Voiture', `${v.make} ${v.model} (${v.year})`],
      ['Départ', fmtDateHeure(r.loc.departDate, r.loc.departHeure)],
      ['Retour', fmtDateHeure(r.loc.retourDate, r.loc.retourHeure)],
      ['Total', `${argent(calc.total)} (taxes incluses)`],
      ['Dépôt', `${argent(r.loc.depotCents)} (non taxé)`],
    ],
  });
});

module.exports = router;
