"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/contexts/ThemeContext";
import { ArrowLeft, Pin, Eye } from "lucide-react";

interface Notice {
  id: number;
  title: string;
  content: string;
  is_pinned: boolean;
  author_nickname: string;
  view_count: number;
  created_at: string;
}

export default function NoticesPage() {
  const router = useRouter();
  const { theme, isDark, mounted } = useTheme();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotices();
  }, []);

  const fetchNotices = async () => {
    const { data, error } = await supabase
      .from("notices")
      .select("*")
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    if (!error && data) {
      setNotices(data);
    }
    setLoading(false);
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.bgMain }}>
      {/* 헤더 */}
      <header 
        className="fixed top-0 left-0 right-0 z-50 h-14"
        style={{ 
          backgroundColor: theme.bgMain,
          borderBottom: `1px solid ${theme.border}`
        }}
      >
        <div className="max-w-[631px] mx-auto h-full flex items-center px-4">
          <button onClick={() => router.back()} className="p-2 -ml-2">
            <ArrowLeft className="w-5 h-5" style={{ color: theme.textPrimary }} />
          </button>
          <h1 className="flex-1 text-center font-bold text-lg" style={{ color: theme.textPrimary }}>
            공지사항
          </h1>
          <div className="w-9" />
        </div>
      </header>

      {/* 목록 */}
      <main className="pt-14 pb-16 max-w-[631px] mx-auto">
        <div className="px-4 py-3" style={{ borderBottom: `1px solid ${theme.border}` }}>
          <span className="text-sm" style={{ color: theme.textMuted }}>
            총 {notices.length}개의 공지
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div 
              className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: theme.accent, borderTopColor: 'transparent' }}
            />
          </div>
        ) : notices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32">
            <p className="text-lg font-medium" style={{ color: theme.textMuted }}>
              등록된 공지사항이 없습니다
            </p>
          </div>
        ) : (
          <div>
            {notices.map((notice) => (
              <div
                key={notice.id}
                onClick={() => router.push(`/notices/${notice.id}`)}
                className="px-4 py-4 cursor-pointer transition-colors"
                style={{ borderBottom: `1px solid ${theme.border}` }}
              >
                <div className="flex items-start gap-2 mb-2">
                  {notice.is_pinned && (
                    <span 
                      className="px-2 py-0.5 text-xs font-bold rounded"
                      style={{ 
                        backgroundColor: `${theme.accent}20`,
                        color: theme.accent 
                      }}
                    >
                      <Pin className="w-3 h-3 inline mr-1" />
                      고정
                    </span>
                  )}
                  <h3 
                    className="font-semibold text-base flex-1"
                    style={{ color: theme.textPrimary }}
                  >
                    {notice.title}
                  </h3>
                </div>
                <div className="flex items-center gap-3 text-xs" style={{ color: theme.textMuted }}>
                  <span>{notice.author_nickname}</span>
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {notice.view_count}
                  </span>
                  <span>{new Date(notice.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
