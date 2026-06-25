// Calendrier interactif pour la sélection des dates de réservation
class BookingCalendar {
  constructor(containerId, blockedDates, onDatesSelected) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

    this.blockedDates = blockedDates || [];
    this.onDatesSelected = onDatesSelected;
    this.selectedDepart = null;
    this.selectedRetour = null;
    this.currentMonth = new Date();

    this.render();
  }

  render() {
    this.container.innerHTML = '';
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();

    // En-tête avec navigation
    const header = document.createElement('div');
    header.className = 'booking-cal-head';

    const prevBtn = document.createElement('button');
    prevBtn.className = 'cal-nav';
    prevBtn.innerHTML = '‹';
    prevBtn.addEventListener('click', () => this.previousMonth());

    const title = document.createElement('div');
    title.className = 'booking-cal-title';
    title.textContent = new Date(year, month, 1).toLocaleString('fr-CA', {
      month: 'long',
      year: 'numeric'
    });

    const nextBtn = document.createElement('button');
    nextBtn.className = 'cal-nav';
    nextBtn.innerHTML = '›';
    nextBtn.addEventListener('click', () => this.nextMonth());

    header.appendChild(prevBtn);
    header.appendChild(title);
    header.appendChild(nextBtn);
    this.container.appendChild(header);

    // Jours de la semaine
    const dowContainer = document.createElement('div');
    dowContainer.className = 'booking-cal-dow';
    const daysOfWeek = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
    daysOfWeek.forEach(day => {
      const dow = document.createElement('div');
      dow.textContent = day;
      dowContainer.appendChild(dow);
    });
    this.container.appendChild(dowContainer);

    // Grille des dates
    const grid = document.createElement('div');
    grid.className = 'booking-cal-grid';

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      const cell = document.createElement('button');
      cell.className = 'booking-cal-cell';
      cell.type = 'button';
      cell.textContent = date.getDate();

      const dateStr = this.formatDate(date);
      const isCurrentMonth = date.getMonth() === month;
      const isPast = date < today;
      const isBlocked = this.blockedDates.includes(dateStr);
      const isSelected = dateStr === this.selectedDepart || dateStr === this.selectedRetour;
      const isBetween = this.isDateBetween(date, this.selectedDepart, this.selectedRetour);

      if (!isCurrentMonth) {
        cell.classList.add('other-month');
        cell.disabled = true;
      } else if (isPast) {
        cell.classList.add('past');
        cell.disabled = true;
      } else if (isBlocked) {
        cell.classList.add('blocked');
        cell.disabled = true;
        cell.innerHTML = '<span class="blocked-mark">✕</span>';
      } else {
        cell.classList.add('available');
        cell.addEventListener('click', () => this.selectDate(dateStr, date));
      }

      if (isSelected) {
        cell.classList.add('selected');
      }
      if (isBetween && !isSelected) {
        cell.classList.add('between');
      }

      grid.appendChild(cell);
    }

    this.container.appendChild(grid);
  }

  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  isDateBetween(date, start, end) {
    if (!start || !end) return false;
    const dateStr = this.formatDate(date);
    const startDate = new Date(start);
    const endDate = new Date(end);
    return date > startDate && date < endDate;
  }

  selectDate(dateStr, dateObj) {
    if (!this.selectedDepart) {
      this.selectedDepart = dateStr;
      this.selectedRetour = null;
    } else if (!this.selectedRetour) {
      if (dateObj > new Date(this.selectedDepart)) {
        this.selectedRetour = dateStr;
      } else {
        // Si on clique avant la date de départ, c'est la nouvelle date de départ
        this.selectedRetour = this.selectedDepart;
        this.selectedDepart = dateStr;
      }
    } else {
      // Réinitialiser et recommencer
      this.selectedDepart = dateStr;
      this.selectedRetour = null;
    }

    this.render();
    if (this.onDatesSelected) {
      this.onDatesSelected(this.selectedDepart, this.selectedRetour);
    }
  }

  previousMonth() {
    this.currentMonth.setMonth(this.currentMonth.getMonth() - 1);
    this.render();
  }

  nextMonth() {
    this.currentMonth.setMonth(this.currentMonth.getMonth() + 1);
    this.render();
  }

  setSelectedDates(depart, retour) {
    this.selectedDepart = depart;
    this.selectedRetour = retour;
    this.render();
  }
}
