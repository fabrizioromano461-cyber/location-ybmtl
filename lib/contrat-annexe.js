// Annexe A du contrat de location : conditions complémentaires et tableau des frais.
// Le MÊME texte sert partout : page de signature (client à distance et page admin), PDF du contrat signé (pages ajoutées
// après la page 4), PDF public de la page /conditions et courriels. Tous les montants et délais sont dans FRAIS ci-dessous :
// c'est le seul endroit à modifier.
//
// Pas de numéros de « page » ici : l'annexe peut occuper 2 ou 3 pages selon la longueur du texte.
// Marques : **gras**.
const TELEPHONE = '(438) 453-9983';
const INTERAC = 'yblocation514@outlook.com'; // même adresse que l'article 1 du contrat

const FRAIS = {
  retardJour: '75 $',            // article 16 du contrat
  amende: '50 $',                // article 10 du contrat
  peage: '15 $',                 // frais administratifs par avis de péage
  nettoyage: '50 $',             // article 12 du contrat
  nettoyageExceptionnel: '150 $',
  fumee: '250 $',
  carburantService: '20 $',      // s'ajoute au coût du carburant manquant
  cle: '300 $',
  accessoire: '100 $',           // télécommande, carte d'accès, autre accessoire
  annulationTardive: '50 $',
  interet: '1,5 % par mois (18 % par année)',
  retenue: '150 $',              // article 2.2 du contrat (14 jours)
  delaiAnnulationHeures: 24,
  delaiRemboursementJours: 3,
  immobilisationMaxJours: 30,
};

const F = FRAIS;
const usd = (fr) => '$' + String(fr).replace(/\s*\$/, ''); // « 75 $ » -> « $75 »

// Tableau des frais (un seul endroit : écran, PDF, page /conditions).
const TABLE_FRAIS = {
  entetes: ['Situation', 'Montant'],
  lignes: [
    ['Retard au retour du véhicule (art. 16)', `${F.retardJour} par jour`],
    ['Contravention ou avis non signalé au Locateur dans les 48 heures (art. 10)', `${F.amende}, en plus du montant de l’amende`],
    ['Péage de l’A25, de l’A30 ou de tout autre réseau (art. 11)', `Montant du péage + ${F.peage} de frais administratifs par avis`],
    ['Nettoyage standard (art. 7 et 12)', F.nettoyage],
    ['Nettoyage exceptionnel : odeurs persistantes, taches importantes, déchets, poils d’animaux (art. 12)', F.nettoyageExceptionnel],
    ['Fumée ou vapotage dans le véhicule', F.fumee],
    ['Carburant manquant au retour (art. 7)', `Coût du carburant manquant, au prix courant, + ${F.carburantService} de frais de service`],
    ['Clé perdue ou endommagée (art. 14)', `${F.cle} par clé`],
    ['Télécommande, carte d’accès ou autre accessoire perdu ou endommagé (art. 14)', `${F.accessoire} par accessoire`],
    ['Remorquage, récupération ou déplacement du véhicule causés par le Locataire (art. 5 et 14)', 'Coût réel facturé, sur présentation de la facture'],
    ['Somme impayée après l’avis écrit (art. 2.5 et 18)', `Intérêt de ${F.interet}`],
    ['Annulation tardive ou non-présentation (article A2)', F.annulationTardive],
  ],
};


