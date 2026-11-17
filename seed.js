// Script de demarrage des donnees.
// - Cree le premier compte administrateur s'il n'existe aucun utilisateur.
// - Ajoute le vehicule de demonstration (Audi S5 Coupe) s'il n'y a aucun
//   vehicule dans la base.
// Lance automatiquement au demarrage du serveur (voir server.js) et aussi
// disponible via `npm run seed`.
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const db = require('./db');
const config = require('./config');
const { todayMontreal } = require('./lib/format');

function seedAdmin() {
  const existing = db
    .prepare('SELECT id, password_hash FROM users WHERE username = ?')
    .get(config.admin.username);

  // Aucun admin : on le cree.
  if (!existing) {
    const hash = bcrypt.hashSync(config.admin.password, 10);
    db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(
      config.admin.username,
      hash
    );
    console.log(`[seed] Compte admin cree -> identifiant: "${config.admin.username}".`);
    return;
  }

  // Admin existant : on synchronise le mot de passe avec ADMIN_PASSWORD
  // (variable d'environnement) s'il a change. Permet de changer le mot de
  // passe en ligne sans recréer la base (la base persiste sur Render).
  const matches = bcrypt.compareSync(config.admin.password, existing.password_hash);
  if (!matches) {
    const hash = bcrypt.hashSync(config.admin.password, 10);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, existing.id);
    console.log('[seed] Mot de passe admin mis a jour depuis ADMIN_PASSWORD.');
  }
}

function seedVehicles() {
  const count = db.prepare('SELECT COUNT(*) AS n FROM vehicles').get().n;
  if (count > 0) return;

  // Charge le catalogue complet (14 vehicules + photos) depuis seed-catalog.json.
  // Permet de reconstruire tout le catalogue a chaque demarrage sur un
  // hebergement gratuit (disque non persistant comme Render free).
  const catalogPath = path.join(__dirname, 'seed-catalog.json');
  if (!fs.existsSync(catalogPath)) {
    console.log('[seed] Aucun seed-catalog.json trouve, aucun vehicule ajoute.');
    return;
  }
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

  const insertVehicle = db.prepare(
    `INSERT INTO vehicles
     (id, make, model, year, transmission, doors, weekly_rate, security_deposit,
      mileage_policy, description, is_published, show_year, coming_soon)
     VALUES (@id, @make, @model, @year, @transmission, @doors, @weekly_rate, @security_deposit,
      @mileage_policy, @description, @is_published, @show_year, @coming_soon)`
  );
  const insertPhoto = db.prepare(
    `INSERT INTO vehicle_photos (vehicle_id, filename, sort_order, is_primary)
     VALUES (?, ?, ?, ?)`
  );

  const seedAll = db.transaction((items) => {
    for (const v of items) {
      const info = insertVehicle.run({
        // Numero FIXE (seed-catalog.json « id ») : les adresses /vehicule/N ne changent pas
        // quand on retire une voiture du catalogue. Sans « id », SQLite en donne un nouveau.
        id: v.id != null ? v.id : null,
        make: v.make,
        model: v.model,
        year: v.year,
        transmission: v.transmission || 'Automatique',
        doors: v.doors || 4,
        weekly_rate: v.weekly_rate || 0,
        security_deposit: v.security_deposit != null ? v.security_deposit : 500,
        mileage_policy: v.mileage_policy || 'Kilometrage illimite',
        description: v.description || null,
        is_published: v.is_published != null ? v.is_published : 1,
        show_year: v.show_year != null ? v.show_year : 1,
        coming_soon: v.coming_soon ? 1 : 0,
      });
      for (const p of v.photos || []) {
        insertPhoto.run(info.lastInsertRowid, p.filename, p.sort_order || 0, p.is_primary || 0);
      }
    }
  });
  seedAll(catalog);

  console.log(`[seed] Catalogue charge : ${catalog.length} vehicules.`);
}

