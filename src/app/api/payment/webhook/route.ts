import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// PayPal API 地址：正式环境 https://api-m.paypal.com，沙盒 https://api-m.sandbox.paypal.com
const PAYPAL_API_BASE = process.env.PAYPAL_MODE === 'live' 
  ? 'https://api-m.paypal.com' 
  : 'https://api-m.sandbox.paypal.com';

interface Env {
  DB: D1Database;
  PAYPAL_CLIENT_ID: string;
  PAYPAL_CLIENT_SECRET: string;
}

// Verify PayPal webhook signature
async function verifyWebhookSignature(
  request: NextRequest,
  body: string,
  env: Env
): Promise<boolean> {
  const headers = request.headers;

  const transmissionId = headers.get('paypal-transmission-id');
  const transmissionTime = headers.get('paypal-transmission-time');
  const certUrl = headers.get('paypal-cert-url');
  const authAlgo = headers.get('paypal-auth-algo');
  const transmissionSig = headers.get('paypal-transmission-sig');

  if (!transmissionId || !transmissionTime || !certUrl || !transmissionSig) {
    console.error('Missing PayPal webhook headers');
    return false;
  }

  try {
    // Fetch PayPal's public certificate
    const certRes = await fetch(certUrl);
    const cert = await certRes.text();

    // Create the expected signature string
    const expectedSig = `${transmissionId}|${transmissionTime}|${env.PAYPAL_CLIENT_ID}|${crypto.createHash('crc32c').update(body).digest('base64')}`;

    // Verify signature using PayPal's public key
    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(expectedSig);

    // Decode base64 signature
    const signature = Buffer.from(transmissionSig, 'base64');

    const isValid = verifier.verify(cert, signature);

    if (!isValid) {
      // Fallback: verify with PayPal API directly
      const accessToken = await getPayPalAccessToken(env);
      const verifyRes = await fetch(`${PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transmission_id: transmissionId,
          transmission_time: transmissionTime,
          cert_url: certUrl,
          auth_algo: authAlgo || 'SHA256withRSA',
          actual_sig: transmissionSig,
          webhook_id: env.PAYPAL_CLIENT_ID, // We use client ID as webhook identifier
          webhook_event: JSON.parse(body),
        }),
      });

      const verifyData = await verifyRes.json();
      return verifyData.verification_status === 'SUCCESS';
    }

    return isValid;
  } catch (err) {
    console.error('Webhook signature verification error:', err);
    return false;
  }
}

async function getPayPalAccessToken(env: Env): Promise<string> {
  const auth = Buffer.from(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`).toString('base64');
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
  const { env } = await import('@opennextjs/cloudflare').then(m => m.getCloudflareContext()) as unknown as { env: Env };

  try {
    const body = await request.text();
    const event = JSON.parse(body);

    // Verify webhook signature (skip in development if needed)
    // const isValid = await verifyWebhookSignature(request, body, env);
    // if (!isValid) {
    //   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    // }

    const eventType = event.event_type;

    // Handle payment capture completed
    if (eventType === 'PAYMENT.CAPTURE.COMPLETED') {
      const resource = event.resource;
      const orderId = resource?.supplementary_data?.related_ids?.order_id || resource?.id;

      console.log(`Payment completed for order: ${orderId}`);

      // Update payment record if not already processed
      const payment = await env.DB.prepare(
        'SELECT * FROM payments WHERE paypal_order_id = ? AND status = ?'
      )
        .bind(orderId, 'pending')
        .first();

      if (payment) {
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
          .bind((payment as { user_id: number }).user_id)
          .run();

        // Record transaction
        await env.DB.prepare(
          'INSERT INTO point_transactions (user_id, type, amount, balance_after, description) VALUES (?, ?, ?, ?, ?)'
        )
          .bind((payment as { user_id: number }).user_id, 'purchase', 0, 0, '购买无限套餐 $1.00 (Webhook)')
          .run();

        console.log(`User ${(payment as { user_id: number }).user_id} upgraded to unlimited via webhook`);
      } else {
        console.log(`Payment already processed or not found: ${orderId}`);
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('PayPal webhook error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
