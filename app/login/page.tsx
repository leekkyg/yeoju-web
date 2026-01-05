"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("이메일 또는 비밀번호가 올바르지 않습니다");
      setLoading(false);
      return;
    }

    router.push("/");
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
          <h1 className="text-white font-bold text-lg">로그인</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-gray-900 font-black text-xl">여주</span>
          </div>
          <h2 className="text-2xl font-black text-gray-900">여주마켓</h2>
          <p className="text-gray-500 mt-1">여주시민의 프리미엄 커뮤니티</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-md">
          <form onSubmit={handleLogin} className="space-y-4">
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
              <label className="block text-sm font-bold text-gray-700 mb-2">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-gray-900"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-amber-500 text-gray-900 font-bold rounded-lg hover:bg-amber-400 disabled:opacity-50 transition-colors text-lg"
            >
              {loading ? "로그인 중..." : "로그인"}
            </button>
          </form>
        </div>

        <div className="mt-6 text-center">
          <p className="text-gray-500">
            계정이 없으신가요?{" "}
            <Link href="/signup" className="text-amber-600 font-bold hover:text-amber-700">
              회원가입
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}