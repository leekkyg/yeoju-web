"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/contexts/ThemeContext";
import { ArrowLeft } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { theme, isDark, mounted } = useTheme();
  const [loading, setLoading] = useState<string | null>(null);
  const [showEmailLogin, setShowEmailLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    // 이미 로그인되어 있으면 홈으로
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) router.push("/");
    });
  }, []);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading('email');
    setError("");

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("이메일 또는 비밀번호가 올바르지 않습니다");
      setLoading(null);
      return;
    }

    router.push("/");
  };

  const handleSocialLogin = async (provider: 'google' | 'kakao' | 'facebook') => {
    setLoading(provider);
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });

    if (error) {
      alert("로그인 중 오류가 발생했습니다");
      setLoading(null);
    }
  };

  const handleNaverLogin = async () => {
    setLoading('naver');
    
    // Supabase는 네이버를 직접 지원하지 않아서 커스텀 구현 필요
    // 일단 준비만 해둠
    alert("네이버 로그인은 준비 중입니다");
    setLoading(null);
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.bgMain }}>
        <div className="w-10 h-10 border-2 rounded-full animate-spin" style={{ borderColor: theme.border, borderTopColor: theme.accent }}></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen transition-colors duration-300" style={{ backgroundColor: theme.bgMain }}>
      {/* 헤더 */}
      <header className="sticky top-0 z-50" style={{ backgroundColor: theme.bgMain, borderBottom: `1px solid ${theme.borderLight}` }}>
        <div className="max-w-[640px] mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="p-1 -ml-1 rounded-lg" style={{ color: theme.textPrimary }}>
            <ArrowLeft className="w-6 h-6" strokeWidth={1.5} />
          </Link>
          <h1 className="text-lg font-bold" style={{ color: theme.textPrimary }}>로그인</h1>
        </div>
      </header>

      <main className="max-w-[640px] mx-auto px-4 py-8">
        {/* 로고 영역 */}
        <div className="text-center mb-10">
          <div 
            className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg"
            style={{ backgroundColor: theme.accent }}
          >
            <span className="font-black text-2xl" style={{ color: isDark ? '#121212' : '#FFFFFF' }}>여주</span>
          </div>
          <h2 className="text-2xl font-black" style={{ color: theme.textPrimary }}>여주모아</h2>
          <p className="mt-2" style={{ color: theme.textMuted }}>여주시민의 프리미엄 커뮤니티</p>
        </div>

        {/* 소셜 로그인 버튼들 */}
        <div className="max-w-[320px] mx-auto space-y-3">
          {/* 카카오 로그인 */}
          <button
            onClick={() => handleSocialLogin('kakao')}
            disabled={loading !== null}
            className="w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2.5 transition-all disabled:opacity-70"
            style={{ backgroundColor: '#FEE500', color: '#000000' }}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3C6.477 3 2 6.463 2 10.691c0 2.65 1.734 4.974 4.38 6.308-.19.706-.69 2.556-.79 2.95-.122.49.178.483.375.352.155-.103 2.47-1.68 3.472-2.36.84.122 1.698.185 2.563.185 5.523 0 10-3.463 10-7.435C22 6.463 17.523 3 12 3z"/>
            </svg>
            {loading === 'kakao' ? '로그인 중...' : '카카오로 시작하기'}
          </button>

          {/* 네이버 로그인 */}
          <button
            onClick={handleNaverLogin}
            disabled={loading !== null}
            className="w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2.5 transition-all disabled:opacity-70"
            style={{ backgroundColor: '#03C75A', color: '#FFFFFF' }}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727z"/>
            </svg>
            {loading === 'naver' ? '로그인 중...' : '네이버로 시작하기'}
          </button>

          {/* 구글 로그인 */}
          <button
            onClick={() => handleSocialLogin('google')}
            disabled={loading !== null}
            className="w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2.5 transition-all disabled:opacity-70"
            style={{ 
              backgroundColor: isDark ? '#4285F4' : '#FFFFFF', 
              color: isDark ? '#FFFFFF' : '#000000',
              border: isDark ? 'none' : '1px solid #dadce0'
            }}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {loading === 'google' ? '로그인 중...' : '구글로 시작하기'}
          </button>

          {/* 페이스북 로그인 */}
          <button
            onClick={() => handleSocialLogin('facebook')}
            disabled={loading !== null}
            className="w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2.5 transition-all disabled:opacity-70"
            style={{ backgroundColor: '#1877F2', color: '#FFFFFF' }}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            {loading === 'facebook' ? '로그인 중...' : '페이스북으로 시작하기'}
          </button>

          {/* 구분선 */}
          <div className="flex items-center gap-3 py-2">
            <div className="flex-1 h-px" style={{ backgroundColor: theme.border }}></div>
            <span className="text-xs" style={{ color: theme.textMuted }}>또는</span>
            <div className="flex-1 h-px" style={{ backgroundColor: theme.border }}></div>
          </div>

          {/* 이메일 로그인 토글 */}
          {!showEmailLogin ? (
            <button
              onClick={() => setShowEmailLogin(true)}
              className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all"
              style={{ backgroundColor: theme.bgInput, color: theme.textPrimary, border: `1px solid ${theme.border}` }}
            >
              이메일로 로그인
            </button>
          ) : (
            <form onSubmit={handleEmailLogin} className="space-y-3">
              {error && (
                <div className="p-3 rounded-xl text-sm" style={{ backgroundColor: theme.redBg, color: theme.red }}>
                  {error}
                </div>
              )}
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="이메일"
                className="w-full px-4 py-3 rounded-xl outline-none text-sm"
                style={{ backgroundColor: theme.bgInput, border: `1px solid ${theme.border}`, color: theme.textPrimary }}
                required
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호"
                className="w-full px-4 py-3 rounded-xl outline-none text-sm"
                style={{ backgroundColor: theme.bgInput, border: `1px solid ${theme.border}`, color: theme.textPrimary }}
                required
              />
              <button
                type="submit"
                disabled={loading === 'email'}
                className="w-full py-3.5 rounded-xl font-semibold text-sm disabled:opacity-70"
                style={{ backgroundColor: theme.accent, color: isDark ? '#121212' : '#FFFFFF' }}
              >
                {loading === 'email' ? '로그인 중...' : '로그인'}
              </button>
            </form>
          )}
        </div>

        {/* 안내 문구 */}
        <div className="mt-8 text-center">
          <p className="text-sm" style={{ color: theme.textMuted }}>
            로그인 시{' '}
            <Link href="/terms" className="underline" style={{ color: theme.textSecondary }}>이용약관</Link>
            {' '}및{' '}
            <Link href="/privacy" className="underline" style={{ color: theme.textSecondary }}>개인정보처리방침</Link>
            에 동의하게 됩니다.
          </p>
        </div>
      </main>
    </div>
  );
}
