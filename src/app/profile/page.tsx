'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

interface User {
  id: number;
  googleId: string;
  email: string;
  name: string;
  avatarUrl: string;
}

interface PointsInfo {
  balance: number;
  totalEarned: number;
  totalSpent: number;
  totalRecharged: number;
  isUnlimited: boolean;
}

interface Transaction {
  id: number;
  type: string;
  amount: number;
  balance_after: number;
  description: string;
  created_at: string;
}

const TYPE_LABELS: Record<string, string> = {
  register: '🎁 注册奖励',
  sign_in: '☀️ 每日签到',
  recharge: '💰 充值',
  spend: '🗜️ 压缩消耗',
  reward: '🏆 邀请奖励',
  purchase: '💎 购买无限套餐',
};

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [points, setPoints] = useState<PointsInfo | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [signedIn, setSignedIn] = useState(false);
  const [signInLoading, setSignInLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const fetchUser = useCallback(async () => {
    const res = await fetch('/api/auth/me');
    const data = await res.json();
    if (data.user) setUser(data.user);
    else setUser(null);
  }, []);

  const fetchPoints = useCallback(async () => {
    const res = await fetch('/api/points/balance');
    if (res.ok) {
      const data = await res.json();
      setPoints(data);
    }
  }, []);

  const fetchTransactions = useCallback(async () => {
    const res = await fetch('/api/points/history?pageSize=20');
    if (res.ok) {
      const data = await res.json();
      setTransactions(data.transactions);
    }
  }, []);

  const checkSignInStatus = useCallback(async () => {
    const today = new Date().toISOString().slice(0, 10);
    const res = await fetch('/api/points/history?pageSize=5');
    if (res.ok) {
      const data = await res.json();
      const todaySignIn = data.transactions?.find(
        (t: Transaction) => t.type === 'sign_in' && t.created_at.slice(0, 10) === today
      );
      setSignedIn(!!todaySignIn);
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchUser(), fetchPoints(), fetchTransactions()]).finally(() => setLoading(false));
  }, [fetchUser, fetchPoints, fetchTransactions]);

  useEffect(() => {
    if (user) checkSignInStatus();
  }, [user, checkSignInStatus]);

  const handleSignIn = async () => {
    setSignInLoading(true);
    try {
      const res = await fetch('/api/points/sign-in', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSignedIn(true);
        setPoints((prev) => prev ? { ...prev, balance: data.newBalance } : prev);
        fetchTransactions();
      }
    } finally {
      setSignInLoading(false);
    }
  };

  const handleLogout = async () => {
    setLogoutLoading(true);
    await fetch('/api/auth/logout');
    // 清空本地状态
    setUser(null);
    setPoints(null);
    setTransactions([]);
    // 跳转到首页
    window.location.href = '/';
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-zinc-700 border-t-indigo-500 rounded-full animate-spin" />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center px-6">
        <div className="text-6xl mb-6">🔐</div>
        <h1 className="text-2xl font-bold mb-3">请先登录</h1>
        <p className="text-zinc-400 mb-8 text-center">登录后可查看积分、签到和充值</p>
        <a
          href="/api/auth/google"
          className="px-6 py-3 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl font-semibold transition-all shadow-[0_4px_16px_rgba(99,102,241,0.3)]"
        >
          Sign in with Google
        </a>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/50">
        <div className="max-w-[640px] mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-zinc-400 hover:text-zinc-100 transition-colors">
            <span className="text-lg">←</span>
            <span className="text-sm">返回首页</span>
          </Link>
          <h1 className="text-lg font-bold">用户中心</h1>
          <div className="w-16" />
        </div>
      </header>

      <div className="max-w-[640px] mx-auto px-6 py-8 space-y-6">
        {/* User Info Card */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="w-16 h-16 rounded-full border-2 border-indigo-500/50"
              referrerPolicy="no-referrer"
            />
            <div className="flex-1 min-w-0">
              <div className="text-lg font-bold truncate">{user.name}</div>
              <div className="text-sm text-zinc-400 truncate">{user.email}</div>
            </div>
          </div>
        </div>

        {/* Points Overview */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 text-center">
            <div className="text-2xl mb-1">🔋</div>
            <div className="text-2xl font-bold text-indigo-400">{points?.isUnlimited ? '∞' : (points?.balance ?? '...')}</div>
            <div className="text-[11px] text-zinc-500 mt-1">当前余额</div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 text-center">
            <div className="text-2xl mb-1">📊</div>
            <div className="text-2xl font-bold">{points?.totalSpent ?? '...'}</div>
            <div className="text-[11px] text-zinc-500 mt-1">累计使用</div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 text-center">
            <div className="text-2xl mb-1">💰</div>
            <div className="text-2xl font-bold text-green-400">{points?.totalRecharged ?? '...'}</div>
            <div className="text-[11px] text-zinc-500 mt-1">累计充值</div>
          </div>
        </div>

        {/* VIP / Unlimited Status */}
        {points?.isUnlimited ? (
          <div className="bg-gradient-to-r from-amber-500/10 to-violet-500/10 border border-amber-500/30 rounded-2xl p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">👑</span>
              <div>
                <div className="font-semibold text-amber-400">无限套餐会员</div>
                <div className="text-xs text-zinc-400 mt-0.5">无限压缩，永久有效</div>
              </div>
            </div>
            <span className="text-green-400 text-sm font-semibold">已激活</span>
          </div>
        ) : (
          <a
            href="/pricing"
            className="block bg-gradient-to-r from-indigo-500/10 to-violet-500/10 border border-indigo-500/30 rounded-2xl p-5 hover:border-indigo-500/50 transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">💎</span>
                <div>
                  <div className="font-semibold text-indigo-300">升级无限套餐</div>
                  <div className="text-xs text-zinc-400 mt-0.5">仅需 $1.00，永久无限压缩</div>
                </div>
              </div>
              <span className="text-indigo-400 text-sm font-semibold">$1 →</span>
            </div>
          </a>
        )}

        {/* Sign In */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg">☀️</span>
                <span className="font-semibold">每日签到</span>
                <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 text-xs font-medium rounded-full">
                  +2 积分
                </span>
              </div>
              <div className="text-xs text-zinc-500 mt-1">每天签到一次，积少成多</div>
            </div>
            <button
              onClick={handleSignIn}
              disabled={signedIn || signInLoading}
              className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                signedIn
                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  : 'bg-indigo-500 text-white hover:bg-indigo-400 shadow-[0_4px_12px_rgba(99,102,241,0.3)]'
              }`}
            >
              {signInLoading ? (
                <span className="inline-block w-4 h-4 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
              ) : signedIn ? (
                '✅ 已签到'
              ) : (
                '签到'
              )}
            </button>
          </div>
        </div>

        {/* Points Tips */}
        <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-4">
          <div className="text-xs text-zinc-500 leading-relaxed">
            <div className="font-semibold text-zinc-400 mb-2">📌 积分获取方式</div>
            <div className="space-y-1">
              <div>• 注册赠送 <span className="text-indigo-400">30</span> 积分</div>
              <div>• 每日签到 <span className="text-indigo-400">+2</span> 积分</div>
              <div>• 邀请好友 <span className="text-indigo-400">+20</span> 积分/人（即将上线）</div>
            </div>
            <div className="font-semibold text-zinc-400 mt-3 mb-2">🗜️ 积分消耗</div>
            <div>每压缩一张图片消耗 <span className="text-amber-400">1</span> 积分</div>
          </div>
        </div>

        {/* Transaction History */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-800">
            <h2 className="font-semibold text-sm">积分记录</h2>
          </div>
          {transactions.length === 0 ? (
            <div className="px-5 py-8 text-center text-zinc-500 text-sm">暂无记录</div>
          ) : (
            <div className="divide-y divide-zinc-800/50">
              {transactions.map((t) => (
                <div key={t.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm">{TYPE_LABELS[t.type] || t.description}</div>
                    <div className="text-[11px] text-zinc-600 mt-0.5">
                      {new Date(t.created_at + 'Z').toLocaleString('zh-CN', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                  <div className="text-sm font-semibold">
                    <span className={t.amount > 0 ? 'text-green-400' : 'text-zinc-400'}>
                      {t.amount > 0 ? '+' : ''}{t.amount}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          disabled={logoutLoading}
          className="w-full py-3 bg-zinc-900/50 border border-zinc-800 rounded-2xl text-sm text-zinc-500 hover:text-red-400 hover:border-red-500/20 transition-all cursor-pointer"
        >
          退出登录
        </button>
      </div>
    </main>
  );
}
