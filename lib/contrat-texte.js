// Texte intégral du contrat de location (articles 1 à 20), affiché dans la page de signature
// pour que le client le lise à l'écran avant de cocher « J'ai lu et j'accepte les conditions ».
//
// Ce texte doit rester IDENTIQUE à celui du PDF public/docs/Contrat-Location-YBMTL-FR.pdf.
// Si le contrat change (ex. l'article 4), mettre ce fichier à jour, puis vérifier avec :
//   python3 outils-contrat/verifier-texte-contrat.py
// Marques : **gras**, et {{depot}} (remplacé à l'écran par le dépôt de garantie saisi dans le formulaire).
module.exports = {
  titre: 'Contrat de location de véhicule',
  societe: 'Centre de LOCATION YBMTL inc',
  sections: [
    {
      titre: '4. Tarifs, paiement et dépôt de garantie',
      articles: [
        {
          titre: 'Article 1 – Prix de la location et conditions de paiement',
          blocs: [
            { p: 'Le prix total de la location est indiqué ci-dessus et est payable immédiatement à la signature du présent contrat. Les modalités de paiement acceptées sont : **Virement Interac (yblocation514@outlook.com) ou argent comptant.**' },
          ],
        },
        {
          titre: 'Article 2 – Dépôt de garantie',
          blocs: [
            { lead: '2.1 Montant et versement.', p: 'Le Locataire verse au Locateur, avant la prise de possession du véhicule, un dépôt de garantie d’un montant de {{depot}} $. Ce dépôt constitue une garantie pour l’exécution de toutes les obligations du Locataire découlant du présent contrat. Le dépôt de garantie ne peut en aucun cas servir de paiement pour une location.' },
            { lead: '2.2 Rétention préventive.', p: 'Un montant de 150 $ du dépôt de garantie sera gelé pour une période de 14 jours afin de couvrir, si nécessaire, des enregistrements manquants, une amende, du carburant manquant ou des frais de nettoyage.' },
            { lead: '2.3 Utilisation du dépôt.', p: 'Le Locateur est autorisé à appliquer tout ou partie du dépôt au paiement de toute somme due, incluant les frais de location impayés, les dommages au véhicule, les frais de nettoyage, les contraventions, les péages, les frais administratifs et toute autre somme exigible en vertu du présent contrat.' },
            { lead: '2.4 Réception tardive des avis.', p: 'Le Locataire reconnaît que certains avis de péage, contraventions ou réclamations peuvent être transmis au Locateur après la fin de la période de location. Le Locataire demeure responsable de ces frais même lorsqu’ils sont reçus plusieurs jours, semaines ou mois après le retour du véhicule.' },
            { lead: '2.5 Solde excédant le dépôt.', p: 'Si les sommes dues excèdent le montant du dépôt, le Locataire s’engage à payer le solde restant dans les dix (10) jours suivant la transmission d’un avis écrit par le Locateur.' },
          ],
        },
      ],
    },
    {
      titre: '5. Assurance et responsabilité',
      articles: [
        {
          titre: 'Article 3 – Responsabilité totale du locataire',
          blocs: [
            { p: 'Toute personne prenant possession du véhicule, qu’elle soit le signataire du présent contrat ou non, est entièrement et solidairement responsable de tout incident, dommage, accident, perte ou détérioration survenant au véhicule durant la période de possession, sans exception.' },
          ],
        },
        {
          titre: 'Article 4 – Couverture d’assurance',
          blocs: [
            { p: 'Chaque location comprend une assurance de base couvrant la responsabilité civile obligatoire (dommages causés à des tiers). Le locataire est néanmoins responsable de tous les dommages causés au véhicule loué.' },
            { p: 'Les situations suivantes ne sont pas couvertes par l’assurance et engagent la pleine responsabilité du Locataire :' },
            { ul: [
              'Conduite sous l’influence d’alcool, de drogues ou de médicaments ;',
              'Dommages aux pneus, jantes, clés ou équipements intérieurs résultant d’une négligence ;',
              'Utilisation du véhicule à des fins de course, de remorquage ou de transport non autorisé de marchandises ou de passagers.',
            ] },
            { p: 'Certains véhicules ne peuvent quitter la province du Québec faute d’assurance, ce qui sera mentionné au Locataire au départ.' },
          ],
        },
        {
          titre: 'Article 5 – Conducteur non autorisé',
          blocs: [
            { p: 'Le Locataire s’engage à être le seul conducteur du véhicule, sauf si un conducteur additionnel a été expressément déclaré et accepté par le Locateur par écrit avant la prise de possession. Tout conducteur non inscrit au présent contrat est considéré comme non autorisé.' },
            { p: 'En cas de conduite par un conducteur non autorisé :' },
            { ul: [
              'Le Locataire demeure entièrement responsable de tout dommage, perte, vol, contravention ou péage ;',
              'Toute couverture d’assurance ou protection contractuelle peut être annulée selon les conditions de l’assureur ;',
              'Le Locateur se réserve le droit de reprendre possession du véhicule sans préavis, aux frais du Locataire (remorquage, récupération, déplacement).',
            ] },
          ],
        },
      ],
    },
    {
      titre: '6. Obligations du locataire',
      articles: [
        {
          titre: 'Article 6 – Obligations générales',
          blocs: [
            { ul: [
              'Utiliser le véhicule conformément au Code de la route.',
              'Ne pas sous-louer le véhicule à un tiers, sous quelque forme que ce soit.',
              'Aviser la compagnie au moins 48h à l’avance en cas de renouvellement de contrat.',
              'Informer immédiatement la compagnie en cas de panne, accident ou problème avec le véhicule.',
              'En cas d’accident, remplir le constat d’accident. En cas de vol ou vandalisme, fournir un rapport de police dans les 24 heures.',
            ] },
          ],
        },
        {
          titre: 'Article 7 – Restitution du véhicule',
          blocs: [
            { p: 'Le Locataire s’engage à restituer le véhicule à la date et à l’heure convenues, dans le même état qu’il l’a reçu, sauf usure normale. Le véhicule doit être restitué avec le même niveau de carburant qu’au départ et dans un état de propreté intérieure et extérieure acceptable. À défaut, les frais correspondants seront prélevés sur le dépôt de garantie.' },
          ],
        },
        {
          titre: 'Article 8 – Signalement de tout problème mécanique',
          blocs: [
            { p: 'Le Locataire s’engage à signaler immédiatement à la compagnie tout problème mécanique, défaillance technique ou anomalie constatée, quelle qu’en soit la nature ou la gravité. L’utilisation du véhicule en connaissance d’une défaillance non signalée engage la pleine responsabilité du Locataire pour tout dommage en résultant.' },
          ],
        },
        {
          titre: 'Article 9 – Coordonnées',
          blocs: [
            { p: 'Le Locataire déclare que les renseignements fournis au présent contrat sont exacts et s’engage à informer le Locateur de tout changement d’adresse, de numéro de téléphone ou de courriel pendant une période de six (6) mois suivant la fin de la location.' },
          ],
        },
      ],
    },
    {
      titre: '7. Infractions, frais et dommages',
      articles: [
        {
          titre: 'Article 10 – Contraventions et infractions',
          blocs: [
            { p: 'Le Locataire est seul responsable de toute contravention, infraction au Code de la sécurité routière, amende, frais de remorquage, frais de stationnement ou autre pénalité imposée durant la période de location. Si le Locataire omet d’informer la compagnie de la réception d’une telle infraction dans un délai de 48 heures, des frais administratifs forfaitaires de 50 $ seront automatiquement imputés, en sus du montant de l’amende.' },
          ],
        },
        {
          titre: 'Article 11 – Frais de péage et ponts',
          blocs: [
            { p: 'Le Locataire est responsable de tous les frais de péage encourus durant la location, incluant notamment ceux de l’autoroute 25 (A25), de l’autoroute 30 (A30) et de tout autre réseau de péage électronique ou manuel. Tout montant facturé à la compagnie sera répercuté intégralement sur le Locataire, majoré des frais administratifs applicables.' },
          ],
        },
        {
          titre: 'Article 12 – Propreté du véhicule',
          blocs: [
            { p: 'Tout véhicule retourné dans un état jugé sale ou dégradé au-delà de l’usure normale fera l’objet de frais de nettoyage forfaitaires de 50 $, prélevés directement sur le dépôt de garantie. Des montants additionnels pourront être facturés en cas de salissures ou dommages exceptionnels (odeurs persistantes, taches importantes, présence de déchets, etc.).' },
          ],
        },
        {
          titre: 'Article 13 – Dommages au véhicule',
          blocs: [
            { p: 'Le Locataire est responsable de tout dommage causé au véhicule pendant la location, incluant les dommages mécaniques, esthétiques, intérieurs ou extérieurs, sauf preuve d’un défaut mécanique non imputable au Locataire.' },
          ],
        },
        {
          titre: 'Article 14 – Clés et accessoires',
          blocs: [
            { p: 'Toute perte de clés, télécommandes ou accessoires entraîne des frais de remplacement ainsi que les coûts associés (remorquage, programmation, déplacement si applicable), entièrement à la charge du Locataire.' },
          ],
        },
        {
          titre: 'Article 15 – Perte ou vol du véhicule',
          blocs: [
            { p: 'En cas de perte ou vol du véhicule durant la location, le Locataire demeure responsable jusqu’à concurrence de la valeur du véhicule, sous réserve des protections d’assurance applicables, et s’engage à collaborer avec les autorités et à fournir un rapport de police dans les 24 heures.' },
          ],
        },
        {
          titre: 'Article 16 – Retard de remise du véhicule',
          blocs: [
            { p: 'Tout retard dans la remise du véhicule entraîne des frais de 75 $ par jour. Après un retard de 24 heures sans communication, le Locateur pourra considérer le véhicule comme potentiellement volé et aviser les autorités.' },
          ],
        },
      ],
    },
    {
      titre: '8. Non-paiement et recours',
      articles: [
        {
          titre: 'Article 17 – Immobilisation du véhicule',
          blocs: [
            { p: 'En cas de non-paiement total ou partiel des sommes dues à l’expiration du contrat, la compagnie se réserve le droit de procéder à l’immobilisation à distance du véhicule sans préavis, 48 heures après la date de fin de la location. Le Locataire y consent expressément en signant le présent contrat.' },
          ],
        },
        {
          titre: 'Article 18 – Défaut de paiement et recouvrement',
          blocs: [
            { p: 'Tout montant impayé en vertu du présent contrat constitue un défaut. Le Locateur pourra envoyer une mise en demeure et, si nécessaire :' },
            { ul: [
              'Transférer le dossier à une agence de recouvrement ;',
              'Entreprendre toute procédure judiciaire autorisée par la loi ;',
              'Réclamer les intérêts ainsi que les frais raisonnables de recouvrement permis par les lois applicables.',
            ] },
          ],
        },
      ],
    },
    {
      titre: '9. Résiliation',
      articles: [
        {
          titre: 'Article 19 – Résiliation du contrat',
          blocs: [
            { p: 'En cas de non-respect de l’une ou l’autre des obligations prévues au présent contrat, la compagnie se réserve le droit de résilier le contrat sans préavis et de reprendre possession immédiate du véhicule, sans préjudice de tout autre recours disponible.' },
          ],
        },
      ],
    },
    {
      titre: '10. Reconnaissance et signatures',
      articles: [
        {
          titre: 'Article 20 – Reconnaissance du locataire',
          blocs: [
            { p: 'Par sa signature, le Locataire reconnaît avoir lu le présent contrat dans son intégralité, en comprendre la portée, accepter toutes les conditions qui y sont énoncées et s’engager à être responsable de tous les montants qui pourraient être réclamés relativement à l’utilisation du véhicule pendant la période de location.' },
          ],
        },
      ],
    },
  ],
};
