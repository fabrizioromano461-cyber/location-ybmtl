#!/bin/bash
# Double-cliquez pour changer un mot de passe admin ou creer un compte employe.
# Suivez les questions dans la fenetre du Terminal.
cd "$(dirname "$0")"
export PATH="$HOME/.local/node/bin:$PATH"
node tools/set-password.js
echo ""
echo "Termine. Vous pouvez fermer cette fenetre."
