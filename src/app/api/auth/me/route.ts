import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { verify } from '@/lib/jwt';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

interface UserInfo {
  id: number;
  google_id: string;
  email: string;
  name: string;
  avatar_url: string;
}

export async function GET(request: NextRequest) {
  const { env } = getCloudflareContext() as unknown as { env: Env };
  const sessionToken = request.cookies.get('session')?.value;

  if (!sessionToken || !env.JWT_SECRET) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const payload = await verify(sessionToken, env.JWT_SECRET);
  if (!payload) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  try {
    const user = await env.DB.prepare(
      'SELECT id, google_id, email, name, avatar_url FROM users WHERE id = ?'
    )
      .bind(payload.userId)
      .first<UserInfo>();

    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        googleId: user.google_id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatar_url,
      },
    });
  } catch (err) {
    console.error('Failed to fetch user:', err);
    return NextResponse.json({ user: null }, { status: 500 });
  }
}
