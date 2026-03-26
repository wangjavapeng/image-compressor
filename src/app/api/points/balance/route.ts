import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth instanceof NextResponse) return auth;
  const { payload, env } = auth;

  try {
    const points = await env.DB.prepare(
      'SELECT balance, total_earned, total_spent, total_recharged, is_unlimited FROM user_points WHERE user_id = ?'
    )
      .bind(payload.userId)
      .first<{
        balance: number;
        total_earned: number;
        total_spent: number;
        total_recharged: number;
      }>();

    if (!points) {
      return NextResponse.json({
        balance: 0,
        totalEarned: 0,
        totalSpent: 0,
        totalRecharged: 0,
      });
    }

    return NextResponse.json({
      balance: points.balance,
      totalEarned: points.total_earned,
      totalSpent: points.total_spent,
      totalRecharged: points.total_recharged,
      isUnlimited: !!points.is_unlimited,
    });
  } catch (err) {
    console.error('Points balance error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
