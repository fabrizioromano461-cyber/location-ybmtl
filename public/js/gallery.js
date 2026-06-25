// Galerie photo de la page detail : clic sur une vignette = grande image.
(function () {
  var main = document.getElementById('galleryMain');
  if (!main) return;
  var thumbs = document.querySelectorAll('.gallery-thumbs .thumb');
  thumbs.forEach(function (t) {
    t.addEventListener('click', function () {
      main.src = t.getAttribute('data-src');
      thumbs.forEach(function (x) { x.classList.remove('active'); });
      t.classList.add('active');
    });
  });
})();
