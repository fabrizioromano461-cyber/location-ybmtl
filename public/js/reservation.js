// Gestion du formulaire de réservation
document.addEventListener('DOMContentLoaded', function() {
  const departInput = document.getElementById('depart');
  const retourInput = document.getElementById('retour');
  const priceDisplay = document.getElementById('totalPrice');

  // Récupérer le tarif hebdomadaire de l'élément
  const weeklyRateEl = document.getElementById('weeklyRate');
  const weeklyRate = weeklyRateEl ? parseFloat(weeklyRateEl.textContent) : 0;

  // Taux de taxes (TPS / TVQ), fournis par le serveur
  const taxEl = document.getElementById('taxRates');
  const tpsRate = taxEl ? parseFloat(taxEl.dataset.tps) : 0;
  const tvqRate = taxEl ? parseFloat(taxEl.dataset.tvq) : 0;
  const breakdownEl = document.getElementById('priceBreakdown');

  // Page anglaise (/en/...) : la page definit window.YBMTL_I18N = { lang: 'en' } ; sinon tout reste en francais.
  const EN = !!(window.YBMTL_I18N && window.YBMTL_I18N.lang === 'en');
  const LOCALE = EN ? 'en-CA' : 'fr-CA';
  // \u00a0 = espace insecable : « 275,00 $ » ne se coupe jamais en fin de ligne sur mobile
  const fmt = EN
    ? (cents) => '$' + (cents / 100).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : (cents) => (cents / 100).toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '\u00a0$';
  const pct = (rate) => (rate * 100).toLocaleString(LOCALE, { maximumFractionDigits: 3 });
  const frDate = (iso) => new Date(iso + 'T00:00:00').toLocaleDateString(LOCALE, { day: 'numeric', month: 'long', year: 'numeric' });

  // Textes affiches par le formulaire (francais / anglais)
  const T = EN
    ? {
        minDepart: (d) => `Departure must be no earlier than ${d}: a rental cannot start on the same day.`,
        retourApres: 'The return date must be after the departure date.',
        minSemaine: '⚠️ Minimum 1-week rental required (7 days minimum).',
        detail: (days, weeks) => `${days}\u00a0day${days > 1 ? 's' : ''} (${weeks}\u00a0week${weeks > 1 ? 's' : ''}) ·\u00a0taxes\u00a0included`,
        sousTotal: (weeks, tarif) => `Subtotal (${weeks}\u00a0wk\u00a0×\u00a0${tarif})`,
        tps: (rate) => `GST (${rate}%)`,
        tvq: (rate) => `QST (${rate}%)`,
        total: 'Total (taxes included)',
        depotNote: 'The security deposit is not taxed.',
        champs: 'Please fill in all required fields (name, phone, email).',
        dates: 'Please select the departure and return dates.',
      }
    : {
        minDepart: (d) => `Le départ doit être au plus tôt le ${d} : une location ne peut pas commencer le jour même.`,
        retourApres: 'La date de retour doit être après la date de départ.',
        minSemaine: '⚠️ Minimum 1 semaine de location requise (7 jours minimum).',
        detail: (days, weeks) => `${days}\u00a0jour${days > 1 ? 's' : ''} (${weeks}\u00a0semaine${weeks > 1 ? 's' : ''}) ·\u00a0taxes\u00a0incluses`,
        sousTotal: (weeks, tarif) => `Sous-total (${weeks}\u00a0sem.\u00a0×\u00a0${tarif})`,
        tps: (rate) => `TPS (${rate}\u00a0%)`,
        tvq: (rate) => `TVQ (${rate}\u00a0%)`,
        total: 'Total (taxes incluses)',
        depotNote: "Le dépôt de garantie n'est pas taxé.",
        champs: 'Veuillez remplir tous les champs obligatoires (nom, téléphone, courriel).',
        dates: 'Veuillez sélectionner les dates de départ et de retour.',
      };

  // Premier jour de départ possible : le lendemain (attribut min fourni par le serveur, heure de Montréal)
  const minDepart = departInput ? departInput.getAttribute('min') || '' : '';
  const minDepartMsg = minDepart ? T.minDepart(frDate(minDepart)) : '';

  function resetPrice() {
    if (priceDisplay) priceDisplay.innerHTML = '—';
    if (breakdownEl) breakdownEl.hidden = true;
  }

  // Récupérer les dates bloquées
  const blockedDatesEl = document.getElementById('blockedDates');
  const blockedDates = blockedDatesEl ? JSON.parse(blockedDatesEl.textContent) : [];

  // Fonction pour calculer le prix total
  function calculatePrice() {
    if (!departInput || !departInput.value || !retourInput || !retourInput.value) {
      resetPrice();
      return;
    }

    const depart = new Date(departInput.value + 'T00:00:00');
    const retour = new Date(retourInput.value + 'T00:00:00');

    const priceError = document.getElementById('priceError');

    if (minDepart && departInput.value < minDepart) {
      if (priceError) {
        priceError.style.display = 'block';
        priceError.textContent = minDepartMsg;
      }
      resetPrice();
      return;
    }

    if (retour <= depart) {
      if (priceError) {
        priceError.style.display = 'block';
        priceError.textContent = T.retourApres;
      }
      resetPrice();
      return;
    }

    // Math.round : un changement d'heure ne doit pas faire perdre une journée
    const days = Math.round((retour - depart) / (1000 * 60 * 60 * 24));

    // Vérifier minimum 1 semaine (7 jours)
    if (days < 7) {
      if (priceError) {
        priceError.style.display = 'block';
        priceError.textContent = T.minSemaine;
      }
      resetPrice();
      return;
    }

    if (priceError) priceError.style.display = 'none';

    const weeks = Math.ceil(days / 7);
    const subtotal = weeks * weeklyRate * 100;
    const tps = Math.round((subtotal * Math.round(tpsRate * 100000)) / 100000);
    const tvq = Math.round((subtotal * Math.round(tvqRate * 100000)) / 100000);
    const total = subtotal + tps + tvq;

    if (priceDisplay) {
      priceDisplay.innerHTML = `<strong class="price-total">${fmt(total)}</strong>
        <span class="price-detail">${T.detail(days, weeks)}</span>`;
    }
    if (breakdownEl) {
      breakdownEl.innerHTML = `
        <div class="breakdown-line"><span>${T.sousTotal(weeks, fmt(weeklyRate * 100))}</span><span>${fmt(subtotal)}</span></div>
        <div class="breakdown-line"><span>${T.tps(pct(tpsRate))}</span><span>${fmt(tps)}</span></div>
        <div class="breakdown-line"><span>${T.tvq(pct(tvqRate))}</span><span>${fmt(tvq)}</span></div>
        <div class="breakdown-line breakdown-total"><span>${T.total}</span><span>${fmt(total)}</span></div>
        <div class="breakdown-note">${T.depotNote}</div>`;
      breakdownEl.hidden = false;
    }
  }

  // Mettre à jour le prix quand les dates changent
  if (departInput) {
    departInput.addEventListener('change', calculatePrice);
    departInput.addEventListener('input', calculatePrice);
  }
  if (retourInput) {
    retourInput.addEventListener('change', calculatePrice);
    retourInput.addEventListener('input', calculatePrice);
  }

  // Le retour ne peut pas être avant le départ choisi
  if (departInput) {
    departInput.addEventListener('change', function() {
      if (this.value && retourInput) {
        retourInput.setAttribute('min', this.value);
        // Réinitialiser la date de retour si elle est avant la date de départ
        if (retourInput.value && new Date(retourInput.value) <= new Date(this.value)) {
          retourInput.value = '';
          calculatePrice();
        }
      }
    });
  }

  // Validation avant envoi
  const form = document.getElementById('reservationForm');
  if (form) {
    form.addEventListener('submit', function(e) {
      const nameEl = document.getElementById('name');
      const phoneEl = document.getElementById('phone');
      const emailEl = document.getElementById('email');
      const formError = document.getElementById('formError');

      // Bloque l'envoi et affiche le message en haut du formulaire (défilé à l'écran)
      const showError = (msg) => {
        e.preventDefault();
        if (formError) {
          formError.style.display = 'block';
          formError.textContent = msg;
          formError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return false;
      };

      const name = nameEl ? nameEl.value.trim() : '';
      const phone = phoneEl ? phoneEl.value.trim() : '';
      const email = emailEl ? emailEl.value.trim() : '';
      const depart = departInput ? departInput.value : '';
      const retour = retourInput ? retourInput.value : '';

      if (!name || !phone || !email) {
        return showError(T.champs);
      }

      if (!depart || !retour) {
        return showError(T.dates);
      }

      if (minDepart && depart < minDepart) {
        return showError(minDepartMsg);
      }

      const departDate = new Date(depart + 'T00:00:00');
      const retourDate = new Date(retour + 'T00:00:00');

      if (retourDate <= departDate) {
        return showError(T.retourApres);
      }

      const days = Math.round((retourDate - departDate) / (1000 * 60 * 60 * 24));
      if (days < 7) {
        return showError(T.minSemaine);
      }

      if (formError) formError.style.display = 'none';
    });
  }
});
