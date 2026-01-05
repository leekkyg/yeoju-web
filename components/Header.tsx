"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function Header() {
  const [user, setUser] = useState<any>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    // 유저 상태 확인
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    // 인증 상태 변경 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    // 스크롤 감지
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/95 backdrop-blur-md shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="container">
        <nav className="flex items-center justify-between h-[72px]">
          {/* 로고 */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-[var(--primary)] flex items-center justify-center">
              <span className="text-white font-bold text-lg">여</span>
            </div>
            <span className="font-bold text-xl text-[var(--text-primary)]">
              여주마켓
            </span>
          </Link>

          {/* 데스크톱 메뉴 */}
          <div className="hidden md:flex items-center gap-8">
            <Link
              href="/community"
              className="text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors font-medium"
            >
              커뮤니티
            </Link>
            <Link
              href="/market"
              className="text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors font-medium"
            >
              마켓
            </Link>
            <Link
              href="/videos"
              className="text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors font-medium"
            >
              영상
            </Link>
          </div>

          {/* 로그인/유저 메뉴 */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                <span className="text-sm text-[var(--text-secondary)]">
                  {user.email?.split("@")[0]}님
                </span>
                <button
                  onClick={handleLogout}
                  className="btn-secondary text-sm py-2 px-4"
                >
                  로그아웃
                </button>
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors font-medium"
                >
                  로그인
                </Link>
                <Link href="/signup" className="btn-primary text-sm py-2 px-5">
                  회원가입
                </Link>
              </>
            )}
          </div>

          {/* 모바일 메뉴 버튼 */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden w-10 h-10 flex items-center justify-center"
          >
            <div className="space-y-1.5">
              <span
                className={`block w-6 h-0.5 bg-[var(--text-primary)] transition-all ${
                  menuOpen ? "rotate-45 translate-y-2" : ""
                }`}
              />
              <span
                className={`block w-6 h-0.5 bg-[var(--text-primary)] transition-all ${
                  menuOpen ? "opacity-0" : ""
                }`}
              />
              <span
                className={`block w-6 h-0.5 bg-[var(--text-primary)] transition-all ${
                  menuOpen ? "-rotate-45 -translate-y-2" : ""
                }`}
              />
            </div>
          </button>
        </nav>

        {/* 모바일 메뉴 */}
        {menuOpen && (
          <div className="md:hidden py-4 border-t border-[var(--border-light)] animate-fade-in">
            <div className="flex flex-col gap-4">
              <Link
                href="/community"
                className="py-2 text-[var(--text-secondary)] hover:text-[var(--primary)] font-medium"
                onClick={() => setMenuOpen(false)}
              >
                커뮤니티
              </Link>
              <Link
                href="/market"
                className="py-2 text-[var(--text-secondary)] hover:text-[var(--primary)] font-medium"
                onClick={() => setMenuOpen(false)}
              >
                마켓
              </Link>
              <Link
                href="/videos"
                className="py-2 text-[var(--text-secondary)] hover:text-[var(--primary)] font-medium"
                onClick={() => setMenuOpen(false)}
              >
                영상
              </Link>
              <div className="pt-4 border-t border-[var(--border-light)]">
                {user ? (
                  <button
                    onClick={() => {
                      handleLogout();
                      setMenuOpen(false);
                    }}
                    className="btn-secondary w-full"
                  >
                    로그아웃
                  </button>
                ) : (
                  <div className="flex gap-3">
                    <Link
                      href="/login"
                      className="btn-secondary flex-1 text-center"
                      onClick={() => setMenuOpen(false)}
                    >
                      로그인
                    </Link>
                    <Link
                      href="/signup"
                      className="btn-primary flex-1 text-center"
                      onClick={() => setMenuOpen(false)}
                    >
                      회원가입
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
