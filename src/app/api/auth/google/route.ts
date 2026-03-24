import { NextRequest, NextResponse } from 'next/server';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'GOOGLE_CLIENT_ID not configured' }, { status: 500 });
  }

  const origin = request.headers.get('origin') || new URL(request.url).origin;
  const redirectUri = `${origin}/api/auth/callback`;

  // Generate random state for CSRF protection
  const state = crypto.randomUUID().slice(0, 32);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'offline',
    prompt: 'select_account',
  });

  const redirectUrl = `${GOOGLE_AUTH_URL}?${params.toString()}`;

  const response = NextResponse.redirect(redirectUrl);
  // Set state cookie for CSRF validation (httpOnly, secure, sameSite)
  response.cookies.set('oauth_state', state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/api/auth/callback',
    maxAge: 600, // 10 minutes
  });

  return response;
}
