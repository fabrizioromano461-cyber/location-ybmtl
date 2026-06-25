// Protege les pages du panneau admin : si l'utilisateur n'est pas connecte,
// on le redirige vers la page de connexion.
function requireLogin(req, res, next) {
  if (req.session && req.session.user) return next();
  return res.redirect('/admin/connexion');
}

module.exports = { requireLogin };
