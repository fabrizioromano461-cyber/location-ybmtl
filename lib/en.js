// Version ANGLAISE du site (pages sous /en) : formats, descriptions des vehicules et FAQ.
// Le site reste en francais par defaut ; ces textes sont des traductions fideles des textes francais
// deja publies (rien de nouveau n'est promis en anglais). Les vehicules ajoutes plus tard sans entree
// ici gardent simplement leur description francaise.

// 375 -> "$375" ; 1500 -> "$1,500"
function money(n) {
  if (n == null) return '';
  return '$' + Number(n).toLocaleString('en-CA');
}

// "2026-11-15" -> "November 15, 2026"
function date(iso) {
  if (!iso) return '';
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' });
}

const TRANSMISSIONS = { Automatique: 'Automatic', Manuelle: 'Manual' };
function trans(t) {
  return TRANSMISSIONS[t] || t || '';
}

function mileage(m) {
  const s = String(m || '');
  if (/illimit/i.test(s)) return 'Unlimited mileage';
  if (/limit/i.test(s)) return 'Limited mileage';
  return s;
}

const DESCRIPTIONS = {
  'Audi S5 Coupé 2012':
    'A sporty coupé that combines performance, comfort and elegance. Its powerful engine, refined interior and dynamic handling make it an excellent choice for everyday driving or special occasions.',
  'Infiniti QX70 2014':
    'The 2014 Infiniti QX70 combines luxury, performance and comfort in an SUV with a sporty, elegant design. Equipped with a sunroof, a premium leather interior, heated seats and a large cargo area, it offers a refined driving experience in the city and on the highway. Its powerful engine and sharp handling make it as enjoyable to drive as it is to look at.',
  'Cadillac Escalade XT 2008':
    'A spacious, powerful luxury pickup, perfect for road trips, light moving jobs or group travel. Combining premium comfort with generous cargo capacity, it offers a driving experience like no other.',
  'BMW 328i 2013':
    'An elegant sedan offering a perfect balance of comfort, performance and fuel economy. Ideal for daily commutes as well as long trips thanks to its enjoyable drive and refined interior.',
  'Kia Sorento 2016':
    'A spacious, versatile SUV offering comfort, safety and plenty of room for passengers and luggage. Ideal for families, road trips and daily driving.',
  'Mazda 6 2016':
    'An elegant, fuel-efficient sedan with a smooth, comfortable ride. Its modern design and roomy interior make it an excellent choice for daily driving or long trips.',
  'Acura MDX 2012':
    'A spacious, versatile luxury SUV offering comfort, safety and performance. Ideal for families, road trips and daily driving thanks to its generous interior and enjoyable drive.',
  'Honda Pilot 2007':
    'A spacious, reliable SUV that carries the whole family in comfort. Ideal for road trips, group outings and daily driving thanks to its large interior and comfortable ride.',
  'Honda Insight 2010':
    'A hybrid sedan with excellent fuel economy and a comfortable ride. An ideal choice for daily driving while cutting down on gas costs.',
  'Volkswagen Jetta 2013':
    'A reliable, economical sedan with a comfortable ride and excellent fuel economy. Perfect for daily driving, studies or road trips.',
  'Nissan Altima 2010':
    'A reliable, comfortable and economical sedan. An excellent choice for the city as well as for long distances.',
  'Ford Focus 2013':
    'A compact, economical car that is easy to drive. Ideal for daily driving thanks to its low fuel consumption and comfortable interior.',
  'Hyundai Santa Fe 2011':
    'A spacious, versatile SUV offering comfort, reliability and plenty of room for passengers and luggage. Perfect for daily driving, road trips and family outings.',
  'Chevrolet Orlando 2012':
    'A versatile vehicle with plenty of space for passengers and luggage. Comfortable and practical, it is ideal for families, groups or long-distance trips. Seats 7, ideal for large families or groups.',
  'Nissan Rogue 2012':
    'Spacious, comfortable and practical, the Nissan Rogue offers an enjoyable drive and good interior space. An excellent choice for daily driving, road trips and weekend getaways.',
  'Acura RDX 2011':
    'Sporty, comfortable and versatile, the Acura RDX offers an enjoyable drive and a roomy interior. An excellent choice for daily driving, road trips and weekend getaways.',
  'Volkswagen GTI 2018':
    'An iconic sporty compact, the Volkswagen GTI embodies the joy of driving. Its lively turbo engine, precise handling and well-finished interior deliver an experience that is both dynamic and refined. An excellent choice for driving in style every day and on the open road.',
  'BMW X1 2016':
    'Compact and refined, the BMW X1 combines German elegance with the versatility of an SUV. Its dynamic drive, well-finished interior and practical size make it an excellent choice for the city and for weekend getaways.',
  'Cadillac ATS-V 2016':
    'A luxury sport sedan with a bold character. The Cadillac ATS-V stands out with its dynamic driving, elegant silhouette and fine leather interior with sunroof. A vehicle that combines presence and driving pleasure, in the city as well as on the road.',
  'Jeep Wrangler Unlimited 2015':
    'A true off-road icon, the Jeep Wrangler Unlimited combines toughness and freedom with its removable soft top. A spacious 4-door layout, an adventurous look and an automatic transmission make it a versatile ride, in the city and on the road.',
  'BMW 750 2019':
    "A luxury sedan in matte black, the 2019 BMW 750 impresses with its light leather interior, panoramic sunroof and sport wheels. Elegance, comfort and power: a car that doesn't go unnoticed. Coming soon for rent at Location YBMTL: contact us to be notified as soon as it arrives.",
  'Acura RDX 2015':
    'A compact luxury SUV, the Acura RDX combines comfort, safety and an enjoyable drive. Its all-wheel drive is reassuring in every season, and its fine leather interior makes every trip more comfortable. An excellent choice for everyday driving, road trips and weekend getaways.',
};

