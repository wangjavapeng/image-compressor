import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth instanceof NextResponse) return auth;
  const { payload, env } = auth;

  try {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    // Check if already signed in today
    const existing = await env.DB.prepare(
      'SELECT id FROM sign_in_logs WHERE user_id = ? AND sign_date = ?'
    )
      .bind(payload.userId, today)
      .first<{ id: number }>();

    if (existing) {
      // Get current balance for the response
      const points = await env.DB.prepare(
        'SELECT balance FROM user_points WHERE user_id = ?'
      )
        .bind(payload.userId)
        .first<{ balance: number }>();
      return NextResponse.json({
        success: false,
        message: 'already_signed_in',
        balance: points?.balance || 0,
      });
    }

    const SIGN_IN_POINTS = 2;

    // Ensure user_points row exists
    const pointsRow = await env.DB.prepare(
      'SELECT balance FROM user_points WHERE user_id = ?'
    )
      .bind(payload.userId)
      .first<{ balance: number }>();

    if (!pointsRow) {
      const BACKFILL_POINTS = 30;
      await env.DB.prepare(
        'INSERT OR IGNORE INTO user_points (user_id, balance, total_earned) VALUES (?, ?, ?)'
      )
        .bind(payload.userId, BACKFILL_POINTS, BACKFILL_POINTS)
        .run();
    }

    // Insert sign-in log
    await env.DB.prepare(
      'INSERT INTO sign_in_logs (user_id, sign_date) VALUES (?, ?)'
    )
      .bind(payload.userId, today)
      .run();

    // Update points
    await env.DB.prepare(
      'UPDATE user_points SET balance = balance + ?, total_earned = total_earned + ?, updated_at = datetime(\'now\') WHERE user_id = ?'
    )
      .bind(SIGN_IN_POINTS, SIGN_IN_POINTS, payload.userId)
      .run();

    // Get new balance
    const updated = await env.DB.prepare(
      'SELECT balance FROM user_points WHERE user_id = ?'
    )
      .bind(payload.userId)
      .first<{ balance: number }>();

    const newBalance = updated?.balance || 0;

    // Insert transaction
    await env.DB.prepare(
      'INSERT INTO point_transactions (user_id, type, amount, balance_after, description) VALUES (?, ?, ?, ?, ?)'
    )
      .bind(payload.userId, 'sign_in', SIGN_IN_POINTS, newBalance, '每日签到')
      .run();

    return NextResponse.json({
      success: true,
      points: SIGN_IN_POINTS,
      newBalance,
    });
  } catch (err) {
    console.error('Sign in error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
