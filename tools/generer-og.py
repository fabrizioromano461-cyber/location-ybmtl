#!/usr/bin/env python3
"""Fabrique les images d'apercu de partage (Facebook, WhatsApp, Messenger, Instagram...).

- Une image 1200x630 par vehicule : public/img/og-<marque-modele>.jpg
- Une image pour l'accueil : public/img/og-accueil.jpg

L'auto est TOUJOURS visible en entier : photo entiere devant, la meme photo floutee derriere.
Aucun prix dans les images (le prix peut changer sans que l'image suive) : il est dans le texte
du lien partage (voir routes/public.js).

Quand on ajoute une voiture : relancer ce script puis televerser les nouveaux og-*.jpg de public/img/ sur GitHub.
Necessite Pillow :  python3 -m pip install Pillow
Lancer depuis la racine du projet :  python3 tools/generer-og.py
"""
import json
import os
import re
import sys
import unicodedata

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont, ImageOps

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOADS = os.path.join(RACINE, 'public', 'uploads')
SORTIE = os.path.join(RACINE, 'public', 'img')
SORTIE_ACCUEIL = os.path.join(RACINE, 'public', 'img', 'og-accueil.jpg')
LOGO = os.path.join(RACINE, 'public', 'img', 'logo-rogne.png')
CATALOGUE = os.path.join(RACINE, 'seed-catalog.json')

W, H = 1200, 630
MARINE = (10, 26, 63)
MARINE_CLAIR = (24, 56, 128)
OR = (245, 179, 1)
GRIS_BLEU = (203, 213, 225)
BLANC = (255, 255, 255)

# Voitures mises en avant sur l'image de l'accueil (meme liste que routes/public.js).
VEDETTES = [('Audi', 'S5 Coupé'), ('BMW', '328i'), ('Mazda', '6')]


def police(gras, taille):
    chemins = (
        ['/System/Library/Fonts/Supplemental/Arial Bold.ttf', '/Library/Fonts/Arial Bold.ttf',
         '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf']
        if gras else
        ['/System/Library/Fonts/Supplemental/Arial.ttf', '/Library/Fonts/Arial.ttf',
         '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf']
    )
    for c in chemins:
        if os.path.exists(c):
            return ImageFont.truetype(c, taille)
    return ImageFont.load_default()


def slug(texte):
    t = unicodedata.normalize('NFD', texte)
    t = ''.join(c for c in t if unicodedata.category(c) != 'Mn').lower()
    return re.sub(r'[^a-z0-9]+', '-', t).strip('-')


def ouvrir(chemin):
    img = Image.open(chemin)
    img = ImageOps.exif_transpose(img)
    return img.convert('RGB')


def fond_flou(img, w, h, rayon=26, luminosite=0.62):
    """La photo recadree pour remplir w x h, puis floutee et assombrie."""
    fond = ImageOps.fit(img, (w, h), Image.LANCZOS)
    fond = fond.filter(ImageFilter.GaussianBlur(rayon))
    return ImageEnhance.Brightness(fond).enhance(luminosite)


def arrondir(img, rayon):
    img = img.convert('RGBA')
    masque = Image.new('L', img.size, 0)
    ImageDraw.Draw(masque).rounded_rectangle((0, 0, img.width - 1, img.height - 1), radius=rayon, fill=255)
    img.putalpha(masque)
    return img


def poser_avec_ombre(toile, img, x, y):
    ombre = Image.new('RGBA', (img.width + 80, img.height + 80), (0, 0, 0, 0))
    ImageDraw.Draw(ombre).rounded_rectangle((40, 48, 40 + img.width, 48 + img.height), radius=22, fill=(0, 0, 0, 120))
    ombre = ombre.filter(ImageFilter.GaussianBlur(14))
    toile.alpha_composite(ombre, (x - 40, y - 40))
    toile.alpha_composite(img, (x, y))


def logo(hauteur):
    img = Image.open(LOGO).convert('RGBA')
    largeur = round(img.width * hauteur / img.height)
    return img.resize((largeur, hauteur), Image.LANCZOS)


