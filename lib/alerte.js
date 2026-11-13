// Alerte instantanee sur le cellulaire pour chaque NOUVELLE DEMANDE de location (service gratuit ntfy.sh).
// Active seulement si la variable d'environnement NTFY_TOPIC existe (un nom secret, difficile a deviner,
// auquel on s'abonne avec l'appli « ntfy »). Option : NTFY_SERVER (par defaut https://ntfy.sh).
// Le message contient la voiture et les dates, JAMAIS le nom ni le telephone du client.
// Une panne de ce service ne doit jamais empecher une demande d'etre recue.
function alerteDemande({ vehicule, depart, retour }) {
  const topic = String(process.env.NTFY_TOPIC || '').trim();
  if (!topic) return Promise.resolve(false);
  const serveur = String(process.env.NTFY_SERVER || 'https://ntfy.sh').trim().replace(/\/+$/, '');
  const dates = depart && retour ? `du ${depart} au ${retour}` : depart ? `a partir du ${depart}` : 'dates a confirmer';
  const corps = {
    topic,
    title: 'Nouvelle demande de location',
    message: `${vehicule} : ${dates}`,
    priority: 4,
    tags: ['car'],
    click: 'https://locationybmtl.ca/admin/demandes',
  };
  const controle = new AbortController();
  const minuterie = setTimeout(() => controle.abort(), 8000);
  return fetch(serveur, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corps),
    signal: controle.signal,
  })
    .then((r) => {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      console.log('[alerte] Alerte envoyee sur le cellulaire.');
      return true;
    })
    .catch((e) => {
      console.error('[alerte] Echec (sans consequence pour la demande) :', e.message);
      return false;
    })
    .finally(() => clearTimeout(minuterie));
}

module.exports = { alerteDemande };
