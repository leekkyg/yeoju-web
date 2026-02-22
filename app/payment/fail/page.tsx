'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTheme } from '@/contexts/ThemeContext';
import { XCircle } from 'lucide-react';

function PaymentFailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { theme, isDark } = useTheme();

  const errorCode = searchParams.get('code') || 'UNKNOWN';
  const errorMessage = searchParams.get('message') || '결제 처리 중 오류가 발생했습니다.';

  return (
    <div className="min-h-screen flex items-center justify-center p-5" style={{ backgroundColor: theme.bgMain }}>
      <div className="w-full max-w-md text-center">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: `${theme.red}20` }}>
          <XCircle className="w-10 h-10" style={{ color: theme.red }} />
        </div>
        <h1 className="text-2xl font-bold mb-2" style={{ color: theme.textPrimary }}>결제 실패</h1>
        <p className="mb-2" style={{ color: theme.textMuted }}>{decodeURIComponent(errorMessage)}</p>
        <p className="text-sm mb-6" style={{ color: theme.textMuted }}>에러 코드: {errorCode}</p>

        <div className="space-y-3">
          <button
            onClick={() => router.back()}
            className="block w-full py-3 rounded-xl font-semibold"
            style={{ backgroundColor: theme.accent, color: isDark ? '#121212' : '#fff' }}
          >
            다시 시도하기
          </button>
          <Link href="/" className="block w-full py-3 rounded-xl font-semibold" style={{ backgroundColor: theme.bgInput, color: theme.textPrimary }}>
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PaymentFailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">로딩중...</div>}>
      <PaymentFailContent />
    </Suspense>
  );
}