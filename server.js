// Point d'entree du site Location YBMTL.
// Lance le serveur web, branche les pages publiques et le panneau admin.
const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const path = require('path');
const config = require('./config');
const { runSeed } = require('./seed');
const { money, frDate } = require('./lib/format');

// Cree le compte admin + le vehicule de demo au premier lancement.
runSeed();

const app = express();

// Moteur de pages (EJS = HTML avec des variables, aucune compilation).
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Lecture des formulaires et du JSON envoye par le calendrier admin.
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Fichiers statiques (CSS, JS, images, photos televersees).
app.use(express.static(path.join(__dirname, 'public')));

// Sessions (pour garder la connexion admin). Stockees dans data/sessions.db
// pour survivre aux redemarrages du serveur.
app.use(
  session({
    store: new SQLiteStore({ db: 'sessions.db', dir: path.join(__dirname, 'data') }),
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 * 24 * 7 }, // 7 jours
  })
);

// Variables disponibles dans toutes les pages.
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  res.locals.company = config.company;
  res.locals.money = money;
  res.locals.frDate = frDate;
  res.locals.path = req.path;
  next();
});

// Routes.
app.use('/', require('./routes/public'));
app.use('/admin', require('./routes/admin'));

// Page 404.
app.use((req, res) => res.status(404).render('404'));

app.listen(config.port, () => {
  console.log('');
  console.log('  Location YBMTL est en ligne !');
  console.log('  Site public  : http://localhost:' + config.port);
  console.log('  Panneau admin: http://localhost:' + config.port + '/admin');
  console.log('');
});
