"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
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

  if (!mounted || loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: mounted ? theme.bgMain : "#252529" }}
      >
        <div
          className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin"
          style={{
            borderColor: theme?.accent || "#C4A77D",
            borderTopColor: "transparent",
          }}
        />
      </div>
    );
  }

  if (error || !notice) {
    return (
      <div
        className="min-h-screen flex items-center justify-center flex-col gap-4"
        style={{ backgroundColor: theme.bgMain }}
      >
        <p style={{ color: theme.textSecondary }}>
          {error || "공지사항을 찾을 수 없습니다."}
        </p>
        <button
          onClick={() => router.push("/?tab=notices")}
          className="px-4 py-2 rounded-lg"
          style={{
            backgroundColor: theme.accent,
            color: theme.btnPrimaryText,
          }}
        >
          공지사항 목록으로
        </button>
      </div>
    );
  }

  const images = notice.images || [];

  const livereHtml = `<livere-comment client-id="gSoyK4WDjal75heUDfIB" article-id="notice-${notice.id}"></livere-comment><script type="module" src="https://www.livere.org/livere-widget.js"><\/script>`;

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.bgMain }}>
      {lightboxImage && (
        <div
          className="fixed inset-0 bg-black z-[200] flex items-center justify-center"
          onClick={() => setLightboxImage(null)}
        >
          <button className="absolute top-4 right-4 text-white text-4xl z-10">
            ×
          </button>
          <img
            src={lightboxImage}
            className="max-w-full max-h-full object-contain"
            alt=""
          />
        </div>
      )}

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
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span
              className="font-bold text-lg"
              style={{ color: theme.textPrimary }}
            >
              공지사항
            </span>
          </button>
        </div>
      </header>

      <main className="max-w-[640px] mx-auto">
        <div
          className="px-4 py-5 border-b"
          style={{
            borderColor: theme.border,
            backgroundColor: theme.bgCard,
          }}
        >
          {notice.is_pinned && (
            <div className="flex items-center gap-2 mb-3">
              <span
                className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded"
                style={{
                  backgroundColor: theme.accent,
                  color: isDark ? "#121212" : "#fff",
                }}
              >
                <svg
                  className="w-3 h-3"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
                </svg>
                중요
              </span>
            </div>
          )}
          <h1
            className="text-xl font-bold leading-tight"
            style={{ color: theme.textPrimary }}
          >
            {notice.title}
          </h1>
          <div
            className="flex items-center gap-3 mt-4 text-sm flex-wrap"
            style={{ color: theme.textMuted }}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: theme.accent }}
              >
                <span
                  className="text-xs font-bold"
                  style={{ color: isDark ? "#121212" : "#fff" }}
                >
                  관
                </span>
              </div>
              <span
                className="font-medium"
                style={{ color: theme.textSecondary }}
              >
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
          <div
            className="whitespace-pre-wrap leading-relaxed"
            style={{ color: theme.textSecondary }}
          >
            {renderContent(notice.content)}
          </div>
        </div>

        <div className="mt-6 px-4">
          <h3
            className="text-base font-bold mb-4"
            style={{ color: theme.textPrimary }}
          >
            댓글
          </h3>
          <div
            className="rounded-xl overflow-hidden p-4"
            style={{
              backgroundColor: theme.bgCard,
              border: `1px solid ${theme.border}`,
            }}
          >
            <div
              id="livere-comments-notice"
              data-theme={isDark ? "dark" : "light"}
              style={
                isDark
                  ? { filter: "invert(0.88) hue-rotate(180deg)" }
                  : undefined
              }
              dangerouslySetInnerHTML={{ __html: livereHtml }}
            />
          </div>
        </div>

        <Script
          src="https://www.livere.org/livere-widget.js"
          strategy="lazyOnload"
          type="module"
        />

        <div className="px-4 py-6">
          <button
            onClick={() => router.push("/?tab=notices")}
            className="block w-full py-3 text-center rounded-xl font-medium"
            style={{
              backgroundColor: theme.bgCard,
              color: theme.textSecondary,
              border: `1px solid ${theme.border}`,
            }}
          >
            목록으로
          </button>
        </div>
      </main>

      <style jsx global>{`
        #livere-comments-notice[data-theme="dark"] img,
        #livere-comments-notice[data-theme="dark"] video,
        #livere-comments-notice[data-theme="dark"] svg,
        #livere-comments-notice[data-theme="dark"] iframe,
        #livere-comments-notice[data-theme="dark"] [class*="avatar"],
        #livere-comments-notice[data-theme="dark"] [class*="profile"],
        #livere-comments-notice[data-theme="dark"] [style*="background-image"] {
          filter: invert(1) hue-rotate(180deg) !important;
        }
      `}</style>
    </div>
  );
}
