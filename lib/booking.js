import { randomBytes } from 'node:crypto';
import { MAX_DAYS, findCar } from './fleet.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const PLACES = ['airport', 'port', 'hotel', 'office'];

// Today's date on Kos, so a late-evening request from another timezone is judged correctly.
export function todayOnKos(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Athens' }).format(now);
}

export function daysBetween(from, to) {
  const [y1, m1, d1] = from.split('-').map(Number);
  const [y2, m2, d2] = to.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}

function line(value, max) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

/** Validates a pick-up/return pair for availability lookups. Returns an error code or null. */
export function checkDates(pickup, dropoff, today = todayOnKos()) {
  if (!DATE_RE.test(pickup || '') || !DATE_RE.test(dropoff || '')) return 'required';
  if (pickup < today) return 'past';
  const days = daysBetween(pickup, dropoff);
  if (days < 1) return 'beforePickup';
  if (days > MAX_DAYS) return 'tooLong';
  return null;
}

/**
 * Validates a booking request. Returns { errors } with per-field error codes,
 * or { data } with the normalised request and its price.
 */
export function validateRequest(input, today = todayOnKos()) {
  const errors = {};
  const data = {
    name: line(input.name, 120),
    email: line(input.email, 160).toLowerCase(),
    phone: line(input.phone, 40),
    pickup: line(input.pickup, 10),
    dropoff: line(input.dropoff, 10),
    category: line(input.category, 20),
    place: PLACES.includes(input.place) ? input.place : 'airport',
    note: String(input.note ?? '').trim().slice(0, 600),
    lang: input.lang === 'en' ? 'en' : 'el',
  };

  if (data.name.length < 2) errors.name = 'required';
  if (!EMAIL_RE.test(data.email)) errors.email = data.email ? 'invalid' : 'required';
  if (data.phone && !/^[+()\d\s.-]{6,40}$/.test(data.phone)) errors.phone = 'invalid';

  if (!DATE_RE.test(data.pickup)) errors.pickup = 'required';
  else if (data.pickup < today) errors.pickup = 'past';

  if (!DATE_RE.test(data.dropoff)) errors.dropoff = 'required';
  else if (!errors.pickup) {
    const days = daysBetween(data.pickup, data.dropoff);
    if (days < 1) errors.dropoff = 'beforePickup';
    else if (days > MAX_DAYS) errors.dropoff = 'tooLong';
  }

  const car = findCar(data.category);
  if (!car) errors.category = 'required';

  if (Object.keys(errors).length) return { errors };

  data.days = daysBetween(data.pickup, data.dropoff);
  data.pricePerDay = car.price;
  data.total = car.price * data.days;
  return { data };
}

export function makeRef() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return 'MR-' + Array.from(randomBytes(5), (b) => alphabet[b % alphabet.length]).join('');
}
