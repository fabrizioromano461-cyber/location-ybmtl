// Gestion du formulaire de réservation
document.addEventListener('DOMContentLoaded', function() {
  const departInput = document.getElementById('depart');
  const retourInput = document.getElementById('retour');
  const priceDisplay = document.getElementById('totalPrice');

  // Récupérer le tarif hebdomadaire de l'élément
  const weeklyRateEl = document.getElementById('weeklyRate');
  const weeklyRate = weeklyRateEl ? parseFloat(weeklyRateEl.textContent) : 0;

  // Récupérer les dates bloquées
  const blockedDatesEl = document.getElementById('blockedDates');
  const blockedDates = blockedDatesEl ? JSON.parse(blockedDatesEl.textContent) : [];

  // Fonction pour calculer le prix total
  function calculatePrice() {
    if (!departInput || !departInput.value || !retourInput || !retourInput.value) {
      if (priceDisplay) priceDisplay.innerHTML = '—';
      return;
    }

    const depart = new Date(departInput.value + 'T00:00:00');
    const retour = new Date(retourInput.value + 'T00:00:00');

    const priceError = document.getElementById('priceError');

    if (retour <= depart) {
      if (priceError) {
        priceError.style.display = 'block';
        priceError.textContent = 'La date de retour doit être après la date de départ.';
      }
      if (priceDisplay) priceDisplay.innerHTML = '—';
      return;
    }

    const days = Math.floor((retour - depart) / (1000 * 60 * 60 * 24));

    // Vérifier minimum 1 semaine (7 jours)
    if (days < 7) {
      if (priceError) {
        priceError.style.display = 'block';
        priceError.textContent = '⚠️ Minimum 1 semaine de location requise (7 jours minimum).';
      }
      if (priceDisplay) priceDisplay.innerHTML = '—';
      return;
    }

    if (priceError) priceError.style.display = 'none';

    const weeks = Math.ceil(days / 7);
    const total = weeks * weeklyRate;

    if (priceDisplay) {
      priceDisplay.innerHTML = `<strong class="price-total">$${total.toFixed(2)}</strong>
        <span class="price-detail">${days} jour${days > 1 ? 's' : ''} (${weeks} semaine${weeks > 1 ? 's' : ''})</span>`;
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

  // Définir la date minimum (aujourd'hui)
  const today = new Date().toISOString().split('T')[0];
  if (departInput) {
    departInput.setAttribute('min', today);
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

      const name = nameEl ? nameEl.value.trim() : '';
      const phone = phoneEl ? phoneEl.value.trim() : '';
      const email = emailEl ? emailEl.value.trim() : '';
      const depart = departInput ? departInput.value : '';
      const retour = retourInput ? retourInput.value : '';

      if (!name || !phone || !email) {
        e.preventDefault();
        if (formError) {
          formError.style.display = 'block';
          formError.textContent = 'Veuillez remplir tous les champs obligatoires (nom, téléphone, courriel).';
        }
        return false;
      }

      if (!depart || !retour) {
        e.preventDefault();
        if (formError) {
          formError.style.display = 'block';
          formError.textContent = 'Veuillez sélectionner les dates de départ et de retour.';
        }
        return false;
      }

      const departDate = new Date(depart + 'T00:00:00');
      const retourDate = new Date(retour + 'T00:00:00');

      if (retourDate <= departDate) {
        e.preventDefault();
        if (formError) {
          formError.style.display = 'block';
          formError.textContent = 'La date de retour doit être après la date de départ.';
        }
        return false;
      }

      const days = Math.floor((retourDate - departDate) / (1000 * 60 * 60 * 24));
      if (days < 7) {
        e.preventDefault();
        if (formError) {
          formError.style.display = 'block';
          formError.textContent = '⚠️ Minimum 1 semaine de location requise (7 jours minimum).';
        }
        return false;
      }

      if (formError) formError.style.display = 'none';
    });
  }
});
