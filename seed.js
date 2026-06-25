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

function seedAdmin() {
  const count = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
  if (count > 0) return;
  const hash = bcrypt.hashSync(config.admin.password, 10);
  db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(
    config.admin.username,
    hash
  );
  console.log(
    `[seed] Compte admin cree -> identifiant: "${config.admin.username}" ` +
      `(mot de passe defini dans .env / config.js). Changez-le !`
  );
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
     (make, model, year, transmission, doors, weekly_rate, security_deposit,
      mileage_policy, description, is_published, show_year)
     VALUES (@make, @model, @year, @transmission, @doors, @weekly_rate, @security_deposit,
      @mileage_policy, @description, @is_published, @show_year)`
  );
  const insertPhoto = db.prepare(
    `INSERT INTO vehicle_photos (vehicle_id, filename, sort_order, is_primary)
     VALUES (?, ?, ?, ?)`
  );

  const seedAll = db.transaction((items) => {
    for (const v of items) {
      const info = insertVehicle.run({
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
      });
      for (const p of v.photos || []) {
        insertPhoto.run(info.lastInsertRowid, p.filename, p.sort_order || 0, p.is_primary || 0);
      }
    }
  });
  seedAll(catalog);

  console.log(`[seed] Catalogue charge : ${catalog.length} vehicules.`);
}

function runSeed() {
  seedAdmin();
  seedVehicles();
}

// Si lance directement (`node seed.js`), on execute tout de suite.
if (require.main === module) {
  runSeed();
  console.log('[seed] Termine.');
}

module.exports = { runSeed };
