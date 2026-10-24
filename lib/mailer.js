// Envoi de courriel pour notifier le proprietaire des nouvelles demandes.
// - EN LIGNE (Render) : via l'API web de Brevo, car Render bloque le SMTP direct.
// - EN LOCAL : repli sur Gmail SMTP (nodemailer) si pas de cle Brevo.
const config = require('../config');
const { moneyCents } = require('./pricing');
const { money, frDate } = require('./format');

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

// ============================================================
// Courriel de CONFIRMATION envoye au CLIENT apres sa demande
// ("Demande bien recue" + resume + prochaines etapes). Ce n'est PAS une confirmation de
// reservation : le proprietaire confirme ensuite par telephone ou courriel.
// Le formulaire est public : pour qu'on ne puisse pas s'en servir afin d'envoyer des courriels
// a n'importe qui, un meme courriel en recoit au plus 3 par 24 h et le site en envoie au plus
// 30 par heure. Le message du client n'est jamais repris dans ce courriel.
// ============================================================
const MAX_PAR_DESTINATAIRE_PAR_JOUR = 3;
const MAX_PAR_HEURE = 30;
const envoisParDestinataire = new Map(); // courriel -> horodatages
let envoisRecents = [];

function confirmationAutorisee(email, maintenant = Date.now()) {
  const cle = email.toLowerCase();
  envoisRecents = envoisRecents.filter((t) => maintenant - t < 3600000);
  const dest = (envoisParDestinataire.get(cle) || []).filter((t) => maintenant - t < 86400000);
  if (envoisRecents.length >= MAX_PAR_HEURE || dest.length >= MAX_PAR_DESTINATAIRE_PAR_JOUR) {
    envoisParDestinataire.set(cle, dest);
    return false;
  }
  dest.push(maintenant);
  envoisParDestinataire.set(cle, dest);
  envoisRecents.push(maintenant);
  if (envoisParDestinataire.size > 500) {
    for (const [k, v] of envoisParDestinataire) {
      if (!v.some((t) => maintenant - t < 86400000)) envoisParDestinataire.delete(k);
    }
  }
  return true;
}

