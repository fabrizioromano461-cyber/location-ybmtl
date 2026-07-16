// Pages publiques (visibles par tout le monde, sans connexion) :
// - Page d'accueil avec la grille de vehicules et la barre de recherche par dates
// - Page de detail d'un vehicule
// - Reception du formulaire "Demander cette voiture"
const express = require('express');
const router = express.Router();
const db = require('../db');
const availability = require('../lib/availability');

// Recupere la photo principale d'un vehicule (ou la premiere, ou null).
function primaryPhoto(vehicleId) {
  return db
    .prepare(
      `SELECT filename FROM vehicle_photos
       WHERE vehicle_id = ?
       ORDER BY is_primary DESC, sort_order ASC, id ASC
       LIMIT 1`
    )
    .get(vehicleId);
}

// PAGE D'ACCUEIL
router.get('/', (req, res) => {
  const start = (req.query.depart || '').trim();
  const end = (req.query.retour || '').trim();
  const hasSearch = !!(start && end);

  let vehicles = db
    .prepare('SELECT * FROM vehicles WHERE is_published = 1 ORDER BY make, model')
    .all();

  vehicles = vehicles.map((v) => {
    const photo = primaryPhoto(v.id);
    return {
      ...v,
      photo: photo ? photo.filename : null,
      rentedToday: availability.isRentedToday(v.id),
      availableForRange: hasSearch
        ? availability.isAvailableForRange(v.id, start, end)
        : true,
    };
  });

  // Si une recherche par dates est faite, on ne garde que les vehicules libres.
  const list = hasSearch
    ? vehicles.filter((v) => v.availableForRange)
    : vehicles;

  // Vehicule(s) « nouvel arrive » mis en vedette en haut (hors recherche par dates).
  const featured = hasSearch ? [] : vehicles.filter((v) => v.is_new);

  res.render('index', {
    vehicles: list,
    featured,
    totalCount: vehicles.length,
    search: { start, end, hasSearch },
  });
});

// PAGE CONDITIONS & CONTRAT
router.get('/conditions', (req, res) => {
  const config = require('../config');
  res.render('conditions', { company: config.company });
});

// PAGE DETAIL D'UN VEHICULE
router.get('/vehicule/:id', (req, res) => {
  const vehicle = db
    .prepare('SELECT * FROM vehicles WHERE id = ? AND is_published = 1')
    .get(req.params.id);
  if (!vehicle) return res.status(404).render('404');

  const photos = db
    .prepare(
      `SELECT * FROM vehicle_photos WHERE vehicle_id = ?
       ORDER BY is_primary DESC, sort_order ASC, id ASC`
    )
    .all(vehicle.id);

  const blocked = availability.getBlockedDates(vehicle.id);

  res.render('vehicle', {
    vehicle,
    photos,
    blocked,
    rentedToday: availability.isRentedToday(vehicle.id),
    sent: req.query.envoye === '1',
    error: req.query.erreur === '1',
  });
});

// RECEPTION DU FORMULAIRE DE DEMANDE
router.post('/vehicule/:id/demande', (req, res) => {
  const vehicle = db
    .prepare('SELECT id, make, model FROM vehicles WHERE id = ?')
    .get(req.params.id);
  if (!vehicle) return res.status(404).render('404');

  const { name, phone, email, depart, retour, message } = req.body;

  // Validation minimale : nom, telephone et courriel sont obligatoires.
  if (!name || !phone || !email) {
    return res.redirect(`/vehicule/${vehicle.id}?erreur=1#demande`);
  }

  // 1. Enregistrer la demande dans la base du site (comme avant)
  db.prepare(
    `INSERT INTO requests
     (vehicle_id, name, phone, email, start_date, end_date, message)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    vehicle.id,
    name.trim(),
    phone.trim(),
    email.trim(),
    depart || null,
    retour || null,
    (message || '').trim() || null
  );

  // 2. Envoyer un courriel de notification DIRECTEMENT depuis le site.
  //    Fonctionne meme en ligne (Render) sans que l'ordinateur soit allume.
  const mailer = require('../lib/mailer');
  mailer.sendReservationNotification({
    name: name.trim(),
    email: email.trim(),
    phone: phone.trim(),
    vehicle: `${vehicle.make} ${vehicle.model}`,
    depart: depart || null,
    retour: retour || null,
    message: (message || '').trim() || null,
  });

  // 3. Transferer la demande au CRM (creation prospect). En "fire-and-forget" :
  //    ne marche que si le CRM local tourne ; sans effet en ligne.
  forwardToCrm({
    client_name: name.trim(),
    client_email: email.trim(),
    client_phone: phone.trim(),
    vehicle_type: `${vehicle.make} ${vehicle.model}`,
    start_date: depart || null,
    end_date: retour || null,
    message: (message || '').trim() || null,
  });

  res.redirect(`/vehicule/${vehicle.id}?envoye=1#demande`);
});

// Envoie la demande au CRM sans bloquer la reponse au client.
function forwardToCrm(payload) {
  const config = require('../config');
  const url = `${config.crmApiUrl}/api/public/demande-reservation`;
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
    .then((r) => {
      if (!r.ok) console.error('[CRM] Reponse non-OK:', r.status);
      else console.log('[CRM] Demande transferee avec succes');
    })
    .catch((err) => {
      // Le CRM est peut-etre eteint : on log mais on ne casse rien.
      console.error('[CRM] Transfert echoue (CRM eteint ?):', err.message);
    });
}

// SITEMAP.XML — aide Google a indexer toutes les pages du site
router.get('/sitemap.xml', (req, res) => {
  const BASE = 'https://locationybmtl.ca';
  const vehicles = db.prepare('SELECT id FROM vehicles WHERE is_published = 1').all();
  const today = new Date().toISOString().split('T')[0];

  const urls = [
    `<url><loc>${BASE}/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>`,
    `<url><loc>${BASE}/conditions</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>`,
    ...vehicles.map(
      (v) =>
        `<url><loc>${BASE}/vehicule/${v.id}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`
    ),
  ];

  res.set('Content-Type', 'application/xml');
  res.send(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`
  );
});

module.exports = router;
