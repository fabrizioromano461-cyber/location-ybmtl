// Petites fonctions d'affichage reutilisees dans les pages.

// Formate un montant en dollars : 600 -> "600 $"
function money(n) {
  if (n == null) return '';
  return Number(n).toLocaleString('fr-CA') + ' $';
}

// Formate une date AAAA-MM-JJ -> "22 juin 2026"
function frDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('fr-CA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// Date du jour a Montreal (AAAA-MM-JJ), meme si le serveur tourne en UTC (Render).
function todayMontreal() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

// Premier jour de depart possible : le lendemain (pas de location qui commence le jour meme).
function minDepartDate() {
  const d = new Date(todayMontreal() + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

module.exports = { money, frDate, todayMontreal, minDepartDate };
