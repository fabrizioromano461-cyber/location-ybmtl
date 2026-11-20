// Questions frequentes (page /faq).
// Les reponses reprennent ce qui est DEJA publie sur /conditions, /comment-ca-marche et les fiches
// des vehicules, plus les regles confirmees par le proprietaire (remise a Laval, paiement a la prise
// du vehicule). Ne rien ajouter ici qui n'ait pas ete valide par le proprietaire.
// (Les voyages aux Etats-Unis sont maintenant couverts : l'article 4 du contrat et l'Annexe A sont harmonises.)
module.exports = function faqItems(company) {
  const tel = String(company.phone || '').replace(/[^0-9+]/g, '');
  return [
    {
      q: 'Comment réserver une voiture ?',
      r: `<p>Choisissez un véhicule dans l'<a href="/#vehicules">inventaire</a>, sélectionnez vos dates sur sa fiche, puis remplissez la demande (nom, téléphone, courriel). Nous vous contactons rapidement par téléphone ou courriel pour confirmer la disponibilité et les détails de la prise en charge.</p><p>Aucun paiement en ligne n'est requis. Voir aussi <a href="/comment-ca-marche">Comment ça marche</a>.</p>`,
    },
    {
      q: 'Quelle est la durée minimale de location ?',
      r: `<p>Le minimum est de <strong>1 semaine</strong>. Nos tarifs sont à la semaine, et la location peut aussi se faire au mois ou plus, selon vos besoins.</p>`,
    },
    {
      q: 'Qui peut louer ? Quel âge et quel permis faut-il ?',
      r: `<p>Le conducteur principal doit avoir <strong>25 ans minimum</strong> et posséder un <strong>permis de conduire valide depuis au moins 3 ans</strong>.</p>`,
    },
    {
      q: 'Comment payer ? Faut-il une carte de crédit ?',
      r: `<p>Non, la carte de crédit n'est pas obligatoire et il n'y a pas de vérification de crédit. Le paiement se fait directement avec Location YBMTL, jamais en ligne : virement Interac ou argent comptant.</p><p>La location et le dépôt de garantie se règlent au plus tard au départ, quand vous prenez le véhicule.</p>`,
    },
    {
      q: 'Les prix affichés incluent-ils les taxes ?',
      r: `<p>Non, les prix affichés sont <strong>avant taxes</strong>. À compter du 1<sup>er</sup> octobre 2026, la TPS (5 %) et la TVQ (9,975 %) sont ajoutées au prix de location, excluant le montant du dépôt de garantie. Le total estimé avec taxes s'affiche dans le formulaire de réservation.</p>`,
    },
    {
      q: 'Y a-t-il un dépôt de garantie ?',
      r: `<p>Un dépôt de garantie est demandé au moment de la prise du véhicule ; son montant est indiqué sur la fiche de chaque véhicule. Il est remboursé dans les 3 jours suivant le retour du véhicule, moins les sommes dues ; une retenue préventive de 150 $ est gardée 14 jours pour les péages ou contraventions qui arriveraient après la location. Voir l'<a href="/conditions">Annexe A du contrat</a>. Le dépôt n'est pas taxé.</p>`,
    },
    {
      q: "L'assurance est-elle incluse ?",
      r: `<p>Chaque location comprend une assurance de base (responsabilité civile). Pour savoir exactement ce qui est couvert et ce qui reste à votre charge, consultez notre <a href="/docs/Guide-Assurances-YBMTL-FR.pdf" target="_blank" rel="noopener">guide « qui paie quoi »</a> (PDF), ou posez-nous la question avant de réserver.</p>`,
    },
    {
      q: 'Le kilométrage est-il illimité ?',
      r: `<p>Oui, nos véhicules sont offerts en <strong>kilométrage illimité</strong>. Il est indiqué sur chaque fiche et précisé lors de la confirmation.</p>`,
    },
    {
      q: 'Où et comment récupère-t-on la voiture ?',
      r: `<p>Le véhicule vous est remis à <strong>Laval</strong>. Nous vous communiquons le point de rencontre exact 48 heures avant le début de la location, avec un appel de confirmation.</p><p>Un état des lieux est établi avant et après la location, pour la protection de chacun.</p>`,
    },
    {
      q: 'Puis-je annuler ma réservation ?',
      r: `<p>Oui. L'annulation est <strong>sans frais jusqu'à 24 heures</strong> avant l'heure de départ prévue. Après ce délai, ou si vous ne vous présentez pas, des frais de 50 $ s'appliquent. Aucun remboursement n'est fait pour un retour anticipé. Voir l'<a href="/conditions">Annexe A du contrat</a>.</p>`,
    },
    {
      q: 'Puis-je voyager aux États-Unis ?',
      r: `<p>Oui. Le véhicule peut être conduit au <strong>Canada et aux États-Unis</strong>, sans frais ni autorisation supplémentaire de notre part. L'assurance de base (responsabilité civile) est valide aux États-Unis ; les formalités d'entrée dans le pays restent à votre charge. Tout autre pays est interdit sans autorisation écrite.</p>`,
    },
    {
      q: "Puis-je utiliser la voiture pour Uber, la livraison ou le covoiturage ?",
      r: `<p>Non, sauf autorisation écrite de notre part donnée avant la prise du véhicule. Il est aussi interdit de fumer ou de vapoter dans le véhicule. Le véhicule peut être conduit au Canada et aux États-Unis.</p>`,
    },
    {
      q: 'Que faire en cas d\'accident ou de panne ?',
      r: `<p>Assurez d'abord la sécurité de tous (911 s'il y a des blessés), puis appelez-nous tout de suite au <a href="tel:${tel}">${company.phone}</a>. Ne faites réparer ni remorquer le véhicule sans notre accord, remplissez le constat d'accident et, en cas de vol ou de vandalisme, fournissez un rapport de police dans les 24 heures.</p>`,
    },
    {
      q: 'Quels frais peuvent s\'ajouter (retard, carburant, nettoyage, clés, péages) ?',
      r: `<p>Tous les montants sont écrits à l'avance dans le <a href="/conditions#frais">tableau des frais</a> de l'Annexe A du contrat : par exemple 75 $ par jour de retard, nettoyage, carburant manquant, clé perdue, péages.</p>`,
    },
    {
      q: 'Puis-je lire le contrat avant de réserver ?',
      r: `<p>Oui. Le contrat de location, avec son Annexe A (conditions complémentaires et tableau des frais), est disponible en PDF sur la page <a href="/conditions">Contrat &amp; Conditions</a> : en français (version officielle), en anglais et en espagnol (traductions de courtoisie, annexe comprise). Le guide des assurances y est offert en français et en anglais.</p>`,
    },
    {
      q: 'Comment vous joindre ?',
      r: `<p>Par téléphone au <a href="tel:${tel}">${company.phone}</a>, par texto au même numéro, ou par courriel à <a href="mailto:${company.email}">${company.email}</a>.</p>`,
    },
  ];
};