// ---------- Traductions de courtoisie (la version française de l'annexe est la version officielle) ----------
const TABLE_EN = {
  entetes: ['Situation', 'Amount'],
  lignes: [
    ['Late return of the vehicle (art. 16)', `${usd(F.retardJour)} per day`],
    ['Ticket or notice not reported to the Lessor within 48 hours (art. 10)', `${usd(F.amende)}, in addition to the fine`],
    ['Toll on the A25, the A30 or any other network (art. 11)', `Toll amount + ${usd(F.peage)} administrative fee per notice`],
    ['Standard cleaning (art. 7 and 12)', usd(F.nettoyage)],
    ['Exceptional cleaning: lingering odours, major stains, garbage, pet hair (art. 12)', usd(F.nettoyageExceptionnel)],
    ['Smoking or vaping in the vehicle', usd(F.fumee)],
    ['Missing fuel at return (art. 7)', `Cost of the missing fuel, at the current price, + ${usd(F.carburantService)} service fee`],
    ['Lost or damaged key (art. 14)', `${usd(F.cle)} per key`],
    ['Lost or damaged remote, access card or other accessory (art. 14)', `${usd(F.accessoire)} per accessory`],
    ['Towing, recovery or relocation of the vehicle caused by the Renter (art. 5 and 14)', 'Actual cost invoiced, on presentation of the invoice'],
    ['Amount unpaid after written notice (art. 2.5 and 18)', 'Interest of 1.5% per month (18% per year)'],
    ['Late cancellation or no-show (article A2)', usd(F.annulationTardive)],
  ],
};
const TABLE_ES = {
  entetes: ['Situación', 'Importe'],
  lignes: [
    ['Retraso en la devolución del vehículo (art. 16)', `${F.retardJour} por día`],
    ['Multa o aviso no comunicado al Arrendador en un plazo de 48 horas (art. 10)', `${F.amende}, además del importe de la multa`],
    ['Peaje de la A25, la A30 o cualquier otra red (art. 11)', `Importe del peaje + ${F.peage} de gastos administrativos por aviso`],
    ['Limpieza estándar (art. 7 y 12)', F.nettoyage],
    ['Limpieza excepcional: olores persistentes, manchas importantes, basura, pelo de animales (art. 12)', F.nettoyageExceptionnel],
    ['Fumar o vapear en el vehículo', F.fumee],
    ['Combustible faltante a la devolución (art. 7)', `Costo del combustible faltante, al precio vigente, + ${F.carburantService} de gastos de servicio`],
    ['Llave perdida o dañada (art. 14)', `${F.cle} por llave`],
    ['Mando a distancia, tarjeta de acceso u otro accesorio perdido o dañado (art. 14)', `${F.accessoire} por accesorio`],
    ['Remolque, recuperación o traslado del vehículo causados por el Arrendatario (art. 5 y 14)', 'Costo real facturado, previa presentación de la factura'],
    ['Suma impagada tras el aviso escrito (art. 2.5 y 18)', 'Interés del 1,5 % mensual (18 % anual)'],
    ['Cancelación tardía o inasistencia (artículo A2)', F.annulationTardive],
  ],
};

