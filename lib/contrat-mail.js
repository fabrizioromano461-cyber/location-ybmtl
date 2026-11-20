// Envoi du contrat signé par courriel (PDF en pièce jointe) : une copie pour le proprio, une pour le client.
// - EN LIGNE (Render) : via l'API web de Brevo (Render bloque le SMTP direct).
// - EN LOCAL : repli sur Gmail SMTP (nodemailer) si pas de clé Brevo.
const config = require('../config');
const { fmtDateHeure, argent } = require('./contrat-pdf');
const { frDate } = require('./format');
const saaq = require('./permis-saaq');

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

// Un deuxième essai après une courte pause : le courriel du proprio contient les photos du permis, qui ne sont gardées
// nulle part ailleurs (une panne passagère ne doit pas les faire perdre).
async function envoyerAvecRepli(m) {
  try {
    await envoyer(m);
  } catch (e) {
    console.error('[contrat] Premier essai d\'envoi échoué, nouvel essai :', e.message);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await envoyer(m);
  }
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

// Rappel pour le proprio : vérifier le permis à la SAAQ (service officiel, gratuit) AVANT de remettre le véhicule.
// Permis du Québec : le numéro prêt à copier (13 caractères, sans tirets) + comment vérifier. Autre permis : alerte, la SAAQ ne peut pas le vérifier.
// `photosPage5` : vrai si le PDF du proprio contient les photos du permis (annexe, page 5).
function blocSaaq(permis, photosPage5) {
  const { numero, quebecois } = saaq.numeroSaaq(permis);
  const saisi = String(permis == null ? '' : permis).trim();
  if (quebecois) {
    return {
      html: `<div style="background:#fff7e0;border:1px solid #fde4a3;border-radius:8px;padding:12px 14px;margin:14px 0;">
        <strong>À faire avant de remettre le véhicule : vérifier le permis à la SAAQ</strong> (gratuit, environ 1 minute)<br>
        <span style="display:block;margin:8px 0;">Numéro de permis à vérifier, prêt à copier :
          <strong style="font-family:Menlo,Consolas,monospace;font-size:17px;letter-spacing:1px;">${esc(numero)}</strong></span>
        <strong>Par téléphone :</strong> ${esc(saaq.TELEPHONE)}, ${esc(saaq.TOUCHES)}, puis donnez le numéro.<br>
        <strong>En ligne :</strong> <a href="${saaq.LIEN_ENTREPRISES}">SAAQclic Entreprises</a> (service « Permis de conduire — Vérifier la validité d'un permis de conduire »).<br>
        <span style="color:#666;font-size:13px;">La SAAQ répond seulement si le permis est valide ou non, sa classe et ses conditions (jamais le nom).
          Si elle répond « non valide », ne louez pas. <a href="${saaq.LIEN_SAAQ}">Page de la SAAQ</a></span>
      </div>`,
      text: `À FAIRE AVANT DE REMETTRE LE VÉHICULE : vérifier le permis à la SAAQ (gratuit, environ 1 minute)
` +
        `Numéro de permis à vérifier, prêt à copier : ${numero}
` +
        `Par téléphone : ${saaq.TELEPHONE}, ${saaq.TOUCHES}, puis donnez le numéro.
` +
        `En ligne : SAAQclic Entreprises ${saaq.LIEN_ENTREPRISES}
` +
        `La SAAQ répond seulement si le permis est valide ou non, sa classe et ses conditions (jamais le nom). Si elle répond « non valide », ne louez pas.
` +
        `Page de la SAAQ : ${saaq.LIEN_SAAQ}
`,
    };
  }
  const aVoir = photosPage5 ? ' (comparez avec les photos du permis, page 5 du PDF)' : '';
  return {
    html: `<div style="background:#fdeaea;border:1px solid #f0c9c9;border-radius:8px;padding:12px 14px;margin:14px 0;">
        <strong>Permis hors Québec, ou numéro mal écrit</strong> : « ${esc(saisi)} » n'a pas le format d'un permis du Québec (une lettre suivie de 12 chiffres).
        La SAAQ ne peut pas le vérifier.<br>
        Si le client a un permis du Québec, vérifiez qu'il a bien écrit son numéro${esc(aVoir)}. Sinon, regardez bien le permis à la remise du véhicule et demandez une 2<sup>e</sup> pièce d'identité.
      </div>`,
    text: `ATTENTION : permis hors Québec, ou numéro mal écrit. « ${saisi} » n'a pas le format d'un permis du Québec (une lettre suivie de 12 chiffres) : la SAAQ ne peut pas le vérifier.
` +
      `Si le client a un permis du Québec, vérifiez qu'il a bien écrit son numéro${aVoir}. Sinon, regardez bien le permis à la remise du véhicule et demandez une 2e pièce d'identité.
`,
  };
}

// Envoie les copies. Renvoie { yb, client } avec 'envoye' | 'echec' | 'aucun' (jamais d'exception).
// `pdfProprio` / `nomFichierProprio` (facultatifs) : version du PDF réservée au proprio, avec l'annexe « permis de conduire » ;
// le client, lui, reçoit toujours `pdf` (sans les photos).
async function envoyerContrat({ d, ref, calc, nomFichier, pdf, copieClient, pdfProprio, nomFichierProprio }) {
  const statut = { yb: 'aucun', client: 'aucun' };
  // Copie d'un contrat papier sans récapitulatif des taxes (ou au mois) : on donne le tarif écrit, pas un total calculé.
  const avecTotal = !d.papier || (d.recap !== false && d.tarifCents != null);
  const tarifs = [
    d.tarifCents != null && argent(d.tarifCents) + ' par semaine',
    d.tarifMensuelCents != null && argent(d.tarifMensuelCents) + ' par mois',
  ].filter(Boolean).join(' · ');
  const resume = [
    ['Véhicule', d.vehicule + (d.annee ? ' ' + d.annee : '')],
    ['Départ', fmtDateHeure(d.departDate, d.departHeure)],
    ['Retour', fmtDateHeure(d.retourDate, d.retourHeure)],
    avecTotal ? ['Total (taxes incluses)', argent(calc.total)] : ['Tarif', tarifs],
    ...(d.depotCents != null ? [['Dépôt de garantie', argent(d.depotCents)]] : []),
  ];
  const resumeTexte = resume.map(([k, v]) => `${k} : ${v}`).join('\n');
  const tel = config.company.phone;
  const reponse = config.company.email;

  // Copie pour le proprio (toujours).
  const distance = !!d.distance && !d.papier; // contrat rempli et signé par le client, à distance (page /contrat)
  const repSignee = distance && !!d.repSignee; // la signature préfaite du représentant est déjà sur le PDF
  const avecPermis = !d.papier && !!pdfProprio; // le PDF du proprio contient l'annexe avec les photos du permis (page 5)
  // Rappel : vérifier le permis à la SAAQ avant la remise. Ce n'est qu'une aide : si elle échouait, le courriel du contrat partirait quand même.
  let verifSaaq = null;
  if (!d.papier) {
    try { verifSaaq = blocSaaq(d.permis, avecPermis); } catch (e) { console.error('[contrat] Rappel SAAQ ignoré :', e.message); }
  }
  if (config.mail.notify) {
    const infos = [
      ['Locataire', d.nom],
      ['Téléphone', d.telephone],
      ['Courriel', d.courriel || '—'],
      ['Permis', d.permis],
      ...(distance
        ? [['Naissance', frDate(d.naissance)], ...(d.moinsDe25 ? [['ATTENTION', 'locataire de moins de 25 ans']] : []), ['Mode', 'Signé à distance (avec le lien que vous avez envoyé)'],
          ...(avecPermis ? [['Photos du permis', 'recto et verso, à la page 5 du PDF'], ['Nom sur le permis', 'le client confirme qu\'il est identique au contrat : à vérifier sur les photos']] : []),
          ['Votre signature', repSignee ? 'déjà sur le contrat (préenregistrée)' : 'à apposer à la remise']]
        : [['Plaque', d.plaque]]),
      ...(avecPermis && !distance ? [['Photos du permis', 'recto et verso, à la page 5 du PDF'], ['Nom sur le permis', 'vous avez confirmé qu\'il est identique au contrat']] : []),
      ...(d.papier ? [['Signé sur papier le', frDate(d.signeLe)]] : []),
      ...resume,
      ['Copie au client', copieClient && d.courriel ? 'envoyée à ' + d.courriel : 'non envoyée'],
    ];
    try {
      await (avecPermis ? envoyerAvecRepli : envoyer)({
        to: config.mail.notify,
        replyTo: d.courriel || undefined,
        subject: d.papier
          ? `Copie du contrat papier : ${d.nom} — ${d.vehicule}`
          : distance ? `Contrat signé à distance${avecPermis ? ' + permis' : ''} : ${d.nom} — ${d.vehicule}` : `Contrat signé${avecPermis ? ' + permis' : ''} : ${d.nom} — ${d.vehicule}`,
        html: cadre(d.papier ? 'Copie de contrat (signé sur papier)' : distance ? 'Contrat signé à distance' : 'Contrat de location signé', 'Référence ' + esc(ref),
          `<p>${d.papier
            ? 'Copie du contrat signé sur papier le ' + esc(frDate(d.signeLe)) + '. Elle est en pièce jointe.'
            : distance
              ? (repSignee
                ? 'Un client a rempli et signé son contrat à distance, avec le lien que vous lui avez envoyé. Il est en pièce jointe, avec votre signature préenregistrée. <strong>À faire à la remise du véhicule :</strong> inscrire la plaque, le kilométrage et l\'état sur le contrat, et vérifier son permis et une pièce d\'identité.'
                : 'Un client a rempli et signé son contrat à distance, avec le lien que vous lui avez envoyé. Il est en pièce jointe. <strong>À faire :</strong> contresigner à la remise du véhicule (la plaque, le kilométrage et l\'état restent à compléter) et vérifier son permis et une pièce d\'identité.')
              : 'Le contrat est signé. Il est en pièce jointe.'}</p>${avecPermis
              ? `<p><strong>Permis de conduire :</strong> les photos du recto et du verso sont à la <strong>page 5</strong> du PDF (annexe). Vérifiez que le nom sur le permis est bien « ${esc(d.nom)} », comme sur le contrat, et que le permis est valide. Ce PDF contient des renseignements personnels : ne le transmettez pas (la copie du client, elle, n'a pas cette page).</p>`
              : ''}${verifSaaq ? verifSaaq.html : ''}${tableau(infos)}`),
        text: `${d.papier ? 'Copie de contrat signé sur papier' : distance ? 'Contrat de location signé à distance' : 'Contrat de location signé'} (${ref})\n\n` +
          infos.map(([k, v]) => `${k} : ${v}`).join('\n') + '\n' +
          (distance ? (repSignee
            ? '\nÀ faire à la remise du véhicule : inscrire la plaque, le kilométrage et l\'état sur le contrat (votre signature est déjà dessus) et vérifier son permis et une pièce d\'identité.\n'
            : '\nÀ faire : contresigner à la remise du véhicule (plaque, kilométrage et état à compléter) et vérifier son permis et une pièce d\'identité.\n') : '') +
          (avecPermis ? `\nPermis de conduire : les photos du recto et du verso sont à la page 5 du PDF (annexe). Vérifiez que le nom sur le permis est bien « ${d.nom} », comme sur le contrat, et que le permis est valide. Ce PDF contient des renseignements personnels : ne le transmettez pas (la copie du client n'a pas cette page).\n` : '') +
          (verifSaaq ? '\n' + verifSaaq.text : ''),
        filename: avecPermis ? nomFichierProprio : nomFichier,
        pdf: avecPermis ? pdfProprio : pdf,
      });
      statut.yb = 'envoye';
    } catch (e) {
      console.error('[contrat] Echec envoi (proprio):', e.message);
      statut.yb = 'echec';
    }
  }

  // Copie pour le client (si demandé et si on a son courriel).
  if (copieClient && d.courriel) {
    // On ne dit au client que ses photos ont été transmises que si le courriel du proprio est vraiment parti.
    const phrasePermis = avecPermis && statut.yb === 'envoye'
      ? (distance
        ? ' Les photos de votre permis ont été transmises à Location YBMTL ; elles ne figurent pas sur cette copie.'
        : ' Les photos de votre permis, prises par Location YBMTL pour votre dossier, ne figurent pas sur cette copie.')
      : '';
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
             : distance
               ? "Merci d'avoir choisi Location YBMTL ! Votre contrat " + (repSignee ? 'signé par vous et par Location YBMTL' : 'signé') + " est en pièce jointe. À la remise du véhicule, apportez votre permis de conduire et une pièce d'identité. Conservez ce document précieusement." + phrasePermis
               : "Merci d'avoir choisi Location YBMTL ! Vous trouverez en pièce jointe votre contrat de location signé. Conservez-le précieusement." + phrasePermis}</p>
           ${tableau(resume)}
           <p>Une question ? Appelez-nous au <strong>${esc(tel)}</strong> ou répondez simplement à ce courriel.</p>
           <p>À bientôt,<br>L'équipe Location YBMTL</p>`),
        text: `Bonjour ${d.nom},\n\n` +
          (d.papier
            ? `Merci d'avoir choisi Location YBMTL ! Vous trouverez en pièce jointe une copie de votre contrat de location, signé sur papier le ${frDate(d.signeLe)}. Elle reprend les informations inscrites au contrat original (l'original signé fait foi). Conservez-la précieusement.`
            : distance
              ? "Merci d'avoir choisi Location YBMTL ! Votre contrat " + (repSignee ? 'signé par vous et par Location YBMTL' : 'signé') + " est en pièce jointe. À la remise du véhicule, apportez votre permis de conduire et une pièce d'identité. Conservez ce document précieusement." + phrasePermis
              : "Merci d'avoir choisi Location YBMTL ! Vous trouverez en pièce jointe votre contrat de location signé. Conservez-le précieusement." + phrasePermis) + '\n\n' +
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
