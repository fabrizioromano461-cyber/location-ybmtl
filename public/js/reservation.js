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

  // \u00a0 = espace insecable : « 275,00 $ » ne se coupe jamais en fin de ligne sur mobile
  const fmt = (cents) => (cents / 100).toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '\u00a0$';
  const pct = (rate) => (rate * 100).toLocaleString('fr-CA', { maximumFractionDigits: 3 });
  const frDate = (iso) => new Date(iso + 'T00:00:00').toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' });

  // Premier jour de départ possible : le lendemain (attribut min fourni par le serveur, heure de Montréal)
  const minDepart = departInput ? departInput.getAttribute('min') || '' : '';
  const minDepartMsg = minDepart ? `Le départ doit être au plus tôt le ${frDate(minDepart)} : une location ne peut pas commencer le jour même.` : '';

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
        priceError.textContent = 'La date de retour doit être après la date de départ.';
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
        priceError.textContent = '⚠️ Minimum 1 semaine de location requise (7 jours minimum).';
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
        <span class="price-detail">${days}\u00a0jour${days > 1 ? 's' : ''} (${weeks}\u00a0semaine${weeks > 1 ? 's' : ''}) ·\u00a0taxes\u00a0incluses</span>`;
    }
    if (breakdownEl) {
      breakdownEl.innerHTML = `
        <div class="breakdown-line"><span>Sous-total (${weeks}\u00a0sem.\u00a0×\u00a0${fmt(weeklyRate * 100)})</span><span>${fmt(subtotal)}</span></div>
        <div class="breakdown-line"><span>TPS (${pct(tpsRate)}\u00a0%)</span><span>${fmt(tps)}</span></div>
        <div class="breakdown-line"><span>TVQ (${pct(tvqRate)}\u00a0%)</span><span>${fmt(tvq)}</span></div>
        <div class="breakdown-line breakdown-total"><span>Total (taxes incluses)</span><span>${fmt(total)}</span></div>
        <div class="breakdown-note">Le dépôt de garantie n'est pas taxé.</div>`;
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
        return showError('Veuillez remplir tous les champs obligatoires (nom, téléphone, courriel).');
      }

      if (!depart || !retour) {
        return showError('Veuillez sélectionner les dates de départ et de retour.');
      }

      if (minDepart && depart < minDepart) {
        return showError(minDepartMsg);
      }

      const departDate = new Date(depart + 'T00:00:00');
      const retourDate = new Date(retour + 'T00:00:00');

      if (retourDate <= departDate) {
        return showError('La date de retour doit être après la date de départ.');
      }

      const days = Math.round((retourDate - departDate) / (1000 * 60 * 60 * 24));
      if (days < 7) {
        return showError('⚠️ Minimum 1 semaine de location requise (7 jours minimum).');
      }

      if (formError) formError.style.display = 'none';
    });
  }
});
