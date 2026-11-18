// Contrôle d'une adresse courriel : (1) la forme, (2) le domaine existe vraiment et reçoit du courriel.
// Sert à la page de contrat des clients, où le courriel est OBLIGATOIRE : la copie du contrat y est envoyée.
// On ne peut pas savoir si la boîte elle-même existe, mais on attrape les fautes de frappe courantes
// (« gmail.con », « hotmial.ccom », oubli du point ou du @, espaces…).
const dns = require('dns').promises;
const { domainToASCII } = require('url');

// Forme pratique d'une adresse (pas toute la norme, mais tout ce qui sert vraiment).
const LOCAL = /^[A-Za-z0-9!#$%&'*+\/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+\/=?^_`{|}~-]+)*$/; // pas de point au début/fin, pas de « .. »
const ETIQUETTE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/;

function courrielValide(c) {
  if (typeof c !== 'string' || c.length > 254 || /\s/.test(c)) return false;
  const i = c.lastIndexOf('@');
  if (i < 1 || c.indexOf('@') !== i) return false; // un seul @
  const local = c.slice(0, i);
  const domaine = c.slice(i + 1);
  if (local.length > 64 || !LOCAL.test(local)) return false;
  const morceaux = domaine.split('.');
  if (morceaux.length < 2 || !morceaux.every((m) => ETIQUETTE.test(m))) return false;
  const fin = morceaux[morceaux.length - 1];
  return /^[A-Za-z]{2,}$/.test(fin) || /^xn--[A-Za-z0-9-]+$/.test(fin);
}

// ---------- Le domaine reçoit-il du courriel ? ----------
const DELAI_MS = 2500;        // par question au DNS
const DELAI_TOTAL_MS = 4500;  // au total : au-delà, on ne bloque pas le client
const ABSENT = new Set(['ENOTFOUND', 'ENODATA']); // « le domaine n'existe pas » / « pas de données de ce type »

function avecDelai(promesse, ms) {
  let minuterie;
  const delai = new Promise((_, rejet) => {
    minuterie = setTimeout(() => rejet(Object.assign(new Error('délai'), { code: 'ETIMEOUT' })), ms);
  });
  return Promise.race([promesse, delai]).finally(() => clearTimeout(minuterie));
}

async function verification(courriel, r) {
  const domaine = domainToASCII(courriel.slice(courriel.lastIndexOf('@') + 1).toLowerCase());
  if (!domaine) return false;
  try {
    const mx = await avecDelai(r.resolveMx(domaine), DELAI_MS);
    // Un MX « . » (vide) veut dire : ce domaine ne reçoit PAS de courriel.
    return mx.some((m) => m.exchange && m.exchange !== '.');
  } catch (e) {
    if (!ABSENT.has(e.code)) return true; // problème de réseau ou de DNS : on ne bloque pas le client
  }
  // Pas de MX : la règle du courriel accepte alors l'adresse A ou AAAA du domaine.
  for (const type of ['resolve4', 'resolve6']) {
    try {
      const adresses = await avecDelai(r[type](domaine), DELAI_MS);
      if (adresses.length) return true;
    } catch (e) {
      if (!ABSENT.has(e.code)) return true;
    }
  }
  return false;
}

// Renvoie true si le domaine existe et reçoit du courriel, false s'il est introuvable.
// En cas de panne ou de lenteur du DNS : true (on préfère laisser passer que bloquer un vrai client).
// `resolveur` : pour les tests seulement.
function domaineCourrielExiste(courriel, resolveur) {
  return avecDelai(verification(courriel, resolveur || dns), DELAI_TOTAL_MS).catch(() => true);
}

module.exports = { courrielValide, domaineCourrielExiste };
