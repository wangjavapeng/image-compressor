import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { verify, JwtPayload } from '@/lib/jwt';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

export async function authenticateRequest(
  request: NextRequest
): Promise<{ payload: JwtPayload; env: Env } | NextResponse> {
  const { env } = getCloudflareContext() as unknown as { env: Env };
  const sessionToken = request.cookies.get('session')?.value;

  if (!sessionToken || !env.JWT_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = await verify(sessionToken, env.JWT_SECRET);
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return { payload, env };
}
