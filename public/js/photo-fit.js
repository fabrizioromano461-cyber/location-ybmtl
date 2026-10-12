// Photos entieres dans leurs cadres, quel que soit l'appareil (telephone, tablette, ordinateur).
// Par defaut une photo remplit son cadre en etant recadree ("cover"). Si ce recadrage couperait
// trop l'auto (photo verticale de telephone, cadre tres large...), on ajoute la classe
// .fit-contain : la photo s'affiche EN ENTIER, avec la meme photo floutee en arriere-plan
// (voir styles.css). Le calcul est refait quand la taille de l'ecran change.
(function () {
  var FRAMES = '.card-photo, .featured-photo, .gallery-main, .thumb, .similar-photo';
  var MAX_CROP_SIDES = 0.08;      // photo plus large que le cadre : "cover" couperait les cotes de l'auto
  var MAX_CROP_TOPBOTTOM = 0.25;  // photo plus haute que le cadre : on tolere de couper un peu ciel / sol

  function fit(frame) {
    var img = frame.querySelector('img');
    if (!img || !img.naturalWidth || !img.naturalHeight || !frame.clientWidth || !frame.clientHeight) return;
    var photoRatio = img.naturalWidth / img.naturalHeight;
    var frameRatio = frame.clientWidth / frame.clientHeight;
    var wider = photoRatio > frameRatio;
    var crop = wider ? 1 - frameRatio / photoRatio : 1 - photoRatio / frameRatio; // part coupee par "cover"
    var contain = crop > (wider ? MAX_CROP_SIDES : MAX_CROP_TOPBOTTOM);
    frame.classList.toggle('fit-contain', contain);
    if (contain) frame.style.setProperty('--photo', 'url("' + (img.currentSrc || img.src) + '")');
  }

  function watch(frame) {
    var img = frame.querySelector('img');
    if (!img) return;
    if (img.complete) fit(frame);
    img.addEventListener('load', function () { fit(frame); }); // aussi quand la galerie change de photo
  }

  function init() {
    var frames = Array.prototype.slice.call(document.querySelectorAll(FRAMES));
    frames.forEach(watch);
    var waiting = false;
    window.addEventListener('resize', function () {
      if (waiting) return;
      waiting = true;
      requestAnimationFrame(function () {
        waiting = false;
        frames.forEach(fit);
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
