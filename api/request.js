import { handleBookingRequest } from '../lib/handler.js';

// Vercel serverless function: POST /api/request
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = null;
    }
  }
  const { status, body: json } = await handleBookingRequest(body);
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).json(json);
}
