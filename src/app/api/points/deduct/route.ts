import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth instanceof NextResponse) return auth;
  const { payload, env } = auth;

  try {
    const body = await request.json();
    const count = Math.max(1, Math.min(body.count || 1, 50));
    const pointsCost = count;

    // Get current points, create account if missing
    let points = await env.DB.prepare(
      'SELECT balance FROM user_points WHERE user_id = ?'
    )
      .bind(payload.userId)
      .first<{ balance: number }>();

    if (!points) {
      // Backfill: create points account for existing user
      const BACKFILL_POINTS = 30;
      await env.DB.prepare(
        'INSERT OR IGNORE INTO user_points (user_id, balance, total_earned) VALUES (?, ?, ?)'
      )
        .bind(payload.userId, BACKFILL_POINTS, BACKFILL_POINTS)
        .run();
      points = await env.DB.prepare(
        'SELECT balance FROM user_points WHERE user_id = ?'
      )
        .bind(payload.userId)
        .first<{ balance: number }>();
    }

    if (!points || points.balance < pointsCost) {
      return NextResponse.json({
        success: false,
        message: 'insufficient_points',
        remainingBalance: points?.balance || 0,
        required: pointsCost,
      });
    }

    const newBalance = points.balance - pointsCost;

    // Update balance
    await env.DB.prepare(
      'UPDATE user_points SET balance = ?, total_spent = total_spent + ?, updated_at = datetime(\'now\') WHERE user_id = ?'
    )
      .bind(newBalance, pointsCost, payload.userId)
      .run();

    // Insert transaction
    await env.DB.prepare(
      'INSERT INTO point_transactions (user_id, type, amount, balance_after, description) VALUES (?, ?, ?, ?, ?)'
    )
      .bind(
        payload.userId,
        'spend',
        -pointsCost,
        newBalance,
        `压缩 ${count} 张图片`
      )
      .run();

    return NextResponse.json({
      success: true,
      pointsCost,
      remainingBalance: newBalance,
    });
  } catch (err) {
    console.error('Points deduct error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
