// Pages publiques (visibles par tout le monde, sans connexion) :
// - Page d'accueil avec la grille de vehicules et la barre de recherche par dates
// - Page de detail d'un vehicule
// - Reception du formulaire "Demander cette voiture"
const fs = require('fs');
const path = require('path');
const express = require('express');
const router = express.Router();
const db = require('../db');
const availability = require('../lib/availability');
const pricing = require('../lib/pricing');
const faqItems = require('../lib/faq');
const { minDepartDate } = require('../lib/format');

const SITE = 'https://locationybmtl.ca';
const IMG_DIR = path.join(__dirname, '..', 'public', 'img');

// "Audi S5 Coupé" -> "audi-s5-coupe" (le fichier d'apercu de partage est public/img/og-audi-s5-coupe.jpg, voir tools/generer-og.py)
function slug(texte) {
  return String(texte)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// Textes et image affiches quand on partage le lien d'une voiture (Facebook, WhatsApp, Google...).
function seoVehicule(vehicle, photos, lang) {
  const nom = `${vehicle.make} ${vehicle.model}`;
  const nomAn = nom + (vehicle.show_year ? ` ${vehicle.year}` : '');
  let description;
  let ogDescription;
  if (lang === 'en') {
    const en = require('../lib/en');
    if (vehicle.coming_soon) {
      description = `${nomAn}: coming soon for rent in Montréal. Contact Location YBMTL to be notified when it arrives.`;
      ogDescription = `${nomAn}: coming soon at Location YBMTL, in Montréal.`;
    } else {
      const km = en.mileage(vehicle.mileage_policy || 'Kilométrage illimité');
      const article = /^[aeiou]/i.test(nomAn) ? 'an' : 'a'; // « an Acura », « a BMW »
      description = `Rent ${article} ${nomAn} in Montréal: $${vehicle.weekly_rate} per week + taxes. ${km}, ${en.trans(vehicle.transmission).toLowerCase()}, ${vehicle.doors} doors. Online request, quick confirmation.`;
      ogDescription = `${nomAn} for rent in Montréal: $${vehicle.weekly_rate}/week + taxes. ${km}. Make your request online.`;
    }
  } else if (vehicle.coming_soon) {
    description = `${nomAn} : bientôt disponible à la location à Montréal. Contactez Location YBMTL pour être informé de son arrivée.`;
    ogDescription = `${nomAn} : bientôt disponible chez Location YBMTL, à Montréal.`;
  } else {
    const km = vehicle.mileage_policy || 'Kilométrage illimité';
    description = `Location ${nomAn} à Montréal : ${vehicle.weekly_rate} $ par semaine + taxes. ${km}, ${String(vehicle.transmission || '').toLowerCase()}, ${vehicle.doors} portes. Demande en ligne, confirmation rapide.`;
    ogDescription = `${nomAn} à louer à Montréal : ${vehicle.weekly_rate} $/semaine + taxes. ${km}. Faites votre demande en ligne.`;
  }
  const seo = { description, ogDescription };
  const fichier = `og-${slug(nom)}.jpg`;
  if (fs.existsSync(path.join(IMG_DIR, fichier))) {
    seo.image = `${SITE}/img/${fichier}`;
    seo.imageSize = [1200, 630];
  } else if (photos.length > 0) {
    seo.image = `${SITE}/uploads/${photos[0].filename}`;
  }
  return seo;
}

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

// PAGE D'ACCUEIL (francais : « / », anglais : « /en »)
const accueil = (lang) => (req, res) => {
  res.locals.altPath = lang === 'en' ? '/' : '/en';
  const start = (req.query.depart || '').trim();
  const end = (req.query.retour || '').trim();
  const hasSearch = !!(start && end);
  // Filtres du menu de recherche : par marque et par prix maximum / semaine.
  const marque = (req.query.marque || '').trim();
  const prixMax = parseInt(req.query.prixMax, 10) || null;
  const hasFilter = !!(marque || prixMax);

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
        ? !v.coming_soon && availability.isAvailableForRange(v.id, start, end)
        : true,
    };
  });

  // Vehicules « mis en avant » : remontent en tete de la liste (sans etre
  // techniquement epingles). Pour changer : modifier cette liste (ordre = priorite).
  const MIS_EN_AVANT = [
    { make: 'Audi', model: 'S5 Coupé' },
    { make: 'BMW', model: '328i' },
    { make: 'Mazda', model: '6' },
  ];
  const rangMiseEnAvant = (v) => {
    const i = MIS_EN_AVANT.findIndex((p) => p.make === v.make && p.model === v.model);
    return i === -1 ? MIS_EN_AVANT.length : i;
  };
  // Les voitures « Bientot disponible » passent en tout premier, puis les mises en avant.
  vehicles.sort(
    (a, b) => (b.coming_soon - a.coming_soon) || (rangMiseEnAvant(a) - rangMiseEnAvant(b))
  );

  // Si une recherche par dates est faite, on ne garde que les vehicules libres.
  let list = hasSearch
    ? vehicles.filter((v) => v.availableForRange)
    : vehicles;
  // Filtres du menu de recherche (marque + prix max), cumulables avec les dates.
  if (marque) list = list.filter((v) => v.make === marque);
  if (prixMax) list = list.filter((v) => !v.coming_soon && v.weekly_rate <= prixMax);

  // Vehicule(s) « nouvel arrive » mis en vedette en haut (hors recherche par dates).
  // Ordre d'affichage des vedettes (le plus recent en premier).
  const ORDRE_VEDETTE = [
    { make: 'Acura', model: 'RDX' },
    { make: 'BMW', model: '750' },
  ];
  const rangVedette = (v) => {
    const i = ORDRE_VEDETTE.findIndex((p) => p.make === v.make && p.model === v.model);
    return i === -1 ? ORDRE_VEDETTE.length : i;
  };
  const featured = hasSearch || hasFilter
    ? []
    : vehicles.filter((v) => v.is_new).sort((a, b) => rangVedette(a) - rangVedette(b));

  res.render(lang === 'en' ? 'en/index' : 'index', {
    vehicles: list,
    featured,
    totalCount: vehicles.length,
    search: { start, end, hasSearch },
    filtre: { marque, prixMax, hasFilter },
  });
};
router.get('/', accueil('fr'));
router.get('/en', accueil('en'));

