// Page admin « Nouveau contrat » (proprio connecté à l'admin).
// Monté dans routes/admin.js sous /admin/contrat (après la vérification de connexion).
// La même page existe aussi sans le mot de passe de l'admin : /contrat (routes/contrat.js).
const express = require('express');
const router = express.Router();
const service = require('../lib/contrat-service');

router.get('/', (req, res) => {
  res.render('admin/contrat', Object.assign(service.donneesFormulaire(req), {
    mode: 'admin',
    actionGenerer: '/admin/contrat/generer',
    urlAccueil: '/admin/contrat',
    urlConnexion: '/admin/connexion',
  }));
});

router.post('/generer', service.memeOrigine, service.genererHandler);

module.exports = router;
