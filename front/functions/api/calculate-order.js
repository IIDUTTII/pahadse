// functions/api/calculate-order.js
import { calculateOrder } from '../lib/orderCalculator.js';

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') return handleCORS();
  if (request.method !== 'POST') return errorResponse('Method Not Allowed', 405);

  try {
    const body = await request.json();
    const { items, couponCode } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return errorResponse('Items array required', 400);
    }

    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return errorResponse('Unauthorized', 401);
    }
    const idToken = authHeader.split(' ')[1];

    const user = await verifyFirebaseToken(idToken, env);
    if (!user) return errorResponse('Invalid token', 401);

    const result = await calculateOrder(items, user.localId, idToken, env, couponCode);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  } catch (err) {
    return errorResponse(err.message, 400);
  }
}

function handleCORS() {
  return new Response(null, { headers: corsHeaders() });
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };
}

function errorResponse(msg, status) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}

async function verifyFirebaseToken(idToken, env) {
  const apiKey = env?.FIREBASE_API_KEY || 'AIzaSyABec4VYQBnHpyzP1IX4TmW8muY3_VQHDM';
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken })
  });
  if (!res.ok) {
    const errorText = await res.text();
    console.error('❌ verifyFirebaseToken failed:', res.status, errorText);
    return null;
  }
  const data = await res.json();
  return data.users?.[0] || null;
}