def tuile(img, w, h, rayon=18):
    """Une vignette : photo ENTIERE devant son propre fond flou."""
    fond = fond_flou(img, w, h, rayon=14, luminosite=0.7).convert('RGBA')
    devant = ImageOps.contain(img, (w, h), Image.LANCZOS).convert('RGBA')
    fond.alpha_composite(devant, ((w - devant.width) // 2, (h - devant.height) // 2))
    return arrondir(fond, rayon)


def photo_principale(vehicule):
    photos = sorted(vehicule.get('photos') or [], key=lambda p: p.get('sort_order', 0))
    choisie = next((p for p in photos if p.get('is_primary')), photos[0] if photos else None)
    if not choisie:
        return None
    chemin = os.path.join(UPLOADS, choisie['filename'])
    return chemin if os.path.exists(chemin) else None


def enregistrer(toile, chemin):
    os.makedirs(os.path.dirname(chemin), exist_ok=True)
    toile.convert('RGB').save(chemin, 'JPEG', quality=82, optimize=True, progressive=True)
    return os.path.getsize(chemin) // 1024


def image_vehicule(vehicule, chemin_photo, chemin_sortie):
    src = ouvrir(chemin_photo)
    toile = fond_flou(src, W, H).convert('RGBA')

    bande_h = 112
    zone_w, zone_h = 1120, H - bande_h - 22
    devant = arrondir(ImageOps.contain(src, (zone_w, zone_h), Image.LANCZOS), 22)
    x = (W - devant.width) // 2
    y = 14 + (zone_h - devant.height) // 2
    poser_avec_ombre(toile, devant, x, y)

    # Bande de marque en bas : marine, filet or, logo, nom de la voiture.
    bande = Image.new('RGBA', (W, bande_h), MARINE + (238,))
    ImageDraw.Draw(bande).rectangle((0, 0, W, 4), fill=OR + (255,))
    toile.alpha_composite(bande, (0, H - bande_h))
    lg = logo(70)
    toile.alpha_composite(lg, (36, H - bande_h + (bande_h - lg.height) // 2 + 2))
    d = ImageDraw.Draw(toile)
    nom = f"{vehicule['make']} {vehicule['model']}"
    sous = 'Bientôt disponible · Location YBMTL' if vehicule.get('coming_soon') else 'Location à Montréal · À la semaine'
    xt = 36 + lg.width + 34
    d.text((xt, H - bande_h + 20), nom, font=police(True, 46), fill=BLANC)
    d.text((xt, H - bande_h + 74), sous, font=police(False, 24), fill=GRIS_BLEU)
    return enregistrer(toile, chemin_sortie)


def image_accueil(vehicules):
    toile = Image.new('RGBA', (W, H), MARINE)
    degrade = Image.new('RGBA', (W, H))
    px = degrade.load()
    for yy in range(H):
        t = yy / (H - 1)
        c = tuple(round(MARINE[i] + (MARINE_CLAIR[i] - MARINE[i]) * t) for i in range(3)) + (255,)
        for xx in range(W):
            px[xx, yy] = c
    toile = degrade

    lg = logo(132)
    toile.alpha_composite(lg, (64, 62))
    d = ImageDraw.Draw(toile)
    d.rectangle((64, 224, 64 + 96, 229), fill=OR)
    d.text((64, 248), 'Location de voiture', font=police(True, 60), fill=BLANC)
    d.text((64, 318), 'à Montréal', font=police(True, 60), fill=BLANC)
    d.text((64, 410), 'À la semaine · Kilométrage illimité', font=police(False, 29), fill=GRIS_BLEU)
    d.text((64, 452), 'Assurance incluse · Demande en ligne', font=police(False, 29), fill=GRIS_BLEU)
    d.text((64, 540), 'locationybmtl.ca', font=police(True, 34), fill=OR)

    choisies = []
    for make, model in VEDETTES:
        v = next((x for x in vehicules if x['make'] == make and x['model'] == model), None)
        p = photo_principale(v) if v else None
        if p:
            choisies.append(ouvrir(p))
    if len(choisies) == 3:
        grand = tuile(choisies[0], 480, 350)
        toile.alpha_composite(grand, (680, 40))
        petit1 = tuile(choisies[1], 232, 170)
        petit2 = tuile(choisies[2], 232, 170)
        toile.alpha_composite(petit1, (680, 406))
        toile.alpha_composite(petit2, (680 + 248, 406))
    return enregistrer(toile, SORTIE_ACCUEIL)


def main():
    with open(CATALOGUE, encoding='utf-8') as f:
        data = json.load(f)
    vehicules = data['vehicles'] if isinstance(data, dict) and 'vehicles' in data else data
    os.makedirs(SORTIE, exist_ok=True)
    fait, manque = 0, []
    for v in vehicules:
        chemin = photo_principale(v)
        nom = f"{v['make']} {v['model']}"
        if not chemin:
            manque.append(nom)
            continue
        fichier = 'og-' + slug(nom) + '.jpg'
        ko = image_vehicule(v, chemin, os.path.join(SORTIE, fichier))
        print(f"  {fichier:32s} {ko:4d} Ko")
        fait += 1
    ko = image_accueil(vehicules)
    print(f"  {'og-accueil.jpg':32s} {ko:4d} Ko")
    print(f"{fait} images de vehicules + 1 image d'accueil.")
    if manque:
        print('Sans photo (ignores) :', ', '.join(manque))
        sys.exit(1)


if __name__ == '__main__':
    main()
