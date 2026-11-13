// Neige legere pour le theme hiver. Ne bloque jamais les clics, ne s'affiche pas sur le
// panneau admin et s'arrete si la personne a demande de reduire les animations.
(function () {
  'use strict';
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var chemin = location.pathname;
  if (chemin.indexOf('/admin') === 0 || chemin.indexOf('/contrat') === 0) return;

  var canvas = document.createElement('canvas');
  canvas.id = 'neige';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);
  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Un flocon = petit rond blanc avec un halo bleu pale : visible sur fond clair comme sur fond fonce.
  var sprite = document.createElement('canvas');
  sprite.width = sprite.height = 32;
  var sctx = sprite.getContext('2d');
  var g = sctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.3, 'rgba(255,255,255,0.96)');
  g.addColorStop(0.5, 'rgba(214,230,250,0.6)');
  g.addColorStop(0.75, 'rgba(190,214,244,0.16)');
  g.addColorStop(1, 'rgba(170,200,240,0)');
  sctx.fillStyle = g;
  sctx.fillRect(0, 0, 32, 32);

  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var W = 0, H = 0, flocons = [];

  function nouveau(partout) {
    return {
      x: Math.random() * W,
      y: partout ? Math.random() * H : -20,
      d: 8 + Math.random() * 13,        // diametre (halo compris)
      v: 0.35 + Math.random() * 0.95,   // vitesse de chute
      a: 0.25 + Math.random() * 0.6,    // amplitude du balancement
      s: 0.008 + Math.random() * 0.02,  // vitesse du balancement
      p: Math.random() * 6.28,          // phase
      o: 0.5 + Math.random() * 0.5      // opacite
    };
  }

  function mesurer() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var n = W < 600 ? 24 : Math.min(55, Math.round(W / 28));
    while (flocons.length < n) flocons.push(nouveau(true));
    flocons.length = n;
  }

  function dessiner() {
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < flocons.length; i++) {
      var f = flocons[i];
      f.y += f.v;
      f.p += f.s;
      f.x += Math.sin(f.p) * f.a + 0.12;
      if (f.y > H + 20) { flocons[i] = nouveau(false); continue; }
      if (f.x > W + 20) f.x = -20;
      if (f.x < -20) f.x = W + 20;
      ctx.globalAlpha = f.o;
      ctx.drawImage(sprite, f.x - f.d / 2, f.y - f.d / 2, f.d, f.d);
    }
    ctx.globalAlpha = 1;
    window.requestAnimationFrame(dessiner);
  }

  window.addEventListener('resize', mesurer);
  mesurer();
  dessiner();
})();