// PAGE COMMENT CA MARCHE
router.get('/comment-ca-marche', (req, res) => {
  res.locals.altPath = '/en/how-it-works';
  res.render('comment-ca-marche');
});
router.get('/en/how-it-works', (req, res) => {
  res.locals.altPath = '/comment-ca-marche';
  res.render('en/how-it-works');
});

// PAGE QUESTIONS FREQUENTES
router.get('/faq', (req, res) => {
  const config = require('../config');
  res.locals.altPath = '/en/faq';
  res.render('faq', {
    faq: faqItems(config.company),
    seo: {
      description:
        "Réponses à vos questions sur la location de voiture chez Location YBMTL : âge et permis, paiement, dépôt, assurance, kilométrage illimité, taxes et remise du véhicule.",
    },
  });
});
router.get('/en/faq', (req, res) => {
  const config = require('../config');
  res.locals.altPath = '/faq';
  res.render('en/faq', {
    faq: require('../lib/en').faq(config.company),
    seo: {
      description:
        'Answers to your questions about renting a car with Location YBMTL: age and licence, payment, deposit, insurance, unlimited mileage, taxes and vehicle pick-up.',
    },
  });
});

// PAGE POLITIQUE DE CONFIDENTIALITE (Loi 25)
router.get('/confidentialite', (req, res) => {
  res.locals.altPath = '/en/privacy';
  res.render('confidentialite', {
    seo: {
      description:
        "Politique de confidentialité de Location YBMTL : renseignements recueillis, utilisation, partage, témoins (cookies) et vos droits.",
    },
  });
});
router.get('/en/privacy', (req, res) => {
  res.locals.altPath = '/confidentialite';
  res.render('en/privacy', {
    seo: {
      description:
        'Location YBMTL privacy policy: information collected, use, sharing, cookies and your rights.',
    },
  });
});

// PAGE CONDITIONS & CONTRAT
router.get('/conditions', (req, res) => {
  const config = require('../config');
  res.locals.altPath = '/en/terms';
  res.render('conditions', { company: config.company });
});
router.get('/en/terms', (req, res) => {
  const config = require('../config');
  res.locals.altPath = '/conditions';
  res.render('en/terms', { company: config.company });
});

// PAGE DETAIL D'UN VEHICULE (francais : « /vehicule/12 », anglais : « /en/vehicle/12 »)
const ficheVehicule = (lang) => (req, res) => {
  const vehicle = db
    .prepare('SELECT * FROM vehicles WHERE id = ? AND is_published = 1')
    .get(req.params.id);
  if (!vehicle) return res.status(404).render(lang === 'en' ? 'en/404' : '404');
  res.locals.altPath = (lang === 'en' ? '/vehicule/' : '/en/vehicle/') + vehicle.id;

  const photos = db
    .prepare(
      `SELECT * FROM vehicle_photos WHERE vehicle_id = ?
       ORDER BY is_primary DESC, sort_order ASC, id ASC`
    )
    .all(vehicle.id);

  const blocked = availability.getBlockedDates(vehicle.id);

  // Vehicules similaires : meme marque, ou prix proche (+/- 100$), publies,
  // en excluant le vehicule courant. Limite a 3, les plus proches en prix d'abord.
  const similaires = db
    .prepare(
      `SELECT * FROM vehicles
       WHERE is_published = 1 AND coming_soon = 0 AND id != ?
         AND (make = ? OR ABS(weekly_rate - ?) <= 100)
       ORDER BY (make = ?) DESC, ABS(weekly_rate - ?) ASC
       LIMIT 3`
    )
    .all(vehicle.id, vehicle.make, vehicle.weekly_rate, vehicle.make, vehicle.weekly_rate)
    .map((v) => ({ ...v, photo: primaryPhoto(v.id) ? primaryPhoto(v.id).filename : null }));

  res.render(lang === 'en' ? 'en/vehicle' : 'vehicle', {
    vehicle,
    photos,
    blocked,
    similaires,
    seo: seoVehicule(vehicle, photos, lang),
    confirmationClient: require('../config').mail.confirmationClient,
    rentedToday: availability.isRentedToday(vehicle.id),
    sent: req.query.envoye === '1',
    error: req.query.erreur === '1',
    dateError: req.query.erreur === 'date',
  });
};
router.get('/vehicule/:id', ficheVehicule('fr'));
router.get('/en/vehicle/:id', ficheVehicule('en'));

