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
  }

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

    // Découpe la signature autour du trait (fond transparent) pour que le PDF l'agrandisse au maximum.
    recadre() {
      const w = this.c.width;
      const h = this.c.height;
      const data = this.ctx.getImageData(0, 0, w, h).data;
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
      const pad = Math.round(6 * (window.devicePixelRatio || 1));
      x0 = Math.max(0, x0 - pad);
      y0 = Math.max(0, y0 - pad);
      x1 = Math.min(w - 1, x1 + pad);
      y1 = Math.min(h - 1, y1 + pad);
      const out = document.createElement('canvas');
      out.width = x1 - x0 + 1;
      out.height = y1 - y0 + 1;
      out.getContext('2d').drawImage(this.c, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
      return out;
    }
    blob() {
      const out = this.recadre();
      return new Promise((resolve) => (out ? out.toBlob(resolve, 'image/png') : resolve(null)));
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
  });
  $('btnRetour').addEventListener('click', () => montrer('form'));
  $('btnNouveau').addEventListener('click', () => { window.location.href = '/admin/contrat'; });

  // ---------- Création du contrat ----------
  async function terminer() {
    const err = $('erreurSig');
    afficherErreur(err, '');
    if (!$('accepte').checked) {
      afficherErreur(err, 'Cochez la case : le locataire a lu le contrat et en accepte les conditions.');
      return;
    }
    if (padLoc.vide()) {
      afficherErreur(err, 'Le locataire doit signer dans le cadre.');
      return;
    }
    let sigRep;
    if (utiliserSauvee) {
      sigRep = await (await fetch(lireSauvee())).blob();
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
    fd.set('sigLocataire', await padLoc.blob(), 'signature-locataire.png');
    fd.set('sigRepresentant', sigRep, 'signature-representant.png');

    const btn = $('btnTerminer');
    const texte = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Création du contrat…';
    try {
      const res = await fetch('/admin/contrat/generer', { method: 'POST', body: fd, credentials: 'same-origin' });
      const type = res.headers.get('content-type') || '';
      if (!res.ok || type.indexOf('application/pdf') === -1) {
        let msg = 'Une erreur est survenue. Réessayez.';
        if (type.indexOf('application/json') !== -1) {
          try { msg = (await res.json()).erreur || msg; } catch (_) { /* ignoré */ }
        } else if (res.redirected || type.indexOf('text/html') !== -1) {
          msg = "Votre connexion a expiré. Reconnectez-vous à /admin dans un autre onglet, puis réessayez ici : rien n'est perdu.";
        }
        throw new Error(msg);
      }
      const blob = await res.blob();
      if (!utiliserSauvee && $('garderSig').checked) {
        const d = padRep.dataURL();
        if (d) ecrireSauvee(d);
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
