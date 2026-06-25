// Panneau d'administration (protege par mot de passe).
// Gestion des vehicules, des photos, des disponibilites et des demandes.
const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const router = express.Router();
const db = require('../db');
const { requireLogin } = require('../middleware/auth');
const availability = require('../lib/availability');

// --- Configuration de l'envoi de photos (multer) ---
const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safe = 'photo-' + Date.now() + '-' + Math.round(Math.random() * 1e6) + ext;
    cb(null, safe);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 Mo max par photo
  fileFilter: (req, file, cb) => {
    const ok = /image\/(jpeg|png|webp|gif)/.test(file.mimetype);
    cb(ok ? null : new Error('Format d image non supporte'), ok);
  },
});

// ============== CONNEXION / DECONNEXION ==============
router.get('/connexion', (req, res) => {
  if (req.session.user) return res.redirect('/admin');
  res.render('admin/login', { error: req.query.erreur === '1' });
});

router.post('/connexion', (req, res) => {
  const { username, password } = req.body;
  const user = db
    .prepare('SELECT * FROM users WHERE username = ?')
    .get((username || '').trim());
  if (!user || !bcrypt.compareSync(password || '', user.password_hash)) {
    return res.redirect('/admin/connexion?erreur=1');
  }
  req.session.user = { id: user.id, username: user.username };
  res.redirect('/admin');
});

router.post('/deconnexion', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/connexion'));
});

// Toutes les routes ci-dessous exigent d'etre connecte.
router.use(requireLogin);

// ============== TABLEAU DE BORD ==============
router.get('/', (req, res) => {
  const stats = {
    vehicles: db.prepare('SELECT COUNT(*) AS n FROM vehicles').get().n,
    published: db
      .prepare('SELECT COUNT(*) AS n FROM vehicles WHERE is_published = 1')
      .get().n,
    newRequests: db
      .prepare("SELECT COUNT(*) AS n FROM requests WHERE status = 'nouvelle'")
      .get().n,
  };
  const recent = db
    .prepare(
      `SELECT r.*, v.make, v.model FROM requests r
       LEFT JOIN vehicles v ON v.id = r.vehicle_id
       ORDER BY r.created_at DESC LIMIT 5`
    )
    .all();
  res.render('admin/dashboard', { stats, recent });
});

// ============== VEHICULES ==============
router.get('/vehicules', (req, res) => {
  const vehicles = db
    .prepare('SELECT * FROM vehicles ORDER BY make, model')
    .all()
    .map((v) => ({
      ...v,
      photoCount: db
        .prepare('SELECT COUNT(*) AS n FROM vehicle_photos WHERE vehicle_id = ?')
        .get(v.id).n,
    }));
  res.render('admin/vehicles', { vehicles });
});

router.get('/vehicules/nouveau', (req, res) => {
  res.render('admin/vehicle-form', { vehicle: null, photos: [] });
});

router.post('/vehicules', upload.array('photos', 12), (req, res) => {
  const id = createOrUpdateVehicle(req.body, null);
  attachPhotos(id, req.files);
  res.redirect('/admin/vehicules/' + id + '/modifier');
});

router.get('/vehicules/:id/modifier', (req, res) => {
  const vehicle = db
    .prepare('SELECT * FROM vehicles WHERE id = ?')
    .get(req.params.id);
  if (!vehicle) return res.status(404).render('404');
  const photos = db
    .prepare(
      'SELECT * FROM vehicle_photos WHERE vehicle_id = ? ORDER BY is_primary DESC, sort_order, id'
    )
    .all(vehicle.id);
  res.render('admin/vehicle-form', {
    vehicle,
    photos,
    saved: req.query.enregistre === '1',
  });
});

router.post('/vehicules/:id', upload.array('photos', 12), (req, res) => {
  const vehicle = db
    .prepare('SELECT id FROM vehicles WHERE id = ?')
    .get(req.params.id);
  if (!vehicle) return res.status(404).render('404');
  createOrUpdateVehicle(req.body, vehicle.id);
  attachPhotos(vehicle.id, req.files);
  res.redirect('/admin/vehicules/' + vehicle.id + '/modifier?enregistre=1');
});

router.post('/vehicules/:id/supprimer', (req, res) => {
  const photos = db
    .prepare('SELECT filename FROM vehicle_photos WHERE vehicle_id = ?')
    .all(req.params.id);
  for (const p of photos) removeUploadFile(p.filename);
  db.prepare('DELETE FROM vehicles WHERE id = ?').run(req.params.id);
  res.redirect('/admin/vehicules');
});

// ---- Photos ----
router.post('/photos/:id/supprimer', (req, res) => {
  const photo = db
    .prepare('SELECT * FROM vehicle_photos WHERE id = ?')
    .get(req.params.id);
  if (photo) {
    removeUploadFile(photo.filename);
    db.prepare('DELETE FROM vehicle_photos WHERE id = ?').run(photo.id);
  }
  res.redirect('/admin/vehicules/' + (photo ? photo.vehicle_id : '') + '/modifier');
});

