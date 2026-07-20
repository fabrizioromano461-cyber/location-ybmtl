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
  // Vehicule(s) mis en vedette « NOUVEL ARRIVE » en haut du site. Placé ICI
  // (après le chargement du catalogue) pour que ça fonctionne meme quand la
  // base est recréée à neuf. Pour changer la vedette : modifier le WHERE.
  // Pour n'en mettre AUCUNE : commenter la 2e ligne.
  db.prepare('UPDATE vehicles SET is_new = 0').run();
  db.prepare("UPDATE vehicles SET is_new = 1 WHERE make = 'BMW' AND model = 'X1'").run();
  db.prepare("UPDATE vehicles SET is_new = 1 WHERE make = 'Volkswagen' AND model = 'GTI'").run();
}

// Si lance directement (`node seed.js`), on execute tout de suite.
if (require.main === module) {
  runSeed();
  console.log('[seed] Termine.');
}

module.exports = { runSeed };
