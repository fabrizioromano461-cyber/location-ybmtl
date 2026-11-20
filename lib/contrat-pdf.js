// Fabrique le contrat de location (PDF) rempli et signé.
// On part du vrai contrat vierge (lib/gabarit/Contrat-Location-YBMTL-FR.pdf, PRIVÉ : le PDF public du même nom est le contrat complet) : les valeurs sont écrites sur ses
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
const { ajouterAnnexeA } = require('./contrat-annexe-pdf');

const TEMPLATE = path.join(__dirname, 'gabarit', 'Contrat-Location-YBMTL-FR.pdf'); // gabarit privé (jamais servi tel quel au public)
const TEMPLATE_SHA256 = '1ad792659d45354927c8db7693243f7bb3b551791a91da6e77189565eafa91a2';

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

// Paragraphe sur plusieurs lignes (retour à la ligne automatique). Renvoie le y où la ligne suivante peut commencer.
function paragraphe(page, font, texte, x, y, largeur, taille, interligne, couleur) {
  const mots = sureWinAnsi(font, texte).split(' ').filter(Boolean);
  let courante = '';
  let yy = y;
  const poser = (t) => { page.drawText(t, { x, y: yy, size: taille, font, color: couleur }); yy -= interligne; };
  for (let mot of mots) {
    while (font.widthOfTextAtSize(mot, taille) > largeur && mot.length > 1) mot = mot.slice(0, -2) + '…'; // un « mot » plus large que la page
    const essai = courante ? courante + ' ' + mot : mot;
    if (courante && font.widthOfTextAtSize(essai, taille) > largeur) { poser(courante); courante = mot; } else courante = essai;
  }
  if (courante) poser(courante);
  return yy;
}

function slug(s) {
  return nettoyer(s).normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'client';
}