// Disponibilites de la semaine : fichier disponibilites.json (mis a jour avec YB chaque dimanche).
//  - "voitures" : « Marque Modele » -> "libre" (disponible maintenant) ou "AAAA-MM-JJ" (premier jour
//    DISPONIBLE : la voiture est bloquee a la reservation d'aujourd'hui jusqu'a la veille de cette date).
//  - "autres_jusqu_au" : toutes les AUTRES voitures (non listees, hors « bientot disponible ») sont bloquees
//    d'aujourd'hui (heure de Montreal) jusqu'a cette date INCLUSE.
// La base en ligne est refaite a chaque demarrage (disque Render ephemere) : c'est la seule facon que ces
// blocages survivent. Une date passee ne bloque plus rien. Voitures reperees par marque + modele.
function normaliser(t) {
  return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function appliquerBlocages(aujourdhui, spec) {
  const debut = aujourdhui || todayMontreal();
  if (!spec) {
    const fichier = path.join(__dirname, 'disponibilites.json');
    if (!fs.existsSync(fichier)) return;
    try { spec = JSON.parse(fs.readFileSync(fichier, 'utf8')); }
    catch (e) { console.warn('[seed] disponibilites.json illisible :', e.message); return; }
  }
  const DATE = /^\d{4}-\d{2}-\d{2}$/;
  const listees = {};
  for (const [nom, val] of Object.entries(spec.voitures || {})) {
    if (val !== 'libre' && !DATE.test(String(val))) console.warn(`[seed] Disponibilites : valeur invalide pour « ${nom} » (ignoree).`);
    listees[normaliser(nom)] = val;
  }
  const bloquer = db.prepare('INSERT OR IGNORE INTO blocked_dates (vehicle_id, date) VALUES (?, ?)');
  let total = 0;
  const bloquerJusqua = (id, derniere) => {
    const jour = new Date(debut + 'T00:00:00Z');
    for (let i = 0; i < 366; i++) {
      const iso = jour.toISOString().slice(0, 10);
      if (iso > derniere) break;
      total += bloquer.run(id, iso).changes;
      jour.setUTCDate(jour.getUTCDate() + 1);
    }
  };
  const vus = new Set();
  db.transaction(() => {
    for (const v of db.prepare('SELECT id, make, model, coming_soon FROM vehicles').all()) {
      if (v.coming_soon) continue;
      const cle = normaliser(v.make + ' ' + v.model);
      let derniere = null;
      if (cle in listees) {
        vus.add(cle);
        const val = String(listees[cle]);
        if (DATE.test(val)) { // disponible a partir de val : bloquee jusqu'a la veille
          const d = new Date(val + 'T00:00:00Z');
          d.setUTCDate(d.getUTCDate() - 1);
          derniere = d.toISOString().slice(0, 10);
        }
      } else if (DATE.test(spec.autres_jusqu_au || '')) {
        derniere = spec.autres_jusqu_au;
      }
      if (derniere) bloquerJusqua(v.id, derniere);
    }
  })();
  for (const cle of Object.keys(listees)) {
    if (!vus.has(cle)) console.warn(`[seed] Disponibilites : voiture inconnue « ${cle} » (ignoree).`);
  }
  if (total) console.log(`[seed] Dates bloquees ajoutees : ${total}.`);
}

function runSeed() {
  seedAdmin();
  seedVehicles();
  appliquerBlocages();
  // Vehicule(s) mis en vedette « NOUVEL ARRIVE » en haut du site. Placé ICI
  // (après le chargement du catalogue) pour que ça fonctionne meme quand la
  // base est recréée à neuf. Pour changer la vedette : modifier le WHERE.
  // Pour n'en mettre AUCUNE : commenter la 2e ligne.
  db.prepare('UPDATE vehicles SET is_new = 0').run();
  db.prepare("UPDATE vehicles SET is_new = 1 WHERE (make = 'BMW' AND model = '750') OR (make = 'Acura' AND model = 'RDX' AND year = 2015) OR (make = 'Toyota' AND model = 'Prius' AND year = 2018) OR (make = 'Infiniti' AND model = 'M37' AND year = 2012) OR (make = 'Lexus' AND model = 'IS 250' AND year = 2013) OR (make = 'Hyundai' AND model = 'Sonata' AND year = 2013)").run();
}

// Si lance directement (`node seed.js`), on execute tout de suite.
if (require.main === module) {
  runSeed();
  console.log('[seed] Termine.');
}

module.exports = { runSeed, appliquerBlocages };
