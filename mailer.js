// Envoi de courriel pour notifier le proprietaire des nouvelles demandes.
// - EN LIGNE (Render) : via l'API web de Brevo, car Render bloque le SMTP direct.
// - EN LOCAL : repli sur Gmail SMTP (nodemailer) si pas de cle Brevo.
const config = require('../config');
const { moneyCents } = require('./pricing');

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildContent(data) {
  const dates =
    data.depart || data.retour
      ? `${data.depart || '?'} au ${data.retour || '?'}`
      : 'Non precisees';
  const messageHtml = data.message
    ? `<div style="background:#f5f5f5;padding:12px;border-radius:8px;margin-top:12px;"><em>« ${escapeHtml(data.message)} »</em></div>`
    : '';
  const est = data.estimate;
  const pct = (r) => (r * 100).toLocaleString('fr-CA', { maximumFractionDigits: 3 });
  const estimateHtml = est
    ? `<table style="width:100%;border-collapse:collapse;margin-top:14px;background:#f5f7fb;border-radius:8px;">
          <tr><td style="padding:6px 12px;color:#666;">Sous-total (${est.weeks} semaine${est.weeks > 1 ? 's' : ''})</td><td style="padding:6px 12px;text-align:right;">${moneyCents(est.subtotal)}</td></tr>
          <tr><td style="padding:6px 12px;color:#666;">TPS (${pct(config.tax.tps)} %)</td><td style="padding:6px 12px;text-align:right;">${moneyCents(est.tps)}</td></tr>
          <tr><td style="padding:6px 12px;color:#666;">TVQ (${pct(config.tax.tvq)} %)</td><td style="padding:6px 12px;text-align:right;">${moneyCents(est.tvq)}</td></tr>
          <tr><td style="padding:8px 12px;font-weight:bold;border-top:1px solid #ccd3e0;">Total estime (taxes incluses)</td><td style="padding:8px 12px;text-align:right;font-weight:bold;border-top:1px solid #ccd3e0;">${moneyCents(est.total)}</td></tr>
        </table>`
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
        ${estimateHtml}
        ${messageHtml}
      </div>
    </div>`;
  const text =
    `Nouvelle demande de reservation\n\n` +
    `Client : ${data.name}\nCourriel : ${data.email}\nTelephone : ${data.phone}\n` +
    `Vehicule : ${data.vehicle}\nDates : ${dates}\n` +
    (est
      ? `Sous-total (${est.weeks} sem.) : ${moneyCents(est.subtotal)}\n` +
        `TPS : ${moneyCents(est.tps)}\nTVQ : ${moneyCents(est.tvq)}\n` +
        `Total estime (taxes incluses) : ${moneyCents(est.total)}\n`
      : '') +
    (data.message ? `Message : ${data.message}\n` : '');
  return { dates, html, text, subject: `Nouvelle reservation : ${data.name} - ${data.vehicle}` };
}

// Envoi via l'API web de Brevo (fonctionne sur Render).
async function sendViaBrevo(data) {
  const { html, text, subject } = buildContent(data);
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': config.mail.brevoApiKey,
      'content-type': 'application/json',
      'accept': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: 'Location YBMTL', email: config.mail.sender },
      to: [{ email: config.mail.notify }],
      replyTo: { email: data.email || config.mail.sender },
      subject,
      htmlContent: html,
      textContent: text,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Brevo ${res.status}: ${body.slice(0, 200)}`);
  }
}

// Envoi via Gmail SMTP (local seulement).
async function sendViaSmtp(data) {
  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    host: config.mail.host,
    port: config.mail.port,
    secure: false,
    auth: { user: config.mail.user, pass: config.mail.pass },
  });
  const { html, text, subject } = buildContent(data);
  await transporter.sendMail({
    from: `"Location YBMTL" <${config.mail.user}>`,
    to: config.mail.notify,
    replyTo: data.email || config.mail.user,
    subject, text, html,
  });
}

// Notification de nouvelle demande. "Fire-and-forget" : ne bloque pas la reponse.
function sendReservationNotification(data) {
  let send;
  if (config.mail.brevoApiKey && config.mail.sender) {
    send = sendViaBrevo(data);
  } else if (config.mail.user && config.mail.pass) {
    send = sendViaSmtp(data);
  } else {
    console.warn('[mail] Aucun service courriel configure, envoi ignore.');
    return;
  }
  Promise.resolve(send)
    .then(() => console.log('[mail] Notification envoyee a', config.mail.notify))
    .catch((err) => console.error('[mail] Echec envoi:', err.message));
}

module.exports = { sendReservationNotification };
