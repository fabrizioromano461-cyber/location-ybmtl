// Met en page l'Annexe A (voir lib/contrat-annexe.js) dans un PDF existant, avec pdf-lib.
// Deux usages :
//  - mode 'signe'  : annexe ajoutée au contrat signé électroniquement (pages après la page 4). Le pied de page indique
//                    que le locataire l'a lue et acceptée en signant (texte fourni par l'appelant, `opts.pied`).
//  - mode 'public' : version à IMPRIMER ou à télécharger : lignes pour les initiales sur chaque page et, à la fin,
//                    un bloc de signature (contrat signé sur papier).
// Même police et mêmes couleurs que le contrat (corps en Times, titres en Helvetica gras bleu marine).
const annexe = require('./contrat-annexe');

const LARGEUR = 612;
const HAUTEUR = 792;
const MARGE = 57;               // gauche et droite
const HAUT = 54;                // marge du haut
const BAS = 78;                 // espace réservé au pied de page
const UTILE = LARGEUR - 2 * MARGE;

// Garde les caractères que la police sait écrire (WinAnsi) ; retire l'accent des autres, sinon met « ? ».
function sur(font, texte) {
  let out = '';
  for (const ch of String(texte == null ? '' : texte).replace(/[   ]/g, ' ').replace(/[\r\n\t]+/g, ' ')) {
    try { font.encodeText(ch); out += ch; continue; } catch (e) { /* non supporté */ }
    const base = ch.normalize('NFD').replace(/[̀-ͯ]/g, '');
    try { if (base) { font.encodeText(base); out += base; continue; } } catch (e) { /* non supporté */ }
    out += '?';
  }
  return out;
}