// Prenom a afficher dans « Bonjour ... » : seulement s'il ressemble a un vrai prenom.
function prenomSur(nom) {
  const premier = String(nom || '').trim().split(/\s+/)[0] || '';
  return /^[\p{L}][\p{L}'’-]{0,29}$/u.test(premier) ? premier : '';
}

function buildConfirmation(data) {
  const c = config.company;
  const site = 'https://locationybmtl.ca';
  const tel = String(c.phone || '').replace(/[^0-9+]/g, '');
  const prenom = prenomSur(data.name);
  const salut = prenom ? `Bonjour ${escapeHtml(prenom)},` : 'Bonjour,';
  const dates =
    data.depart && data.retour
      ? `du ${frDate(data.depart)} au ${frDate(data.retour)}`
      : 'à confirmer avec vous';
  const est = data.estimate;
  const pct = (r) => (r * 100).toLocaleString('fr-CA', { maximumFractionDigits: 3 });
  const ligne = (a, b, fort) =>
    `<tr><td style="padding:6px 12px;color:${fort ? '#1c2430' : '#666'};${fort ? 'font-weight:bold;border-top:1px solid #ccd3e0;' : ''}">${a}</td>` +
    `<td style="padding:6px 12px;text-align:right;${fort ? 'font-weight:bold;border-top:1px solid #ccd3e0;' : ''}">${b}</td></tr>`;
  const estimateHtml = est
    ? `<table style="width:100%;border-collapse:collapse;margin-top:14px;background:#f5f7fb;border-radius:8px;">
          ${ligne(`Sous-total (${est.weeks} semaine${est.weeks > 1 ? 's' : ''})`, moneyCents(est.subtotal))}
          ${ligne(`TPS (${pct(config.tax.tps)} %)`, moneyCents(est.tps))}
          ${ligne(`TVQ (${pct(config.tax.tvq)} %)`, moneyCents(est.tvq))}
          ${ligne('Total estimé (taxes incluses)', moneyCents(est.total), true)}
        </table>`
    : '';
  const depot = Number(data.deposit) > 0 ? money(data.deposit) : '';
  const depotHtml = depot
    ? `<p style="margin:14px 0 0;font-size:14px;color:#444;">Dépôt de garantie : <strong>${depot}</strong> (non taxé), demandé à la prise du véhicule et remis à la fin de la location, sous réserve du contrat.</p>`
    : '';
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1c2430;">
      <div style="background:#1d4ed8;color:#fff;padding:20px;border-radius:8px 8px 0 0;">
        <h2 style="margin:0;">Demande bien reçue</h2>
        <p style="margin:4px 0 0;opacity:.9;">${escapeHtml(c.name)}</p>
      </div>
      <div style="border:1px solid #e5e5e5;border-top:none;padding:20px;border-radius:0 0 8px 8px;line-height:1.55;">
        <p style="margin-top:0;">${salut}</p>
        <p>Merci de votre demande ! Nous l'avons bien reçue. Voici le résumé :</p>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:6px 0;color:#666;width:110px;">Véhicule</td><td style="padding:6px 0;font-weight:bold;">${escapeHtml(data.vehicle)}</td></tr>
          <tr><td style="padding:6px 0;color:#666;">Dates</td><td style="padding:6px 0;">${escapeHtml(dates)}</td></tr>
        </table>
        ${estimateHtml}
        ${depotHtml}
        <h3 style="margin:22px 0 6px;">Et maintenant ?</h3>
        <p style="margin:0 0 10px;"><strong>Ceci n'est pas encore une confirmation de réservation.</strong> Nous vous contactons rapidement par téléphone ou courriel pour confirmer la disponibilité du véhicule et les détails de la prise en charge. Aucun paiement en ligne n'est requis.</p>
        <p style="margin:0 0 10px;">La remise du véhicule se fait à Laval : le point de rencontre exact vous est communiqué 48 heures avant le début de la location, avec un appel de confirmation.</p>
        <p style="margin:16px 0 0;">Une question ou un changement de dates ? Répondez simplement à ce courriel ou appelez-nous au <a href="tel:${tel}" style="color:#1d4ed8;">${escapeHtml(c.phone)}</a>.</p>
        <p style="margin:14px 0 0;font-size:14px;">En attendant : <a href="${site}/faq" style="color:#1d4ed8;">questions fréquentes</a> · <a href="${site}/conditions" style="color:#1d4ed8;">contrat et conditions</a></p>
      </div>
      <p style="font-size:12px;color:#888;text-align:center;margin:14px 0 0;">Vous recevez ce courriel parce qu'une demande de location a été faite avec cette adresse sur locationybmtl.ca. <a href="${site}/confidentialite" style="color:#888;">Politique de confidentialité</a></p>
    </div>`;
  const text =
    `${prenom ? `Bonjour ${prenom},` : 'Bonjour,'}\n\n` +
    `Merci de votre demande ! Nous l'avons bien recue. Voici le resume :\n\n` +
    `Vehicule : ${data.vehicle}\nDates : ${dates}\n` +
    (est
      ? `Sous-total (${est.weeks} sem.) : ${moneyCents(est.subtotal)}\nTPS : ${moneyCents(est.tps)}\nTVQ : ${moneyCents(est.tvq)}\n` +
        `Total estime (taxes incluses) : ${moneyCents(est.total)}\n`
      : '') +
    (depot ? `Depot de garantie : ${depot} (non taxe), demande a la prise du vehicule et remis a la fin de la location, sous reserve du contrat.\n` : '') +
    `\nCeci n'est pas encore une confirmation de reservation. Nous vous contactons rapidement par telephone ou courriel ` +
    `pour confirmer la disponibilite du vehicule et les details de la prise en charge. Aucun paiement en ligne n'est requis.\n\n` +
    `La remise du vehicule se fait a Laval : le point de rencontre exact vous est communique 48 heures avant le debut de la location, avec un appel de confirmation.\n\n` +
    `Une question ou un changement de dates ? Repondez a ce courriel ou appelez-nous au ${c.phone}.\n` +
    `Questions frequentes : ${site}/faq\nContrat et conditions : ${site}/conditions\n\n` +
    `Vous recevez ce courriel parce qu'une demande de location a ete faite avec cette adresse sur locationybmtl.ca. ` +
    `Politique de confidentialite : ${site}/confidentialite\n`;
  return { subject: 'Demande bien reçue - Location YBMTL', html, text };
}

async function sendConfirmationViaBrevo(to, mail) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': config.mail.brevoApiKey,
      'content-type': 'application/json',
      'accept': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: 'Location YBMTL', email: config.mail.sender },
      to: [{ email: to }],
      replyTo: { email: config.mail.notify || config.mail.sender },
      subject: mail.subject,
      htmlContent: mail.html,
      textContent: mail.text,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Brevo ${res.status}: ${body.slice(0, 200)}`);
  }
}

async function sendConfirmationViaSmtp(to, mail) {
  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    host: config.mail.host,
    port: config.mail.port,
    secure: false,
    auth: { user: config.mail.user, pass: config.mail.pass },
  });
  await transporter.sendMail({
    from: `"Location YBMTL" <${config.mail.user}>`,
    to,
    replyTo: config.mail.notify || config.mail.user,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
  });
}

// "Fire-and-forget" comme la notification : ne bloque jamais la reponse au client.
function sendClientConfirmation(data) {
  if (!config.mail.confirmationClient) return;
  const email = String((data && data.email) || '').trim();
  if (email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
  if (!confirmationAutorisee(email)) {
    console.warn('[mail] Confirmation client ignoree (limite atteinte).');
    return;
  }
  const mail = buildConfirmation({ ...data, email });
  let send;
  if (config.mail.brevoApiKey && config.mail.sender) {
    send = sendConfirmationViaBrevo(email, mail);
  } else if (config.mail.user && config.mail.pass) {
    send = sendConfirmationViaSmtp(email, mail);
  } else {
    return;
  }
  Promise.resolve(send)
    .then(() => console.log('[mail] Confirmation envoyee au client.'))
    .catch((err) => console.error('[mail] Echec confirmation client:', err.message));
}

module.exports = { sendReservationNotification, sendClientConfirmation, confirmationAutorisee, buildConfirmation };
