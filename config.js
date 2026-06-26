// Configuration centrale du site Location YBMTL.
// Les valeurs sensibles (mot de passe admin, secret de session) viennent
// du fichier .env. Voir .env.example pour la liste.
require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  sessionSecret: process.env.SESSION_SECRET || 'changez-ce-secret-en-production',

  // Identifiants du tout premier compte administrateur, créé au démarrage
  // s'il n'existe aucun utilisateur. À changer ensuite via .env (ou plus tard
  // dans le panneau admin si on ajoute la gestion des comptes).
  admin: {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || 'ybmtl2026',
  },

  // Coordonnées de l'entreprise (affichées dans le pied de page / contact).
  company: {
    name: 'Location YBMTL',
    city: 'Montréal, Québec',
    phone: process.env.COMPANY_PHONE || '(514) 000-0000',
    email: process.env.COMPANY_EMAIL || 'locationyb514@outlook.com',
  },

  // URL de l'API du CRM. Les demandes de reservation y sont transferees
  // automatiquement (creation d'un prospect + notification courriel).
  crmApiUrl: process.env.CRM_API_URL || 'http://127.0.0.1:8000',

  // Envoi de courriel directement par le site (independant du CRM).
  // Permet de recevoir une notification meme quand le site est en ligne
  // et que l'ordinateur/CRM est eteint. Utilise Gmail SMTP (mot de passe
  // d'application). Les valeurs sensibles viennent de .env / des variables
  // d'environnement Render.
  mail: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASSWORD || '',
    // Adresse qui recoit les notifications de nouvelles demandes.
    notify: process.env.NOTIFY_EMAIL || process.env.SMTP_USER || '',
    // Cle API Brevo (envoi par API web). Necessaire en ligne sur Render,
    // car Render bloque le SMTP direct. Si presente, on l'utilise en priorite.
    brevoApiKey: process.env.BREVO_API_KEY || '',
    // Expediteur affiche (doit etre un expediteur verifie dans Brevo).
    sender: process.env.SENDER_EMAIL || process.env.NOTIFY_EMAIL || process.env.SMTP_USER || '',
  },
};
