import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  PAYPAL_CLIENT_ID: string;
  PAYPAL_CLIENT_SECRET: string;
}

export async function GET() {
  try {
    const { env } = getCloudflareContext() as unknown as { env: Env };
    
    return NextResponse.json({
      hasDB: !!env.DB,
      hasJwtSecret: !!env.JWT_SECRET,
      jwtSecretLength: env.JWT_SECRET?.length || 0,
      hasGoogleClientId: !!env.GOOGLE_CLIENT_ID,
      googleClientIdPrefix: env.GOOGLE_CLIENT_ID?.substring(0, 10) || 'NOT SET',
      hasGoogleClientSecret: !!env.GOOGLE_CLIENT_SECRET,
      hasPayPalClientId: !!env.PAYPAL_CLIENT_ID,
      paypalClientIdPrefix: env.PAYPAL_CLIENT_ID?.substring(0, 10) || 'NOT SET',
      hasPayPalClientSecret: !!env.PAYPAL_CLIENT_SECRET,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
