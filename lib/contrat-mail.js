// Envoi du contrat signé par courriel (PDF en pièce jointe) : une copie pour le proprio, une pour le client.
// - EN LIGNE (Render) : via l'API web de Brevo (Render bloque le SMTP direct).
// - EN LOCAL : repli sur Gmail SMTP (nodemailer) si pas de clé Brevo.
const config = require('../config');
const { fmtDateHeure, argent } = require('./contrat-pdf');
const { frDate } = require('./format');

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function viaBrevo(m) {
  const corps = {
    sender: { name: 'Location YBMTL', email: config.mail.sender },
    to: [m.toName ? { email: m.to, name: m.toName } : { email: m.to }],
    replyTo: { email: m.replyTo || config.mail.sender },
    subject: m.subject,
    htmlContent: m.html,
    textContent: m.text,
  };
  if (m.pdf) corps.attachment = [{ name: m.filename, content: m.pdf.toString('base64') }]; // pas de pièce jointe pour le code de connexion
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': config.mail.brevoApiKey,
      'content-type': 'application/json',
      'accept': 'application/json',
    },
    body: JSON.stringify(corps),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Brevo ${res.status}: ${body.slice(0, 200)}`);
  }
}

async function viaSmtp(m) {
  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    host: config.mail.host,
    port: config.mail.port,
    secure: false,
    auth: { user: config.mail.user, pass: config.mail.pass },
  });
  await transporter.sendMail({
    from: `"Location YBMTL" <${config.mail.user}>`,
    to: m.toName ? `"${m.toName.replace(/"/g, '')}" <${m.to}>` : m.to,
    replyTo: m.replyTo || config.mail.user,
    subject: m.subject,
    text: m.text,
    html: m.html,
    attachments: m.pdf ? [{ filename: m.filename, content: m.pdf, contentType: 'application/pdf' }] : [],
  });
}

function envoyer(m) {
  if (config.mail.brevoApiKey && config.mail.sender) return viaBrevo(m);
  if (config.mail.user && config.mail.pass) return viaSmtp(m);
  return Promise.reject(new Error('Aucun service courriel configuré'));
}

