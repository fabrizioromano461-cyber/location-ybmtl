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

module.exports = { money, frDate };
