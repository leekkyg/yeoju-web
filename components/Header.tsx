"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/lib/supabase";
import { Bell, Sun, Moon, ArrowLeft, MoreVertical, Home, User } from "lucide-react";

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  showHome?: boolean;
  showThemeToggle?: boolean;
  showNotification?: boolean;
  showProfile?: boolean;
  showMore?: boolean;
  unreadCount?: number;
  rightElement?: React.ReactNode;
}

export default function Header({
  title,
  showBack = false,
  showHome = true,
  showThemeToggle = true,
  showNotification = true,
  showProfile = true,
  showMore = false,
  unreadCount = 0,
  rightElement,
}: HeaderProps) {
  const { theme, isDark, toggleTheme } = useTheme();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
      setUser(user);
      
      if (user) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("nickname, avatar_url")
          .eq("id", user.id)
          .single();
        setProfile(profileData);
      }
      setLoading(false);
    };

    fetchUser();

    // 로그인/로그아웃 상태 변화 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("nickname, avatar_url")
          .eq("id", session.user.id)
          .single();
        setProfile(profileData);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <header
      className="sticky top-0 z-50 transition-colors duration-300"
      style={{
        backgroundColor: theme.bgCard,
        borderBottom: `1px solid ${theme.borderLight}`,
      }}
    >
      <div className="max-w-[631px] mx-auto px-4 h-14 flex items-center justify-between">
        {/* 왼쪽 영역 */}
        <div className="flex items-center gap-2">
          {showBack ? (
            <button
              onClick={() => window.history.back()}
              className="w-10 h-10 flex items-center justify-center rounded-full transition-colors"
              style={{ color: theme.textPrimary }}
            >
              <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
            </button>
          ) : null}
          
          {title ? (
            <h1 className="font-bold text-lg" style={{ color: theme.textPrimary }}>
              {title}
            </h1>
          ) : (
            <Link href="/" className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${theme.accent}, ${theme.accentDark})`,
                }}
              >
                <span
                  className="font-bold text-sm"
                  style={{ color: isDark ? "#121212" : "#FFFFFF" }}
                >
                  여
                </span>
              </div>
              <span className="font-bold text-lg" style={{ color: theme.textPrimary }}>
                여주모아
              </span>
            </Link>
          )}
        </div>

        {/* 오른쪽 영역 */}
        <div className="flex items-center gap-1">
          {showThemeToggle && (
            <button
              onClick={toggleTheme}
              className="w-10 h-10 flex items-center justify-center rounded-full transition-colors"
            >
              {isDark ? (
                <Sun className="w-5 h-5" style={{ color: theme.accent }} strokeWidth={1.5} />
              ) : (
                <Moon className="w-5 h-5" style={{ color: theme.accent }} strokeWidth={1.5} />
              )}
            </button>
          )}

          {showHome && (
            <Link
              href="/"
              className="w-10 h-10 flex items-center justify-center rounded-full transition-colors"
            >
              <Home className="w-5 h-5" style={{ color: theme.textSecondary }} strokeWidth={1.5} />
            </Link>
          )}

          {showNotification && (
            <Link
              href="/notifications"
              className="relative w-10 h-10 flex items-center justify-center rounded-full transition-colors"
            >
              <Bell className="w-5 h-5" style={{ color: theme.textSecondary }} strokeWidth={1.5} />
              {unreadCount > 0 && (
                <span
                  className="absolute top-1 right-1 w-4 h-4 text-[10px] font-bold rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: theme.accent,
                    color: isDark ? "#121212" : "#FFFFFF",
                  }}
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
          )}

          {showMore && (
            <button
              className="w-10 h-10 flex items-center justify-center rounded-full transition-colors"
              style={{ color: theme.textSecondary }}
            >
              <MoreVertical className="w-5 h-5" strokeWidth={1.5} />
            </button>
          )}

          {rightElement}

          {/* 프로필 아이콘 - 항상 표시 */}
          {showProfile && !loading && (
            user ? (
              <Link
                href="/mypage"
                className="w-9 h-9 rounded-full flex items-center justify-center overflow-hidden"
                style={{
                  backgroundColor: theme.bgElevated,
                  border: `2px solid ${theme.accent}`,
                }}
              >
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="font-semibold text-sm" style={{ color: theme.accent }}>
                    {profile?.nickname?.[0] || user.email?.[0]?.toUpperCase() || "?"}
                  </span>
                )}
              </Link>
            ) : (
              <Link
                href="/login"
                className="px-3 py-1.5 text-sm font-bold rounded-lg"
                style={{
                  background: `linear-gradient(135deg, ${theme.accent}, ${theme.accentDark})`,
                  color: isDark ? "#121212" : "#FFFFFF",
                }}
              >
                로그인
              </Link>
            )
          )}
        </div>
      </div>
    </header>
  );
}