// Description anglaise d'un vehicule (repli : la description francaise de la base).
function desc(v) {
  return DESCRIPTIONS[`${v.make} ${v.model} ${v.year}`] || v.description || '';
}

// Questions frequentes (page /en/faq) : memes reponses que /faq.
function faq(company) {
  const tel = String(company.phone || '').replace(/[^0-9+]/g, '');
  return [
    {
      q: 'How do I book a car?',
      r: `<p>Choose a vehicle in the <a href="/en#vehicles">inventory</a>, select your dates on its page, then fill in the request (name, phone, email). We contact you quickly by phone or email to confirm availability and the pick-up details.</p><p>No online payment is required. See also <a href="/en/how-it-works">How it works</a>.</p>`,
    },
    {
      q: 'What is the minimum rental period?',
      r: `<p>The minimum is <strong>1 week</strong>. Our rates are weekly, and rentals can also be made by the month or longer, depending on your needs.</p>`,
    },
    {
      q: 'Who can rent? What age and licence are required?',
      r: `<p>The main driver must be <strong>at least 25 years old</strong> and hold a <strong>driver's licence that has been valid for at least 3 years</strong>.</p>`,
    },
    {
      q: 'How do I pay? Do I need a credit card?',
      r: `<p>No, a credit card is not required and there is no credit check. Payment is made directly to Location YBMTL, never online: Interac or bank transfer, cash, cheque, debit card or credit card.</p><p>The rental and the security deposit are paid when you pick up the vehicle.</p>`,
    },
    {
      q: 'Do the displayed prices include taxes?',
      r: `<p>No, the prices shown are <strong>before taxes</strong>. Starting October 1, 2026, GST (5%) and QST (9.975%) are added to the rental price, excluding the security deposit. The estimated total with taxes is shown in the booking form.</p>`,
    },
    {
      q: 'Is there a security deposit?',
      r: `<p>A security deposit is requested when you pick up the vehicle; the amount is shown on each vehicle's page. It is returned at the end of the rental, subject to the contract. The deposit is not taxed.</p>`,
    },
    {
      q: 'Is insurance included?',
      r: `<p>Every rental includes basic insurance (third-party liability). To find out exactly what is covered and what remains your responsibility, see our <a href="/docs/Insurance-Guide-YBMTL-EN.pdf" target="_blank" rel="noopener">&ldquo;who pays what&rdquo; guide</a> (PDF), or ask us before booking.</p>`,
    },
    {
      q: 'Is the mileage unlimited?',
      r: `<p>Yes, our vehicles come with <strong>unlimited mileage</strong>. It is shown on each vehicle page and confirmed when we confirm your booking.</p>`,
    },
    {
      q: 'Where and how do I pick up the car?',
      r: `<p>The vehicle is handed over in <strong>Laval</strong>. We give you the exact meeting point 48 hours before the start of the rental, with a confirmation call.</p><p>A condition report is completed before and after the rental, to protect everyone.</p>`,
    },
    {
      q: 'Can I read the contract before booking?',
      r: `<p>Yes. The rental agreement is available as a PDF on the <a href="/en/terms">Terms &amp; Contract</a> page: in French (official version), English and Spanish (courtesy translations). The insurance guide is offered there in French and English.</p>`,
    },
    {
      q: 'How can I reach you?',
      r: `<p>By phone at <a href="tel:${tel}">${company.phone}</a>, by text message to the same number, or by email at <a href="mailto:${company.email}">${company.email}</a>.</p>`,
    },
  ];
}

module.exports = { money, date, trans, mileage, desc, faq };