// opts : { mode: 'signe' | 'public', langue: 'fr' (défaut) | 'en' | 'es' (versions de courtoisie, mode public seulement), pied }
async function ajouterAnnexeA(pdf, opts) {
  const { StandardFonts, rgb } = require('pdf-lib');
  const o = opts || {};
  const mode = o.mode === 'public' ? 'public' : 'signe';
  const C = o.langue === 'en' ? annexe.en : (o.langue === 'es' ? annexe.es : annexe); // contenu dans la langue demandée
  const L = C.libelles;
  const versionTexte = o.versionTexte || C.versionTexte;
  const corps = await pdf.embedFont(StandardFonts.TimesRoman);
  const gras = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const sansGras = await pdf.embedFont(StandardFonts.HelveticaBold);
  const NAVY = rgb(0.06, 0.12, 0.35);
  const BLEU = rgb(0.11, 0.31, 0.85);
  const GRIS = rgb(0.45, 0.47, 0.52);
  const NOIR = rgb(0.1, 0.1, 0.12);
  const TRAIT = rgb(0.72, 0.76, 0.84);
  const FOND = rgb(0.93, 0.95, 0.99);

  const pages = [];
  let page = null;
  let y = 0;
  function nouvellePage() {
    page = pdf.addPage([LARGEUR, HAUTEUR]);
    page.drawRectangle({ x: 0, y: 0, width: LARGEUR, height: HAUTEUR, color: rgb(1, 1, 1) }); // fond blanc
    pages.push(page);
    y = HAUTEUR - HAUT;
    if (pages.length > 1) { // en-tête des pages suivantes
      page.drawText(sur(sansGras, L.suite), { x: MARGE, y: y - 8, size: 8.5, font: sansGras, color: GRIS });
      y -= 26;
    }
  }
  const assurer = (h) => { if (!page || y - h < BAS) nouvellePage(); };

  // Retour à la ligne : `runs` = [{ t: texte, f: police }], taille, largeur disponible. Renvoie les lignes [{ mots: [{w, f}] }].
  function lignes(runs, taille, largeur) {
    const mots = [];
    for (const r of runs) for (const w of sur(r.f, r.t).split(' ').filter(Boolean)) mots.push({ w, f: r.f });
    const espace = corps.widthOfTextAtSize(' ', taille);
    const out = [];
    let cour = [];
    let larg = 0;
    for (const m of mots) {
      const lm = m.f.widthOfTextAtSize(m.w, taille);
      if (cour.length && larg + espace + lm > largeur) { out.push(cour); cour = []; larg = 0; }
      larg += (cour.length ? espace : 0) + lm;
      cour.push(m);
    }
    if (cour.length) out.push(cour);
    return out;
  }
  function ecrireLigne(ligne, x, yy, taille, couleur) {
    const espace = corps.widthOfTextAtSize(' ', taille);
    let xx = x;
    ligne.forEach((m, i) => {
      if (i) xx += espace;
      page.drawText(m.w, { x: xx, y: yy, size: taille, font: m.f, color: couleur });
      xx += m.f.widthOfTextAtSize(m.w, taille);
    });
  }
  // Paragraphe (avec retrait éventuel de la puce). Renvoie rien ; avance y.
  function paragraphe(runs, { taille = 10.5, interligne = 13.6, x = MARGE, largeur = UTILE, couleur = NOIR, apres = 5 } = {}) {
    const ls = lignes(runs, taille, largeur);
    for (const l of ls) {
      assurer(interligne);
      ecrireLigne(l, x, y - taille, taille, couleur);
      y -= interligne;
    }
    y -= apres;
  }
  function puce(texte) {
    const taille = 10.5;
    const ls = lignes([{ t: texte, f: corps }], taille, UTILE - 16);
    ls.forEach((l, i) => {
      assurer(13.6);
      if (i === 0) page.drawText('•', { x: MARGE + 4, y: y - taille, size: taille, font: corps, color: NOIR });
      ecrireLigne(l, MARGE + 16, y - taille, taille, NOIR);
      y -= 13.6;
    });
    y -= 2.5;
  }
  function tableau(t) {
    const colonnes = [UTILE * 0.64, UTILE * 0.36];
    const taille = 9.5;
    const interligne = 12;
    const pad = 4.5;
    const dessinerLigne = (cellules, entete) => {
      const police = entete ? sansGras : sans;
      const ls = cellules.map((c, i) => lignes([{ t: c, f: police }], taille, colonnes[i] - 2 * pad));
      const h = Math.max(...ls.map((l) => l.length)) * interligne + 2 * pad;
      assurer(h + 2);
      let xx = MARGE;
      cellules.forEach((c, i) => {
        page.drawRectangle({ x: xx, y: y - h, width: colonnes[i], height: h, color: entete ? FOND : undefined, borderColor: TRAIT, borderWidth: 0.6 });
        ls[i].forEach((l, k) => ecrireLigne(l, xx + pad, y - pad - taille - k * interligne + 1.5, taille, entete ? NAVY : NOIR));
        xx += colonnes[i];
      });
      y -= h;
    };
    dessinerLigne(t.entetes, true);
    t.lignes.forEach((l) => dessinerLigne(l, false));
    y -= 8;
  }

  // ---------- Contenu ----------
  nouvellePage();
  page.drawText(sur(sansGras, L.titreCourt), { x: MARGE, y: y - 17, size: 18, font: sansGras, color: BLEU });
  y -= 26;
  page.drawText(sur(sansGras, L.sousTitre), { x: MARGE, y: y - 12, size: 13, font: sansGras, color: NAVY });
  y -= 19;
  page.drawText(sur(sans, L.societeVersion(versionTexte)), { x: MARGE, y: y - 9, size: 8.5, font: sans, color: GRIS });
  y -= 14;
  page.drawLine({ start: { x: MARGE, y: y - 2 }, end: { x: MARGE + UTILE, y: y - 2 }, thickness: 0.8, color: TRAIT });
  y -= 14;
  paragraphe([{ t: C.intro, f: corps }], { apres: 8 });

  for (const art of C.articles) {
    assurer(60); // un titre n'est jamais seul au bas d'une page
    y -= 4;
    paragraphe([{ t: art.titre, f: sansGras }], { taille: 11, interligne: 14, couleur: NAVY, apres: 3 });
    for (const b of art.blocs) {
      if (b.table) tableau(b.table);
      else if (b.ul) b.ul.forEach(puce);
      else {
        const runs = [];
        if (b.lead) runs.push({ t: b.lead + (b.p ? ' ' : ''), f: gras });
        if (b.p) runs.push({ t: b.p, f: corps });
        paragraphe(runs);
      }
    }
  }

  // Bloc de signature (version à imprimer) : le contrat est signé sur papier.
  if (mode === 'public') {
    assurer(120);
    y -= 8;
    paragraphe([{ t: L.reconnaissance, f: gras }], { apres: 18 });
    const ligne = (libelle, xx, largeur) => {
      page.drawLine({ start: { x: xx, y: y - 22 }, end: { x: xx + largeur, y: y - 22 }, thickness: 0.7, color: NOIR });
      page.drawText(sur(sans, libelle), { x: xx, y: y - 33, size: 8.5, font: sans, color: GRIS });
    };
    ligne(L.signLocataire, MARGE, 230);
    ligne(L.signRepresentant, MARGE + 262, UTILE - 262);
    y -= 44;
  }

  // ---------- Pied de page de chaque page de l'annexe ----------
  const n = pages.length;
  pages.forEach((p, i) => {
    p.drawLine({ start: { x: MARGE, y: BAS - 12 }, end: { x: MARGE + UTILE, y: BAS - 12 }, thickness: 0.5, color: TRAIT });
    const num = sur(sans, L.page(i + 1, n));
    p.drawText(num, { x: MARGE + UTILE - sans.widthOfTextAtSize(num, 8), y: BAS - 26, size: 8, font: sans, color: GRIS });
    if (mode === 'public') {
      p.drawText(sur(sans, L.initiales), { x: MARGE, y: BAS - 26, size: 8.5, font: sans, color: NOIR });
      const piedTxt = L.piedPublic(versionTexte); // vide en français (plus de ligne « version du … » en bas de page)
      if (piedTxt) p.drawText(sur(sans, piedTxt), { x: MARGE, y: BAS - 40, size: 7.5, font: sans, color: GRIS });
    } else if (o.pied) {
      const lignesPied = lignes([{ t: o.pied, f: sans }], 7.5, UTILE - 110);
      lignesPied.slice(0, 2).forEach((l, k) => ecrireLigne(l, MARGE, BAS - 26 - k * 10, 7.5, GRIS));
    }
  });
  return n;
}

module.exports = { ajouterAnnexeA };
