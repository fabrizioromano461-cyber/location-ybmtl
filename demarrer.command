#!/bin/bash
# Double-cliquez sur ce fichier pour demarrer le site Location YBMTL.
# Une fenetre du Terminal s'ouvre et le site devient accessible dans votre
# navigateur a l'adresse http://localhost:3000
# Pour ARRETER le site : fermez cette fenetre du Terminal (ou Ctrl+C).

cd "$(dirname "$0")"
export PATH="$HOME/.local/node/bin:$PATH"

echo "Demarrage du site Location YBMTL..."
echo "Ouvrez votre navigateur a : http://localhost:3000"
echo "Panneau admin : http://localhost:3000/admin"
echo "Pour arreter : fermez cette fenetre."
echo ""

# Ouvre le navigateur automatiquement apres 2 secondes
( sleep 2 && open "http://localhost:3000" ) &

node server.js
