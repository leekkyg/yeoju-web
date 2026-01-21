'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft } from 'lucide-react';

function RegisterCardContent() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tossLoaded, setTossLoaded] = useState(false);

  useEffect(() => {
    checkUser();
    loadTossScript();
  }, []);

  const loadTossScript = () => {
    const script = document.createElement('script');
    script.src = 'https://js.tosspayments.com/v1/payment';
    script.async = true;
    script.onload = () => setTossLoaded(true);
    document.body.appendChild(script);
  };

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    setUser(user);
  };

  const handleBillingAuth = async () => {
    if (!user) return;
    if (!tossLoaded || !window.TossPayments) {
      alert('결제 모듈을 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }
    
    try {
      setLoading(true);
      const tossPayments = window.TossPayments(process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY);
      const customerKey = `customer_${user.id}`;
      const returnUrl = new URLSearchParams(window.location.search).get('returnUrl') || '';

      await tossPayments.requestBillingAuth('카드', {
        customerKey,
        successUrl: `${window.location.origin}/mypage/cards/callback${returnUrl ? `?returnUrl=${encodeURIComponent(returnUrl)}` : ''}`,
        failUrl: `${window.location.origin}/mypage/cards/callback?error=true${returnUrl ? `&returnUrl=${encodeURIComponent(returnUrl)}` : ''}`,
      });
    } catch (err: any) {
      console.error('빌링 인증 요청 실패:', err);
      setError(err.message || '카드 등록에 실패했습니다.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.bgMain }}>
      <div className="max-w-[640px] mx-auto">
        <div className="sticky top-0 z-10 px-4 py-3 flex items-center gap-3" style={{ backgroundColor: theme.bgMain, borderBottom: `1px solid ${theme.border}` }}>
          <button onClick={() => router.back()}>
            <ArrowLeft className="w-6 h-6" style={{ color: theme.textPrimary }} />
          </button>
          <h1 className="text-lg font-bold" style={{ color: theme.textPrimary }}>카드 등록</h1>
        </div>

        <div className="p-4">
          {error && (
            <div className="p-4 rounded-xl mb-4" style={{ backgroundColor: `${theme.red}20` }}>
              <p style={{ color: theme.red }}>{error}</p>
            </div>
          )}

          <div className="text-center py-8">
            <p className="mb-4" style={{ color: theme.textMuted }}>
              카드 정보를 안전하게 등록합니다
            </p>
            <button
              onClick={handleBillingAuth}
              disabled={loading || !user || !tossLoaded}
              className="w-full py-4 rounded-xl font-semibold disabled:opacity-50"
              style={{ backgroundColor: theme.accent, color: isDark ? '#121212' : '#fff' }}
            >
              {loading ? '처리중...' : !tossLoaded ? '로딩중...' : '카드 등록하기'}
            </button>
          </div>

          <div className="mt-6 p-4 rounded-xl" style={{ backgroundColor: theme.bgCard }}>
            <p className="text-sm" style={{ color: theme.textMuted }}>
              • 카드 정보는 토스페이먼츠에서 안전하게 관리됩니다<br />
              • 등록된 카드는 언제든 삭제할 수 있습니다<br />
              • 실제 결제는 구매 시에만 진행됩니다
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RegisterCardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">로딩중...</div>}>
      <RegisterCardContent />
    </Suspense>
  );
}