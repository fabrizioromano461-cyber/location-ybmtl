// Page de contrat des CLIENTS : https://locationybmtl.ca/contrat/<lien>
// Le lien est PRIVÉ : le proprio le crée pour chaque location confirmée (panneau admin > Lien client) et l'envoie
// lui-même au client. Sans lien valide (signé, non expiré), la page refuse : personne ne peut remplir un contrat
// de son propre chef, et /contrat tout seul n'ouvre rien. Voir lib/contrat-lien.js et lib/contrat-client.js.
// Monté dans server.js sous /contrat. (La page du proprio, elle, reste /admin/contrat.)
const express = require('express');
const router = express.Router();
const service = require('../lib/contrat-service'); // memeOrigine : refuse les envois venant d'un autre site
const client = require('../lib/contrat-client');

// Jamais gardée en cache (contient des renseignements personnels), jamais indexée par Google.
router.use((req, res, next) => {
  res.set({ 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' });
  next();
});

// Sans lien : rien à voir ici.
router.get('/', (req, res) => client.invalide(res, 'invalide', 404));

router.post('/generer', service.memeOrigine, client.genererHandler);

// Le lien du client : /contrat/<voiture>.<dates>....<signature>
router.get('/:lien', client.page);

module.exports = router;