function cadre(titre, sousTitre, corps) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <div style="background:#1d4ed8;color:#fff;padding:20px;border-radius:8px 8px 0 0;">
        <h2 style="margin:0;">${titre}</h2>
        <p style="margin:4px 0 0;opacity:.9;">${sousTitre}</p>
      </div>
      <div style="border:1px solid #e5e5e5;border-top:none;padding:20px;border-radius:0 0 8px 8px;">${corps}</div>
    </div>`;
}

function tableau(lignes) {
  return '<table style="width:100%;border-collapse:collapse;margin:12px 0;">' +
    lignes.map(([k, v]) =>
      `<tr><td style="padding:6px 0;color:#666;width:150px;vertical-align:top;">${esc(k)}</td><td style="padding:6px 0;font-weight:bold;">${esc(v)}</td></tr>`
    ).join('') + '</table>';
}

// Envoie les copies. Renvoie { yb, client } avec 'envoye' | 'echec' | 'aucun' (jamais d'exception).
async function envoyerContrat({ d, ref, calc, nomFichier, pdf, copieClient }) {
  const statut = { yb: 'aucun', client: 'aucun' };
  const resume = [
    ['Véhicule', d.vehicule + (d.annee ? ' ' + d.annee : '')],
    ['Départ', fmtDateHeure(d.departDate, d.departHeure)],
    ['Retour', fmtDateHeure(d.retourDate, d.retourHeure)],
    ['Total (taxes incluses)', argent(calc.total)],
    ['Dépôt de garantie', argent(d.depotCents)],
  ];
  const resumeTexte = resume.map(([k, v]) => `${k} : ${v}`).join('\n');
  const tel = config.company.phone;
  const reponse = config.company.email;

  // Copie pour le proprio (toujours).
  if (config.mail.notify) {
    const infos = [
      ['Locataire', d.nom],
      ['Téléphone', d.telephone],
      ['Courriel', d.courriel || '—'],
      ['Permis', d.permis],
      ['Plaque', d.plaque],
      ...(d.papier ? [['Signé sur papier le', frDate(d.signeLe)]] : []),
      ...resume,
      ['Copie au client', copieClient && d.courriel ? 'envoyée à ' + d.courriel : 'non envoyée'],
    ];
    try {
      await envoyer({
        to: config.mail.notify,
        replyTo: d.courriel || undefined,
        subject: d.papier ? `Copie du contrat papier : ${d.nom} — ${d.vehicule}` : `Contrat signé : ${d.nom} — ${d.vehicule}`,
        html: cadre(d.papier ? 'Copie de contrat (signé sur papier)' : 'Contrat de location signé', 'Référence ' + esc(ref),
          `<p>${d.papier
            ? 'Copie du contrat signé sur papier le ' + esc(frDate(d.signeLe)) + '. Elle est en pièce jointe.'
            : 'Le contrat est signé. Il est en pièce jointe.'}</p>${tableau(infos)}`),
        text: `${d.papier ? 'Copie de contrat signé sur papier' : 'Contrat de location signé'} (${ref})\n\n` +
          infos.map(([k, v]) => `${k} : ${v}`).join('\n') + '\n',
        filename: nomFichier,
        pdf,
      });
      statut.yb = 'envoye';
    } catch (e) {
      console.error('[contrat] Echec envoi (proprio):', e.message);
      statut.yb = 'echec';
    }
  }

  // Copie pour le client (si demandé et si on a son courriel).
  if (copieClient && d.courriel) {
    try {
      await envoyer({
        to: d.courriel,
        toName: d.nom,
        replyTo: reponse,
        subject: d.papier ? 'Copie de votre contrat de location — Location YBMTL' : 'Votre contrat de location — Location YBMTL',
        html: cadre(d.papier ? 'Copie de votre contrat de location' : 'Votre contrat de location', 'Location YBMTL',
          `<p>Bonjour ${esc(d.nom)},</p>
           <p>${d.papier
             ? "Merci d'avoir choisi Location YBMTL ! Vous trouverez en pièce jointe une copie de votre contrat de location, signé sur papier le " + esc(frDate(d.signeLe)) + ". Elle reprend les informations inscrites au contrat original (l'original signé fait foi). Conservez-la précieusement."
             : "Merci d'avoir choisi Location YBMTL ! Vous trouverez en pièce jointe votre contrat de location signé. Conservez-le précieusement."}</p>
           ${tableau(resume)}
           <p>Une question ? Appelez-nous au <strong>${esc(tel)}</strong> ou répondez simplement à ce courriel.</p>
           <p>À bientôt,<br>L'équipe Location YBMTL</p>`),
        text: `Bonjour ${d.nom},\n\n` +
          (d.papier
            ? `Merci d'avoir choisi Location YBMTL ! Vous trouverez en pièce jointe une copie de votre contrat de location, signé sur papier le ${frDate(d.signeLe)}. Elle reprend les informations inscrites au contrat original (l'original signé fait foi). Conservez-la précieusement.`
            : "Merci d'avoir choisi Location YBMTL ! Vous trouverez en pièce jointe votre contrat de location signé. Conservez-le précieusement.") + '\n\n' +
          resumeTexte + `\n\nUne question ? Appelez-nous au ${tel} ou répondez à ce courriel.\n\nÀ bientôt,\nL'équipe Location YBMTL\n`,
        filename: nomFichier,
        pdf,
      });
      statut.client = 'envoye';
    } catch (e) {
      console.error('[contrat] Echec envoi (client):', e.message);
      statut.client = 'echec';
    }
  }

  console.log(`[contrat] ${ref} : copie proprio = ${statut.yb}, copie client = ${statut.client}`);
  return statut;
}

// Code à 6 chiffres pour ouvrir la page /contrat (envoyé au courriel du proprio, jamais ailleurs).
async function envoyerCode(code) {
  if (!config.mail.notify) throw new Error('Aucune adresse de destination');
  await envoyer({
    to: config.mail.notify,
    subject: `Code ${code} : page Contrat YBMTL`,
    html: cadre('Code de connexion', 'Page Contrat — Location YBMTL',
      `<p>Voici le code pour ouvrir la page Contrat :</p>
       <p style="font-size:34px;letter-spacing:8px;font-weight:bold;margin:14px 0;">${esc(code)}</p>
       <p>Il est valide 10 minutes. Si vous n'avez rien demandé, ignorez simplement ce courriel.</p>`),
    text: `Code de connexion à la page Contrat : ${code}\nValide 10 minutes. Si vous n'avez rien demandé, ignorez ce courriel.\n`,
  });
}

module.exports = { envoyerContrat, envoyerCode };
