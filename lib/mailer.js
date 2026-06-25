// Envoi de courriel directement par le site (via Gmail SMTP / nodemailer).
// Sert a notifier le proprietaire des nouvelles demandes de reservation,
// meme quand le site est en ligne et que l'ordinateur est eteint.
const nodemailer = require('nodemailer');
const config = require('../config');

// Cree le transporteur seulement si les identifiants sont configures.
let transporter = null;
if (config.mail.user && config.mail.pass) {
  transporter = nodemailer.createTransport({
    host: config.mail.host,
    port: config.mail.port,
    secure: false, // STARTTLS sur le port 587
    auth: { user: config.mail.user, pass: config.mail.pass },
  });
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Envoie une notification de nouvelle demande de reservation au proprietaire.
// "Fire-and-forget" : ne bloque jamais la reponse au client.
function sendReservationNotification(data) {
  if (!transporter) {
    console.warn('[mail] Identifiants courriel non configures, envoi ignore.');
    return;
  }
  const dates =
    data.depart || data.retour
      ? `${data.depart || '?'} au ${data.retour || '?'}`
      : 'Non precisees';
  const messageHtml = data.message
    ? `<div style="background:#f5f5f5;padding:12px;border-radius:8px;margin-top:12px;"><em>« ${escapeHtml(data.message)} »</em></div>`
    : '';

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <div style="background:#1d4ed8;color:#fff;padding:20px;border-radius:8px 8px 0 0;">
        <h2 style="margin:0;">Nouvelle demande de reservation</h2>
        <p style="margin:4px 0 0;opacity:.9;">Recue depuis votre site web</p>
      </div>
      <div style="border:1px solid #e5e5e5;border-top:none;padding:20px;border-radius:0 0 8px 8px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:8px 0;color:#666;width:130px;">Client</td><td style="padding:8px 0;font-weight:bold;">${escapeHtml(data.name)}</td></tr>
          <tr><td style="padding:8px 0;color:#666;">Courriel</td><td style="padding:8px 0;"><a href="mailto:${escapeHtml(data.email)}">${escapeHtml(data.email)}</a></td></tr>
          <tr><td style="padding:8px 0;color:#666;">Telephone</td><td style="padding:8px 0;"><a href="tel:${escapeHtml(data.phone)}">${escapeHtml(data.phone)}</a></td></tr>
          <tr><td style="padding:8px 0;color:#666;">Vehicule</td><td style="padding:8px 0;font-weight:bold;">${escapeHtml(data.vehicle)}</td></tr>
          <tr><td style="padding:8px 0;color:#666;">Dates</td><td style="padding:8px 0;">${escapeHtml(dates)}</td></tr>
        </table>
        ${messageHtml}
      </div>
    </div>`;

  const text =
    `Nouvelle demande de reservation\n\n` +
    `Client : ${data.name}\nCourriel : ${data.email}\nTelephone : ${data.phone}\n` +
    `Vehicule : ${data.vehicle}\nDates : ${dates}\n` +
    (data.message ? `Message : ${data.message}\n` : '');

  transporter
    .sendMail({
      from: `"Location YBMTL" <${config.mail.user}>`,
      to: config.mail.notify,
      replyTo: data.email || config.mail.user,
      subject: `Nouvelle reservation : ${data.name} - ${data.vehicle}`,
      text,
      html,
    })
    .then(() => console.log('[mail] Notification envoyee a', config.mail.notify))
    .catch((err) => console.error('[mail] Echec envoi:', err.message));
}

module.exports = { sendReservationNotification };
