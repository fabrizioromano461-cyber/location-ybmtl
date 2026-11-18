// Page admin « Lien client » : crée un lien PRIVÉ de contrat pour une location confirmée,
// puis permet de l'envoyer au client (texto, WhatsApp…) ou de le copier.
(function () {
  'use strict';
  const page = document.getElementById('lienPage');
  if (!page) return;

  const $ = (id) => document.getElementById(id);
  const form = $('lienForm');
  const TPS_K = Math.round(parseFloat(page.dataset.tps) * 100000);
  const TVQ_K = Math.round(parseFloat(page.dataset.tvq) * 100000);
  const AUJ = page.dataset.aujourdhui; // AAAA-MM-JJ (heure de Montréal)

  const argent = (cents) =>
    (cents / 100).toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' $';
  const dateFr = (iso) =>
    new Date(iso + 'T00:00:00').toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' });
  const ajouterJours = (iso, n) => {
    const t = new Date(iso + 'T00:00:00Z');
    t.setUTCDate(t.getUTCDate() + n);
    return t.toISOString().slice(0, 10);
  };
  const montant = (v) => {
    const n = parseFloat(String(v || '').replace(',', '.').replace(/[^\d.]/g, ''));
    return isNaN(n) ? null : Math.round(n * 100);
  };

  form.departDate.min = AUJ;

  // ---------- Prix (celui du site, modifiable) et total en direct ----------
  const sel = $('vehiculeSel');
  function prixDuSite() {
    const o = sel.options[sel.selectedIndex];
    if (!o || !o.value) return;
    $('tarifHebdo').value = o.dataset.tarif;
    $('depot').value = o.dataset.depot;
  }
  function majRecap() {
    const box = $('recapPrix');
    const tarif = montant($('tarifHebdo').value);
    const a = form.departDate.value;
    const b = form.retourDate.value;
    const t0 = Date.parse(a + 'T00:00:00Z');
    const t1 = Date.parse(b + 'T00:00:00Z');
    if (!tarif || !a || !b || isNaN(t0) || isNaN(t1) || t1 <= t0) {
      box.textContent = 'Choisissez la voiture et les dates pour voir le total.';
      return;
    }
    const days = Math.round((t1 - t0) / 86400000);
    const weeks = Math.ceil(days / 7);
    const subtotal = weeks * tarif;
    const tps = Math.round((subtotal * TPS_K) / 100000);
    const tvq = Math.round((subtotal * TVQ_K) / 100000);
    const depot = montant($('depot').value);
    box.innerHTML =
      '<strong>' + weeks + ' semaine' + (weeks > 1 ? 's' : '') + '</strong> (' + days + ' jours) × ' + argent(tarif) + '<br>' +
      'Sous-total ' + argent(subtotal) + ' · TPS ' + argent(tps) + ' · TVQ ' + argent(tvq) + '<br>' +
      '<strong>Total taxes incluses : ' + argent(subtotal + tps + tvq) + '</strong>' +
      (depot != null ? '<br>Dépôt de garantie (non taxé) : ' + argent(depot) : '');
  }
  sel.addEventListener('change', () => { prixDuSite(); majRecap(); });
  form.departDate.addEventListener('change', () => {
    const d = form.departDate.value;
    if (d && (!form.retourDate.value || form.retourDate.value <= d)) form.retourDate.value = ajouterJours(d, 7);
    majRecap();
  });
  ['retourDate', 'tarifHebdo', 'depot'].forEach((n) => {
    form[n].addEventListener('input', majRecap);
    form[n].addEventListener('change', majRecap);
  });
  if (sel.value) prixDuSite(); // voiture déjà choisie (depuis la liste des demandes)
  majRecap();

  // ---------- Création du lien ----------
  function erreur(msg) {
    const el = $('lienErreur');
    el.textContent = msg || '';
    el.hidden = !msg;
    if (msg) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  let messageClient = '';
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    erreur('');
    const btn = $('btnCreer');
    const texte = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Création du lien…';
    try {
      const res = await fetch('/admin/contrat/lien', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
        body: new URLSearchParams(new FormData(form)),
        credentials: 'same-origin',
        redirect: 'manual',
      });
      if (res.type === 'opaqueredirect' || res.status === 401 || res.status === 302) {
        throw new Error('Ta session est terminée. Reconnecte-toi à l’admin puis recommence.');
      }
      const type = res.headers.get('content-type') || '';
      if (type.indexOf('application/json') === -1) throw new Error('Réponse inattendue. Recharge la page et recommence.');
      const data = await res.json();
      if (!res.ok) throw new Error(data.erreur || 'Impossible de créer le lien.');
      afficher(data);
    } catch (err) {
      erreur(err && err.message ? err.message : 'Erreur de réseau. Réessaie.');
    } finally {
      btn.disabled = false;
      btn.textContent = texte;
    }
  });

  function afficher(data) {
    const dl = $('lienResume');
    dl.textContent = '';
    (data.resume || []).forEach(([k, v]) => {
      const dt = document.createElement('dt');
      dt.textContent = k;
      const dd = document.createElement('dd');
      dd.textContent = v;
      dl.append(dt, dd);
    });
    $('lienUrl').value = data.url;
    $('btnOuvrir').href = data.url;
    $('lienExpire').textContent = 'Valide jusqu’au ' + dateFr(data.expire) + '.';
    messageClient = 'Bonjour ! Voici votre lien pour remplir et signer votre contrat de location Location YBMTL (environ 3 minutes, sur votre cellulaire) : ' + data.url;
    $('btnPartager').hidden = !navigator.share;
    form.hidden = true;
    $('lienResultat').hidden = false;
    window.scrollTo(0, 0);
  }

  $('btnPartager').addEventListener('click', async () => {
    try { await navigator.share({ title: 'Contrat de location YBMTL', text: messageClient }); } catch (_) { /* annulé */ }
  });

  $('btnCopier').addEventListener('click', async () => {
    const champ = $('lienUrl');
    const btn = $('btnCopier');
    let ok = false;
    try { await navigator.clipboard.writeText(champ.value); ok = true; } catch (_) { /* repli ci-dessous */ }
    if (!ok) {
      champ.focus();
      champ.select();
      try { ok = document.execCommand('copy'); } catch (_) { ok = false; }
    }
    const avant = btn.textContent;
    btn.textContent = ok ? 'Lien copié ✓' : 'Sélectionné : fais « Copier »';
    setTimeout(() => { btn.textContent = avant; }, 2500);
  });

  $('btnAutre').addEventListener('click', () => {
    $('lienResultat').hidden = true;
    form.hidden = false;
    window.scrollTo(0, 0);
  });
})();