// Pièce jointe RÉSERVÉE AU PROPRIO (dernière page du PDF qu'il reçoit) : photos recto et verso du permis du locataire.
// Elle n'est jamais dans la copie envoyée au client. `d.photosPermis` : { recto: {buffer}, verso: {buffer} } (JPEG déjà vérifiés).
async function ajouterAnnexePermis(pdf, d, ref, now, font, bold, couleurs) {
  const { rgb } = require('pdf-lib');
  const { NAVY, GRIS } = couleurs;
  const BORDURE = rgb(0.75, 0.8, 0.9);
  const page = pdf.addPage([612, 792]);
  page.drawRectangle({ x: 0, y: 0, width: 612, height: 792, color: rgb(1, 1, 1) }); // fond blanc (certains lecteurs affichent une page vide en noir)
  const gauche = 45;
  const largeur = 522;

  page.drawText('PIÈCE JOINTE — PERMIS DE CONDUIRE DU LOCATAIRE', { x: gauche, y: 744, size: 14, font: bold, color: NAVY });
  ecrire(page, font, `Contrat ${ref}  ·  Photos reçues le ${frDate(now.iso)} à ${fmtHeure(now.heure)} (heure de Montréal)`, gauche, 727, largeur, 9, GRIS);
  page.drawLine({ start: { x: gauche, y: 718 }, end: { x: gauche + largeur, y: 718 }, thickness: 0.8, color: BORDURE });

  // Le nom du contrat, bien en vue, pour le comparer d'un coup d'œil avec le nom sur le permis.
  const etiquette = 'Nom inscrit au contrat :';
  const wEtiquette = font.widthOfTextAtSize(etiquette, 10) + 6;
  page.drawText(etiquette, { x: gauche, y: 700, size: 10, font, color: GRIS });
  ecrire(page, bold, d.nom, gauche + wEtiquette, 699, largeur - wEtiquette, 13, NAVY);

  let y = 680;
  for (const [cote, titre] of [['recto', 'Recto (devant)'], ['verso', 'Verso (derrière)']]) {
    const img = await pdf.embedJpg(d.photosPermis[cote].buffer);
    const s = Math.min(430 / img.width, 235 / img.height);
    const w = img.width * s;
    const h = img.height * s;
    page.drawText(titre, { x: gauche, y: y - 9, size: 10, font: bold, color: NAVY });
    const yImg = y - 18 - h;
    const xImg = (612 - w) / 2;
    page.drawRectangle({ x: xImg - 1, y: yImg - 1, width: w + 2, height: h + 2, borderColor: BORDURE, borderWidth: 0.8 });
    page.drawImage(img, { x: xImg, y: yImg, width: w, height: h });
    y = yImg - 16;
  }

  y -= 4;
  if (d.distance) {
    y = paragraphe(page, font, 'Le locataire a confirmé, en signant son contrat à distance, que ce permis est le sien et que le nom qui y est inscrit est identique au nom du contrat.', gauche, y, largeur, 9, 12, NAVY);
    y = paragraphe(page, font, "À vérifier par Location YBMTL : que le nom sur ces photos est bien celui du contrat (ci-dessus), que le permis est valide (date d'expiration) et, au départ du véhicule, que la personne présente est bien le titulaire du permis.", gauche, y - 2, largeur, 9, 12, NAVY);
  } else {
    y = paragraphe(page, font, 'Le représentant de Location YBMTL a confirmé, au moment de la signature du contrat en personne, avoir vérifié le permis du locataire et que le nom qui y est inscrit est identique au nom du contrat.', gauche, y, largeur, 9, 12, NAVY);
    y = paragraphe(page, font, "À vérifier : que le nom sur ces photos est bien celui du contrat (ci-dessus) et que le permis est valide (date d'expiration).", gauche, y - 2, largeur, 9, 12, NAVY);
  }
  paragraphe(page, font, "Document confidentiel (renseignements personnels), réservé à Location YBMTL : à ne pas transmettre (par exemple à un comptable). La copie du contrat envoyée au locataire ne contient pas cette page.", gauche, y - 6, largeur, 7.5, 10, GRIS);
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

  // Copie d'un contrat papier au mois : pas de tarif par semaine, donc seulement la durée (jamais de total inventé).
  const calc = calculerLocation(d.departDate, d.retourDate, d.tarifCents == null ? 0 : d.tarifCents);
  if (!calc) throw new Error('Dates invalides');

  const pdf = await PDFDocument.load(fs.readFileSync(TEMPLATE), { ignoreEncryption: true });
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pages = pdf.getPages();
  const NAVY = rgb(0.06, 0.12, 0.35);
  const GRIS = rgb(0.45, 0.47, 0.52);

  const now = maintenantMontreal(d.maintenant);
  const papier = !!d.papier;
  // Contrat rempli et signé PAR LE CLIENT, à distance (page /contrat) : seule sa signature est posée ;
  // le représentant contresigne à la remise du véhicule.
  const distance = !!d.distance && !papier;
  const dateContrat = papier ? d.signeLe : now.iso;
  const ref = papier
    ? refPapier(d)
    : 'YB-' + now.iso.replace(/-/g, '') + '-' + now.heure.replace(':', '') +
      (distance ? '-' + crypto.randomBytes(2).toString('hex').toUpperCase() : '');

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
  if (distance) {
    // Ces trois lignes sont remplies à la remise du véhicule (pas par le client).
    for (const cle of ['plaque', 'km', 'etat']) {
      const [p, x0, , y] = L[cle];
      pages[p].drawText('à compléter au départ du véhicule', { x: x0 + 3, y: y + 3.2, size: 8.5, font, color: GRIS });
    }
  }
  // 3. Durée de location
  ligne('depart', fmtDateHeure(d.departDate, d.departHeure));
  ligne('retour', fmtDateHeure(d.retourDate, d.retourHeure));
  // Copie d'un contrat papier : le préavis est celui écrit à la main sur le contrat (sinon : 48 h).
  ligne('prolongation', (papier && d.prolongation) || 'Préavis de 48 h requis (voir article 6)');
  // 4. Tarifs et dépôt
  ligne('journalier', 'Non applicable (location minimale de 7 jours)');
  // Copie d'un contrat papier signé avant l'arrivée des taxes (récapitulatif décoché) : pas de « avant taxes ».
  const sansMentionTaxes = papier && d.recap === false;
  ligne('hebdo', d.tarifCents == null ? '—' : argent(d.tarifCents) + ' par semaine' + (sansMentionTaxes ? '' : ' (avant taxes)'));
  ligne('mensuel', d.tarifMensuelCents == null ? '—' : argent(d.tarifMensuelCents) + ' par mois' + (sansMentionTaxes ? '' : ' (avant taxes)'));
  if (d.depotCents != null) ligne('depot', nombre(d.depotCents)); // contrat papier sans dépôt écrit : la ligne reste vide

  // Référence du contrat (en haut à droite de la page 1).
  const txtRef = 'Réf. ' + ref;
  pages[0].drawText(txtRef, {
    x: 567 - font.widthOfTextAtSize(txtRef, 8), y: 776, size: 8, font, color: GRIS,
  });

  // Récapitulatif des taxes au bas de la page 1 (le contrat n'a pas de ligne pour les taxes).
  if (d.recap !== false && d.tarifCents != null) {
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
      ...(d.depotCents != null ? [`Dépôt de garantie : ${argent(d.depotCents)} (non taxé)`] : []),
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
  // `hauteur` et `descente` (facultatifs) : la signature préfaite est un peu plus grande et dépasse sous la ligne, comme à la main.
  async function poserSignature(buf, cle, maxW, tape, hauteur, descente) {
    const img = await pdf.embedPng(buf);
    const [p, x0, , y] = L[cle];
    const maxH = hauteur || (tape ? 19 : 22);
    const s = Math.min(maxW / img.width, maxH / img.height);
    pages[p].drawImage(img, { x: x0 + 8, y: y + 2 - (descente || 0), width: img.width * s, height: img.height * s });
  }
  let repSignee = false; // la signature préfaite du représentant a-t-elle été apposée ? (contrats à distance seulement)
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
  } else if (distance) {
    // Le client a rempli et signé le contrat à distance : sa signature seulement.
    await poserSignature(d.sigLocataire, 'sigLoc', 190, d.sigModeLocataire === 'clavier');
    const estampeD = `Signé le ${frDate(now.iso)} à ${fmtHeure(now.heure)}`;
    p4.drawText(estampeD, { x: 567 - font.widthOfTextAtSize(estampeD, 7), y: L.sigLoc[3] + 2.4, size: 7, font, color: GRIS });
    // Signature PRÉFAITE du représentant (lib/signature-representant.js) : si elle est configurée, on l'appose ; si elle manque ou
    // est illisible, on garde « à apposer à la remise » (le contrat du client ne doit jamais échouer à cause d'elle).
    if (d.sigRepresentantPrefaite) {
      try {
        await poserSignature(d.sigRepresentantPrefaite, 'sigRep', 165, false, 26, 6);
        repSignee = true;
      } catch (e) {
        console.error('[contrat] Signature préfaite du représentant ignorée :', e.message);
      }
    }
    if (repSignee) {
      const estampeR = `Apposée automatiquement le ${frDate(now.iso)} à ${fmtHeure(now.heure)}`;
      p4.drawText(estampeR, { x: 567 - font.widthOfTextAtSize(estampeR, 7), y: L.sigRep[3] + 2.4, size: 7, font, color: GRIS });
    } else {
      p4.drawText('à apposer au départ du véhicule', { x: L.sigRep[1] + 8, y: L.sigRep[3] + 3.2, size: 8.5, font, color: GRIS });
    }

    const piedD = `Contrat ${ref} — rempli et signé électroniquement à distance par le locataire (locationybmtl.ca), Annexe A incluse`;
    p4.drawText(piedD, { x: (612 - font.widthOfTextAtSize(piedD, 7.5)) / 2, y: 70, size: 7.5, font, color: GRIS });
    const preuveD = `Le locataire a lu les conditions du contrat à l'écran et coché « J'ai lu et j'accepte les conditions » avant de signer, le ${frDate(now.iso)} à ${fmtHeure(now.heure)} (heure de Montréal).`;
    const sPreuveD = font.widthOfTextAtSize(preuveD, 7) > 520 ? 6.5 : 7;
    p4.drawText(preuveD, { x: (612 - font.widthOfTextAtSize(preuveD, sPreuveD)) / 2, y: 60, size: sPreuveD, font, color: GRIS });
    let yD = 50;
    if (d.photosPermis) {
      // Photos du permis : la pièce jointe est dans le PDF du proprio seulement, mais cette mention est sur les deux copies.
      const permisD = 'Le locataire a joint les photos recto et verso de son permis de conduire et confirme que le nom qui y est inscrit est identique à celui du contrat.';
      const sPermisD = font.widthOfTextAtSize(permisD, 7) > 520 ? 6.5 : 7;
      p4.drawText(permisD, { x: (612 - font.widthOfTextAtSize(permisD, sPermisD)) / 2, y: yD, size: sPermisD, font, color: GRIS });
      yD -= 9;
    }
    if (d.sigModeLocataire === 'clavier') {
      const mentionD = "Signature du locataire : nom tapé au clavier à l'écran (signature électronique).";
      p4.drawText(mentionD, { x: (612 - font.widthOfTextAtSize(mentionD, 7)) / 2, y: yD, size: 7, font, color: GRIS });
      yD -= 9;
    }
    if (repSignee) {
      const repD = 'Signature du représentant de Location YBMTL : signature préenregistrée, apposée automatiquement lors de la signature du locataire.';
      p4.drawText(repD, { x: (612 - font.widthOfTextAtSize(repD, 7)) / 2, y: yD, size: 7, font, color: GRIS });
      yD -= 9;
    }
    if (d.ip && /^[0-9a-fA-F:.]{3,45}$/.test(d.ip)) {
      const ipD = `Signature électronique à distance — adresse IP : ${d.ip}`;
      p4.drawText(ipD, { x: (612 - font.widthOfTextAtSize(ipD, 7)) / 2, y: yD, size: 7, font, color: GRIS });
    }
  } else {
    await poserSignature(d.sigLocataire, 'sigLoc', 190, d.sigModeLocataire === 'clavier');
    await poserSignature(d.sigRepresentant, 'sigRep', 165, d.sigModeRepresentant === 'clavier');

    // Date et heure de la signature, alignées à droite de chaque ligne de signature.
    const estampe = `Signé le ${frDate(now.iso)} à ${fmtHeure(now.heure)}`;
    const wE = font.widthOfTextAtSize(estampe, 7);
    p4.drawText(estampe, { x: 567 - wE, y: L.sigLoc[3] + 2.4, size: 7, font, color: GRIS });
    p4.drawText(estampe, { x: 567 - wE, y: L.sigRep[3] + 2.4, size: 7, font, color: GRIS });

    const pied = `Contrat ${ref} — signatures apposées électroniquement sur l'appareil de Location YBMTL, Annexe A incluse`;
    p4.drawText(pied, { x: (612 - font.widthOfTextAtSize(pied, 7.5)) / 2, y: 70, size: 7.5, font, color: GRIS });
    // Preuve : le texte complet du contrat est affiché à l'écran et la case doit être cochée avant de signer.
    const preuve = `Le locataire a lu les conditions du contrat à l'écran et coché « J'ai lu et j'accepte les conditions » avant de signer, le ${frDate(now.iso)} à ${fmtHeure(now.heure)} (heure de Montréal).`;
    const sPreuve = font.widthOfTextAtSize(preuve, 7) > 520 ? 6.5 : 7;
    p4.drawText(preuve, { x: (612 - font.widthOfTextAtSize(preuve, sPreuve)) / 2, y: 60, size: sPreuve, font, color: GRIS });
    // Permis du client : le représentant l'a vérifié sur place et en a gardé les photos (pièce jointe du PDF du proprio seulement).
    let yE = 50;
    if (d.photosPermis) {
      const permisE = 'Le représentant de Location YBMTL a vérifié le permis de conduire du locataire (photos recto et verso au dossier) : le nom inscrit est identique à celui du contrat.';
      const sPermisE = font.widthOfTextAtSize(permisE, 7) > 520 ? 6.5 : 7;
      p4.drawText(permisE, { x: (612 - font.widthOfTextAtSize(permisE, sPermisE)) / 2, y: yE, size: sPermisE, font, color: GRIS });
      yE -= 9;
    }
    // Mention quand une signature a été tapée au clavier au lieu d'être dessinée au doigt.
    const claviers = [];
    if (d.sigModeLocataire === 'clavier') claviers.push('du locataire');
    if (d.sigModeRepresentant === 'clavier') claviers.push('du représentant');
    if (claviers.length) {
      const mention = (claviers.length > 1 ? 'Signatures ' : 'Signature ') + claviers.join(' et ') +
        (claviers.length > 1 ? ' : noms tapés' : ' : nom tapé') + " au clavier à l'écran (signature électronique).";
      p4.drawText(mention, { x: (612 - font.widthOfTextAtSize(mention, 7)) / 2, y: yE, size: 7, font, color: GRIS });
    }
  }

  pdf.setTitle(papier ? 'Copie du contrat de location de véhicule — Location YBMTL' : 'Contrat de location de véhicule — Location YBMTL');
  pdf.setSubject((papier ? 'Copie du contrat ' : 'Contrat ') + ref);
  pdf.setAuthor('Location YBMTL');
  pdf.setCreator('Location YBMTL');
  pdf.setProducer('Location YBMTL');

  // Annexe A (conditions complémentaires et tableau des frais) : pages ajoutées après la page 4 des contrats signés
  // électroniquement (à distance ou sur place), lues à l'écran avant la signature. Jamais sur la copie d'un contrat
  // signé sur papier (signé avant l'annexe).
  if (!papier) {
    await ajouterAnnexeA(pdf, {
      mode: 'signe',
      pied: `Annexe A au contrat ${ref} · ${d.nom} · lue et acceptée par le locataire en signant électroniquement le contrat, le ${frDate(now.iso)} à ${fmtHeure(now.heure)} (heure de Montréal).`,
    });
  }

  // Copie du client (et téléchargement à l'écran) : le contrat + l'Annexe A, sans les photos du permis.
  const bytes = await pdf.save({ useObjectStreams: true });

  // Copie du PROPRIO : le même contrat + la pièce jointe avec les photos recto et verso du permis (dernière page).
  let bytesProprio = null;
  if (!papier && d.photosPermis) {
    await ajouterAnnexePermis(pdf, d, ref, now, font, bold, { NAVY, GRIS });
    bytesProprio = Buffer.from(await pdf.save({ useObjectStreams: true }));
  }

  return {
    bytes: Buffer.from(bytes),
    bytesProprio,
    ref,
    calc,
    repSignee,
    nomFichier: papier
      ? `Copie-Contrat-Location-YBMTL-${slug(d.nom)}-${slug(d.vehicule)}-${d.signeLe}.pdf`
      : `Contrat-Location-YBMTL-${slug(d.nom)}-${now.iso}.pdf`,
    nomFichierProprio: bytesProprio ? `Contrat-Location-YBMTL-${slug(d.nom)}-${now.iso}-AVEC-PERMIS.pdf` : null,
  };
}

module.exports = {
  genererContrat, gabaritOk, calculerLocation, maintenantMontreal,
  fmtDateHeure, fmtHeure, argent, nombre,
};
