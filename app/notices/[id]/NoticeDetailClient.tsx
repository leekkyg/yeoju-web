"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import { createClient } from "@supabase/supabase-js";

interface Notice {
  id: number;
  title: string;
  content: string;
  author_nickname: string;
  view_count: number;
  is_pinned: boolean;
  created_at: string;
  images: string[] | null;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function NoticeDetailClient({ noticeId }: { noticeId: string }) {
  const router = useRouter();
  const { theme, isDark, mounted } = useTheme();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  useEffect(() => {
    const fetchNotice = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const numId = parseInt(noticeId);
        
        if (isNaN(numId)) {
          setError("잘못된 공지사항 ID입니다.");
          setLoading(false);
          return;
        }

        const { data, error: fetchError } = await supabase
          .from("notices")
          .select("*")
          .eq("id", numId)
          .single();

        if (fetchError) {
          setError("공지사항을 불러올 수 없습니다.");
          setLoading(false);
          return;
        }

        if (!data) {
          setError("공지사항을 찾을 수 없습니다.");
          setLoading(false);
          return;
        }

        setNotice(data);
        
        // 조회수 증가
        await supabase
          .from("notices")
          .update({ view_count: (data.view_count || 0) + 1 })
          .eq("id", numId);
          
      } catch (err) {
        setError("오류가 발생했습니다.");
      }
      
      setLoading(false);
    };

    if (noticeId) {
      fetchNotice();
    }
  }, [noticeId]);

  const formatFullDate = (d: string) => {
    return new Date(d).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderContent = (content: string) => {
    if (!content) return null;
    return content;
  };

  // 로딩 중 (theme 로드 전 또는 데이터 로딩 중)
  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF6F0]">
        <div className="w-8 h-8 border-4 border-[#C4A77D] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // 에러 또는 데이터 없음
  if (error || !notice) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4 bg-[#FAF6F0]">
        <p className="text-gray-700">{error || "공지사항을 찾을 수 없습니다."}</p>
        <button
          onClick={() => router.push("/?tab=notices")}
          className="px-4 py-2 rounded-lg bg-[#C4A77D] text-white"
        >
          공지사항 목록으로
        </button>
      </div>
    );
  }

  const images = notice.images || [];

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.bgMain }}>
      {/* 라이트박스 */}
      {lightboxImage && (
        <div
          className="fixed inset-0 bg-black z-[200] flex items-center justify-center"
          onClick={() => setLightboxImage(null)}
        >
          <button className="absolute top-4 right-4 text-white text-4xl z-10">×</button>
          <img src={lightboxImage} className="max-w-full max-h-full object-contain" alt="" />
        </div>
      )}

      {/* 헤더 */}
      <header
        className="sticky top-0 z-50 border-b"
        style={{ backgroundColor: theme.bgCard, borderColor: theme.border }}
      >
        <div className="max-w-[640px] mx-auto px-4 h-14 flex items-center">
          <button
            onClick={() => router.push("/?tab=notices")}
            className="flex items-center gap-3"
            style={{ color: theme.textSecondary }}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="font-bold text-lg" style={{ color: theme.textPrimary }}>공지사항</span>
          </button>
        </div>
      </header>

      {/* 본문 */}
      <main className="max-w-[640px] mx-auto">
        <div className="px-4 py-5 border-b" style={{ borderColor: theme.border, backgroundColor: theme.bgCard }}>
          {notice.is_pinned && (
            <div className="flex items-center gap-2 mb-3">
              <span
                className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded"
                style={{ backgroundColor: theme.accent, color: isDark ? "#121212" : "#fff" }}
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
                </svg>
                중요
              </span>
            </div>
          )}
          <h1 className="text-xl font-bold leading-tight" style={{ color: theme.textPrimary }}>
            {notice.title}
          </h1>
          <div className="flex items-center gap-3 mt-4 text-sm flex-wrap" style={{ color: theme.textMuted }}>
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: theme.accent }}
              >
                <span className="text-xs font-bold" style={{ color: isDark ? "#121212" : "#fff" }}>
                  관
                </span>
              </div>
              <span className="font-medium" style={{ color: theme.textSecondary }}>
                {notice.author_nickname || "관리자"}
              </span>
            </div>
            <span style={{ color: theme.border }}>|</span>
            <span>{formatFullDate(notice.created_at)}</span>
            <span style={{ color: theme.border }}>|</span>
            <span>조회 {notice.view_count || 0}</span>
          </div>
        </div>

        <div className="px-4 py-6" style={{ backgroundColor: theme.bgCard }}>
          {images.length > 0 && (
            <div className="mb-6 space-y-3">
              {images.map((img: string, idx: number) => (
                <img
                  key={idx}
                  src={img}
                  className="w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setLightboxImage(img)}
                  alt=""
                />
              ))}
            </div>
          )}
          <div className="whitespace-pre-wrap leading-relaxed" style={{ color: theme.textSecondary }}>
            {renderContent(notice.content)}
          </div>
        </div>

        {/* 목록으로 버튼 */}
        <div className="px-4 py-6">
          <button
            onClick={() => router.push("/?tab=notices")}
            className="block w-full py-3 text-center rounded-xl font-medium"
            style={{ backgroundColor: theme.bgCard, color: theme.textSecondary, border: `1px solid ${theme.border}` }}
          >
            목록으로
          </button>
        </div>
      </main>
    </div>
  );
}
