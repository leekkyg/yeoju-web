"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/contexts/ThemeContext";

export default function CommunityDetailClient({ postId }: { postId: string }) {
  const router = useRouter();
  const { theme, mounted } = useTheme();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 메인 커뮤니티 페이지로 리다이렉트하면서 해당 게시물 열기
    // URL 파라미터로 postId 전달
    router.replace(`/community?post=${postId}`);
  }, [postId, router]);

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
        <p style={{ color: theme.textMuted }}>게시물 로딩 중...</p>
      </div>
    </div>
  );
}
