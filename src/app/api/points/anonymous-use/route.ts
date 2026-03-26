import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

const FREE_LIMIT = 3;

interface Env {
  DB: D1Database;
}

export async function POST(request: NextRequest) {
  const { env } = getCloudflareContext() as unknown as { env: Env };

  try {
    const body = await request.json();
    const deviceId = body.deviceId;
    const count = Math.max(1, Math.min(body.count || 1, 50));

    if (!deviceId || typeof deviceId !== 'string' || deviceId.length < 8) {
      return NextResponse.json(
        { success: false, message: 'invalid_device_id' },
        { status: 400 }
      );
    }

    // Get or create anonymous usage record
    const record = await env.DB.prepare(
      'SELECT usage_count FROM anonymous_usage WHERE device_id = ?'
    )
      .bind(deviceId)
      .first<{ usage_count: number }>();

    const currentCount = record?.usage_count || 0;

    if (currentCount >= FREE_LIMIT) {
      return NextResponse.json({
        success: false,
        message: 'free_limit',
        remaining: 0,
        totalUsed: currentCount,
      });
    }

    const canUse = Math.min(count, FREE_LIMIT - currentCount);

    if (record) {
      await env.DB.prepare(
        'UPDATE anonymous_usage SET usage_count = ?, updated_at = datetime(\'now\') WHERE device_id = ?'
      )
        .bind(currentCount + canUse, deviceId)
        .run();
    } else {
      await env.DB.prepare(
        'INSERT INTO anonymous_usage (device_id, usage_count) VALUES (?, ?)'
      )
        .bind(deviceId, canUse)
        .run();
    }

    return NextResponse.json({
      success: true,
      used: canUse,
      totalUsed: currentCount + canUse,
      remaining: FREE_LIMIT - (currentCount + canUse),
    });
  } catch (err) {
    console.error('Anonymous use error:', err);
    return NextResponse.json(
      { success: false, message: 'server_error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { env } = getCloudflareContext() as unknown as { env: Env };
  const deviceId = request.nextUrl.searchParams.get('deviceId');

  if (!deviceId) {
    return NextResponse.json(
      { success: false, message: 'invalid_device_id' },
      { status: 400 }
    );
  }

  try {
    const record = await env.DB.prepare(
      'SELECT usage_count FROM anonymous_usage WHERE device_id = ?'
    )
      .bind(deviceId)
      .first<{ usage_count: number }>();

    const totalUsed = record?.usage_count || 0;
    const remaining = Math.max(0, FREE_LIMIT - totalUsed);

    return NextResponse.json({
      success: true,
      totalUsed,
      remaining,
    });
  } catch (err) {
    console.error('Anonymous check error:', err);
    return NextResponse.json(
      { success: false, message: 'server_error' },
      { status: 500 }
    );
  }
}
