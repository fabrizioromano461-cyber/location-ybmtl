// Questions frequentes (page /faq).
// Les reponses reprennent ce qui est DEJA publie sur /conditions, /comment-ca-marche et les fiches
// des vehicules, plus les regles confirmees par le proprietaire (remise a Laval, paiement a la prise
// du vehicule). Ne rien ajouter ici qui n'ait pas ete valide par le proprietaire.
// (Volontairement absent pour l'instant : les voyages aux Etats-Unis, tant que l'article 4 du contrat
// n'est pas harmonise avec la politique.)
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
      r: `<p>Non, la carte de crédit n'est pas obligatoire et il n'y a pas de vérification de crédit. Le paiement se fait directement avec Location YBMTL, jamais en ligne : Interac ou virement, comptant, chèque, carte débit ou carte de crédit.</p><p>La location et le dépôt de garantie se règlent au moment de la prise du véhicule.</p>`,
    },
    {
      q: 'Les prix affichés incluent-ils les taxes ?',
      r: `<p>Non, les prix affichés sont <strong>avant taxes</strong>. À compter du 1<sup>er</sup> octobre 2026, la TPS (5 %) et la TVQ (9,975 %) sont ajoutées au prix de location, excluant le montant du dépôt de garantie. Le total estimé avec taxes s'affiche dans le formulaire de réservation.</p>`,
    },
    {
      q: 'Y a-t-il un dépôt de garantie ?',
      r: `<p>Un dépôt de garantie est demandé au moment de la prise du véhicule ; son montant est indiqué sur la fiche de chaque véhicule. Il est remis à la fin de la location, sous réserve du contrat. Le dépôt n'est pas taxé.</p>`,
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
      r: `<p>La remise du véhicule se fait à <strong>Laval</strong>. Nous vous communiquons le point de rencontre exact 48 heures avant le début de la location, avec un appel de confirmation.</p><p>Un état des lieux est établi avant et après la location, pour la protection de chacun.</p>`,
    },
    {
      q: 'Puis-je lire le contrat avant de réserver ?',
      r: `<p>Oui. Le contrat de location est disponible en PDF sur la page <a href="/conditions">Contrat &amp; Conditions</a> : en français (version officielle), en anglais et en espagnol (traductions de courtoisie). Le guide des assurances y est offert en français et en anglais.</p>`,
    },
    {
      q: 'Comment vous joindre ?',
      r: `<p>Par téléphone au <a href="tel:${tel}">${company.phone}</a>, par texto au même numéro, ou par courriel à <a href="mailto:${company.email}">${company.email}</a>.</p>`,
    },
  ];
};
