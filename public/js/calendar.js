// Calendrier en LECTURE SEULE (page detail d'un vehicule).
// Affiche un mois a la fois, avec les dates indisponibles grisees.
(function () {
  var el = document.getElementById('calendar');
  if (!el) return;

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

  function render() {
    var y = view.getFullYear();
    var m = view.getMonth();
    var firstDay = new Date(y, m, 1).getDay(); // 0 = dimanche
    var offset = (firstDay + 6) % 7;           // semaine commence lundi
    var daysInMonth = new Date(y, m + 1, 0).getDate();
    var today = new Date(); today.setHours(0, 0, 0, 0);

    var html = '<div class="cal-head">' +
      '<button type="button" class="cal-nav" data-dir="-1">&lsaquo;</button>' +
      '<span class="cal-title">' + MOIS[m] + ' ' + y + '</span>' +
      '<button type="button" class="cal-nav" data-dir="1">&rsaquo;</button>' +
      '</div><div class="cal-grid">';

    JOURS.forEach(function (j) { html += '<span class="cal-dow">' + j + '</span>'; });
    for (var i = 0; i < offset; i++) html += '<span class="cal-cell empty"></span>';

    for (var d = 1; d <= daysInMonth; d++) {
      var key = iso(y, m, d);
      var cls = 'cal-cell';
      var cellDate = new Date(y, m, d);
      if (cellDate < today) cls += ' past';
      if (blocked[key]) cls += ' blocked';
      html += '<span class="' + cls + '">' + d + '</span>';
    }
    html += '</div>';
    el.innerHTML = html;

    el.querySelectorAll('.cal-nav').forEach(function (b) {
      b.addEventListener('click', function () {
        view.setMonth(view.getMonth() + parseInt(b.getAttribute('data-dir'), 10));
        render();
      });
    });
  }

  render();
})();
