// Themes saisonniers du site (heure de Montreal).
//  - HIVER : actif du 1er novembre au 31 mars.
//  - NOEL  : decor de Noel (Pere Noel, sapins, bonhommes de neige), actif du 1er novembre au 1er janvier
//            inclus : il disparait tout seul le 2 janvier, il ne reste alors que le theme hiver.
// Pour forcer ou couper sans toucher au code (variables d'environnement, p. ex. dans Render) :
//   WINTER_THEME=on|off     NOEL_THEME=on|off     (sans variable : selon la date)
function force(valeur) {
  const f = String(valeur || '').trim().toLowerCase();
  if (['on', 'oui', '1', 'true'].includes(f)) return true;
  if (['off', 'non', '0', 'false'].includes(f)) return false;
  return null;
}

// Securite : si la date ne peut pas etre lue pour une raison quelconque, les themes restent coupes
// (le site ne doit JAMAIS tomber a cause d'un theme decoratif).
function moisEtJour(date) {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', month: 'numeric', day: 'numeric' }).formatToParts(date);
    const get = (t) => Number(parts.find((p) => p.type === t).value);
    return { mois: get('month'), jour: get('day') };
  } catch (e) {
    return null;
  }
}

function hiverActif(date = new Date(), env = process.env.WINTER_THEME) {
  const f = force(env);
  if (f !== null) return f;
  const d = moisEtJour(date);
  if (!d) return false;
  return d.mois >= 11 || d.mois <= 3;
}

function noelActif(date = new Date(), env = process.env.NOEL_THEME) {
  const f = force(env);
  if (f !== null) return f;
  const d = moisEtJour(date);
  if (!d) return false;
  return d.mois >= 11 || (d.mois === 1 && d.jour <= 1);
}

module.exports = { hiverActif, noelActif };
