"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("비밀번호는 6자 이상이어야 합니다");
      setLoading(false);
      return;
    }

    if (nickname.length < 2) {
      setError("닉네임은 2자 이상이어야 합니다");
      setLoading(false);
      return;
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (authData.user) {
      await supabase.from("profiles").insert({
        id: authData.user.id,
        email,
        nickname,
      });
    }

    alert("회원가입 완료! 로그인해주세요.");
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-gray-900 sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center">
          <Link href="/" className="text-gray-400 hover:text-white mr-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-white font-bold text-lg">회원가입</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-gray-900 font-black text-xl">여주</span>
          </div>
          <h2 className="text-2xl font-black text-gray-900">여주마켓 가입하기</h2>
          <p className="text-gray-500 mt-1">여주시민 커뮤니티에 참여하세요</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-md">
          <form onSubmit={handleSignup} className="space-y-4">
            {error && (
              <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm font-medium rounded">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">이메일</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="이메일을 입력하세요"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-gray-900"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">닉네임</label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="닉네임을 입력하세요 (2자 이상)"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-gray-900"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="6자 이상 입력하세요"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-gray-900"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">비밀번호 확인</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="비밀번호를 다시 입력하세요"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-gray-900"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-amber-500 text-gray-900 font-bold rounded-lg hover:bg-amber-400 disabled:opacity-50 transition-colors text-lg"
            >
              {loading ? "가입 중..." : "회원가입"}
            </button>
          </form>
        </div>

        <div className="mt-6 text-center">
          <p className="text-gray-500">
            이미 계정이 있으신가요?{" "}
            <Link href="/login" className="text-amber-600 font-bold hover:text-amber-700">
              로그인
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}