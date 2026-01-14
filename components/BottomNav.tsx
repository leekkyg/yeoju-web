"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import { Home, MessageCircle, Newspaper, Video, User } from "lucide-react";

export default function BottomNav() {
  const pathname = usePathname();
  const { theme, isDark } = useTheme();
  
  const navItems = [
    { href: "/", icon: Home, label: "홈" },
    { href: "/community", icon: MessageCircle, label: "커뮤니티" },
    { href: "/news", icon: Newspaper, label: "소식" },
    { href: "/videos", icon: Video, label: "영상" },
    { href: "/mypage", icon: User, label: "MY" },
  ];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 transition-colors duration-300"
      style={{ 
        backgroundColor: theme.bgCard,
        borderTop: `1px solid ${theme.borderLight}`,
      }}
    >
      <div className="max-w-[631px] mx-auto flex justify-around items-center h-16 pb-safe">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center gap-1 px-4 py-2 transition-colors"
            >
              <Icon 
                className="w-5 h-5 transition-colors" 
                strokeWidth={active ? 2 : 1.5}
                style={{ color: active ? theme.accent : theme.textMuted }}
              />
              <span 
                className="text-[10px] font-semibold transition-colors"
                style={{ color: active ? theme.accent : theme.textMuted }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
