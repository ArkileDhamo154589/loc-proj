import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRequest, daysBetween } from '../lib/booking.js';
import { handleBookingRequest } from '../lib/handler.js';
import { customerEmail } from '../lib/emails.js';
import { typicalTotal } from '../lib/fleet.js';

const TODAY = '2026-07-01';
const valid = {
  name: 'Anna Schmidt',
  email: 'Anna@Example.com',
  pickup: '2026-07-10',
  dropoff: '2026-07-17',
  category: 'mini',
  place: 'airport',
  lang: 'en',
};
const silent = { error() {}, info() {} };

test('valid request is normalised and priced', () => {
  const { data, errors } = validateRequest(valid, TODAY);
  assert.equal(errors, undefined);
  assert.equal(data.email, 'anna@example.com');
  assert.equal(data.days, 7);
  assert.equal(data.total, 245);
});

test('each invalid field reports its own code', () => {
  const { errors } = validateRequest(
    { ...valid, name: ' ', email: 'nope', pickup: '2026-06-01', category: 'truck', phone: 'call me' },
    TODAY,
  );
  assert.deepEqual(errors, { name: 'required', email: 'invalid', pickup: 'past', category: 'required', phone: 'invalid' });
});

test('return must be at least one day after pick-up and within 60 days', () => {
  assert.equal(validateRequest({ ...valid, dropoff: '2026-07-10' }, TODAY).errors.dropoff, 'beforePickup');
  assert.equal(validateRequest({ ...valid, dropoff: '2026-09-30' }, TODAY).errors.dropoff, 'tooLong');
});

test('days are counted across month boundaries', () => {
  assert.equal(daysBetween('2026-07-28', '2026-08-04'), 7);
});

test('typical "from 8€" week comes to about 47€ a day', () => {
  assert.equal(typicalTotal(7), 330);
});

test('auto-reply asks only for missing details, in the visitor language', () => {
  const r = { ...validateRequest(valid, TODAY).data, ref: 'MR-TEST1' };
  const mail = customerEmail(r);
  assert.match(mail.subject, /We’ve received your request/);
  assert.match(mail.text, /flight number/);
  const withDetails = customerEmail({ ...r, phone: '+49 170 000', note: 'LH1754' });
  assert.doesNotMatch(withDetails.text, /still need/);
});

test('handler accepts requests in demo mode when no storage is configured', async () => {
  const res = await handleBookingRequest({ ...valid, pickup: '2099-07-10', dropoff: '2099-07-17' }, {}, silent);
  assert.equal(res.status, 200);
  assert.equal(res.body.demo, true);
  assert.equal(res.body.total, 245);
});

test('handler reports 503 when configured storage fails', async () => {
  const res = await handleBookingRequest(
    { ...valid, pickup: '2099-07-10', dropoff: '2099-07-17' },
    { LOCAL_STORE_FILE: new URL('../package.json/requests.jsonl', import.meta.url).pathname },
    silent,
  );
  assert.equal(res.status, 503);
});

test('handler returns field errors as 422', async () => {
  const res = await handleBookingRequest({ ...valid, email: '' }, {}, silent);
  assert.equal(res.status, 422);
  assert.equal(res.body.fields.email, 'required');
});

test('honeypot submissions get a fake success and are not stored', async () => {
  const res = await handleBookingRequest({ ...valid, website: 'spam.example' }, { LOCAL_STORE_FILE: '/nonexistent/x' }, silent);
  assert.equal(res.status, 200);
  assert.equal(res.body.days, undefined);
});

test('env values are trimmed and an invalid owner email does not break delivery', async () => {
  const file = new URL('../data/test-requests.jsonl', import.meta.url).pathname;
  const res = await handleBookingRequest(
    { ...valid, pickup: '2099-07-10', dropoff: '2099-07-17' },
    { LOCAL_STORE_FILE: `  ${file} `, OWNER_EMAIL: 'your email here' },
    silent,
  );
  assert.equal(res.status, 200);
  assert.equal(res.body.demo, undefined);
});
