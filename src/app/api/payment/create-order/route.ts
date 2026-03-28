import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';

// PayPal API 地址：正式环境 https://api-m.paypal.com，沙盒 https://api-m.sandbox.paypal.com
const PAYPAL_API_BASE = process.env.PAYPAL_MODE === 'live' 
  ? 'https://api-m.paypal.com' 
  : 'https://api-m.sandbox.paypal.com';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  PAYPAL_CLIENT_ID: string;
  PAYPAL_CLIENT_SECRET: string;
}

async function getPayPalAccessToken(clientId: string, clientSecret: string): Promise<string> {
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  console.log('[PayPal Debug] Requesting access token...');
  console.log('[PayPal Debug] Client ID:', clientId?.substring(0, 10) + '...');
  console.log('[PayPal Debug] Client Secret:', clientSecret ? 'SET' : 'NOT SET');
  
  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const data = await res.json();
  console.log('[PayPal Debug] Token response status:', res.status);
  console.log('[PayPal Debug] Token response:', JSON.stringify(data));
  
  if (!data.access_token) {
    console.error('[PayPal Debug] Failed to get access token. Error:', data.error_description || data.error);
    throw new Error('Failed to get PayPal access token: ' + (data.error_description || JSON.stringify(data)));
  }
  return data.access_token;
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth instanceof NextResponse) return auth;
  const { payload, env } = auth as unknown as { payload: { userId: number }; env: Env };

  const clientId = env.PAYPAL_CLIENT_ID;
  const clientSecret = env.PAYPAL_CLIENT_SECRET;
  
  console.log('[PayPal Debug] Env PAYPAL_CLIENT_ID:', clientId ? 'SET (length:' + clientId?.length + ')' : 'NOT set');
  console.log('[PayPal Debug] Env PAYPAL_CLIENT_SECRET:', clientSecret ? 'SET (length:' + clientSecret?.length + ')' : 'Not set');
  
  if (!clientId || !clientSecret) {
    console.error('[PayPal Debug] Payment system not configured - missing credentials');
    return NextResponse.json(
      { error: 'Payment system not configured', debug: { hasClientId: !!clientId, hasClientSecret: !!clientSecret } },
      { status: 503 }
    );
  }

  // Check if already unlimited
  const existing = await env.DB.prepare(
    'SELECT is_unlimited FROM user_points WHERE user_id = ?'
  )
    .bind(payload.userId)
    .first<{ is_unlimited: number }>();

  if (existing?.is_unlimited) {
    return NextResponse.json({
      error: 'already_unlimited',
      message: 'You already have unlimited access',
    }, { status: 400 });
  }

  try {
    const accessToken = await getPayPalAccessToken(clientId, clientSecret);

    const res = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: 'USD',
            value: '1.00',
          },
          description: 'Image Compressor - Unlimited Access',
        }],
        application_context: {
          brand_name: 'Image Compressor',
          user_action: 'PAY_NOW',
          return_url: `${new URL(request.url).origin}/pricing?success=true`,
          cancel_url: `${new URL(request.url).origin}/pricing?canceled=true`,
        },
      }),
    });

    const order = await res.json();

    if (!order.id || !order.links) {
      console.error('PayPal create order failed:', order);
      return NextResponse.json(
        { error: 'Failed to create PayPal order' },
        { status: 500 }
      );
    }

    // Save pending payment record
    await env.DB.prepare(
      'INSERT INTO payments (user_id, paypal_order_id, amount, currency, status) VALUES (?, ?, ?, ?, ?)'
    )
      .bind(payload.userId, order.id, 1.00, 'USD', 'pending')
      .run();

    const approveLink = order.links.find((l: { rel: string }) => l.rel === 'approve');

    return NextResponse.json({
      orderId: order.id,
      approveUrl: approveLink?.href || '',
    });
  } catch (err) {
    console.error('PayPal create order error:', err);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
}
