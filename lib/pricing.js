// Calcul du prix d'une location avec TPS et TVQ.
// Tout est calcule en cents (entiers) pour eviter les erreurs d'arrondi.
// Meme formule que public/js/reservation.js (affichage en direct dans le formulaire).
const config = require('../config');

const TPS_K = Math.round(config.tax.tps * 100000);
const TVQ_K = Math.round(config.tax.tvq * 100000);

// Ajoute la TPS et la TVQ a un sous-total en cents.
function withTaxes(subtotalCents) {
  const tps = Math.round((subtotalCents * TPS_K) / 100000);
  const tvq = Math.round((subtotalCents * TVQ_K) / 100000);
  return { subtotal: subtotalCents, tps, tvq, total: subtotalCents + tps + tvq };
}

// Estimation d'une location : semaines entamees x tarif hebdomadaire + taxes.
// Retourne null si les dates sont absentes ou invalides.
function estimateRental(weeklyRate, depart, retour) {
  if (!depart || !retour) return null;
  const start = Date.parse(depart + 'T00:00:00Z');
  const end = Date.parse(retour + 'T00:00:00Z');
  if (isNaN(start) || isNaN(end) || end <= start) return null;
  const days = Math.round((end - start) / 86400000);
  const weeks = Math.ceil(days / 7);
  return { days, weeks, ...withTaxes(weeks * weeklyRate * 100) };
}

// 31618 -> "316,18 $"
function moneyCents(cents) {
  if (cents == null) return '';
  return (cents / 100).toLocaleString('fr-CA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + ' $';
}

module.exports = { withTaxes, estimateRental, moneyCents };
