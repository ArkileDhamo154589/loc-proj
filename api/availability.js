import { handleAvailability } from '../lib/handler.js';

// Vercel serverless function: GET /api/availability?pickup=YYYY-MM-DD&dropoff=YYYY-MM-DD
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }
  const { status, body } = await handleAvailability(req.query || {});
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).json(body);
}
