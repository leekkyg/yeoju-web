'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { CheckCircle, XCircle } from 'lucide-react';

function CallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    processCallback();
  }, [searchParams]);

  const processCallback = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    
    if (!user) {
      setStatus('error');
      setMessage('로그인이 필요합니다.');
      return;
    }

    const authKey = searchParams.get('authKey');
    const customerKey = searchParams.get('customerKey');
    const error = searchParams.get('error');
    const errorMessage = searchParams.get('message');

    if (error || errorMessage) {
      setStatus('error');
      setMessage(errorMessage || '카드 등록이 취소되었습니다.');
      return;
    }

    if (!authKey || !customerKey) {
      setStatus('error');
      setMessage('카드 등록 정보가 올바르지 않습니다.');
      return;
    }

    try {
      const response = await fetch('/api/payment/billing/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authKey,
          customerKey,
          userId: user.id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setStatus('success');
        setMessage('카드가 성공적으로 등록되었습니다.');
      } else {
        setStatus('error');
        setMessage(data.message || '카드 등록에 실패했습니다.');
      }
    } catch (err: any) {
      setStatus('error');
      setMessage('카드 등록 처리 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: theme.bgMain }}>
      <div className="w-full max-w-md text-center">
        {status === 'loading' && (
          <>
            <div className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-6" style={{ borderColor: theme.accent }} />
            <p style={{ color: theme.textPrimary }}>카드 등록 처리 중...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: theme.accent }}>
              <CheckCircle className="w-10 h-10" style={{ color: isDark ? '#121212' : '#fff' }} />
            </div>
            <h1 className="text-2xl font-bold mb-2" style={{ color: theme.textPrimary }}>등록 완료!</h1>
            <p className="mb-6" style={{ color: theme.textMuted }}>{message}</p>
            <button
         onClick={() => {
             const returnUrl = searchParams.get('returnUrl');
            router.push(returnUrl || '/mypage/cards');
             }}
              className="w-full py-3 rounded-xl font-semibold"
              style={{ backgroundColor: theme.accent, color: isDark ? '#121212' : '#fff' }}
            >
            {searchParams.get('returnUrl') ? '결제 계속하기' : '카드 관리로 이동'}
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: `${theme.red}20` }}>
              <XCircle className="w-10 h-10" style={{ color: theme.red }} />
            </div>
            <h1 className="text-2xl font-bold mb-2" style={{ color: theme.textPrimary }}>등록 실패</h1>
            <p className="mb-6" style={{ color: theme.textMuted }}>{message}</p>
            <div className="space-y-3">
              <button
                onClick={() => router.push('/mypage/cards/register')}
                className="w-full py-3 rounded-xl font-semibold"
                style={{ backgroundColor: theme.accent, color: isDark ? '#121212' : '#fff' }}
              >
                다시 시도
              </button>
              <button
             onClick={() => {
             const returnUrl = searchParams.get('returnUrl');
             router.push(returnUrl || '/mypage/cards');
             }}
             className="w-full py-3 rounded-xl font-semibold"
             style={{ backgroundColor: theme.accent, color: isDark ? '#121212' : '#fff' }}
            >
                 {searchParams.get('returnUrl') ? '결제 계속하기' : '카드 관리로 이동'}
                </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function CardCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">로딩중...</div>}>
      <CallbackContent />
    </Suspense>
  );
}