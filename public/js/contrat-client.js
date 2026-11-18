// Page /contrat/<lien> : le client entre ses infos, lit les conditions, accepte et signe.
// La voiture, les dates et le prix viennent du lien (signé par Location YBMTL) : le serveur ne croit que lui.
(function () {
  'use strict';
  const page = document.getElementById('contratPage');
  if (!page) return;

  const $ = (id) => document.getElementById(id);
  const form = $('contratForm');
  const URL_GENERER = page.dataset.generer || '/contrat/generer';
  let LIGNES = [];
  try { LIGNES = JSON.parse(page.dataset.lignes || '[]') || []; } catch (_) { LIGNES = []; }

  form.addEventListener('submit', (e) => e.preventDefault()); // jamais d'envoi par la touche Entrée

  // Forme d'une adresse courriel (même règle que sur le serveur, lib/courriel.js).
  const LOCAL = /^[A-Za-z0-9!#$%&'*+\/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+\/=?^_`{|}~-]+)*$/;
  const ETIQUETTE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/;
  function courrielValide(c) {
    if (typeof c !== 'string' || c.length > 254 || /\s/.test(c)) return false;
    const i = c.lastIndexOf('@');
    if (i < 1 || c.indexOf('@') !== i) return false;
    const local = c.slice(0, i);
    const morceaux = c.slice(i + 1).split('.');
    if (local.length > 64 || !LOCAL.test(local)) return false;
    if (morceaux.length < 2 || !morceaux.every((m) => ETIQUETTE.test(m))) return false;
    const fin = morceaux[morceaux.length - 1];
    return /^[A-Za-z]{2,}$/.test(fin) || /^xn--[A-Za-z0-9-]+$/.test(fin);
  }

  // ---------- Âge (information, jamais bloquant au-dessus de 18 ans) ----------
  function ageDe(iso) {
    const n = new Date(iso + 'T00:00:00');
    if (isNaN(n)) return null;
    const t = new Date();
    let age = t.getFullYear() - n.getFullYear();
    const m = t.getMonth() - n.getMonth();
    if (m < 0 || (m === 0 && t.getDate() < n.getDate())) age--;
    return age;
  }
  function majAge() {
    const hint = $('ageHint');
    hint.hidden = true;
    const v = form.naissance.value;
    if (!v) return;
    const age = ageDe(v);
    if (age == null || age < 0 || age > 110) {
      hint.textContent = 'Vérifiez votre date de naissance.';
      hint.hidden = false;
    } else if (age >= 18 && age < 25) {
      hint.textContent = 'Le conducteur principal doit avoir 25 ans minimum. Location YBMTL vous contactera pour confirmer.';
      hint.hidden = false;
    }
  }
  form.naissance.addEventListener('change', majAge);
  form.naissance.addEventListener('input', majAge);

  // ---------- Étapes ----------
  const etapes = { 1: $('etape1'), 2: $('etape2') };
  function majProgression(n, fini) {
    document.querySelectorAll('#progress li').forEach((li) => {
      const e = parseInt(li.dataset.etape, 10);
      li.classList.toggle('actif', !fini && e === n);
      li.classList.toggle('fait', fini || e < n);
    });
  }
  function montrer(n) {
    Object.keys(etapes).forEach((k) => { etapes[k].hidden = parseInt(k, 10) !== n; });
    $('etapeFin').hidden = true;
    majProgression(n, false);
    window.scrollTo(0, 0);
  }
  function erreur(id, msg, champ) {
    const el = $(id);
    el.textContent = msg || '';
    el.hidden = !msg;
    if (msg) {
      if (champ && champ.focus) { try { champ.focus({ preventScroll: true }); } catch (_) { /* ignoré */ } }
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }

  function validerEtape1() {
    erreur('erreur1', '');
    if (form.nom.value.trim().length < 3) return erreur('erreur1', 'Entrez votre nom complet.', form.nom), false;
    if (form.adresse.value.trim().length < 6) return erreur('erreur1', 'Entrez votre adresse complète.', form.adresse), false;
    if (form.telephone.value.replace(/\D/g, '').length < 7) return erreur('erreur1', 'Entrez votre numéro de téléphone.', form.telephone), false;
    const courriel = form.courriel.value.trim();
    if (!courriel) return erreur('erreur1', 'Entrez votre courriel : vous y recevrez votre copie du contrat.', form.courriel), false;
    if (!courrielValide(courriel)) return erreur('erreur1', 'Votre courriel ne semble pas valide. Vérifiez-le (exemple : nom@gmail.com).', form.courriel), false;
    if (!form.naissance.value) return erreur('erreur1', 'Entrez votre date de naissance.', form.naissance), false;
    const age = ageDe(form.naissance.value);
    if (age == null || age < 18 || age > 100) return erreur('erreur1', 'Vérifiez votre date de naissance.', form.naissance), false;
    if (form.permis.value.trim().length < 4) return erreur('erreur1', 'Entrez votre numéro de permis de conduire.', form.permis), false;
    return true;
  }

  function remplirResume() {
    const dl = $('resume');
    dl.textContent = '';
    const courriel = form.courriel.value.trim();
    const lignes = [['Locataire', form.nom.value.trim()], ['Courriel', courriel]].concat(LIGNES);
    lignes.forEach(([k, v]) => {
      const dt = document.createElement('dt');
      dt.textContent = k;
      const dd = document.createElement('dd');
      dd.textContent = v;
      dl.append(dt, dd);
    });
    // Le dépôt remplace le blanc de l'article 2.1 dans le texte du contrat.
    document.querySelectorAll('.js-depot').forEach((e) => { e.textContent = page.dataset.depot || ''; });
    $('noteCopie').textContent = courriel
      ? 'Une copie du contrat sera envoyée à ' + courriel + ' et à Location YBMTL.'
      : "Vous n'avez pas indiqué de courriel : vous pourrez télécharger votre copie à la fin. Location YBMTL reçoit aussi le contrat.";
  }

  $('suivant1').addEventListener('click', () => {
    if (!validerEtape1()) return;
    remplirResume();
    montrer(2);
    initSignature();
    surveillerConditions();
  });
  document.querySelectorAll('[data-retour]').forEach((b) => {
    b.addEventListener('click', () => montrer(parseInt(b.dataset.retour, 10)));
  });

  // ---------- Lecture des conditions : la case « J'ai lu et j'accepte » s'ouvre au bas du contrat ----------
  let conditionsLues = false;
  let ecouteurFin = null;
  function debloquerAccepte() {
    conditionsLues = true;
    $('accepte').disabled = false;
    $('blocAccepte').classList.remove('c-check-off');
    $('aideAccepte').hidden = true;
    if (ecouteurFin) { window.removeEventListener('scroll', ecouteurFin); ecouteurFin = null; }
  }
  function verifierFinConditions() {
    const fin = $('finConditions');
    if (!fin) { debloquerAccepte(); return; }
    if (etapes[2].hidden || fin.offsetParent === null) return;
    if (fin.getBoundingClientRect().top <= window.innerHeight) debloquerAccepte();
  }
  function surveillerConditions() {
    if (conditionsLues || ecouteurFin) return;
    ecouteurFin = verifierFinConditions;
    window.addEventListener('scroll', ecouteurFin, { passive: true });
    verifierFinConditions();
  }

  // ---------- Signature ----------
  // Découpe une signature autour du trait (fond transparent). Renvoie un canevas, ou null s'il n'y a rien d'écrit.
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
      if (r.width < 10) return;
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
    blob() {
      const out = recadrerCanevas(this.c);
      return out ? blobDe(out) : Promise.resolve(null);
    }
  }

  // Signature au clavier : le nom tapé est dessiné en écriture « manuscrite » puis envoyé comme image.
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

  let padLoc = null;
  let mode = 'dessin';
  function majApercu() {
    const zone = $('apercuLoc');
    const cadre = zone.querySelector('.c-apercu-cible');
    const c = canevasTexte($('texteLoc').value);
    cadre.textContent = '';
    if (c) {
      c.className = 'c-apercu-img';
      cadre.appendChild(c);
    }
    zone.classList.toggle('has-ink', !!c);
  }
  function choisirMode(m) {
    mode = m;
    $('zoneDessinLoc').hidden = m !== 'dessin';
    $('zoneClavierLoc').hidden = m !== 'clavier';
    document.querySelectorAll('.c-mode').forEach((b) => {
      const actif = b.dataset.mode === m;
      b.classList.toggle('actif', actif);
      b.setAttribute('aria-pressed', actif ? 'true' : 'false');
    });
    if (m === 'dessin') { if (padLoc) padLoc.init(); } else $('texteLoc').focus({ preventScroll: true });
  }
  document.querySelectorAll('.c-mode').forEach((b) => b.addEventListener('click', () => choisirMode(b.dataset.mode)));
  $('texteLoc').addEventListener('input', majApercu);
  function initSignature() {
    if (!padLoc) padLoc = new Pad($('padLoc'), $('boiteLoc'));
    padLoc.init();
  }
  $('effLoc').addEventListener('click', () => padLoc && padLoc.effacer());
  window.addEventListener('resize', () => {
    if (etapes[2].hidden || !padLoc) return;
    if (Math.abs(padLoc.c.getBoundingClientRect().width - padLoc.larg) > 1) padLoc.init();
  });

  // ---------- Envoi du contrat ----------
  async function terminer() {
    erreur('erreur2', '');
    if (!conditionsLues) return erreur('erreur2', "Faites défiler le contrat jusqu'en bas, puis cochez « J'ai lu et j'accepte les conditions »."), undefined;
    if (!$('accepte').checked) return erreur('erreur2', "Cochez la case « J'ai lu et j'accepte les conditions du contrat de location »."), undefined;
    let sig;
    if (mode === 'clavier') {
      const c = canevasTexte($('texteLoc').value);
      if (!c) return erreur('erreur2', 'Tapez votre nom pour signer.', $('texteLoc')), undefined;
      sig = await blobDe(c);
    } else {
      if (padLoc.vide()) return erreur('erreur2', 'Signez dans le cadre avec votre doigt.'), undefined;
      sig = await padLoc.blob();
    }
    const courriel = form.courriel.value.trim();
    const fd = new FormData(form);
    fd.set('accepte', '1');
    fd.set('sigLocataire', sig, 'signature-locataire.png');
    fd.set('sigModeLocataire', mode);

    const btn = $('btnTerminer');
    const texte = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Envoi du contrat…';
    try {
      const res = await fetch(URL_GENERER, { method: 'POST', body: fd });
      const type = res.headers.get('content-type') || '';
      if (!res.ok || type.indexOf('application/pdf') === -1) {
        let msg = 'Une erreur est survenue. Réessayez dans un instant.';
        if (type.indexOf('application/json') !== -1) {
          try { msg = (await res.json()).erreur || msg; } catch (_) { /* ignoré */ }
        }
        throw new Error(msg);
      }
      const blob = await res.blob();
      afficherFin(blob, {
        nom: res.headers.get('X-Nom-Fichier'),
        ref: res.headers.get('X-Reference'),
        yb: res.headers.get('X-Courriel-YB'),
        client: res.headers.get('X-Courriel-Client'),
        courriel,
      });
    } catch (e) {
      erreur('erreur2', e && e.message ? e.message : 'Erreur de réseau. Vérifiez votre connexion et réessayez.');
      btn.disabled = false;
      btn.textContent = texte;
    }
  }
  $('btnTerminer').addEventListener('click', terminer);

  function afficherFin(blob, info) {
    const nom = info.nom || 'Contrat-Location-YBMTL.pdf';
    const lien = $('btnTelecharger');
    lien.href = URL.createObjectURL(blob);
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
    if (info.yb === 'envoye') ligne('ok', 'Votre contrat a été transmis à Location YBMTL.');
    else ligne('bad', "Votre contrat n'a pas pu être transmis automatiquement à Location YBMTL. Téléchargez le PDF ci-dessous et envoyez-le-nous, ou appelez-nous.");
    if (info.client === 'envoye') ligne('ok', 'Une copie vous a été envoyée par courriel : ' + info.courriel + ' (vérifiez aussi vos pourriels).');
    else if (info.client === 'echec') ligne('bad', "Votre copie n'a pas pu être envoyée par courriel : téléchargez-la ci-dessous.");
    else ligne('info', "Pas de courriel indiqué : téléchargez votre copie ci-dessous.");
    Object.keys(etapes).forEach((k) => { etapes[k].hidden = true; });
    $('etapeFin').hidden = false;
    majProgression(2, true);
    window.scrollTo(0, 0);
  }
})();
