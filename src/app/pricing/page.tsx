'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';

interface User {
  id: number;
  googleId: string;
  email: string;
  name: string;
  avatarUrl: string;
}

type PaymentStatus = 'idle' | 'creating' | 'pending' | 'capturing' | 'success' | 'error' | 'canceled';

export default function PricingPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isUnlimited, setIsUnlimited] = useState(false);
  const [status, setStatus] = useState<PaymentStatus>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('canceled') === 'true') return 'canceled';
      if (params.get('success') === 'true' && params.get('token')) return 'capturing';
    }
    return 'idle';
  });
  const [errorMsg, setErrorMsg] = useState('');
  const capturedRef = useRef(false);

  const fetchUser = useCallback(async () => {
    const res = await fetch('/api/auth/me');
    const data = await res.json();
    if (data.user) {
      setUser(data.user);
      const balRes = await fetch('/api/points/balance');
      if (balRes.ok) {
        const balData = await balRes.json();
        setIsUnlimited(!!balData.isUnlimited);
      }
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Capture PayPal order when returning from PayPal
  useEffect(() => {
    if (status !== 'capturing' || capturedRef.current) return;
    capturedRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (!token) {
      setStatus('error');
      setErrorMsg('Missing payment token');
      return;
    }

    fetch('/api/payment/capture-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: token }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setStatus('success');
          setIsUnlimited(true);
          window.history.replaceState({}, '', '/pricing');
        } else {
          setErrorMsg(data.error || 'Payment verification failed');
          setStatus('error');
        }
      })
      .catch(() => {
        setErrorMsg('Network error during verification');
        setStatus('error');
      });
  }, [status]);

  const handlePurchase = async () => {
    if (!user) {
      window.location.href = '/api/auth/google';
      return;
    }

    setStatus('creating');
    setErrorMsg('');

    try {
      const res = await fetch('/api/payment/create-order', { method: 'POST' });
      const data = await res.json();

      if (data.error === 'already_unlimited') {
        setIsUnlimited(true);
        setStatus('idle');
        return;
      }

      if (!data.orderId || !data.approveUrl) {
        setErrorMsg(data.error || 'Failed to create order');
        setStatus('error');
        return;
      }

      setStatus('pending');
      window.location.href = data.approveUrl;
    } catch {
      setErrorMsg('Network error, please try again');
      setStatus('error');
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/50">
        <div className="max-w-[640px] mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-zinc-400 hover:text-zinc-100 transition-colors">
            <span className="text-lg">←</span>
            <span className="text-sm">返回首页</span>
          </Link>
          <h1 className="text-lg font-bold">定价方案</h1>
          <div className="w-16" />
        </div>
      </header>

      <div className="max-w-[480px] mx-auto px-6 py-12">
        {/* Title */}
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold mb-3 bg-gradient-to-r from-indigo-500 via-violet-400 to-indigo-400 bg-clip-text text-transparent">
            简单透明，一次付费
          </h2>
          <p className="text-zinc-400 text-sm">
            不用担心积分用完，一次购买无限使用
          </p>
        </div>

        {/* Pricing Card */}
        <div className="relative bg-zinc-900/50 border-2 border-indigo-500/50 rounded-3xl p-8 mb-8">
          {/* Badge */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-indigo-500 text-white text-xs font-bold rounded-full shadow-[0_4px_12px_rgba(99,102,241,0.4)]">
            推荐
          </div>

          <div className="text-center mb-6">
            <h3 className="text-xl font-bold mb-1">无限套餐</h3>
            <p className="text-zinc-500 text-xs">Unlimited Access</p>
          </div>

          <div className="text-center mb-8">
            <span className="text-5xl font-bold">$1</span>
            <span className="text-zinc-400 text-sm ml-1">一次性</span>
            <div className="text-xs text-zinc-500 mt-1">永久有效</div>
          </div>

          <div className="space-y-3 mb-8">
            {[
              '✅ 无限次图片压缩',
              '✅ 支持所有格式转换',
              '✅ 批量压缩下载',
              '✅ 永久有效，无隐藏费用',
            ].map((item) => (
              <div key={item} className="text-sm text-zinc-300 pl-1">
                {item}
              </div>
            ))}
          </div>

          {/* Purchase Button */}
          {isUnlimited ? (
            <div className="text-center py-3.5 bg-green-500/10 border border-green-500/30 rounded-2xl text-green-400 font-semibold text-sm">
              🎉 已开通无限套餐
            </div>
          ) : (
            <button
              onClick={handlePurchase}
              disabled={status === 'creating' || status === 'capturing' || status === 'pending'}
              className="w-full py-3.5 bg-indigo-500 hover:bg-indigo-400 text-white rounded-2xl font-semibold text-sm transition-all shadow-[0_4px_16px_rgba(99,102,241,0.4)] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
            >
              {status === 'creating' || status === 'capturing' ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  处理中...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7.076 21.337H2.47a.641.641 0 01-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797H9.603c-.564 0-1.04.41-1.126.967l-1.4 8.938zM21.98 7.792c-.063.298-.114.547-.2.868-1.716 6.247-6.018 7.935-11.666 7.935H7.53c-.698 0-1.285.508-1.393 1.198L4.738 23.84a.723.723 0 00.714.847h4.536c.612 0 1.132-.444 1.226-1.05l.036-.187.877-5.557.056-.305c.094-.608.614-1.052 1.226-1.052h.558c3.856 0 6.876-1.567 7.756-6.102.37-1.9.178-3.488-.8-4.601-.304-.344-.684-.63-1.13-.849z"/>
                  </svg>
                  通过 PayPal 支付 $1.00
                </>
              )}
            </button>
          )}
        </div>

        {/* Status Messages */}
        {status === 'canceled' && (
          <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl text-center">
            <div className="text-sm text-zinc-400">支付已取消</div>
            <button
              onClick={() => setStatus('idle')}
              className="mt-2 text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer"
            >
              重新购买
            </button>
          </div>
        )}

        {status === 'success' && (
          <div className="p-6 bg-green-500/5 border border-green-500/20 rounded-2xl text-center">
            <div className="text-4xl mb-3">🎉</div>
            <div className="text-lg font-bold text-green-400 mb-1">支付成功！</div>
            <div className="text-sm text-zinc-400 mb-4">你已获得无限压缩权限</div>
            <Link
              href="/"
              className="inline-block px-6 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl text-sm font-semibold transition-all"
            >
              开始压缩
            </Link>
          </div>
        )}

        {status === 'error' && errorMsg && (
          <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-2xl text-center">
            <div className="text-sm text-red-400">{errorMsg}</div>
            <button
              onClick={() => setStatus('idle')}
              className="mt-2 text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer"
            >
              重试
            </button>
          </div>
        )}

        {/* Trust badges */}
        <div className="flex items-center justify-center gap-6 mt-8 text-xs text-zinc-600">
          <span className="flex items-center gap-1">🔒 安全支付</span>
          <span className="flex items-center gap-1">⚡ 即时开通</span>
          <span className="flex items-center gap-1">♾️ 永久有效</span>
        </div>

        {/* Login hint */}
        {!user && (
          <div className="mt-8 p-4 bg-zinc-900/30 border border-zinc-800/50 rounded-2xl text-center">
            <div className="text-sm text-zinc-400">
              请先
              <a
                href="/api/auth/google"
                className="text-indigo-400 hover:text-indigo-300 font-semibold mx-1"
              >
                登录
              </a>
              后购买
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
