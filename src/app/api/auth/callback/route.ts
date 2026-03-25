import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { sign } from '@/lib/jwt';

interface Env {
  DB: D1Database;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  JWT_SECRET: string;
}

interface GoogleTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  id_token?: string;
}

interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture: string;
  verified_email: boolean;
}

export async function GET(request: NextRequest) {
  const { env } = getCloudflareContext() as unknown as { env: Env };
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    console.error('OAuth error:', error);
    return NextResponse.redirect(new URL('/?auth_error=' + error, request.url));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL('/?auth_error=missing_params', request.url));
  }

  // Verify state cookie (CSRF protection)
  const savedState = request.cookies.get('oauth_state')?.value;
  if (!savedState || savedState !== state) {
    return NextResponse.redirect(new URL('/?auth_error=invalid_state', request.url));
  }

  const origin = request.headers.get('origin') || new URL(request.url).origin;
  const redirectUri = `${origin}/api/auth/callback`;

  try {
    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.error('Token exchange failed:', errText);
      return NextResponse.redirect(new URL('/?auth_error=token_exchange_failed', request.url));
    }

    const tokenData: GoogleTokenResponse = await tokenResponse.json();

    // Fetch user info
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userResponse.ok) {
      console.error('User info fetch failed:', await userResponse.text());
      return NextResponse.redirect(new URL('/?auth_error=user_info_failed', request.url));
    }

    const userInfo: GoogleUserInfo = await userResponse.json();

    // Upsert user in D1
    const existing = await env.DB.prepare('SELECT id FROM users WHERE google_id = ?')
      .bind(userInfo.id)
      .first<{ id: number }>();

    let userId: number;
    let isNewUser = false;
    if (existing) {
      userId = existing.id;
      await env.DB.prepare(
        'UPDATE users SET email = ?, name = ?, avatar_url = ? WHERE id = ?'
      )
        .bind(userInfo.email, userInfo.name, userInfo.picture, userId)
        .run();
    } else {
      const result = await env.DB.prepare(
        'INSERT INTO users (google_id, email, name, avatar_url) VALUES (?, ?, ?, ?)'
      )
        .bind(userInfo.id, userInfo.email, userInfo.name, userInfo.picture)
        .run();
      userId = result.meta.last_row_id as number;
      isNewUser = true;
    }

    // New user: grant welcome bonus points
    if (isNewUser) {
      const WELCOME_POINTS = 30;
      await env.DB.prepare(
        'INSERT INTO user_points (user_id, balance, total_earned) VALUES (?, ?, ?)'
      )
        .bind(userId, WELCOME_POINTS, WELCOME_POINTS)
        .run();
      await env.DB.prepare(
        'INSERT INTO point_transactions (user_id, type, amount, balance_after, description) VALUES (?, ?, ?, ?, ?)'
      )
        .bind(userId, 'register', WELCOME_POINTS, WELCOME_POINTS, '新用户注册奖励')
        .run();
    }

    // Generate JWT
    const jwtSecret = env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET not configured');
      return NextResponse.redirect(new URL('/?auth_error=config_error', request.url));
    }

    const token = await sign(
      {
        userId,
        googleId: userInfo.id,
        email: userInfo.email,
        name: userInfo.name,
        avatarUrl: userInfo.picture,
      },
      jwtSecret
    );

    // Redirect to home with session cookie
    const response = NextResponse.redirect(new URL('/', request.url));
    response.cookies.set('session', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });
    // Clear oauth_state cookie
    response.cookies.delete('oauth_state');

    return response;
  } catch (err) {
    console.error('OAuth callback error:', err);
    return NextResponse.redirect(new URL('/?auth_error=internal_error', request.url));
  }
}
