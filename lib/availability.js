// Petite bibliotheque pour gerer la disponibilite des vehicules.
// Une date "bloquee" = une journee ou le vehicule n'est pas disponible
// (loue, en entretien, etc.). C'est l'admin qui les ajoute manuellement.
const db = require('../db');

// Retourne toutes les dates AAAA-MM-JJ entre start et end (inclus).
function datesInRange(start, end) {
  const out = [];
  if (!start || !end) return out;
  const d = new Date(start + 'T00:00:00');
  const last = new Date(end + 'T00:00:00');
  if (isNaN(d) || isNaN(last) || d > last) return out;
  while (d <= last) {
    out.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

// Retourne la liste des dates bloquees d'un vehicule (tableau de AAAA-MM-JJ).
function getBlockedDates(vehicleId) {
  return db
    .prepare('SELECT date FROM blocked_dates WHERE vehicle_id = ? ORDER BY date')
    .all(vehicleId)
    .map((r) => r.date);
}

// Vrai si le vehicule est libre sur TOUTE la periode [start, end].
function isAvailableForRange(vehicleId, start, end) {
  const range = datesInRange(start, end);
  if (range.length === 0) return true; // pas de periode demandee = on ne filtre pas
  const placeholders = range.map(() => '?').join(',');
  const row = db
    .prepare(
      `SELECT COUNT(*) AS n FROM blocked_dates
       WHERE vehicle_id = ? AND date IN (${placeholders})`
    )
    .get(vehicleId, ...range);
  return row.n === 0;
}

// Vrai si le vehicule est loue/bloque aujourd'hui (pour le badge des cartes).
function isRentedToday(vehicleId) {
  const today = new Date().toISOString().slice(0, 10);
  const row = db
    .prepare('SELECT 1 FROM blocked_dates WHERE vehicle_id = ? AND date = ?')
    .get(vehicleId, today);
  return !!row;
}

module.exports = {
  datesInRange,
  getBlockedDates,
  isAvailableForRange,
  isRentedToday,
};