const EN = {
  versionTexte: 'November 20, 2026',
  titre: 'Annex A – Additional terms and fee schedule',
  societe: 'Centre de LOCATION YBMTL inc',
  libelles: {
    titreCourt: 'ANNEX A',
    sousTitre: 'Additional terms and fee schedule',
    societeVersion: () => 'Centre de LOCATION YBMTL inc · courtesy translation',
    suite: 'ANNEX A – additional terms and fee schedule (continued)',
    page: (i, n) => `Annex A – page ${i} of ${n}`,
    initiales: "Renter's initials: ________      Lessor's initials: ________",
    piedPublic: () => 'Courtesy translation, the French version prevails',
    reconnaissance: 'The Renter acknowledges having read and accepted this annex, which forms an integral part of the rental agreement signed on ______________________.',
    signLocataire: "Renter's signature",
    signRepresentant: 'Signature of the representative of Location YBMTL',
  },
  intro: 'This annex forms an integral part of the vehicle rental agreement entered into with Centre de LOCATION YBMTL inc (the “Lessor”). It sets out the amounts and rules that Articles 1 to 20 provide for without detailing them. Amounts are in Canadian dollars; GST and QST are added where they apply. This is a courtesy translation: the French version is the official version.',
  articles: [
    { titre: 'Article A1 – Fee schedule', blocs: [
      { table: TABLE_EN },
      { p: 'These fees may be deducted from the security deposit (art. 2.3).' },
    ] },
    { titre: 'Article A2 – Cancellation, early return and extension', blocs: [
      { lead: 'Cancellation.', p: `The Renter may cancel free of charge up to ${F.delaiAnnulationHeures} hours before the planned departure time. After that, or in the event of a no-show, a ${usd(F.annulationTardive)} fee applies and must be paid before any new rental.` },
      { lead: 'Early return.', p: 'The rental price is not refunded for unused days.' },
      { lead: 'Extension.', p: 'On request made at least 48 hours in advance (art. 6), subject to the vehicle’s availability and at the rate set out in the agreement.' },
    ] },
    { titre: 'Article A3 – Payment and refund of the security deposit', blocs: [
      { lead: 'Payment.', p: 'As a clarification of Article 1, the rental price and the security deposit are payable no later than at departure, when the Renter takes possession of the vehicle, by Interac e-transfer or in cash.' },
      { lead: 'Refund.', p: `When the vehicle is returned, the Lessor inspects it with the Renter. The security deposit is refunded within ${F.delaiRemboursementJours} days after the return, minus any amounts owed and the precautionary hold of ${usd(F.retenue)} (art. 2.2).` },
      { p: 'The precautionary hold is refunded at the end of the 14 days following the return, minus any tolls, tickets or other amounts received in the meantime.' },
      { p: 'Refunds are made by Interac e-transfer or in cash. The Lessor sends the details of any amount withheld by email. If the amounts owed exceed the deposit, Article 2.5 applies.' },
    ] },
    { titre: 'Article A4 – Accident, theft and breakdown', blocs: [
      { lead: 'In case of an accident:', p: '' },
      { ul: [
        'Make sure everyone is safe and call 911 if anyone is injured.',
        `Call Location YBMTL immediately at ${TELEPHONE}.`,
        'Do not admit liability. Note the name, phone number, insurance and licence plate of the other people involved, take photos and identify witnesses.',
        'Fill in the accident report (art. 6). In case of theft or vandalism, provide a police report within 24 hours.',
        'Do not have the vehicle repaired or towed without the Lessor’s approval.',
      ] },
      { lead: 'In case of a breakdown.', p: 'Call the Lessor without delay, do not attempt to repair the vehicle and do not have it towed without the Lessor’s approval (art. 8). If the breakdown is not attributable to the Renter (art. 13), the Lessor proposes a solution: a replacement vehicle, subject to availability, or a price adjustment.' },
      { lead: 'Immobilisation during repairs.', p: `If the vehicle must be repaired following an accident or damage attributable to the Renter, the Renter pays, for each day the vehicle is out of service until the repairs are completed (maximum ${F.immobilisationMaxJours} days), an amount equal to the contract’s weekly rate divided by 7, because the vehicle cannot be rented to another customer.` },
    ] },
    { titre: 'Article A5 – Use of the vehicle', blocs: [
      { ul: [
        'It is prohibited to use the vehicle for paid ride-sharing or for any passenger transport or delivery service (Uber, Lyft, DoorDash, Uber Eats, etc.), unless the Lessor has given written permission before possession.',
        'Smoking or vaping in the vehicle is prohibited (fee in Article A1).',
        'The vehicle may be driven in Canada and the United States (art. 4). Any other country is prohibited without the Lessor’s written permission.',
        'Off-road driving, towing and racing are prohibited (art. 4).',
        'Mileage is unlimited, unless the contract states otherwise in writing.',
      ] },
    ] },
    { titre: 'Article A6 – Additional driver', blocs: [
      { p: 'An additional driver must be declared to the Lessor and accepted in writing before possession (art. 5). They must be at least 25 years old, hold a driver’s licence that has been valid for at least 3 years, and provide the same documents as the Renter (driver’s licence and ID), which are checked in the same way. No fee is charged for an accepted additional driver. The Renter and the additional driver are jointly and severally liable (art. 3).' },
    ] },
    { titre: 'Article A7 – Location and remote immobilisation', blocs: [
      { p: 'The vehicle may be equipped with a location (GPS) device and a remote immobilisation device.' },
      { p: 'The Lessor uses the vehicle’s location only to recover a vehicle that is stolen, not returned or whose rental is unpaid (art. 16 and 17), to assist in case of an accident or breakdown, and to check compliance with the permitted territory (Article A5). It is not used to follow the Renter’s personal movements. Location data is kept only as long as needed for these purposes.' },
      { p: 'The remote immobilisation provided for in Article 17 is carried out only when the vehicle is stopped.' },
    ] },
    { titre: 'Article A8 – Licence verification, notices and consents', blocs: [
      { ul: [
        'The Renter, and any additional driver, authorizes the Lessor to verify the validity of their driver’s licence with the Société de l’assurance automobile du Québec and to keep the photos of the front and back of their licence for as long as needed for the rental file.',
        'Notices, invoices and claims may be sent to the Renter by email or text message, at the contact details given in the agreement (art. 9).',
        'The electronic signature of the agreement and of this annex has the same value as a handwritten signature.',
        'The Lessor may disclose the necessary information to the authorities, insurers and, in case of non-payment, a collection agency (art. 18). Its privacy policy is published at locationybmtl.ca/en/privacy.',
      ] },
    ] },
    { titre: 'Article A9 – General provisions', blocs: [
      { ul: [
        'This annex supplements Articles 1 to 20. Where both deal with the same subject, the more specific rule or amount applies.',
        'The agreement is governed by the laws of Québec and the federal laws that apply in Québec.',
        'If any provision of the agreement is found to be invalid, the others remain in force.',
        'The French version of the agreement is the official version; the English and Spanish translations are provided as a courtesy.',
      ] },
    ] },
  ],
};

