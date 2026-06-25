// Outil pour creer un compte admin ou changer un mot de passe.
// - Interactif (cas normal) : node tools/set-password.js
//   (lance par changer-mot-de-passe.command)
// - Par arguments (avance) : node tools/set-password.js <identifiant> <motdepasse>
const readline = require('readline');
const bcrypt = require('bcryptjs');
const path = require('path');
const db = require(path.join(__dirname, '..', 'db'));

function upsert(username, password) {
  const hash = bcrypt.hashSync(password, 10);
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, existing.id);
    return 'maj';
  }
  db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, hash);
  return 'cree';
}

// --- Mode par arguments (non interactif) ---
const args = process.argv.slice(2);
if (args.length >= 2) {
  const [username, password] = args;
  if (password.length < 8) {
    console.log('Mot de passe trop court (8 caracteres minimum). Annule.');
    process.exit(1);
  }
  const r = upsert(username.trim(), password);
  console.log(r === 'cree' ? `Compte "${username}" cree.` : `Mot de passe de "${username}" mis a jour.`);
  process.exit(0);
}

// --- Mode interactif ---
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, res));

(async function () {
  console.log('\n=== Gestion des comptes admin - Location YBMTL ===\n');
  const users = db.prepare('SELECT username FROM users ORDER BY username').all();
  if (users.length) {
    console.log('Comptes existants : ' + users.map((u) => u.username).join(', '));
  } else {
    console.log('Aucun compte pour le moment.');
  }

  const username = (await ask('\nIdentifiant (existant = changer son mot de passe ; nouveau = creer) : ')).trim();
  if (!username) { console.log('Annule.'); rl.close(); return; }

  const pw1 = (await ask('Nouveau mot de passe : ')).trim();
  const pw2 = (await ask('Confirmez le mot de passe : ')).trim();
  if (pw1.length < 8) { console.log('\nTrop court (8 caracteres minimum). Annule.'); rl.close(); return; }
  if (pw1 !== pw2) { console.log('\nLes deux mots de passe ne correspondent pas. Annule.'); rl.close(); return; }

  const r = upsert(username, pw1);
  console.log(
    r === 'cree'
      ? `\nNouveau compte "${username}" cree avec succes.`
      : `\nMot de passe de "${username}" mis a jour avec succes.`
  );
  rl.close();
})();
