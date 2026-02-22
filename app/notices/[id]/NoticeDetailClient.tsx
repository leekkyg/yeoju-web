"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";

export default function NoticeDetailClient({ noticeId }: { noticeId: string }) {
  const router = useRouter();
  const { theme, mounted } = useTheme();

  useEffect(() => {
    // 메인 공지사항 페이지로 리다이렉트하면서 해당 공지 열기
    router.replace(`/notices?id=${noticeId}`);
  }, [noticeId, router]);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#121212' }}>
        <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#d4af37' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.bgMain }}>
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{ borderColor: theme.accent }} />
        <p style={{ color: theme.textMuted }}>공지사항 로딩 중...</p>
      </div>
    </div>
  );
}
