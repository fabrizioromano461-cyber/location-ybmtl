// Fabrique le contrat de location (PDF) rempli et signé.
// On part du vrai contrat (public/docs/Contrat-Location-YBMTL-FR.pdf) : les valeurs sont écrites sur ses
// lignes et les signatures sont posées au bas de la dernière page. Rien n'est enregistré sur le serveur
// (l'hébergement gratuit efface ses fichiers) : le PDF est renvoyé à l'écran puis envoyé par courriel.
//
// Les positions du tableau L ont été relevées sur CE gabarit. Si le PDF du contrat change (texte ou mise
// en page), il faut les relever à nouveau et mettre à jour TEMPLATE_SHA256 ; en attendant, gabaritOk()
// renvoie false et la page admin affiche un avertissement.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('../config');
const { frDate } = require('./format');
const { withTaxes } = require('./pricing');

const TEMPLATE = path.join(__dirname, '..', 'public', 'docs', 'Contrat-Location-YBMTL-FR.pdf');
const TEMPLATE_SHA256 = 'fc110065cf07d5299ddf8052f1ead78b6d37e54c7a7a346b91ef253f8643733e';

// Position de chaque ligne du gabarit (points PDF, origine en bas à gauche) : [page, x début, x fin, y du trait]
const L = {
  nom:          [0, 133.5, 567.0, 556.5],
  adresse:      [0,  91.5, 567.0, 539.2],
  telephone:    [0, 102.8, 567.0, 521.2],
  permis:       [0, 156.8, 567.0, 503.2],
  naissance:    [0, 135.8, 567.0, 485.2],
  vehicule:     [0, 133.5, 567.0, 434.2],
  annee:        [0,  84.8, 567.0, 416.2],
  plaque:       [0, 172.5, 567.0, 399.0],
  km:           [0, 158.2, 567.0, 381.0],
  etat:         [0, 219.0, 567.0, 363.0],
  depart:       [0, 162.0, 567.0, 312.0],
  retour:       [0, 198.0, 567.0, 294.0],
  prolongation: [0, 170.2, 567.0, 276.0],
  journalier:   [0, 126.8, 567.0, 225.8],
  hebdo:        [0, 146.2, 567.0, 207.8],
  mensuel:      [0, 117.8, 567.0, 189.8],
  depot:        [1, 116.2, 168.8, 701.2],
  faita:        [3,  76.5, 306.0, 195.8],
  faitle:       [3, 329.2, 559.5, 195.8],
  nomSign:      [3, 133.5, 567.0, 171.8],
  sigLoc:       [3, 156.0, 567.0, 147.8],
  sigRep:       [3, 269.2, 567.0, 123.8],
};

const TZ = 'America/Toronto'; // heure de Montréal (le serveur Render tourne en UTC)

let gabaritVerifie = null;
function gabaritOk() {
  if (gabaritVerifie === null) {
    try {
      const h = crypto.createHash('sha256').update(fs.readFileSync(TEMPLATE)).digest('hex');
      gabaritVerifie = h === TEMPLATE_SHA256;
    } catch (e) {
      gabaritVerifie = false;
    }
  }
  return gabaritVerifie;
}

// ---------- Petits utilitaires d'affichage ----------

// Date et heure actuelles à Montréal : { iso: 'AAAA-MM-JJ', heure: 'HH:MM' }
function maintenantMontreal(date) {
  const parts = new Intl.DateTimeFormat('fr-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date || new Date());
  const g = (t) => parts.find((p) => p.type === t).value;
  return { iso: `${g('year')}-${g('month')}-${g('day')}`, heure: `${g('hour')}:${g('minute')}` };
}

// '12:30' -> '12 h 30' ; '09:05' -> '9 h 05' ; '12:00' -> '12 h'
function fmtHeure(hhmm) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm || '');
  if (!m) return '';
  const h = parseInt(m[1], 10);
  return m[2] === '00' ? `${h} h` : `${h} h ${m[2]}`;
}

// ('2026-10-20', '12:30') -> '20 octobre 2026, à 12 h 30'
function fmtDateHeure(iso, hhmm) {
  const h = fmtHeure(hhmm);
  return frDate(iso) + (h ? ', à ' + h : '');
}

const nombre = (cents) =>
  (cents / 100).toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const argent = (cents) => nombre(cents) + ' $';
