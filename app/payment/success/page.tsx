'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTheme } from '@/contexts/ThemeContext';
import { CheckCircle } from 'lucide-react';

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const { theme, isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const confirmPayment = async () => {
      const paymentKey = searchParams.get('paymentKey');
      const orderId = searchParams.get('orderId');
      const amount = searchParams.get('amount');
      const participantId = searchParams.get('participantId');

      if (!paymentKey || !orderId || !amount || !participantId) {
        setError('결제 정보가 올바르지 않습니다.');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/payment/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentKey,
            orderId,
            amount: Number(amount),
            participantId: Number(participantId),
          }),
        });

        const data = await response.json();

        if (!data.success) {
          setError(data.message || '결제 승인에 실패했습니다.');
        }
      } catch (err: any) {
        setError('결제 처리 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    confirmPayment();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.bgMain }}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{ borderColor: theme.accent }} />
          <p style={{ color: theme.textPrimary }}>결제 처리 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-5" style={{ backgroundColor: theme.bgMain }}>
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: `${theme.red}20` }}>
            <span className="text-4xl">❌</span>
          </div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: theme.textPrimary }}>결제 실패</h1>
          <p className="mb-6" style={{ color: theme.textMuted }}>{error}</p>
          <Link href="/" className="inline-block px-6 py-3 rounded-xl font-semibold" style={{ backgroundColor: theme.accent, color: isDark ? '#121212' : '#fff' }}>
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-5" style={{ backgroundColor: theme.bgMain }}>
      <div className="w-full max-w-md text-center">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: theme.accent }}>
          <CheckCircle className="w-10 h-10" style={{ color: isDark ? '#121212' : '#fff' }} />
        </div>
        <h1 className="text-2xl font-bold mb-2" style={{ color: theme.textPrimary }}>결제 완료!</h1>
        <p className="mb-6" style={{ color: theme.textMuted }}>주문이 정상적으로 처리되었습니다.</p>

        <div className="space-y-3">
          <Link href="/mypage/groupbuys" className="block w-full py-3 rounded-xl font-semibold" style={{ backgroundColor: theme.accent, color: isDark ? '#121212' : '#fff' }}>
            주문 내역 확인
          </Link>
          <Link href="/" className="block w-full py-3 rounded-xl font-semibold" style={{ backgroundColor: theme.bgInput, color: theme.textPrimary }}>
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">로딩중...</div>}>
      <PaymentSuccessContent />
    </Suspense>
  );
}