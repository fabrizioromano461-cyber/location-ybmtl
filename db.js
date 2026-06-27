// Connexion a la base de donnees SQLite + creation des tables.
// SQLite = un seul fichier (data/app.db), aucune installation de serveur de
// base de donnees requise. Parfait pour un site simple a maintenir.
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const dataDir = path.join(__dirname, 'data');
fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'app.db'));
db.pragma('journal_mode = WAL'); // meilleures performances en lecture/ecriture
db.pragma('foreign_keys = ON');  // respecte les liens entre tables

// Creation des tables si elles n'existent pas encore.
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS vehicles (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  make             TEXT NOT NULL,                 -- marque (ex: Audi)
  model            TEXT NOT NULL,                 -- modele (ex: S5 Coupe)
  year             INTEGER NOT NULL,              -- annee
  transmission     TEXT NOT NULL DEFAULT 'Automatique',
  doors            INTEGER NOT NULL DEFAULT 4,    -- nombre de portes
  weekly_rate      INTEGER NOT NULL,              -- tarif hebdomadaire en $
  security_deposit INTEGER NOT NULL DEFAULT 500,   -- depot de garantie en $ (minimum 500)

  mileage_policy   TEXT NOT NULL DEFAULT 'Kilometrage illimite',
  description      TEXT,
  is_published     INTEGER NOT NULL DEFAULT 1,    -- 1 = visible sur le site
  show_year        INTEGER NOT NULL DEFAULT 1,    -- 1 = affiche l'annee aux clients
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS vehicle_photos (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  filename   TEXT NOT NULL,                     -- nom du fichier dans public/uploads
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_primary INTEGER NOT NULL DEFAULT 0         -- 1 = photo principale de la carte
);

CREATE TABLE IF NOT EXISTS blocked_dates (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  date       TEXT NOT NULL,                     -- format AAAA-MM-JJ
  UNIQUE(vehicle_id, date)
);

CREATE TABLE IF NOT EXISTS requests (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE SET NULL,
  name       TEXT NOT NULL,
  phone      TEXT NOT NULL,
  email      TEXT NOT NULL,
  start_date TEXT,                              -- date de depart souhaitee
  end_date   TEXT,                              -- date de retour souhaitee
  message    TEXT,
  status     TEXT NOT NULL DEFAULT 'nouvelle',  -- 'nouvelle' ou 'traitee'
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_blocked_vehicle ON blocked_dates(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_photos_vehicle ON vehicle_photos(vehicle_id);
`);

// Migrations legeres : ajoute les colonnes manquantes sur une base deja creee.
const vehicleCols = db.prepare('PRAGMA table_info(vehicles)').all().map((c) => c.name);
if (!vehicleCols.includes('show_year')) {
  db.exec('ALTER TABLE vehicles ADD COLUMN show_year INTEGER NOT NULL DEFAULT 1');
}
if (!vehicleCols.includes('security_deposit')) {
  db.exec('ALTER TABLE vehicles ADD COLUMN security_deposit INTEGER NOT NULL DEFAULT 0');
}

// Corrections de noms (idempotent, s'execute a chaque demarrage) : repare une
// base deja seedee avec les anciens noms, meme si le disque persiste.
db.prepare("UPDATE vehicles SET make = 'BMW' WHERE make = 'BMX'").run();
db.prepare("UPDATE vehicles SET model = 'QX70' WHERE model = 'Qx70'").run();

module.exports = db;