router.post('/photos/:id/principale', (req, res) => {
  const photo = db
    .prepare('SELECT * FROM vehicle_photos WHERE id = ?')
    .get(req.params.id);
  if (photo) {
    db.prepare('UPDATE vehicle_photos SET is_primary = 0 WHERE vehicle_id = ?').run(
      photo.vehicle_id
    );
    db.prepare('UPDATE vehicle_photos SET is_primary = 1 WHERE id = ?').run(photo.id);
  }
  res.redirect('/admin/vehicules/' + (photo ? photo.vehicle_id : '') + '/modifier');
});

// ============== DISPONIBILITE (calendrier) ==============
router.get('/vehicules/:id/disponibilite', (req, res) => {
  const vehicle = db
    .prepare('SELECT * FROM vehicles WHERE id = ?')
    .get(req.params.id);
  if (!vehicle) return res.status(404).render('404');
  res.render('admin/availability', {
    vehicle,
    blocked: availability.getBlockedDates(vehicle.id),
  });
});

// API appelee par le calendrier admin pour bloquer/liberer une date.
router.post('/api/disponibilite', (req, res) => {
  const { vehicle_id, date, action } = req.body;
  if (!vehicle_id || !/^\d{4}-\d{2}-\d{2}$/.test(date || '')) {
    return res.status(400).json({ ok: false });
  }
  if (action === 'block') {
    db.prepare(
      'INSERT OR IGNORE INTO blocked_dates (vehicle_id, date) VALUES (?, ?)'
    ).run(vehicle_id, date);
  } else {
    db.prepare('DELETE FROM blocked_dates WHERE vehicle_id = ? AND date = ?').run(
      vehicle_id,
      date
    );
  }
  res.json({ ok: true });
});

// ============== DEMANDES DE RESERVATION ==============
router.get('/demandes', (req, res) => {
  const requests = db
    .prepare(
      `SELECT r.*, v.make, v.model FROM requests r
       LEFT JOIN vehicles v ON v.id = r.vehicle_id
       ORDER BY (r.status = 'nouvelle') DESC, r.created_at DESC`
    )
    .all();
  res.render('admin/requests', { requests });
});

router.post('/demandes/:id/statut', (req, res) => {
  const r = db.prepare('SELECT * FROM requests WHERE id = ?').get(req.params.id);
  if (r) {
    const next = r.status === 'nouvelle' ? 'traitee' : 'nouvelle';
    db.prepare('UPDATE requests SET status = ? WHERE id = ?').run(next, r.id);
  }
  res.redirect('/admin/demandes');
});

router.post('/demandes/:id/supprimer', (req, res) => {
  db.prepare('DELETE FROM requests WHERE id = ?').run(req.params.id);
  res.redirect('/admin/demandes');
});

// ============== FONCTIONS UTILITAIRES ==============
function createOrUpdateVehicle(body, id) {
  const data = {
    make: (body.make || '').trim(),
    model: (body.model || '').trim(),
    year: parseInt(body.year, 10) || new Date().getFullYear(),
    transmission: (body.transmission || 'Automatique').trim(),
    doors: parseInt(body.doors, 10) || 4,
    weekly_rate: parseInt(body.weekly_rate, 10) || 0,
    security_deposit: parseInt(body.security_deposit, 10) || 0,
    mileage_policy: (body.mileage_policy || 'Kilometrage illimite').trim(),
    description: (body.description || '').trim(),
    is_published: body.is_published ? 1 : 0,
    show_year: body.show_year ? 1 : 0,
  };
  if (id) {
    db.prepare(
      `UPDATE vehicles SET make=@make, model=@model, year=@year,
       transmission=@transmission, doors=@doors, weekly_rate=@weekly_rate,
       security_deposit=@security_deposit, mileage_policy=@mileage_policy, description=@description,
       is_published=@is_published, show_year=@show_year WHERE id=@id`
    ).run({ ...data, id });
    return id;
  }
  const info = db
    .prepare(
      `INSERT INTO vehicles
       (make, model, year, transmission, doors, weekly_rate, security_deposit, mileage_policy, description, is_published, show_year)
       VALUES (@make, @model, @year, @transmission, @doors, @weekly_rate, @security_deposit, @mileage_policy, @description, @is_published, @show_year)`
    )
    .run(data);
  return info.lastInsertRowid;
}

function attachPhotos(vehicleId, files) {
  if (!files || files.length === 0) return;
  const existing = db
    .prepare('SELECT COUNT(*) AS n FROM vehicle_photos WHERE vehicle_id = ?')
    .get(vehicleId).n;
  const insert = db.prepare(
    `INSERT INTO vehicle_photos (vehicle_id, filename, sort_order, is_primary)
     VALUES (?, ?, ?, ?)`
  );
  files.forEach((f, i) => {
    const isPrimary = existing === 0 && i === 0 ? 1 : 0; // 1re photo = principale
    insert.run(vehicleId, f.filename, existing + i, isPrimary);
  });
}

// Supprime un fichier image du dossier uploads (sauf les placeholders fournis).
function removeUploadFile(filename) {
  if (!filename || filename.startsWith('placeholder-')) return;
  const p = path.join(uploadDir, filename);
  fs.access(p, fs.constants.F_OK, (err) => {
    if (!err) fs.unlink(p, () => {});
  });
}

module.exports = router;
