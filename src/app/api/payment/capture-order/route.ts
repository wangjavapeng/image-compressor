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
  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('Failed to get PayPal access token');
  return data.access_token;
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth instanceof NextResponse) return auth;
  const { payload, env } = auth as unknown as { payload: { userId: number }; env: Env };

  const clientId = env.PAYPAL_CLIENT_ID;
  const clientSecret = env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: 'Payment system not configured' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });
    }

    const accessToken = await getPayPalAccessToken(clientId, clientSecret);

    // Capture the PayPal order
    const res = await fetch(
      `${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const capture = await res.json();

    if (capture.status !== 'COMPLETED') {
      console.error('PayPal capture failed:', capture);
      return NextResponse.json(
        { error: 'Payment capture failed', details: capture },
        { status: 400 }
      );
    }

    // Verify the payment belongs to this user
    const payment = await env.DB.prepare(
      'SELECT * FROM payments WHERE paypal_order_id = ? AND user_id = ? AND status = ?'
    )
      .bind(orderId, payload.userId, 'pending')
      .first();

    if (!payment) {
      console.error('Payment record not found or already processed:', orderId);
      return NextResponse.json(
        { error: 'Payment record not found' },
        { status: 404 }
      );
    }

    // Update payment status
    await env.DB.prepare(
      "UPDATE payments SET status = 'completed' WHERE paypal_order_id = ?"
    )
      .bind(orderId)
      .run();

    // Set user to unlimited
    await env.DB.prepare(
      'UPDATE user_points SET is_unlimited = 1, updated_at = datetime(\'now\') WHERE user_id = ?'
    )
      .bind(payload.userId)
      .run();

    // Record transaction
    await env.DB.prepare(
      'INSERT INTO point_transactions (user_id, type, amount, balance_after, description) VALUES (?, ?, ?, ?, ?)'
    )
      .bind(payload.userId, 'purchase', 0, 0, '购买无限套餐 $1.00')
      .run();

    return NextResponse.json({
      success: true,
      message: 'Payment successful! Unlimited access activated.',
      orderId: capture.id,
    });
  } catch (err) {
    console.error('PayPal capture error:', err);
    return NextResponse.json(
      { error: 'Failed to capture payment' },
      { status: 500 }
    );
  }
}
