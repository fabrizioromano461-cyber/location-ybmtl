// Calendrier INTERACTIF du panneau admin.
// Clic sur une journee = bloquer / liberer. Enregistre tout de suite via l'API.
(function () {
  var el = document.getElementById('adminCalendar');
  if (!el) return;

  var vehicleId = el.getAttribute('data-vehicle');
  var blocked = {};
  (JSON.parse(el.getAttribute('data-blocked') || '[]')).forEach(function (d) {
    blocked[d] = true;
  });

  var MOIS = ['Janvier','Fevrier','Mars','Avril','Mai','Juin','Juillet',
              'Aout','Septembre','Octobre','Novembre','Decembre'];
  var JOURS = ['L','M','M','J','V','S','D'];

  var view = new Date();
  view.setDate(1);

  function iso(y, m, d) {
    return y + '-' + String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
  }

  function save(date, action) {
    return fetch('/admin/api/disponibilite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vehicle_id: vehicleId, date: date, action: action }),
    }).then(function (r) { return r.json(); });
  }

  function render() {
    var y = view.getFullYear();
    var m = view.getMonth();
    var firstDay = new Date(y, m, 1).getDay();
    var offset = (firstDay + 6) % 7;
    var daysInMonth = new Date(y, m + 1, 0).getDate();

    var html = '<div class="cal-head">' +
      '<button type="button" class="cal-nav" data-dir="-1">&lsaquo;</button>' +
      '<span class="cal-title">' + MOIS[m] + ' ' + y + '</span>' +
      '<button type="button" class="cal-nav" data-dir="1">&rsaquo;</button>' +
      '</div><div class="cal-grid">';

    JOURS.forEach(function (j) { html += '<span class="cal-dow">' + j + '</span>'; });
    for (var i = 0; i < offset; i++) html += '<span class="cal-cell empty"></span>';

    for (var d = 1; d <= daysInMonth; d++) {
      var key = iso(y, m, d);
      var cls = 'cal-cell clickable' + (blocked[key] ? ' blocked' : '');
      html += '<button type="button" class="' + cls + '" data-date="' + key + '">' + d + '</button>';
    }
    html += '</div>';
    el.innerHTML = html;

    el.querySelectorAll('.cal-nav').forEach(function (b) {
      b.addEventListener('click', function () {
        view.setMonth(view.getMonth() + parseInt(b.getAttribute('data-dir'), 10));
        render();
      });
    });

    el.querySelectorAll('.cal-cell.clickable').forEach(function (cell) {
      cell.addEventListener('click', function () {
        var date = cell.getAttribute('data-date');
        var isBlocked = !!blocked[date];
        var action = isBlocked ? 'unblock' : 'block';
        cell.classList.add('saving');
        save(date, action).then(function (res) {
          cell.classList.remove('saving');
          if (res && res.ok) {
            if (isBlocked) { delete blocked[date]; cell.classList.remove('blocked'); }
            else { blocked[date] = true; cell.classList.add('blocked'); }
          }
        });
      });
    });
  }

  render();
})();
