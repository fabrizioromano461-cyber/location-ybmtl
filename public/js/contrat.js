// Page admin « Nouveau contrat » : formulaire, signature au doigt, création du PDF et partage.
(function () {
  'use strict';
  const page = document.getElementById('contratPage');
  if (!page) return;

  // Taux de taxes fournis par le serveur (meme formule que lib/pricing.js).
  const TPS_K = Math.round(parseFloat(page.dataset.tps) * 100000);
  const TVQ_K = Math.round(parseFloat(page.dataset.tvq) * 100000);
  const CLE_SIG = 'ybmtl_signature_representant'; // signature du proprio, gardee sur SON telephone seulement

  const $ = (id) => document.getElementById(id);
  const form = $('contratForm');
  // Adresses fournies par la page : /admin/contrat (admin) ou /contrat (accès par code courriel).
  const URL_GENERER = page.dataset.generer || '/admin/contrat/generer';
  const URL_ACCUEIL = page.dataset.accueil || '/admin/contrat';
  const URL_CONNEXION = page.dataset.connexion || '/admin/connexion';

  const num = (v) => {
    const n = parseFloat(String(v == null ? '' : v).replace(',', '.').replace(/[^\d.]/g, ''));
    return isNaN(n) ? null : n;
  };
  const argent = (cents) =>
    (cents / 100).toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '\u00a0$';
  const dateFr = (iso) =>
    new Date(iso + 'T00:00:00').toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' });
  const heureFr = (hhmm) => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm || '');
    if (!m) return '';
    return m[2] === '00' ? parseInt(m[1], 10) + '\u00a0h' : parseInt(m[1], 10) + '\u00a0h\u00a0' + m[2];
  };

  // ---------- Prix en direct ----------
  function calcul() {
    const rate = num(form.tarifHebdo.value);
    const a = form.departDate.value;
    const b = form.retourDate.value;
    if (rate == null || !a || !b) return null;
    const t0 = Date.parse(a + 'T00:00:00Z');
    const t1 = Date.parse(b + 'T00:00:00Z');
    if (isNaN(t0) || isNaN(t1) || t1 <= t0) return null;
    const rateCents = Math.round(rate * 100);
    const days = Math.round((t1 - t0) / 86400000);
    const weeks = Math.ceil(days / 7);
    const subtotal = weeks * rateCents;
    const tps = Math.round((subtotal * TPS_K) / 100000);
    const tvq = Math.round((subtotal * TVQ_K) / 100000);
    return { days, weeks, rateCents, subtotal, tps, tvq, total: subtotal + tps + tvq };
  }

  function majPrix() {
    const c = calcul();
    const box = $('recapPrix');
    if (!c) {
      box.textContent = 'Choisissez les dates (retour après le départ) et le tarif pour voir le total.';
      return;
    }
    const depot = num(form.depot.value);
    box.innerHTML =
      '<strong>' + c.weeks + ' semaine' + (c.weeks > 1 ? 's' : '') + '</strong> (' +
      c.days + ' jour' + (c.days > 1 ? 's' : '') + ') × ' + argent(c.rateCents) + '<br>' +
      'Sous-total\u00a0' + argent(c.subtotal) + ' · TPS\u00a0' + argent(c.tps) + ' · TVQ\u00a0' + argent(c.tvq) + '<br>' +
      '<strong>Total taxes incluses : ' + argent(c.total) + '</strong>' +
      (depot != null ? '<br>Dépôt de garantie (non taxé) : ' + argent(Math.round(depot * 100)) : '');
  }

  function majAge() {
    const v = form.naissance.value;
    const hint = $('ageHint');
    hint.hidden = true;
    if (!v) return;
    const n = new Date(v + 'T00:00:00');
    if (isNaN(n)) return;
    const t = new Date();
    let age = t.getFullYear() - n.getFullYear();
    const m = t.getMonth() - n.getMonth();
    if (m < 0 || (m === 0 && t.getDate() < n.getDate())) age--;
    if (age < 0 || age > 110) {
      hint.textContent = 'Vérifiez la date de naissance.';
      hint.hidden = false;
    } else if (age < 25) {
      hint.textContent = 'Attention : le locataire a ' + age + ' an' + (age > 1 ? 's' : '') + ' (minimum 25 ans).';
      hint.hidden = false;
    }
  }

  // ---------- Choix du véhicule ----------
  function remplirVehicule() {
    const sel = $('vehiculeSel');
    const o = sel.options[sel.selectedIndex];
    if (!o || !o.dataset.nom) return; // « Autre véhicule » : les champs restent libres
    $('vehiculeNom').value = o.dataset.nom;
    $('annee').value = o.dataset.annee;
    form.tarifHebdo.value = o.dataset.tarif;
    form.depot.value = o.dataset.depot;
  }
  $('vehiculeSel').addEventListener('change', () => { remplirVehicule(); majPrix(); });

  // Quand on choisit le départ, le retour se met 7 jours plus tard (modifiable).
  form.departDate.addEventListener('change', () => {
    const d = form.departDate.value;
    if (d && (!form.retourDate.value || form.retourDate.value <= d)) {
      const t = new Date(d + 'T00:00:00Z');
      t.setUTCDate(t.getUTCDate() + 7);
      form.retourDate.value = t.toISOString().slice(0, 10);
    }
    majPrix();
  });
  ['retourDate', 'tarifHebdo', 'depot'].forEach((n) => {
    form[n].addEventListener('input', majPrix);
    form[n].addEventListener('change', majPrix);
  });
  form.naissance.addEventListener('change', majAge);
  form.naissance.addEventListener('input', majAge);

  if ($('vehiculeSel').value) remplirVehicule(); // préremplissage depuis une demande
  majPrix();

  // ---------- Étapes ----------
  const etapes = { form: $('contratForm'), sig: $('etapeSignature'), fin: $('etapeFin') };
  function montrer(nom) {
    Object.keys(etapes).forEach((k) => { etapes[k].hidden = k !== nom; });
    window.scrollTo(0, 0);
  }
  function afficherErreur(el, msg) {
    el.textContent = msg || '';
    el.hidden = !msg;
    if (msg) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  function remplirResume(c) {
    const dl = $('resume');
    dl.textContent = '';
    const lignes = [
      ['Locataire', form.nom.value],
      ['Véhicule', form.vehicule.value + ' ' + form.annee.value + ' · ' + form.plaque.value],
      ['Départ', dateFr(form.departDate.value) + ', ' + heureFr(form.departHeure.value)],
      ['Retour', dateFr(form.retourDate.value) + ', ' + heureFr(form.retourHeure.value)],
      ['Total', argent(c.total) + ' (taxes incluses)'],
      ['Dépôt', argent(Math.round((num(form.depot.value) || 0) * 100))],
    ];
    lignes.forEach(([k, v]) => {
      const dt = document.createElement('dt');
      dt.textContent = k;
      const dd = document.createElement('dd');
      dd.textContent = v;
      dl.append(dt, dd);
    });
    // Le dépôt saisi remplace le blanc de l'article 2.1 dans le texte du contrat affiché plus bas.
    const depot = num(form.depot.value);
    const texteDepot = depot == null
      ? '______'
      : depot.toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    document.querySelectorAll('.js-depot').forEach((e) => { e.textContent = texteDepot; });
  }

  // ---------- Lecture des conditions : la case « J'ai lu et j'accepte » s'ouvre au bas du contrat ----------
  let conditionsLues = false;
  let ecouteurFin = null;
  function debloquerAccepte() {
    conditionsLues = true;
    const acc = $('accepte');
    const bloc = $('blocAccepte');
    const aide = $('aideAccepte');
    if (acc) acc.disabled = false;
    if (bloc) bloc.classList.remove('c-check-off');
    if (aide) aide.hidden = true;
    if (ecouteurFin) { window.removeEventListener('scroll', ecouteurFin); ecouteurFin = null; }
  }
  // La case s'ouvre dès que le bas du contrat est apparu à l'écran (ou a été dépassé, si on a défilé très vite).
  function verifierFinConditions() {
    const fin = $('finConditions');
    if (!fin) { debloquerAccepte(); return; } // page sans texte du contrat : on ne bloque pas
    if (etapes.sig.hidden || fin.offsetParent === null) return; // étape pas affichée : rien à mesurer
    if (fin.getBoundingClientRect().top <= window.innerHeight) debloquerAccepte();
  }
  function surveillerConditions() {
    if (conditionsLues || ecouteurFin) return;
    ecouteurFin = verifierFinConditions;
    window.addEventListener('scroll', ecouteurFin, { passive: true });
    verifierFinConditions();
  }

  // Découpe une signature autour du trait (fond transparent) pour que le PDF l'agrandisse au maximum.
  // Renvoie un nouveau canevas, ou null s'il n'y a rien d'écrit.
  function recadrerCanevas(source, marge) {
    const w = source.width;
    const h = source.height;
    const data = source.getContext('2d').getImageData(0, 0, w, h).data;
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (data[(y * w + x) * 4 + 3] > 12) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
      }
    }
    if (x1 < 0) return null;
    const pad = marge == null ? Math.round(6 * (window.devicePixelRatio || 1)) : marge;
    x0 = Math.max(0, x0 - pad);
    y0 = Math.max(0, y0 - pad);
    x1 = Math.min(w - 1, x1 + pad);
    y1 = Math.min(h - 1, y1 + pad);
    const out = document.createElement('canvas');
    out.width = x1 - x0 + 1;
    out.height = y1 - y0 + 1;
    out.getContext('2d').drawImage(source, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
    return out;
  }
  const blobDe = (canevas) => new Promise((resolve) => canevas.toBlob(resolve, 'image/png'));

  // ---------- Signature au doigt ----------
  class Pad {
    constructor(canvas, box) {
      this.c = canvas;
      this.box = box;
      this.ctx = canvas.getContext('2d');
      this.encre = false;
      this.dessin = false;
      this.larg = 0;
      const pos = (e) => {
        const r = canvas.getBoundingClientRect();
        return { x: e.clientX - r.left, y: e.clientY - r.top };
      };
      canvas.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* ignoré */ }
        this.dessin = true;
        const p = pos(e);
        this.dernier = p;
        this.milieu = p;
        const ctx = this.ctx;
        ctx.beginPath();
        ctx.arc(p.x, p.y, ctx.lineWidth / 2, 0, Math.PI * 2);
        ctx.fillStyle = ctx.strokeStyle;
        ctx.fill();
        if (!this.encre) { this.encre = true; this.box.classList.add('has-ink'); }
      });
      canvas.addEventListener('pointermove', (e) => {
        if (!this.dessin) return;
        e.preventDefault();
        const p = pos(e);
        const ctx = this.ctx;
        const mid = { x: (this.dernier.x + p.x) / 2, y: (this.dernier.y + p.y) / 2 };
        ctx.beginPath();
        ctx.moveTo(this.milieu.x, this.milieu.y);
        ctx.quadraticCurveTo(this.dernier.x, this.dernier.y, mid.x, mid.y);
        ctx.stroke();
        this.dernier = p;
        this.milieu = mid;
      });
      // Fin du trait : on termine la derniere moitie du segment (sinon la fin du trait serait coupee).
      const fin = () => {
        if (this.dessin) {
          const ctx = this.ctx;
          ctx.beginPath();
          ctx.moveTo(this.milieu.x, this.milieu.y);
          ctx.lineTo(this.dernier.x, this.dernier.y);
          ctx.stroke();
        }
        this.dessin = false;
      };
      ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => canvas.addEventListener(ev, fin));
    }

    // (Re)dimensionne le canevas à sa taille affichée, en gardant le dessin existant.
    init() {
      const r = this.c.getBoundingClientRect();
      if (r.width < 10) return; // pas visible
      let copie = null;
      if (this.encre) {
        copie = document.createElement('canvas');
        copie.width = this.c.width;
        copie.height = this.c.height;
        copie.getContext('2d').drawImage(this.c, 0, 0);
      }
      const dpr = window.devicePixelRatio || 1;
      this.c.width = Math.round(r.width * dpr);
      this.c.height = Math.round(r.height * dpr);
      const ctx = this.ctx;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineWidth = 3.2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#0b1b4a';
      this.larg = r.width;
      if (copie) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(copie, 0, 0, this.c.width, this.c.height);
        ctx.restore();
      }
    }

    effacer() {
      const ctx = this.ctx;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, this.c.width, this.c.height);
      ctx.restore();
      this.encre = false;
      this.box.classList.remove('has-ink');
    }

    vide() { return !this.encre; }

    recadre() { return recadrerCanevas(this.c); }
    blob() {
      const out = this.recadre();
      return out ? blobDe(out) : Promise.resolve(null);
    }
    dataURL() {
      const out = this.recadre();
      return out ? out.toDataURL('image/png') : null;
    }
  }

  let padLoc = null;
  let padRep = null;
  let utiliserSauvee = false;

  const lireSauvee = () => { try { return localStorage.getItem(CLE_SIG); } catch (_) { return null; } };
  const ecrireSauvee = (v) => { try { localStorage.setItem(CLE_SIG, v); } catch (_) { /* ignoré */ } };
  // On retient aussi si la signature enregistrée a été dessinée ou tapée (le PDF le mentionne).
  const CLE_MODE = 'ybmtl_signature_representant_mode';
  const lireModeSauvee = () => { try { return localStorage.getItem(CLE_MODE) === 'clavier' ? 'clavier' : 'dessin'; } catch (_) { return 'dessin'; } };
  const ecrireModeSauvee = (m) => { try { localStorage.setItem(CLE_MODE, m); } catch (_) { /* ignoré */ } };

  // ---------- Signature au clavier : le nom tapé est dessiné en écriture « manuscrite » puis envoyé comme image ----------
  // (Même mécanique que le dessin au doigt : le serveur reçoit une image et la pose sur la ligne de signature.)
  const POLICE_SIGNATURE = '"Snell Roundhand", "Apple Chancery", "Dancing Script", "Brush Script MT", "Segoe Script", "Lucida Handwriting", cursive';
  function canevasTexte(texte) {
    const t = String(texte || '').replace(/\s+/g, ' ').trim();
    if (t.length < 2) return null;
    const taille = 84;
    const marge = 24;
    const police = taille + 'px ' + POLICE_SIGNATURE;
    const mesure = document.createElement('canvas').getContext('2d');
    mesure.font = police;
    const largeur = Math.min(2400, Math.ceil(mesure.measureText(t).width) + marge * 2);
    const c = document.createElement('canvas');
    c.width = largeur;
    c.height = Math.ceil(taille * 1.7);
    const ctx = c.getContext('2d');
    ctx.font = police;
    ctx.fillStyle = '#0b1b4a';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(t, marge, Math.round(taille * 1.15), largeur - marge * 2);
    return recadrerCanevas(c, 8);
  }

  // « Dessiner au doigt » ou « Taper au clavier » : l'un OU l'autre, pour chaque signature (Loc = locataire, Rep = représentant).
  const modes = { Loc: 'dessin', Rep: 'dessin' };
  function majApercu(cible) {
    const zone = $('apercu' + cible);
    const cadre = zone.querySelector('.c-apercu-cible');
    const c = canevasTexte($('texte' + cible).value);
    cadre.textContent = '';
    if (c) {
      c.className = 'c-apercu-img';
      cadre.appendChild(c);
    }
    zone.classList.toggle('has-ink', !!c);
  }
  function choisirMode(cible, mode) {
    modes[cible] = mode;
    $('zoneDessin' + cible).hidden = mode !== 'dessin';
    $('zoneClavier' + cible).hidden = mode !== 'clavier';
    document.querySelectorAll('.c-mode[data-cible="' + cible + '"]').forEach((b) => {
      const actif = b.dataset.mode === mode;
      b.classList.toggle('actif', actif);
      b.setAttribute('aria-pressed', actif ? 'true' : 'false');
    });
    if (mode === 'dessin') {
      const pad = cible === 'Loc' ? padLoc : padRep;
      if (pad) pad.init(); // le cadre était caché : on le redimensionne
    } else {
      $('texte' + cible).focus({ preventScroll: true });
    }
  }
  document.querySelectorAll('.c-mode').forEach((b) => {
    b.addEventListener('click', () => choisirMode(b.dataset.cible, b.dataset.mode));
  });
  ['Loc', 'Rep'].forEach((cible) => {
    const champ = $('texte' + cible);
    if (champ) champ.addEventListener('input', () => majApercu(cible)); // (la page peut ne pas avoir la saisie au clavier)
  });

  function initSignatures() {
    if (!padLoc) {
      padLoc = new Pad($('padLoc'), $('boiteLoc'));
      padRep = new Pad($('padRep'), $('boiteRep'));
    }
    padLoc.init();
    const s = lireSauvee();
    utiliserSauvee = !!s;
    $('repSauvee').hidden = !s;
    $('repZone').hidden = !!s;
    if (s) $('repImg').src = s;
    else padRep.init();
  }

  $('effLoc').addEventListener('click', () => padLoc && padLoc.effacer());
  $('effRep').addEventListener('click', () => padRep && padRep.effacer());
  $('repRefaire').addEventListener('click', () => {
    utiliserSauvee = false;
    $('repSauvee').hidden = true;
    $('repZone').hidden = false;
    padRep.init();
  });
  window.addEventListener('resize', () => {
    if (etapes.sig.hidden) return;
    [padLoc, padRep].forEach((p) => {
      if (p && Math.abs(p.c.getBoundingClientRect().width - p.larg) > 1) p.init();
    });
  });

  // ---------- Navigation ----------
  $('btnContinuer').addEventListener('click', () => {
    const err = $('erreurForm');
    afficherErreur(err, '');
    if (!form.reportValidity()) return;
    const c = calcul();
    if (!c) {
      afficherErreur(err, 'Vérifiez les dates (le retour doit être après le départ) et le tarif par semaine.');
      return;
    }
    remplirResume(c);
    const courriel = form.courriel.value.trim();
    $('courrielClient').textContent = courriel;
    $('blocCopieClient').hidden = !courriel;
    $('envoyerClient').checked = !!courriel;
    $('notePartage').textContent = courriel
      ? 'Vous recevez toujours votre copie. Après la création, vous pourrez aussi partager le PDF par texto.'
      : 'Pas de courriel pour le client : après la création, partagez-lui le PDF par texto avec le bouton « Partager ».';
    montrer('sig');
    initSignatures();
    surveillerConditions();
  });
  $('btnRetour').addEventListener('click', () => montrer('form'));
  $('btnNouveau').addEventListener('click', () => { window.location.href = URL_ACCUEIL; });

  // ---------- Création du contrat ----------
  async function terminer() {
    const err = $('erreurSig');
    afficherErreur(err, '');
    if (!conditionsLues) {
      afficherErreur(err, "Faites défiler le contrat jusqu'en bas, puis cochez « J'ai lu et j'accepte les conditions ».");
      return;
    }
    if (!$('accepte').checked) {
      afficherErreur(err, "Cochez la case « J'ai lu et j'accepte les conditions du contrat de location ».");
      return;
    }
    // Signature du locataire : dessinée au doigt OU tapée au clavier.
    let sigLoc;
    if (modes.Loc === 'clavier') {
      const c = canevasTexte($('texteLoc').value);
      if (!c) {
        afficherErreur(err, 'Le locataire doit taper son nom pour signer.');
        return;
      }
      sigLoc = await blobDe(c);
    } else {
      if (padLoc.vide()) {
        afficherErreur(err, 'Le locataire doit signer dans le cadre.');
        return;
      }
      sigLoc = await padLoc.blob();
    }
    // Signature du représentant : enregistrée, dessinée OU tapée.
    let sigRep;
    let modeRep = 'dessin';
    if (utiliserSauvee) {
      sigRep = await (await fetch(lireSauvee())).blob();
      modeRep = lireModeSauvee();
    } else if (modes.Rep === 'clavier') {
      const c = canevasTexte($('texteRep').value);
      if (!c) {
        afficherErreur(err, 'La signature du représentant est manquante : tapez votre nom.');
        return;
      }
      sigRep = await blobDe(c);
      modeRep = 'clavier';
    } else {
      if (padRep.vide()) {
        afficherErreur(err, 'La signature du représentant est manquante.');
        return;
      }
      sigRep = await padRep.blob();
    }

    const courriel = form.courriel.value.trim();
    const fd = new FormData(form);
    fd.set('lieu', $('lieu').value || 'Montréal');
    fd.set('accepte', '1');
    fd.set('envoyerClient', courriel && $('envoyerClient').checked ? '1' : '');
    fd.set('sigLocataire', sigLoc, 'signature-locataire.png');
    fd.set('sigModeLocataire', modes.Loc);
    fd.set('sigRepresentant', sigRep, 'signature-representant.png');
    fd.set('sigModeRepresentant', modeRep);

    const btn = $('btnTerminer');
    const texte = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Création du contrat…';
    try {
      const res = await fetch(URL_GENERER, { method: 'POST', body: fd, credentials: 'same-origin' });
      const type = res.headers.get('content-type') || '';
      if (!res.ok || type.indexOf('application/pdf') === -1) {
        let msg = 'Une erreur est survenue. Réessayez.';
        if (type.indexOf('application/json') !== -1) {
          try { msg = (await res.json()).erreur || msg; } catch (_) { /* ignoré */ }
        }
        if (res.status === 401 || res.redirected || type.indexOf('text/html') !== -1) {
          msg = 'Votre connexion a expiré. Ouvrez ' + URL_CONNEXION + " dans un autre onglet, reconnectez-vous, puis réessayez ici : rien n'est perdu.";
        }
        throw new Error(msg);
      }
      const blob = await res.blob();
      if (!utiliserSauvee && $('garderSig').checked) {
        let d = null;
        if (modes.Rep === 'clavier') {
          const c = canevasTexte($('texteRep').value);
          d = c ? c.toDataURL('image/png') : null;
        } else {
          d = padRep.dataURL();
        }
        if (d) {
          ecrireSauvee(d);
          ecrireModeSauvee(modes.Rep);
        }
      }
      afficherFin(blob, {
        nom: res.headers.get('X-Nom-Fichier'),
        ref: res.headers.get('X-Reference'),
        yb: res.headers.get('X-Courriel-YB'),
        client: res.headers.get('X-Courriel-Client'),
        courriel,
      });
    } catch (e) {
      afficherErreur(err, e && e.message ? e.message : 'Erreur de réseau. Réessayez.');
      btn.disabled = false;
      btn.textContent = texte;
    }
  }
  $('btnTerminer').addEventListener('click', terminer);

  function afficherFin(blob, info) {
    const nom = info.nom || 'Contrat-Location-YBMTL.pdf';
    const url = URL.createObjectURL(blob);
    const lien = $('btnTelecharger');
    lien.href = url;
    lien.download = nom;
    $('finRef').textContent = info.ref ? 'Référence ' + info.ref : '';

    const ul = $('finMails');
    ul.textContent = '';
    const ligne = (classe, texte) => {
      const li = document.createElement('li');
      li.className = classe;
      li.textContent = texte;
      ul.appendChild(li);
    };
    if (info.yb === 'envoye') ligne('ok', 'Votre copie a été envoyée par courriel.');
    else if (info.yb === 'echec') ligne('bad', "Votre copie n'a pas pu être envoyée par courriel. Gardez le PDF ci-dessous.");
    else ligne('bad', "Aucun service courriel n'est configuré : gardez le PDF ci-dessous.");
    if (info.client === 'envoye') ligne('ok', 'Copie envoyée au client : ' + info.courriel);
    else if (info.client === 'echec') ligne('bad', "La copie du client n'a pas pu être envoyée par courriel : utilisez « Partager le PDF ».");
    else ligne('info', 'Copie au client : non envoyée par courriel. Utilisez « Partager le PDF » pour la lui donner.');

    const file = new File([blob], nom, { type: 'application/pdf' });
    const btnP = $('btnPartager');
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      btnP.hidden = false;
      btnP.onclick = async () => {
        try {
          await navigator.share({ files: [file], title: 'Contrat de location — Location YBMTL' });
        } catch (e) { /* partage annulé */ }
      };
    }
    montrer('fin');
  }
})();
