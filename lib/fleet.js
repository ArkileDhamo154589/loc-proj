// Single source of truth for prices: used by the page build, the calculator and the API.

export const FLEET = [
  { id: 'mini', price: 35, count: 4, seats: 4, bags: 1, gearbox: 'manual' },
  { id: 'auto', price: 44, count: 4, seats: 5, bags: 2, gearbox: 'auto' },
  { id: 'cabrio', price: 52, count: 2, seats: 2, bags: 1, gearbox: 'manual' },
  { id: 'suv', price: 58, count: 2, seats: 5, bags: 3, gearbox: 'manual' },
];

// What a typical "from 8€/day" small-car offer costs once you add what Meltemi includes.
// Indicative island-wide figures, not any specific company.
export const TYPICAL = {
  base: 8,
  perDay: [
    { id: 'insurance', amount: 15 },
    { id: 'zeroExcess', amount: 10 },
    { id: 'driver', amount: 7 },
  ],
  oneOff: [
    { id: 'airport', amount: 25 },
    { id: 'fuel', amount: 25 },
  ],
  deposit: 1200,
};

export const CONTACT = {
  phone: '+302242055012',
  phoneLabel: '+30 22420 55012',
  whatsapp: '306970055012',
  whatsappLabel: '+30 697 005 5012',
  email: 'hello@meltemi-rentals.gr',
  mapsUrl: 'https://maps.google.com/?q=Kos+Town+Greece',
};

export const MAX_DAYS = 60;

export function findCar(id) {
  return FLEET.find((c) => c.id === id) || null;
}

export function typicalTotal(days) {
  const perDay = TYPICAL.base + TYPICAL.perDay.reduce((s, l) => s + l.amount, 0);
  return perDay * days + TYPICAL.oneOff.reduce((s, l) => s + l.amount, 0);
}

export function money(n, lang) {
  const num = Math.round(n).toLocaleString(lang === 'el' ? 'el-GR' : 'en-GB');
  return lang === 'el' ? `${num}€` : `€${num}`;
}
