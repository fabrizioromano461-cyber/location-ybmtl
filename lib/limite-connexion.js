// Limite les essais de connexion ratés au panneau admin, pour qu'on ne puisse pas essayer
// des mots de passe au hasard indéfiniment. Après ESSAIS_MAX échecs en 15 minutes, la connexion
// est bloquée jusqu'à ce que le plus ancien échec ait plus de 15 minutes.
//
// Le compteur est commun à tous les visiteurs (et non par adresse IP) : derrière l'hébergeur,
// toutes les requêtes arrivent par le même relais, et une adresse IP « transmise » pourrait être falsifiée.
// Il est gardé en mémoire : un redémarrage du serveur le remet à zéro, ce qui suffit ici.
const FENETRE_MS = 15 * 60 * 1000;
const ESSAIS_MAX = 10;

let echecs = [];

function nettoyer(maintenant) {
  echecs = echecs.filter((t) => maintenant - t < FENETRE_MS);
}

function estBloque(maintenant = Date.now()) {
  nettoyer(maintenant);
  return echecs.length >= ESSAIS_MAX;
}

// Minutes à attendre avant de pouvoir réessayer (0 si pas bloqué).
function minutesRestantes(maintenant = Date.now()) {
  nettoyer(maintenant);
  if (echecs.length < ESSAIS_MAX) return 0;
  return Math.max(1, Math.ceil((echecs[0] + FENETRE_MS - maintenant) / 60000));
}

function noterEchec(maintenant = Date.now()) {
  nettoyer(maintenant);
  echecs.push(maintenant);
}

function noterReussite() {
  echecs = [];
}

module.exports = { estBloque, minutesRestantes, noterEchec, noterReussite, ESSAIS_MAX };
