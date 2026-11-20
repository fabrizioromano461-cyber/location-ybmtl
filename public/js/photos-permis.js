// Photos du permis de conduire (recto et verso) : choix de la photo, réduction et aperçu.
// Utilisé par /contrat/<lien> (le client, à distance) et par /admin/contrat (le proprio, avec le client en personne).
// Le navigateur réduit chaque photo (1600 px au plus, JPEG) avant l'envoi : plus rapide sur le cellulaire, et les
// données cachées dans la photo (lieu, modèle du téléphone) ne partent pas. Le serveur refait les mêmes vérifications
// (lib/photos-permis.js). Rien n'est gardé : les photos restent en mémoire dans la page puis partent avec le formulaire.
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  if (!$('fichierRecto') || !$('fichierVerso')) return;

  const LONG_MAX = 1600;
  const LONG_MIN = 700;
  const COURT_MIN = 400;
  const OCTETS_MAX = 1000 * 1024;
  const photos = { recto: null, verso: null }; // { blob, url, empreinte }
  const MAJ = { recto: 'Recto', verso: 'Verso' };
  const AUTRE = { recto: 'verso', verso: 'recto' };
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
    $('texteBtn' + MAJ[cote]).textContent = p ? 'Reprendre la photo' : 'Prendre ou choisir la photo';
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

  // Réduit la photo (JPEG, 1600 px au plus, moins de 1 Mo). Lance une erreur « petite », « lourde » ou « illisible ».
  // (Le navigateur applique lui-même l'orientation de la photo : un permis pris à la verticale reste à la verticale.)
  async function reduire(fichier) {
    const img = await chargerImage(fichier);
    const w0 = img.naturalWidth;
    const h0 = img.naturalHeight;
    if (!w0 || !h0) throw new Error('illisible');
    let echelle = Math.min(1, LONG_MAX / Math.max(w0, h0));
    if (Math.max(w0, h0) * echelle < LONG_MIN || Math.min(w0, h0) * echelle < COURT_MIN) throw new Error('petite');
    for (let essai = 0; essai < 4; essai++) {
      const w = Math.max(1, Math.round(w0 * echelle));
      const h = Math.max(1, Math.round(h0 * echelle));
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      const blob = await blobJpeg(c, essai === 0 ? 0.85 : 0.72);
      c.width = 1;
      c.height = 1;
      if (!blob) throw new Error('illisible');
      if (blob.size <= OCTETS_MAX) return blob;
      echelle *= 0.8;
      if (Math.min(w0, h0) * echelle < COURT_MIN || Math.max(w0, h0) * echelle < LONG_MIN) throw new Error('lourde');
    }
    throw new Error('lourde');
  }

  // Empreinte de la photo : sert seulement à voir si le recto et le verso sont la même photo.
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
  async function choisir(cote, entree) {
    const fichier = entree.files && entree.files[0];
    if (!fichier) return;
    document.dispatchEvent(new Event('permis-photo')); // la page efface son message d'erreur
    etat(cote, 'Préparation de la photo…');
    enCours++;
    try {
      if (!/^image\//.test(fichier.type) && !/\.(jpe?g|png|webp|heic|heif)$/i.test(fichier.name || '')) throw new Error('format');
      const blob = await reduire(fichier);
      const empreinte = await empreinteDe(blob);
      const autre = photos[AUTRE[cote]];
      if (autre && autre.empreinte === empreinte) {
        etat(cote, "C'est la même photo que l'autre côté du permis. Photographiez l'autre côté." + (photos[cote] ? ' La photo précédente est conservée.' : ''), true);
        return;
      }
      if (photos[cote]) URL.revokeObjectURL(photos[cote].url);
      photos[cote] = { blob, url: URL.createObjectURL(blob), empreinte };
      montrer(cote);
      etat(cote, 'Photo prête (' + Math.max(1, Math.round(blob.size / 1024)) + ' Ko). Vérifiez qu\'elle est bien lisible.');
    } catch (e) {
      const msg = MESSAGES[e && e.message] || 'Impossible de lire cette photo. Reprenez-la (format JPG ou PNG).';
      etat(cote, msg + (photos[cote] ? ' La photo précédente est conservée.' : ''), true);
    } finally {
      enCours--;
      entree.value = ''; // permet de rechoisir le même fichier
    }
  }
  document.querySelectorAll('.c-file-input').forEach((entree) => {
    entree.addEventListener('change', () => choisir(entree.dataset.cote, entree));
  });

  window.PhotosPermis = {
    // 'recto' ou 'verso' : la première photo qui manque ; null si les deux sont prêtes.
    manque: () => (!photos.recto ? 'recto' : (!photos.verso ? 'verso' : null)),
    // Vrai tant qu'une photo est en cours de préparation.
    occupe: () => enCours > 0,
    // Ajoute les deux photos au formulaire qui part vers le serveur.
    ajouter: (fd) => {
      fd.set('permisRecto', photos.recto.blob, 'permis-recto.jpg');
      fd.set('permisVerso', photos.verso.blob, 'permis-verso.jpg');
    },
  };
})();
