// Limites anti-abus de la page de contrat des clients (liens privés, voir lib/contrat-lien.js).
// Tout est gardé en mémoire (aucune base de données) : remis à zéro au redémarrage, ce qui suffit à freiner
// les abus. Chaque contrat envoie 1 ou 2 courriels : sans limite, un lien qui circule pourrait servir à
// inonder la boîte du proprio ou celle d'un tiers.
// Les courriels et les liens ne sont gardés que sous forme d'empreinte (on ne garde pas l'adresse elle-même).
const crypto = require('crypto');
const PAR_IP_HEURE = 6;        // contrats par adresse IP et par heure
const GLOBAL_HEURE = 20;       // contrats par heure pour tout le site
const GLOBAL_JOUR = 40;        // contrats par 24 h pour tout le site (protège le quota de courriels : Brevo gratuit = 300/jour)
const PAR_COURRIEL_JOUR = 3;   // copies envoyées à un même courriel par 24 h
const PAR_LIEN_JOUR = 3;       // contrats produits par un même lien par 24 h (un lien = une location)
const HEURE = 3600 * 1000;
const JOUR = 24 * HEURE;

const parIp = new Map();
const parCourriel = new Map();
const parLien = new Map();
let global = [];
let globalJour = [];

const recents = (liste, fenetre, maintenant) => (liste || []).filter((t) => maintenant - t < fenetre);
const empreinte = (courriel) => crypto.createHash('sha256').update(String(courriel).trim().toLowerCase()).digest('hex');

// Adresse IP du visiteur : en ligne le site est derrière Cloudflare puis Render.
function ipDe(req) {
  const brut = req.get('cf-connecting-ip') ||
    (req.get('x-forwarded-for') || '').split(',')[0].trim() ||
    (req.socket && req.socket.remoteAddress) || '';
  return /^[0-9a-fA-F:.]{3,45}$/.test(brut) ? brut : 'inconnue';
}

// Vérifie les limites (sans rien compter). Renvoie { ok: true } ou { ok: false, message }.
// `cleLien` (facultatif) = empreinte du lien utilisé (voir cleLimite dans lib/contrat-lien.js).
function verifier(ip, courriel, maintenant, cleLien) {
  const t = maintenant || Date.now();
  globalJour = recents(globalJour, JOUR, t);
  if (globalJour.length >= GLOBAL_JOUR) {
    return { ok: false, message: 'Le contrat en ligne n’est plus disponible pour aujourd’hui. Appelez-nous pour finaliser votre contrat.' };
  }
  global = recents(global, HEURE, t);
  if (global.length >= GLOBAL_HEURE) {
    return { ok: false, message: 'Beaucoup de contrats sont en cours en ce moment. Réessayez dans quelques minutes.' };
  }
  if (recents(parIp.get(ip), HEURE, t).length >= PAR_IP_HEURE) {
    return { ok: false, message: 'Trop de contrats envoyés depuis cet appareil. Réessayez plus tard ou appelez-nous.' };
  }
  if (cleLien && recents(parLien.get(cleLien), JOUR, t).length >= PAR_LIEN_JOUR) {
    return { ok: false, message: 'Ce lien a déjà servi plusieurs fois aujourd’hui. Si vous avez un problème, appelez-nous.' };
  }
  const c = courriel ? empreinte(courriel) : '';
  if (c && recents(parCourriel.get(c), JOUR, t).length >= PAR_COURRIEL_JOUR) {
    return { ok: false, message: 'Cette adresse courriel a déjà reçu plusieurs copies aujourd’hui. Appelez-nous si vous avez un problème.' };
  }
  return { ok: true };
}

// Compte un contrat envoyé.
function enregistrer(ip, courriel, maintenant, cleLien) {
  const t = maintenant || Date.now();
  global.push(t);
  globalJour.push(t);
  parIp.set(ip, recents(parIp.get(ip), HEURE, t).concat(t));
  if (cleLien) parLien.set(cleLien, recents(parLien.get(cleLien), JOUR, t).concat(t));
  if (courriel) {
    const c = empreinte(courriel);
    parCourriel.set(c, recents(parCourriel.get(c), JOUR, t).concat(t));
  }
  // Ménage : on ne garde pas des milliers d'entrées.
  if (parIp.size > 5000) parIp.clear();
  if (parCourriel.size > 5000) parCourriel.clear();
  if (parLien.size > 5000) parLien.clear();
}

// (pour les tests)
function remiseAZero() { parIp.clear(); parCourriel.clear(); parLien.clear(); global = []; globalJour = []; }

module.exports = {
  ipDe, verifier, enregistrer, remiseAZero,
  PAR_IP_HEURE, GLOBAL_HEURE, GLOBAL_JOUR, PAR_COURRIEL_JOUR, PAR_LIEN_JOUR,
};
