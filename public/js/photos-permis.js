// Photos du permis de conduire (recto et verso) et selfie (photo du visage) : prise de la photo, réduction et aperçu.
// Utilisé par /contrat/<lien> (le client, à distance) et par /admin/contrat (le proprio, avec le client en personne).
// - Permis : photo prise avec l'appareil ou choisie (JPEG, 1600 px au plus).
// - Selfie : pris EN DIRECT avec la caméra, ouverte dans la page (aucune photo de la galerie). Si la caméra ne peut pas s'ouvrir
//   dans la page (refusée, absente), un bouton de repli ouvre l'appareil photo du téléphone (champ « capture »).
// Le navigateur réduit chaque photo avant l'envoi : plus rapide sur le cellulaire, et les données cachées dans la photo (lieu,
// modèle du téléphone) ne partent pas. Le serveur refait les mêmes vérifications (lib/photos-permis.js). Rien n'est gardé : les
// photos restent en mémoire dans la page puis partent avec le formulaire. Le selfie sert à comparer le visage avec la photo du
// permis : la comparaison est faite À L'ŒIL par Location YBMTL (aucune reconnaissance faciale automatique).
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  if (!$('fichierRecto') || !$('fichierVerso')) return;

  const avecSelfie = !!$('fichierSelfie');
  const COTES = avecSelfie ? ['recto', 'verso', 'selfie'] : ['recto', 'verso'];
  const photos = { recto: null, verso: null, selfie: null }; // { blob, url, empreinte }
  const MAJ = { recto: 'Recto', verso: 'Verso', selfie: 'Selfie' };
  const LONG_MAX = { recto: 1600, verso: 1600, selfie: 1280 };
  const LONG_MIN = { recto: 700, verso: 700, selfie: 600 };
  const COURT_MIN = 400;
  const OCTETS_MAX = { recto: 1000 * 1024, verso: 1000 * 1024, selfie: 700 * 1024 };
  const BOUTON = {
    recto: ['Prendre ou choisir la photo', 'Reprendre la photo'],
    verso: ['Prendre ou choisir la photo', 'Reprendre la photo'],
    selfie: ['Prendre le selfie', 'Reprendre le selfie'],
  };
  let enCours = 0; // photos en cours de préparation

  function etat(cote, texte, mauvais) {
    const el = $('etat' + MAJ[cote]);
    el.textContent = texte || '';
    el.className = 'c-photo-etat' + (texte ? (mauvais ? ' bad' : ' ok') : '');
  }
  function montrer(cote) {
    const p = photos[cote];
    const img = $('apercu' + MAJ[cote]);
    if (p) img.src = p.url; else img.removeAttribute('src');
    img.hidden = !p;
    $('vide' + MAJ[cote]).hidden = !!p;
    $('texteBtn' + MAJ[cote]).textContent = BOUTON[cote][p ? 1 : 0];
  }

  function chargerImage(fichier) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(fichier);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('illisible')); };
      img.src = url;
    });
  }
  const blobJpeg = (canevas, qualite) => new Promise((resolve) => canevas.toBlob(resolve, 'image/jpeg', qualite));

  // Réduit une image (fichier ou caméra) en JPEG. `source` : élément <img> ou <video> ; w0/h0 : sa taille réelle.
  // Lance une erreur « petite », « lourde » ou « illisible ».
  async function reduireSource(source, w0, h0, cote) {
    if (!w0 || !h0) throw new Error('illisible');
    let echelle = Math.min(1, LONG_MAX[cote] / Math.max(w0, h0));
    if (Math.max(w0, h0) * echelle < LONG_MIN[cote] || Math.min(w0, h0) * echelle < COURT_MIN) throw new Error('petite');
    for (let essai = 0; essai < 4; essai++) {
      const w = Math.max(1, Math.round(w0 * echelle));
      const h = Math.max(1, Math.round(h0 * echelle));
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(source, 0, 0, w, h);
      const blob = await blobJpeg(c, essai === 0 ? 0.85 : 0.72);
      c.width = 1;
      c.height = 1;
      if (!blob) throw new Error('illisible');
      if (blob.size <= OCTETS_MAX[cote]) return blob;
      echelle *= 0.8;
      if (Math.min(w0, h0) * echelle < COURT_MIN || Math.max(w0, h0) * echelle < LONG_MIN[cote]) throw new Error('lourde');
    }
    throw new Error('lourde');
  }
  // (Le navigateur applique lui-même l'orientation de la photo : un permis pris à la verticale reste à la verticale.)
  async function reduire(fichier, cote) {
    const img = await chargerImage(fichier);
    return reduireSource(img, img.naturalWidth, img.naturalHeight, cote);
  }

  // Empreinte de la photo : sert seulement à voir si deux cases ont reçu la même photo.
  async function empreinteDe(blob) {
    try {
      const h = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
      return Array.from(new Uint8Array(h)).map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch (_) {
      return 'taille-' + blob.size;
    }
  }

  const MESSAGES = {
    petite: 'Photo trop petite pour lire le permis. Rapprochez-vous du permis et reprenez-la.',
    lourde: 'Photo trop lourde. Reprenez-la.',
    format: "Ce fichier n'est pas une photo (JPG ou PNG). Reprenez la photo.",
  };
  const MESSAGES_SELFIE = {
    petite: 'La caméra donne une photo trop petite. Reprenez le selfie (ou utilisez un autre appareil).',
    lourde: 'Photo trop lourde. Reprenez le selfie.',
    format: "Ce fichier n'est pas une photo. Reprenez le selfie.",
  };
  const messageErreur = (cote, e) => (cote === 'selfie' ? MESSAGES_SELFIE : MESSAGES)[e && e.message] ||
    'Impossible de lire cette photo. Reprenez-la (format JPG ou PNG).';

  // Garde la photo préparée (après les contrôles) et l'affiche dans sa case.
  async function accepter(cote, blob) {
    const empreinte = await empreinteDe(blob);
    const double = COTES.find((autre) => autre !== cote && photos[autre] && photos[autre].empreinte === empreinte);
    if (double) {
      const conserve = photos[cote] ? ' La photo précédente est conservée.' : '';
      etat(cote, cote === 'selfie'
        ? "C'est une photo du permis, pas un selfie. Prenez une photo du visage." + conserve
        : double === 'selfie'
          ? "C'est la même photo que le selfie. Photographiez le permis." + conserve
          : "C'est la même photo que l'autre côté du permis. Photographiez l'autre côté." + conserve, true);
      return;
    }
    if (photos[cote]) URL.revokeObjectURL(photos[cote].url);
    photos[cote] = { blob, url: URL.createObjectURL(blob), empreinte };
    montrer(cote);
    const ko = Math.max(1, Math.round(blob.size / 1024));
    etat(cote, cote === 'selfie'
      ? 'Selfie prêt (' + ko + ' Ko). Vérifiez que le visage est bien visible.'
      : 'Photo prête (' + ko + ' Ko). Vérifiez qu\'elle est bien lisible.');
  }

  // Photo venant d'un champ « fichier » (permis, ou repli du selfie).
  async function choisir(cote, entree) {
    const fichier = entree.files && entree.files[0];
    if (!fichier || !MAJ[cote]) return;
    document.dispatchEvent(new Event('permis-photo')); // la page efface son message d'erreur
    etat(cote, 'Préparation de la photo…');
    enCours++;
    try {
      if (!/^image\//.test(fichier.type) && !/\.(jpe?g|png|webp|heic|heif)$/i.test(fichier.name || '')) throw new Error('format');
      await accepter(cote, await reduire(fichier, cote));
    } catch (e) {
      etat(cote, messageErreur(cote, e) + (photos[cote] ? ' La photo précédente est conservée.' : ''), true);
    } finally {
      enCours--;
      entree.value = ''; // permet de rechoisir le même fichier
    }
  }
  document.querySelectorAll('.c-file-input').forEach((entree) => {
    entree.addEventListener('change', () => choisir(entree.dataset.cote, entree));
  });

  // ---------- Selfie EN DIRECT : la caméra s'ouvre dans la page ----------
  const cam = { boite: $('cameraSelfie'), video: $('videoSelfie'), flux: null, face: 'user', ouvert: false };
  function arreterFlux() {
    if (cam.flux) cam.flux.getTracks().forEach((t) => t.stop());
    cam.flux = null;
    if (cam.video) cam.video.srcObject = null;
  }
  function fermerCamera() {
    arreterFlux();
    if (!cam.ouvert) return;
    cam.ouvert = false;
    cam.boite.hidden = true;
    document.body.classList.remove('c-camera-ouverte');
    const btn = $('btnSelfie');
    if (btn) btn.focus({ preventScroll: true });
  }
  async function demarrerFlux() {
    arreterFlux();
    $('cameraPrendre').disabled = true;
    $('cameraEtat').textContent = 'Ouverture de la caméra…';
    cam.flux = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: cam.face, width: { ideal: 1280 }, height: { ideal: 960 } },
    });
    if (!cam.ouvert) { arreterFlux(); return; } // fenêtre fermée pendant l'ouverture
    cam.video.srcObject = cam.flux;
    $('cameraVideo').classList.toggle('miroir', cam.face === 'user'); // aperçu en miroir ; la photo, elle, est à l'endroit
    try { await cam.video.play(); } catch (_) { /* lecture automatique : la vidéo démarre quand même sur la plupart des appareils */ }
    $('cameraEtat').textContent = '';
    $('cameraPrendre').disabled = false;
  }
  function repli(message) {
    // Repli : l'appareil photo du téléphone (champ « capture ») ; un nouveau toucher est nécessaire pour l'ouvrir.
    $('repliSelfie').hidden = false;
    etat('selfie', message + ' Touchez « Ouvrir l\'appareil photo ».', true);
  }
  async function ouvrirCamera() {
    document.dispatchEvent(new Event('permis-photo'));
    if (!cam.boite || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      repli('La caméra ne peut pas s\'ouvrir dans cette page.');
      return;
    }
    cam.ouvert = true;
    cam.boite.hidden = false;
    document.body.classList.add('c-camera-ouverte');
    try {
      await demarrerFlux();
      // Plusieurs caméras (avant et arrière) : bouton « Changer de caméra » (utile en personne).
      try {
        const appareils = await navigator.mediaDevices.enumerateDevices();
        $('cameraTourner').hidden = appareils.filter((a) => a.kind === 'videoinput').length < 2;
      } catch (_) { /* sans importance */ }
    } catch (e) {
      fermerCamera();
      repli(e && e.name === 'NotAllowedError'
        ? 'L\'accès à la caméra a été refusé. Autorisez la caméra pour ce site, ou utilisez l\'appareil photo du téléphone.'
        : 'La caméra ne s\'est pas ouverte.');
    }
  }
  async function prendrePhoto() {
    const v = cam.video;
    if (!v || !v.videoWidth || !v.videoHeight) return;
    $('cameraPrendre').disabled = true;
    enCours++;
    try {
      const blob = await reduireSource(v, v.videoWidth, v.videoHeight, 'selfie');
      fermerCamera();
      await accepter('selfie', blob);
    } catch (e) {
      $('cameraEtat').textContent = messageErreur('selfie', e);
      $('cameraPrendre').disabled = false;
    } finally {
      enCours--;
    }
  }
  if (avecSelfie && $('btnSelfie') && cam.boite) {
    $('btnSelfie').addEventListener('click', ouvrirCamera);
    $('cameraPrendre').addEventListener('click', prendrePhoto);
    $('cameraAnnuler').addEventListener('click', fermerCamera);
    $('cameraTourner').addEventListener('click', async () => {
      cam.face = cam.face === 'user' ? 'environment' : 'user';
      try { await demarrerFlux(); } catch (_) { $('cameraEtat').textContent = 'Cette caméra ne s\'ouvre pas. Réessayez.'; }
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && cam.ouvert) fermerCamera(); });
    // La caméra s'arrête dès qu'on quitte la page ou l'onglet.
    document.addEventListener('visibilitychange', () => { if (document.hidden && cam.ouvert) fermerCamera(); });
    window.addEventListener('pagehide', arreterFlux);
  }

  window.PhotosPermis = {
    // 'recto', 'verso' ou 'selfie' : la première photo qui manque ; null si tout est prêt.
    manque: () => COTES.find((c) => !photos[c]) || null,
    // Vrai tant qu'une photo est en cours de préparation.
    occupe: () => enCours > 0,
    // Ajoute les photos au formulaire qui part vers le serveur (« avecSelfie » : cette page demande le selfie).
    ajouter: (fd) => {
      fd.set('permisRecto', photos.recto.blob, 'permis-recto.jpg');
      fd.set('permisVerso', photos.verso.blob, 'permis-verso.jpg');
      if (avecSelfie) {
        fd.set('permisSelfie', photos.selfie.blob, 'selfie.jpg');
        fd.set('avecSelfie', '1');
      }
    },
  };
})();
