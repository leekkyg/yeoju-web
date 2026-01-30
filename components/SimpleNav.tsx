"use client";

import Link from "next/link";
import { Home } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

export default function SimpleNav() {
  const { theme } = useTheme();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        backgroundColor: theme.bgCard,
        borderTop: `1px solid ${theme.borderLight}`,
      }}
    >
      <div className="max-w-[631px] mx-auto flex justify-center py-3">
        <Link
          href="/"
          className="flex flex-col items-center gap-1 px-8 py-2 rounded-xl transition-colors"
          style={{ backgroundColor: theme.bgInput }}
        >
          <Home className="w-6 h-6" style={{ color: theme.accent }} />
          <span className="text-xs font-medium" style={{ color: theme.accent }}>
            홈
          </span>
        </Link>
      </div>
    </nav>
  );
}