const ES = {
  versionTexte: '20 de noviembre de 2026',
  titre: 'Anexo A – Condiciones complementarias y tabla de cargos',
  societe: 'Centre de LOCATION YBMTL inc',
  libelles: {
    titreCourt: 'ANEXO A',
    sousTitre: 'Condiciones complementarias y tabla de cargos',
    societeVersion: () => 'Centre de LOCATION YBMTL inc · traducción de cortesía',
    suite: 'ANEXO A – condiciones complementarias y tabla de cargos (continuación)',
    page: (i, n) => `Anexo A – página ${i} de ${n}`,
    initiales: 'Iniciales del arrendatario: ________      Iniciales del representante: ________',
    piedPublic: () => 'Traducción de cortesía, prevalece la versión francesa',
    reconnaissance: 'El Arrendatario reconoce haber leído y aceptado el presente anexo, que forma parte integrante del contrato de alquiler firmado el ______________________.',
    signLocataire: 'Firma del arrendatario',
    signRepresentant: 'Firma del representante de Location YBMTL',
  },
  intro: 'Este anexo forma parte integrante del contrato de alquiler de vehículo celebrado con Centre de LOCATION YBMTL inc (el «Arrendador»). Precisa los importes y las reglas que los artículos 1 a 20 prevén sin detallarlos. Los importes están en dólares canadienses; el GST (TPS) y el QST (TVQ) se añaden cuando corresponda. Esta es una traducción de cortesía: la versión francesa es la versión oficial.',
  articles: [
    { titre: 'Artículo A1 – Tabla de cargos', blocs: [
      { table: TABLE_ES },
      { p: 'Estos cargos pueden deducirse del depósito de garantía (art. 2.3).' },
    ] },
    { titre: 'Artículo A2 – Cancelación, devolución anticipada y prórroga', blocs: [
      { lead: 'Cancelación.', p: `El Arrendatario puede cancelar sin cargo hasta ${F.delaiAnnulationHeures} horas antes de la hora de salida prevista. Después de ese plazo, o si no se presenta, se aplica un cargo de ${F.annulationTardive}, que debe pagarse antes de cualquier nuevo alquiler.` },
      { lead: 'Devolución anticipada.', p: 'El precio del alquiler no se reembolsa por los días no utilizados.' },
      { lead: 'Prórroga.', p: 'Previa solicitud con al menos 48 horas de antelación (art. 6), según la disponibilidad del vehículo y a la tarifa prevista en el contrato.' },
    ] },
    { titre: 'Artículo A3 – Pago y reembolso del depósito de garantía', blocs: [
      { lead: 'Pago.', p: 'A modo de precisión del artículo 1, el precio del alquiler y el depósito de garantía son pagaderos, a más tardar, en la salida, cuando el Arrendatario toma posesión del vehículo, por transferencia Interac o en efectivo.' },
      { lead: 'Reembolso.', p: `A la devolución del vehículo, el Arrendador lo inspecciona con el Arrendatario. El depósito de garantía se reembolsa dentro de los ${F.delaiRemboursementJours} días siguientes a la devolución, menos las sumas adeudadas y la retención preventiva de ${F.retenue} (art. 2.2).` },
      { p: 'La retención preventiva se reembolsa al final de los 14 días posteriores a la devolución, menos los peajes, multas u otras sumas recibidos entretanto.' },
      { p: 'El reembolso se hace por transferencia Interac o en efectivo. El Arrendador envía por correo electrónico el detalle de toda suma retenida. Si las sumas adeudadas superan el depósito, se aplica el artículo 2.5.' },
    ] },
    { titre: 'Artículo A4 – Accidente, robo y avería', blocs: [
      { lead: 'En caso de accidente:', p: '' },
      { ul: [
        'Garantizar la seguridad de todos y llamar al 911 si hay heridos.',
        `Llamar a Location YBMTL de inmediato al ${TELEPHONE}.`,
        'No admitir responsabilidad. Anotar el nombre, el teléfono, el seguro y la matrícula de las demás personas implicadas, tomar fotos e identificar a los testigos.',
        'Llenar el informe de accidente (art. 6). En caso de robo o vandalismo, presentar un informe policial dentro de las 24 horas.',
        'No hacer reparar ni remolcar el vehículo sin la aprobación del Arrendador.',
      ] },
      { lead: 'En caso de avería.', p: 'Llamar al Arrendador sin demora, no intentar reparar el vehículo y no hacerlo remolcar sin su aprobación (art. 8). Si la avería no es imputable al Arrendatario (art. 13), el Arrendador le propone una solución: un vehículo de reemplazo, según la disponibilidad, o un ajuste del precio.' },
      { lead: 'Inmovilización durante las reparaciones.', p: `Si el vehículo debe repararse a raíz de un accidente o de un daño imputable al Arrendatario, este paga, por cada día de inmovilización hasta el fin de las reparaciones (máximo ${F.immobilisationMaxJours} días), un importe igual a la tarifa semanal del contrato dividida entre 7, ya que el vehículo no puede alquilarse a otro cliente.` },
    ] },
    { titre: 'Artículo A5 – Uso del vehículo', blocs: [
      { ul: [
        'Está prohibido usar el vehículo para compartir viajes de pago o para cualquier servicio de transporte de personas o de entrega (Uber, Lyft, DoorDash, Uber Eats, etc.), salvo autorización escrita del Arrendador otorgada antes de la toma de posesión.',
        'Está prohibido fumar o vapear en el vehículo (cargo del artículo A1).',
        'El vehículo puede conducirse en Canadá y en los Estados Unidos (art. 4). Cualquier otro país está prohibido sin autorización escrita del Arrendador.',
        'Está prohibido conducir fuera de carretera, remolcar y participar en carreras (art. 4).',
        'El kilometraje es ilimitado, salvo mención escrita en contrario en el contrato.',
      ] },
    ] },
    { titre: 'Artículo A6 – Conductor adicional', blocs: [
      { p: 'Un conductor adicional debe ser declarado al Arrendador y aceptado por escrito antes de la toma de posesión (art. 5). Debe tener al menos 25 años, poseer una licencia de conducir válida desde hace al menos 3 años y presentar los mismos documentos que el Arrendatario (licencia de conducir y documento de identidad), que se verifican de la misma manera. No se cobra ningún cargo por un conductor adicional aceptado. El Arrendatario y el conductor adicional son solidariamente responsables (art. 3).' },
    ] },
    { titre: 'Artículo A7 – Localización e inmovilización a distancia', blocs: [
      { p: 'El vehículo puede estar equipado con un dispositivo de localización (GPS) y un dispositivo de inmovilización a distancia.' },
      { p: 'El Arrendador utiliza la localización del vehículo únicamente para recuperar un vehículo robado, no devuelto o cuyo alquiler no esté pagado (art. 16 y 17), para prestar asistencia en caso de accidente o avería y para verificar el cumplimiento del territorio permitido (artículo A5). No se utiliza para seguir los desplazamientos personales del Arrendatario. Los datos de localización se conservan solo el tiempo necesario para estos fines.' },
      { p: 'La inmovilización a distancia prevista en el artículo 17 solo se realiza cuando el vehículo está detenido.' },
    ] },
    { titre: 'Artículo A8 – Verificación de la licencia, avisos y consentimientos', blocs: [
      { ul: [
        'El Arrendatario, y todo conductor adicional, autoriza al Arrendador a verificar la validez de su licencia de conducir ante la Société de l’assurance automobile du Québec y a conservar las fotos del anverso y del reverso de su licencia durante el tiempo necesario para el expediente de alquiler.',
        'Los avisos, facturas y reclamaciones pueden enviarse al Arrendatario por correo electrónico o mensaje de texto, a los datos de contacto indicados en el contrato (art. 9).',
        'La firma electrónica del contrato y de este anexo tiene el mismo valor que una firma manuscrita.',
        'El Arrendador puede comunicar la información necesaria a las autoridades, a las aseguradoras y, en caso de impago, a una agencia de cobro (art. 18). Su política de privacidad está publicada en locationybmtl.ca/en/privacy (versión en inglés).',
      ] },
    ] },
    { titre: 'Artículo A9 – Disposiciones generales', blocs: [
      { ul: [
        'Este anexo complementa los artículos 1 a 20. Cuando ambos tratan el mismo tema, se aplica la regla o el importe más preciso.',
        'El contrato se rige por las leyes de Quebec y por las leyes federales aplicables en Quebec.',
        'Si alguna disposición del contrato se considera inválida, las demás siguen en vigor.',
        'La versión francesa del contrato es la versión oficial; las traducciones al inglés y al español se ofrecen a título de cortesía.',
      ] },
    ] },
  ],
};