const pct = (r) => (r * 100).toLocaleString('fr-CA', { maximumFractionDigits: 3 });

// Durée + prix : semaines entamées x tarif hebdomadaire (en cents), plus TPS et TVQ. Null si dates invalides.
function calculerLocation(departDate, retourDate, tarifCents) {
  const a = Date.parse(departDate + 'T00:00:00Z');
  const b = Date.parse(retourDate + 'T00:00:00Z');
  if (isNaN(a) || isNaN(b) || b <= a) return null;
  const days = Math.round((b - a) / 86400000);
  const weeks = Math.ceil(days / 7);
  return { days, weeks, ...withTaxes(weeks * tarifCents) };
}

// ---------- Texte compatible avec la police standard du PDF ----------

function nettoyer(s) {
  return String(s == null ? '' : s)
    .replace(/[\u00a0\u202f\u2009\u2007]/g, ' ')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// Garde les caractères que la police sait écrire ; retire l'accent des autres (ễ -> e), sinon met « ? ».
function sureWinAnsi(font, texte) {
  let out = '';
  for (const ch of nettoyer(texte)) {
    try { font.encodeText(ch); out += ch; continue; } catch (e) { /* non supporté */ }
    const base = ch.normalize('NFD').replace(/[̀-ͯ]/g, '');
    try { if (base) { font.encodeText(base); out += base; continue; } } catch (e) { /* non supporté */ }
    out += '?';
  }
  return out;
}

// Écrit le texte sur une ligne ; réduit la taille (jusqu'à 7 pt), puis coupe avec « … » s'il dépasse encore.
function ecrire(page, font, texte, x, y, maxW, taille, couleur) {
  let t = sureWinAnsi(font, texte);
  if (!t) return;
  let s = taille;
  while (s > 7 && font.widthOfTextAtSize(t, s) > maxW) s -= 0.5;
  if (font.widthOfTextAtSize(t, s) > maxW) {
    while (t.length > 1 && font.widthOfTextAtSize(t + '…', s) > maxW) t = t.slice(0, -1);
    t += '…';
  }
  page.drawText(t, { x, y, size: s, font, color: couleur });
}

function slug(s) {
  return nettoyer(s).normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'client';
}

// Référence d'une COPIE de contrat signé sur papier : stable (même contrat = même référence), du genre
// YB-P-20261012-3F9A. Calculée à partir du contrat lui-même pour ne jamais se répéter d'un contrat à l'autre.
function refPapier(d) {
  const h = crypto.createHash('sha1')
    .update([d.nom, d.permis, d.plaque, d.departDate].map(nettoyer).join('|'))
    .digest('hex').slice(0, 4).toUpperCase();
  return 'YB-P-' + String(d.signeLe).replace(/-/g, '') + '-' + h;
}

// ---------- Fabrication du PDF ----------
// d : { nom, adresse, telephone, courriel, naissance, permis, vehicule, annee, plaque, km, etat,
//       departDate, departHeure, retourDate, retourHeure, tarifCents, depotCents, lieu, recap,
//       sigLocataire (Buffer PNG), sigRepresentant (Buffer PNG) }
// Contrat DÉJÀ SIGNÉ SUR PAPIER (d.papier = true, d.signeLe = 'AAAA-MM-JJ') : on fabrique seulement la copie.
// Aucune signature n'est posée (ni image, ni nom tapé) : la page porte « Signé sur papier le … » et la mention
// que l'original signé à la main fait foi.
async function genererContrat(d) {
  // Chargé ici : si le module manque, seule cette fonction échoue (pas tout le site).
  const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

  const calc = calculerLocation(d.departDate, d.retourDate, d.tarifCents);
  if (!calc) throw new Error('Dates invalides');

  const pdf = await PDFDocument.load(fs.readFileSync(TEMPLATE), { ignoreEncryption: true });
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pages = pdf.getPages();
  const NAVY = rgb(0.06, 0.12, 0.35);
  const GRIS = rgb(0.45, 0.47, 0.52);

  const now = maintenantMontreal(d.maintenant);
  const papier = !!d.papier;
  const dateContrat = papier ? d.signeLe : now.iso;
  const ref = papier ? refPapier(d) : 'YB-' + now.iso.replace(/-/g, '') + '-' + now.heure.replace(':', '');

  const ligne = (cle, texte, taille) => {
    const [p, x0, x1, y] = L[cle];
    ecrire(pages[p], font, texte, x0 + 3, y + 3.2, x1 - x0 - 6, taille || 10.5, NAVY);
  };

  // 1. Informations du client
  ligne('nom', d.nom);
  ligne('adresse', d.adresse);
  ligne('telephone', d.telephone + (d.courriel ? ' · Courriel : ' + d.courriel : ''));
  ligne('permis', d.permis);
  ligne('naissance', frDate(d.naissance));
  // 2. Véhicule loué
  ligne('vehicule', d.vehicule);
  ligne('annee', d.annee);
  ligne('plaque', d.plaque);
  ligne('km', d.km ? d.km + ' km' : '');
  ligne('etat', d.etat);
  // 3. Durée de location
  ligne('depart', fmtDateHeure(d.departDate, d.departHeure));
  ligne('retour', fmtDateHeure(d.retourDate, d.retourHeure));
  ligne('prolongation', 'Préavis de 48 h requis (voir article 6)');
  // 4. Tarifs et dépôt
  ligne('journalier', 'Non applicable (location minimale de 7 jours)');
  // Copie d'un contrat papier signé avant l'arrivée des taxes (récapitulatif décoché) : pas de « avant taxes ».
  ligne('hebdo', argent(d.tarifCents) + ' par semaine' + (papier && d.recap === false ? '' : ' (avant taxes)'));
  ligne('mensuel', '—');
  ligne('depot', nombre(d.depotCents));

  // Référence du contrat (en haut à droite de la page 1).
  const txtRef = 'Réf. ' + ref;
  pages[0].drawText(txtRef, {
    x: 567 - font.widthOfTextAtSize(txtRef, 8), y: 776, size: 8, font, color: GRIS,
  });

  // Récapitulatif des taxes au bas de la page 1 (le contrat n'a pas de ligne pour les taxes).
  if (d.recap !== false) {
    const p = pages[0];
    const x0 = 45, larg = 522, bas = 56, haut = 66;
    p.drawRectangle({
      x: x0, y: bas, width: larg, height: haut,
      color: rgb(0.96, 0.97, 1), borderColor: rgb(0.75, 0.8, 0.9), borderWidth: 0.8,
    });
    p.drawText('Récapitulatif financier de la location', { x: x0 + 8, y: bas + haut - 14, size: 9.5, font: bold, color: NAVY });
    const lignes = [
      `Durée : ${calc.weeks} semaine${calc.weeks > 1 ? 's' : ''} (${calc.days} jour${calc.days > 1 ? 's' : ''}) × ${argent(d.tarifCents)} par semaine`,
      `Sous-total : ${argent(calc.subtotal)} · TPS (${pct(config.tax.tps)} %) : ${argent(calc.tps)} · TVQ (${pct(config.tax.tvq)} %) : ${argent(calc.tvq)}`,
      `Total de la location, taxes incluses : ${argent(calc.total)}`,
      `Dépôt de garantie : ${argent(d.depotCents)} (non taxé)`,
    ];
    lignes.forEach((t, i) => {
      ecrire(p, i === 2 ? bold : font, t, x0 + 8, bas + haut - 27 - i * 11.2, larg - 16, 9, NAVY);
    });
  }

  // Dernière page : lieu, date, nom et signatures.
  const p4 = pages[3];
  ligne('faita', d.lieu || 'Montréal');
  ligne('faitle', frDate(dateContrat));
  ligne('nomSign', d.nom);

  // Un nom tapé au clavier est plus large qu'un trait dessiné : on le garde un peu plus bas pour ne pas toucher la ligne du dessus.
  async function poserSignature(buf, cle, maxW, tape) {
    const img = await pdf.embedPng(buf);
    const [p, x0, , y] = L[cle];
    const maxH = tape ? 19 : 22;
    const s = Math.min(maxW / img.width, maxH / img.height);
    pages[p].drawImage(img, { x: x0 + 8, y: y + 2, width: img.width * s, height: img.height * s });
  }
  if (papier) {
    // Copie d'un contrat signé sur papier : les lignes de signature restent vides, on indique seulement la date.
    const estampeP = `Signé sur papier le ${frDate(d.signeLe)}`;
    const wP = font.widthOfTextAtSize(estampeP, 7);
    p4.drawText(estampeP, { x: 567 - wP, y: L.sigLoc[3] + 2.4, size: 7, font, color: GRIS });
    p4.drawText(estampeP, { x: 567 - wP, y: L.sigRep[3] + 2.4, size: 7, font, color: GRIS });
    const piedP = `Contrat ${ref} — copie du contrat signé sur papier le ${frDate(d.signeLe)}`;
    p4.drawText(piedP, { x: (612 - font.widthOfTextAtSize(piedP, 7.5)) / 2, y: 70, size: 7.5, font, color: GRIS });
    const avisP = "Cette copie reprend les informations du contrat original signé à la main ; en cas de différence, l'original signé sur papier fait foi.";
    const sAvisP = font.widthOfTextAtSize(avisP, 7) > 520 ? 6.5 : 7;
    p4.drawText(avisP, { x: (612 - font.widthOfTextAtSize(avisP, sAvisP)) / 2, y: 60, size: sAvisP, font, color: GRIS });
  } else {
    await poserSignature(d.sigLocataire, 'sigLoc', 190, d.sigModeLocataire === 'clavier');
    await poserSignature(d.sigRepresentant, 'sigRep', 165, d.sigModeRepresentant === 'clavier');

    // Date et heure de la signature, alignées à droite de chaque ligne de signature.
    const estampe = `Signé le ${frDate(now.iso)} à ${fmtHeure(now.heure)}`;
    const wE = font.widthOfTextAtSize(estampe, 7);
    p4.drawText(estampe, { x: 567 - wE, y: L.sigLoc[3] + 2.4, size: 7, font, color: GRIS });
    p4.drawText(estampe, { x: 567 - wE, y: L.sigRep[3] + 2.4, size: 7, font, color: GRIS });

    const pied = `Contrat ${ref} — signatures apposées électroniquement sur l'appareil de Location YBMTL`;
    p4.drawText(pied, { x: (612 - font.widthOfTextAtSize(pied, 7.5)) / 2, y: 70, size: 7.5, font, color: GRIS });
    // Preuve : le texte complet du contrat est affiché à l'écran et la case doit être cochée avant de signer.
    const preuve = `Le locataire a lu les conditions du contrat à l'écran et coché « J'ai lu et j'accepte les conditions » avant de signer, le ${frDate(now.iso)} à ${fmtHeure(now.heure)} (heure de Montréal).`;
    const sPreuve = font.widthOfTextAtSize(preuve, 7) > 520 ? 6.5 : 7;
    p4.drawText(preuve, { x: (612 - font.widthOfTextAtSize(preuve, sPreuve)) / 2, y: 60, size: sPreuve, font, color: GRIS });
    // Mention quand une signature a été tapée au clavier au lieu d'être dessinée au doigt.
    const claviers = [];
    if (d.sigModeLocataire === 'clavier') claviers.push('du locataire');
    if (d.sigModeRepresentant === 'clavier') claviers.push('du représentant');
    if (claviers.length) {
      const mention = (claviers.length > 1 ? 'Signatures ' : 'Signature ') + claviers.join(' et ') +
        (claviers.length > 1 ? ' : noms tapés' : ' : nom tapé') + " au clavier à l'écran (signature électronique).";
      p4.drawText(mention, { x: (612 - font.widthOfTextAtSize(mention, 7)) / 2, y: 50, size: 7, font, color: GRIS });
    }
  }

  pdf.setTitle(papier ? 'Copie du contrat de location de véhicule — Location YBMTL' : 'Contrat de location de véhicule — Location YBMTL');
  pdf.setSubject((papier ? 'Copie du contrat ' : 'Contrat ') + ref);
  pdf.setAuthor('Location YBMTL');
  pdf.setCreator('Location YBMTL');
  pdf.setProducer('Location YBMTL');

  const bytes = await pdf.save({ useObjectStreams: true });
  return {
    bytes: Buffer.from(bytes),
    ref,
    calc,
    nomFichier: papier
      ? `Copie-Contrat-Location-YBMTL-${slug(d.nom)}-${d.signeLe}.pdf`
      : `Contrat-Location-YBMTL-${slug(d.nom)}-${now.iso}.pdf`,
  };
}

module.exports = {
  genererContrat, gabaritOk, calculerLocation, maintenantMontreal,
  fmtDateHeure, fmtHeure, argent, nombre,
};
