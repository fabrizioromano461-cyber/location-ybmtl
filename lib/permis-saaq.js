// Aide à la vérification du permis auprès de la SAAQ (service officiel « Vérifier la validité d'un permis de conduire »,
// https://saaq.gouv.qc.ca/permis-conduire/verifier-validite-permis).
// Le site ne peut PAS appeler la SAAQ : aucun accès automatique n'est offert, et il faudrait les identifiants du proprio.
// C'est donc le proprio qui vérifie (téléphone ou SAAQclic Entreprises). Ici on lui prépare le numéro au format que la SAAQ
// demande (13 caractères, sans tirets ni espaces) et on signale un numéro qui n'a pas le format d'un permis du Québec
// (permis d'une autre province ou d'un autre pays, ou numéro mal écrit) : la SAAQ ne peut pas le vérifier.
const TELEPHONE = '1 800 361-7620';
const TOUCHES = 'faites le 4, le 4, puis le 6';
const LIEN_SAAQ = 'https://saaq.gouv.qc.ca/permis-conduire/verifier-validite-permis';
const LIEN_ENTREPRISES = 'https://saaqclic-entreprises.saaq.gouv.qc.ca/saaqstorefront/fr/login';

// « T1234-567890-12 » -> { numero: 'T123456789012', quebecois: true }
// Un permis du Québec = une lettre suivie de 12 chiffres (13 caractères).
function numeroSaaq(permis) {
  const numero = String(permis == null ? '' : permis).toUpperCase().replace(/[^A-Z0-9]/g, '');
  return { numero, quebecois: /^[A-Z]\d{12}$/.test(numero) };
}

module.exports = { numeroSaaq, TELEPHONE, TOUCHES, LIEN_SAAQ, LIEN_ENTREPRISES };