module.exports = {
  en: EN,
  es: ES,
  tableFrais: TABLE_FRAIS,
  version: '2026-11-20',              // à changer chaque fois que l'annexe change (elle est écrite dans le pied de page)
  versionTexte: '20 novembre 2026',
  telephone: TELEPHONE,
  interac: INTERAC,
  frais: FRAIS,
  titre: 'Annexe A – Conditions complémentaires et tableau des frais',
  societe: 'Centre de LOCATION YBMTL inc',
  libelles: {
    titreCourt: 'ANNEXE A',
    sousTitre: 'Conditions complémentaires et tableau des frais',
    societeVersion: () => 'Centre de LOCATION YBMTL inc',
    suite: 'ANNEXE A – conditions complémentaires et tableau des frais (suite)',
    page: (i, n) => `Annexe A – page ${i} de ${n}`,
    initiales: 'Initiales du locataire : ________      Initiales du représentant : ________',
    piedPublic: () => '', // YB (2026-11-21) : plus de ligne « … · version du 20 novembre 2026 » en bas des pages du contrat français
    reconnaissance: 'Le Locataire reconnaît avoir lu et accepté la présente annexe, qui fait partie intégrante du contrat de location signé le ______________________.',
    signLocataire: 'Signature du locataire',
    signRepresentant: 'Signature du représentant de Location YBMTL',
  },
  intro: 'La présente annexe fait partie intégrante du contrat de location de véhicule conclu avec Centre de LOCATION YBMTL inc (le « Locateur »). Elle précise les montants et les règles que les articles 1 à 20 prévoient sans les détailler. Les montants sont en dollars canadiens ; la TPS et la TVQ s’ajoutent lorsqu’elles s’appliquent.',
  tableEn: TABLE_EN, // résumé de courtoisie en anglais du tableau des frais (page /en/terms)
  articles: [
    {
      titre: 'Article A1 – Tableau des frais',
      blocs: [
        { table: TABLE_FRAIS },
        { p: 'Ces frais peuvent être prélevés sur le dépôt de garantie (art. 2.3).' },
      ],
    },
    {
      titre: 'Article A2 – Annulation, retour anticipé et prolongation',
      blocs: [
        { lead: 'Annulation.', p: `Le Locataire peut annuler sans frais jusqu’à ${F.delaiAnnulationHeures} heures avant l’heure de départ prévue. Après ce délai, ou en cas de non-présentation, des frais de ${F.annulationTardive} s’appliquent et doivent être payés avant toute nouvelle location.` },
        { lead: 'Retour anticipé.', p: 'Le prix de la location n’est pas remboursé pour les jours non utilisés.' },
        { lead: 'Prolongation.', p: 'Sur demande faite au moins 48 heures à l’avance (art. 6), selon la disponibilité du véhicule et au tarif prévu au contrat.' },
      ],
    },
    {
      titre: 'Article A3 – Paiement et remboursement du dépôt de garantie',
      blocs: [
        { lead: 'Paiement.', p: 'Par précision de l’article 1, le prix de la location et le dépôt de garantie sont payables au plus tard au départ, à la prise de possession du véhicule, par virement Interac ou en argent comptant.' },
        { lead: 'Remboursement.', p: `Au retour du véhicule, le Locateur l’inspecte avec le Locataire. Le dépôt de garantie est remboursé dans les ${F.delaiRemboursementJours} jours suivant le retour, moins les sommes dues et la retenue préventive de ${F.retenue} (art. 2.2).` },
        { p: 'La retenue préventive est remboursée à la fin des 14 jours suivant le retour, moins les péages, contraventions ou autres sommes reçus entre-temps.' },
        { p: `Le remboursement se fait par virement Interac ou en argent comptant. Le Locateur envoie par courriel le détail de toute somme retenue. Si les sommes dues dépassent le dépôt, l’article 2.5 s’applique.` },
      ],
    },
    {
      titre: 'Article A4 – Accident, vol et panne',
      blocs: [
        { lead: 'En cas d’accident :', p: '' },
        { ul: [
          'Assurer la sécurité de tous et appeler le 911 s’il y a des blessés.',
          `Appeler Location YBMTL immédiatement au ${TELEPHONE}.`,
          'Ne pas admettre sa responsabilité. Noter le nom, le téléphone, l’assurance et la plaque des autres personnes impliquées, prendre des photos et relever les témoins.',
          'Remplir le constat d’accident (art. 6). En cas de vol ou de vandalisme, fournir un rapport de police dans les 24 heures.',
          'Ne faire réparer ni remorquer le véhicule sans l’accord du Locateur.',
        ] },
        { lead: 'En cas de panne.', p: 'Appeler le Locateur sans attendre, ne pas tenter de réparer et ne pas faire remorquer le véhicule sans son accord (art. 8). Si la panne n’est pas imputable au Locataire (art. 13), le Locateur lui propose une solution : véhicule de remplacement, selon les disponibilités, ou ajustement du prix.' },
        { lead: 'Immobilisation pendant les réparations.', p: `Si le véhicule doit être réparé à la suite d’un accident ou d’un dommage imputable au Locataire, celui-ci paie, pour chaque jour d’immobilisation jusqu’à la fin des réparations (maximum ${F.immobilisationMaxJours} jours), un montant égal au tarif hebdomadaire du contrat divisé par 7, car le véhicule ne peut pas être loué à un autre client.` },
      ],
    },
    {
      titre: 'Article A5 – Usage du véhicule',
      blocs: [
        { ul: [
          'Il est interdit d’utiliser le véhicule pour du covoiturage payant ou pour un service de transport de personnes ou de livraison (Uber, Lyft, DoorDash, Uber Eats, etc.), sauf autorisation écrite du Locateur donnée avant la prise de possession.',
          `Il est interdit de fumer ou de vapoter dans le véhicule (frais de l’article A1).`,
          'Le véhicule peut être conduit au Canada et aux États-Unis (art. 4). Tout autre pays est interdit sans autorisation écrite du Locateur.',
          'Il est interdit de conduire hors route, de remorquer et de participer à des courses (art. 4).',
          'Le kilométrage est illimité, sauf mention écrite contraire dans le contrat.',
        ] },
      ],
    },
    {
      titre: 'Article A6 – Conducteur additionnel',
      blocs: [
        { p: 'Un conducteur additionnel doit être déclaré au Locateur et accepté par écrit avant la prise de possession (art. 5). Il doit avoir au moins 25 ans, détenir un permis de conduire valide depuis au moins 3 ans et fournir les mêmes documents que le Locataire (permis de conduire et pièce d’identité), qui sont vérifiés de la même façon. Aucuns frais ne sont exigés pour un conducteur additionnel accepté. Le Locataire et le conducteur additionnel sont solidairement responsables (art. 3).' },
      ],
    },
    {
      titre: 'Article A7 – Localisation et immobilisation à distance',
      blocs: [
        { p: 'Le véhicule peut être équipé d’un dispositif de localisation (GPS) et d’un dispositif d’immobilisation à distance.' },
        { p: 'Le Locateur utilise la localisation du véhicule seulement pour retrouver un véhicule volé, non retourné ou dont la location n’est pas payée (art. 16 et 17), pour porter assistance en cas d’accident ou de panne, et pour vérifier le respect du territoire permis (article A5). Elle ne sert pas à suivre les déplacements personnels du Locataire. Les données de localisation sont conservées seulement le temps nécessaire à ces fins.' },
        { p: 'L’immobilisation à distance prévue à l’article 17 n’est faite que lorsque le véhicule est à l’arrêt.' },
      ],
    },
    {
      titre: 'Article A8 – Vérification du permis, avis et consentements',
      blocs: [
        { ul: [
          'Le Locataire, et tout conducteur additionnel, autorise le Locateur à vérifier la validité de son permis de conduire auprès de la Société de l’assurance automobile du Québec et à conserver les photos du recto et du verso de son permis pendant le temps nécessaire au dossier de location.',
          'Les avis, factures et réclamations peuvent être transmis au Locataire par courriel ou par texto, aux coordonnées indiquées au contrat (art. 9).',
          'La signature électronique du contrat et de la présente annexe a la même valeur qu’une signature manuscrite.',
          'Le Locateur peut communiquer les renseignements nécessaires aux autorités, aux assureurs et, en cas de non-paiement, à une agence de recouvrement (art. 18). Sa politique de confidentialité est publiée à locationybmtl.ca/confidentialite.',
        ] },
      ],
    },
    {
      titre: 'Article A9 – Dispositions générales',
      blocs: [
        { ul: [
          'La présente annexe complète les articles 1 à 20. Lorsque les deux traitent du même sujet, la règle ou le montant le plus précis s’applique.',
          'Le contrat est régi par les lois du Québec et par les lois fédérales qui s’y appliquent.',
          'Si une disposition du contrat est jugée invalide, les autres demeurent en vigueur.',
          'La version française du contrat est la version officielle ; les traductions en anglais et en espagnol sont fournies à titre de courtoisie.',
        ] },
      ],
    },
  ],
};