// RECEPTION DU FORMULAIRE DE DEMANDE
router.post('/vehicule/:id/demande', (req, res) => {
  const vehicle = db
    .prepare('SELECT id, make, model, weekly_rate, security_deposit, coming_soon FROM vehicles WHERE id = ?')
    .get(req.params.id);
  if (!vehicle) return res.status(404).render('404');
  // Voiture « Bientot disponible » : pas de reservation possible (la fiche n'a pas de formulaire).
  if (vehicle.coming_soon) return res.redirect(req.body.lang === 'en' ? `/en/vehicle/${vehicle.id}` : `/vehicule/${vehicle.id}`);

  const { name, phone, email, depart, retour, message, website } = req.body;
  // Langue de la page d'ou vient la demande : sert a rediriger vers la bonne page et a ecrire le courriel au client.
  const lang = req.body.lang === 'en' ? 'en' : 'fr';
  const fiche = (lang === 'en' ? '/en/vehicle/' : '/vehicule/') + vehicle.id;

  // Champ-piege anti-robots (invisible pour les humains) : s'il est rempli, on fait comme si tout
  // allait bien, sans rien enregistrer ni envoyer.
  if (website) return res.redirect(`${fiche}?envoye=1#demande`);

  // Validation minimale : nom, telephone et courriel sont obligatoires.
  if (!name || !phone || !email) {
    return res.redirect(`${fiche}?erreur=1#demande`);
  }

  // Pas de location qui commence le jour meme : depart au plus tot le lendemain (heure de Montreal).
  if (depart && !(/^\d{4}-\d{2}-\d{2}$/.test(depart) && depart >= minDepartDate())) {
    return res.redirect(`${fiche}?erreur=date#demande`);
  }

  // Estimation du prix avec TPS et TVQ (calculee ici, pas fiee au navigateur).
  const estimate = pricing.estimateRental(vehicle.weekly_rate, depart, retour);

  // 1. Enregistrer la demande dans la base du site (comme avant)
  db.prepare(
    `INSERT INTO requests
     (vehicle_id, name, phone, email, start_date, end_date, message,
      est_subtotal, est_tps, est_tvq, est_total)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    vehicle.id,
    name.trim(),
    phone.trim(),
    email.trim(),
    depart || null,
    retour || null,
    (message || '').trim() || null,
    estimate ? estimate.subtotal : null,
    estimate ? estimate.tps : null,
    estimate ? estimate.tvq : null,
    estimate ? estimate.total : null
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
    estimate,
  });

  // 2 bis. Courriel « Demande bien recue » envoye au CLIENT (resume + prochaines etapes).
  mailer.sendClientConfirmation({
    name: name.trim(),
    email: email.trim(),
    vehicle: `${vehicle.make} ${vehicle.model}`,
    depart: depart || null,
    retour: retour || null,
    estimate,
    deposit: vehicle.security_deposit,
    lang,
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

  // 4. Alerte instantanee sur le cellulaire du proprio (si NTFY_TOPIC est configure ; jamais de donnees du client).
  require('../lib/alerte').alerteDemande({
    vehicule: `${vehicle.make} ${vehicle.model}`,
    depart: depart || null,
    retour: retour || null,
  });

  res.redirect(`${fiche}?envoye=1#demande`);
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

  // Chaque page existe en francais et en anglais : on declare les deux, avec les liens « hreflang ».
  const paire = (fr, en, freq, prio, lastmod) => {
    const alt =
      `<xhtml:link rel="alternate" hreflang="fr-CA" href="${BASE}${fr}"/>` +
      `<xhtml:link rel="alternate" hreflang="en-CA" href="${BASE}${en}"/>`;
    const lm = lastmod ? `<lastmod>${lastmod}</lastmod>` : '';
    return [fr, en].map(
      (u) => `<url><loc>${BASE}${u}</loc>${lm}<changefreq>${freq}</changefreq><priority>${prio}</priority>${alt}</url>`
    );
  };
  const urls = [
    ...paire('/', '/en', 'weekly', '1.0'),
    ...paire('/comment-ca-marche', '/en/how-it-works', 'monthly', '0.6'),
    ...paire('/faq', '/en/faq', 'monthly', '0.6'),
    ...paire('/conditions', '/en/terms', 'monthly', '0.5'),
    ...paire('/confidentialite', '/en/privacy', 'yearly', '0.2'),
    ...vehicles.flatMap((v) => paire(`/vehicule/${v.id}`, `/en/vehicle/${v.id}`, 'weekly', '0.8', today)),
  ];

  res.set('Content-Type', 'application/xml');
  res.send(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>`
  );
});

module.exports = router;
