"use client";

import Link from "next/link";
import { useTheme } from "@/contexts/ThemeContext";
import { Bell, Sun, Moon, Home } from "lucide-react";

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  showHome?: boolean;
  showThemeToggle?: boolean;
  showNotification?: boolean;
  unreadCount?: number;
}

export default function Header({
  title,
  showBack = false,
  showHome = true,
  showThemeToggle = true,
  showNotification = true,
  unreadCount = 0,
}: HeaderProps) {
  const { theme, isDark, toggleTheme } = useTheme();

  return (
    <header
      className="sticky top-0 z-50 transition-colors duration-300"
      style={{
        backgroundColor: theme.bgCard,
        borderBottom: `1px solid ${theme.borderLight}`,
      }}
    >
      <div className="max-w-[631px] mx-auto px-4 h-14 flex items-center justify-between">
        {/* 왼쪽 영역 - 로고 */}
        <div className="flex items-center gap-2">
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

        {/* 오른쪽 영역 - 다크모드, 홈, 알림 */}
        <div className="flex items-center gap-1">
          {/* 다크/라이트 모드 토글 */}
          {showThemeToggle && (
            <button
              onClick={toggleTheme}
              className="w-10 h-10 flex items-center justify-center rounded-full transition-colors hover:bg-black/5 dark:hover:bg-white/10"
              title={isDark ? "라이트 모드" : "다크 모드"}
            >
              {isDark ? (
                <Sun className="w-5 h-5" style={{ color: theme.accent }} strokeWidth={1.5} />
              ) : (
                <Moon className="w-5 h-5" style={{ color: theme.accent }} strokeWidth={1.5} />
              )}
            </button>
          )}

          {/* 홈 버튼 */}
          {showHome && (
            <Link
              href="/"
              className="w-10 h-10 flex items-center justify-center rounded-full transition-colors hover:bg-black/5 dark:hover:bg-white/10"
              title="홈"
            >
              <Home className="w-5 h-5" style={{ color: theme.textSecondary }} strokeWidth={1.5} />
            </Link>
          )}

          {/* 알림 버튼 */}
          {showNotification && (
            <Link
              href="/notifications"
              className="relative w-10 h-10 flex items-center justify-center rounded-full transition-colors hover:bg-black/5 dark:hover:bg-white/10"
              title="알림"
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
        </div>
      </div>
    </header>
  );
}