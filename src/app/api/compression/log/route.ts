import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth instanceof NextResponse) return auth;
  const { payload, env } = auth;

  try {
    const body = await request.json();
    const { fileCount, totalOriginalSize, totalCompressedSize, pointsCost } = body;

    await env.DB.prepare(
      'INSERT INTO compression_logs (user_id, file_count, total_original_size, total_compressed_size, points_cost) VALUES (?, ?, ?, ?, ?)'
    )
      .bind(
        payload.userId,
        fileCount || 1,
        totalOriginalSize || 0,
        totalCompressedSize || 0,
        pointsCost || 0
      )
      .run();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Compression log error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
