// Galerie photo de la page detail : clic sur une vignette = grande image.
// Clic sur la photo principale = ouvre une visionneuse plein ecran (lightbox)
// avec navigation precedente/suivante.
(function () {
  var main = document.getElementById('galleryMain');
  if (!main) return;
  var thumbs = document.querySelectorAll('.gallery-thumbs .thumb');
  var sources = Array.prototype.map.call(thumbs.length ? thumbs : [{ getAttribute: function () { return main.src; } }], function (t) {
    return t.getAttribute('data-src') || main.getAttribute('src');
  });
  if (!thumbs.length) sources = [main.getAttribute('src')];

  thumbs.forEach(function (t) {
    t.addEventListener('click', function () {
      main.src = t.getAttribute('data-src');
      thumbs.forEach(function (x) { x.classList.remove('active'); });
      t.classList.add('active');
    });
  });

  // ----- Lightbox -----
  var lightbox = document.getElementById('lightbox');
  var lightboxImg = document.getElementById('lightboxImg');
  var lightboxCount = document.getElementById('lightboxCount');
  var btn = document.getElementById('galleryMainBtn');
  if (!lightbox || !btn) return;

  var current = 0;

  function indexOfSrc(src) {
    var i = sources.indexOf(src);
    return i === -1 ? 0 : i;
  }

  function show(i) {
    current = (i + sources.length) % sources.length;
    lightboxImg.src = sources[current];
    if (lightboxCount) lightboxCount.textContent = (current + 1) + ' / ' + sources.length;
  }

  function open() {
    show(indexOfSrc(main.getAttribute('src')));
    lightbox.hidden = false;
    document.body.classList.add('lightbox-open');
  }
  function close() {
    lightbox.hidden = true;
    document.body.classList.remove('lightbox-open');
  }

  btn.addEventListener('click', open);
  var closeBtn = document.getElementById('lightboxClose');
  if (closeBtn) closeBtn.addEventListener('click', close);
  lightbox.addEventListener('click', function (e) {
    if (e.target === lightbox) close();
  });
  var prevBtn = document.getElementById('lightboxPrev');
  var nextBtn = document.getElementById('lightboxNext');
  if (prevBtn) prevBtn.addEventListener('click', function () { show(current - 1); });
  if (nextBtn) nextBtn.addEventListener('click', function () { show(current + 1); });

  document.addEventListener('keydown', function (e) {
    if (lightbox.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') show(current - 1);
    if (e.key === 'ArrowRight') show(current + 1);
  });
})();

// ----- Bouton Partager (fiche vehicule) -----
(function () {
  var shareBtn = document.getElementById('shareBtn');
  if (!shareBtn) return;
  function flash(text) {
    var original = shareBtn.innerHTML;
    shareBtn.textContent = text;
    setTimeout(function () { shareBtn.innerHTML = original; }, 2000);
  }

  shareBtn.addEventListener('click', function () {
    var title = document.title;
    var url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: title, url: url }).catch(function () {});
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () {
        flash('✓ Lien copié');
      }).catch(function () {
        window.prompt('Copiez ce lien pour le partager :', url);
      });
    } else {
      window.prompt('Copiez ce lien pour le partager :', url);
    }
  });
})();
