import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth instanceof NextResponse) return auth;
  const { payload, env } = auth;

  try {
    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const pageSize = Math.min(50, Math.max(1, parseInt(url.searchParams.get('pageSize') || '20')));
    const offset = (page - 1) * pageSize;

    const totalResult = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM point_transactions WHERE user_id = ?'
    )
      .bind(payload.userId)
      .first<{ count: number }>();

    const total = totalResult?.count || 0;

    const { results } = await env.DB.prepare(
      'SELECT id, type, amount, balance_after, description, created_at FROM point_transactions WHERE user_id = ? ORDER BY id DESC LIMIT ? OFFSET ?'
    )
      .bind(payload.userId, pageSize, offset)
      .all<{
        id: number;
        type: string;
        amount: number;
        balance_after: number;
        description: string;
        created_at: string;
      }>();

    return NextResponse.json({
      transactions: results || [],
      total,
      page,
      pageSize,
    });
  } catch (err) {
    console.error('Points history error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
