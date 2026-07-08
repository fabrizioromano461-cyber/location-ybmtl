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

// Tarifs et depots synchronises (idempotent, s'execute a chaque demarrage).
// Garantit les bonnes valeurs en ligne meme si la base persiste entre les
// deploiements. Pour changer un prix/depot de facon PERMANENTE : modifier ici
// ET dans seed-catalog.json (les deux doivent rester coherents).
const _majTarif = db.prepare('UPDATE vehicles SET weekly_rate = ? WHERE make = ? AND model = ?');
const _majDepot = db.prepare('UPDATE vehicles SET security_deposit = ? WHERE make = ? AND model = ?');
[
  { make: 'Audi',     model: 'S5 Coupé',    rate: 800, deposit: 2000 },
  { make: 'Infiniti', model: 'QX70',                   deposit: 700 },
  { make: 'Cadillac', model: 'Escalade XT', rate: 500, deposit: 900 },
  { make: 'Kia',      model: 'Sorento',     rate: 500, deposit: 800 },
  { make: 'Mazda',    model: '6',                      deposit: 700 },
  { make: 'Acura',    model: 'MDX',         rate: 400, deposit: 800 },
].forEach((t) => {
  if (t.rate != null) _majTarif.run(t.rate, t.make, t.model);
  if (t.deposit != null) _majDepot.run(t.deposit, t.make, t.model);
});

// Nouveaux vehicules ajoutes apres coup (idempotent). Sur la base EN LIGNE qui
// persiste (deja seedee), on insere les vehicules manquants. Sur une base vide,
// on ne fait rien ici : seedVehicles() chargera tout le catalogue (qui les
// contient deja). Garder coherent avec seed-catalog.json.
const _nbVeh = db.prepare('SELECT COUNT(*) AS n FROM vehicles').get().n;
if (_nbVeh > 0) {
  const _nouveaux = [
    {
      make: 'Nissan', model: 'Rogue', year: 2012, transmission: 'Automatique', doors: 4,
      weekly_rate: 300, security_deposit: 500, mileage_policy: 'Kilometrage illimite',
      description: 'Spacieux, confortable et pratique, le Nissan Rogue offre une conduite agréable et un bon espace intérieur. Un excellent choix pour les déplacements quotidiens, les voyages et les escapades de fin de semaine.',
      photos: [
        { filename: 'nissan-rogue-face.jpg', sort_order: 0, is_primary: 1 },
        { filename: 'nissan-rogue-arriere.jpg', sort_order: 10, is_primary: 0 },
        { filename: 'nissan-rogue-interieur.jpg', sort_order: 20, is_primary: 0 },
      ],
    },
    {
      make: 'Acura', model: 'RDX', year: 2011, transmission: 'Automatique', doors: 4,
      weekly_rate: 300, security_deposit: 500, mileage_policy: 'Kilometrage illimite',
      description: "Sportif, confortable et polyvalent, l'Acura RDX offre une conduite agréable et un intérieur spacieux. Un excellent choix pour les déplacements quotidiens, les voyages et les escapades de fin de semaine.",
      photos: [
        { filename: 'acura-rdx-arriere.jpg', sort_order: 0, is_primary: 1 },
      ],
    },
  ];
  const _findVeh = db.prepare('SELECT id FROM vehicles WHERE make = ? AND model = ? AND year = ?');
  const _insVeh = db.prepare(
    `INSERT INTO vehicles (make, model, year, transmission, doors, weekly_rate,
       security_deposit, mileage_policy, description, is_published, show_year)
     VALUES (@make, @model, @year, @transmission, @doors, @weekly_rate,
       @security_deposit, @mileage_policy, @description, 1, 1)`
  );
  const _insPhoto = db.prepare(
    'INSERT INTO vehicle_photos (vehicle_id, filename, sort_order, is_primary) VALUES (?, ?, ?, ?)'
  );
  for (const v of _nouveaux) {
    if (_findVeh.get(v.make, v.model, v.year)) continue; // deja present
    const info = _insVeh.run({
      make: v.make, model: v.model, year: v.year, transmission: v.transmission,
      doors: v.doors, weekly_rate: v.weekly_rate, security_deposit: v.security_deposit,
      mileage_policy: v.mileage_policy, description: v.description,
    });
    for (const p of v.photos) {
      _insPhoto.run(info.lastInsertRowid, p.filename, p.sort_order, p.is_primary);
    }
  }
}

module.exports = db;
