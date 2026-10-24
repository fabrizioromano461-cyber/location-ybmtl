// Bandeau des temoins (cookies) + Google Analytics SEULEMENT apres l'accord du visiteur.
// - Aucune mesure n'est chargee tant que le visiteur n'a pas dit « Accepter ».
// - Le choix est garde dans le navigateur (localStorage) : il n'est jamais envoye au serveur.
// - Le bouton « Temoins (cookies) » du pied de page permet de changer d'avis.
// - Si le navigateur envoie le signal « Global Privacy Control », on le traite comme un refus.
(function () {
  var meta = document.querySelector('meta[name="ga-measurement-id"]');
  var GA_ID = meta ? (meta.getAttribute('content') || '').trim() : '';
  var CLE = 'ybmtl_temoins';
  var bandeau = null;

  var bouton = document.getElementById('cookiePrefs');
  // Pas de mesure configuree : rien a accepter, on cache le bouton.
  if (!GA_ID) {
    if (bouton) bouton.hidden = true;
    return;
  }

  function lire() { try { return localStorage.getItem(CLE); } catch (e) { return null; } }
  function ecrire(v) { try { localStorage.setItem(CLE, v); } catch (e) { /* navigation privee : tant pis */ } }

  function chargerGA() {
    if (window.__gaCharge) return;
    window.__gaCharge = true;
    window['ga-disable-' + GA_ID] = false;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA_ID);
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA_ID);
    document.head.appendChild(s);
  }

  function couperGA() {
    window['ga-disable-' + GA_ID] = true; // arrete l'envoi de mesures pour cette visite
    var racine = location.hostname.replace(/^www\./, '');
    var domaines = [location.hostname, '.' + location.hostname, '.' + racine];
    document.cookie.split(';').forEach(function (c) {
      var nom = c.split('=')[0].trim();
      if (nom === '_ga' || nom === '_gid' || nom.indexOf('_ga_') === 0 || nom.indexOf('_gat') === 0) {
        var vieux = nom + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
        document.cookie = vieux;
        domaines.forEach(function (d) { document.cookie = vieux + '; domain=' + d; });
      }
    });
  }

  function fermer() {
    if (bandeau && bandeau.parentNode) bandeau.parentNode.removeChild(bandeau);
    bandeau = null;
  }

  function choisir(valeur) {
    ecrire(valeur);
    if (valeur === 'oui') chargerGA(); else couperGA();
    fermer();
    if (bouton) bouton.focus();
  }

  function el(tag, attrs, texte) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (texte) n.textContent = texte;
    return n;
  }

  function afficher() {
    if (bandeau) return;
    var actuel = lire();
    bandeau = el('div', { 'class': 'cookie-banner', role: 'region', 'aria-label': 'Témoins (cookies)' });
    var interieur = el('div', { 'class': 'cookie-banner-inner' });
    var texte = el('div', { 'class': 'cookie-banner-text' });
    texte.appendChild(el('strong', {}, 'Témoins (cookies) et vie privée'));
    var p = el('p');
    p.appendChild(document.createTextNode(
      'Nous utilisons Google Analytics pour mesurer les visites de ce site (pages vues, appareil, région approximative). ' +
      'Aucun témoin de mesure n’est installé sans votre accord. '
    ));
    p.appendChild(el('a', { href: '/confidentialite' }, 'En savoir plus'));
    p.appendChild(document.createTextNode('.'));
    if (actuel) p.appendChild(document.createTextNode(' Votre choix actuel : ' + (actuel === 'oui' ? 'accepté' : 'refusé') + '.'));
    texte.appendChild(p);
    var actions = el('div', { 'class': 'cookie-banner-actions' });
    var non = el('button', { type: 'button', 'class': 'btn btn-outline', 'data-choix': 'non' }, 'Refuser');
    var oui = el('button', { type: 'button', 'class': 'btn btn-primary', 'data-choix': 'oui' }, 'Accepter');
    non.addEventListener('click', function () { choisir('non'); });
    oui.addEventListener('click', function () { choisir('oui'); });
    actions.appendChild(non);
    actions.appendChild(oui);
    interieur.appendChild(texte);
    interieur.appendChild(actions);
    bandeau.appendChild(interieur);
    document.body.appendChild(bandeau);
  }

  function demarrer() {
    var choix = lire();
    if (choix === 'oui') {
      chargerGA();
    } else if (choix === null) {
      if (navigator.globalPrivacyControl === true) { ecrire('non'); return; }
      afficher();
    }
    if (bouton) {
      bouton.addEventListener('click', function () {
        afficher();
        var premier = bandeau && bandeau.querySelector('button');
        if (premier) premier.focus();
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', demarrer);
  else demarrer();
})();
