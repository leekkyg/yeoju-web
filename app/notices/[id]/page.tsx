"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/contexts/ThemeContext";
import { ArrowLeft, Pin, Eye, Clock, Home, Moon, Sun } from "lucide-react";
import { use } from "react";

interface Notice {
  id: number;
  title: string;
  content: string;
  is_pinned: boolean;
  author_nickname: string;
  view_count: number;
  created_at: string;
}

export default function NoticeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { theme, isDark, mounted, toggleTheme } = useTheme();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [otherNotices, setOtherNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotice();
    fetchOtherNotices();
  }, [id]);

  const fetchNotice = async () => {
    const { data, error } = await supabase
      .from("notices")
      .select("*")
      .eq("id", parseInt(id))
      .single();

    if (error || !data) {
      alert("공지사항을 찾을 수 없습니다");
      router.back();
      return;
    }

    // 조회수 증가
    await supabase
      .from("notices")
      .update({ view_count: data.view_count + 1 })
      .eq("id", parseInt(id));

    setNotice(data);
    setLoading(false);
  };

  const fetchOtherNotices = async () => {
    const { data } = await supabase
      .from("notices")
      .select("*")
      .neq("id", parseInt(id))
      .order("created_at", { ascending: false })
      .limit(5);

    if (data) {
      setOtherNotices(data);
    }
  };

  // Livere 스크립트 로드 및 테마 적용
  useEffect(() => {
    if (!loading && notice) {
      const existingScript = document.querySelector('script[src*="livere-widget"]');
      if (existingScript) {
        existingScript.remove();
      }

      const script = document.createElement("script");
      script.type = "module";
      script.src = "https://www.livere.org/livere-widget.js";
      document.body.appendChild(script);

      // Livere CSS 오버라이드
      const style = document.createElement("style");
      style.id = "livere-theme-override";
      style.textContent = `
        livere-comment {
          ${isDark ? `
            --livere-bg: ${theme.bgCard};
            --livere-text: ${theme.textPrimary};
            --livere-border: ${theme.border};
          ` : `
            --livere-bg: #ffffff;
            --livere-text: #000000;
            --livere-border: #e5e7eb;
          `}
        }
      `;
      document.head.appendChild(style);

      return () => {
        const scriptToRemove = document.querySelector('script[src*="livere-widget"]');
        if (scriptToRemove) scriptToRemove.remove();
        const styleToRemove = document.getElementById("livere-theme-override");
        if (styleToRemove) styleToRemove.remove();
      };
    }
  }, [loading, notice, isDark, theme]);

  if (!mounted) return null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.bgMain }}>
        <div 
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: theme.accent, borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  if (!notice) return null;

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
        <div className="max-w-[631px] mx-auto h-full flex items-center justify-between px-4">
          <button onClick={() => router.back()} className="p-2 -ml-2">
            <ArrowLeft className="w-5 h-5" style={{ color: theme.textPrimary }} />
          </button>
          <h1 className="font-bold text-lg" style={{ color: theme.textPrimary }}>
            공지사항
          </h1>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => router.push("/")}
              className="p-2 rounded-lg transition-colors"
              style={{ color: theme.textPrimary }}
            >
              <Home className="w-5 h-5" />
            </button>
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-lg transition-colors"
              style={{ color: theme.textPrimary }}
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* 내용 */}
      <main className="pt-14 pb-16 max-w-[631px] mx-auto px-4">
        {/* 1. 본문 내용 */}
        <div 
          className="my-4 rounded-2xl shadow-sm p-6"
          style={{ 
            backgroundColor: theme.bgCard,
            border: `1px solid ${theme.border}`
          }}
        >
          {notice.is_pinned && (
            <div 
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg mb-4"
              style={{ 
                backgroundColor: isDark ? 'rgba(251, 146, 60, 0.15)' : 'rgba(251, 146, 60, 0.1)',
                border: `1px solid ${isDark ? 'rgba(251, 146, 60, 0.3)' : 'rgba(251, 146, 60, 0.2)'}`,
                color: '#fb923c'
              }}
            >
              <Pin className="w-3.5 h-3.5" />
              <span className="text-xs font-bold">중요 공지</span>
            </div>
          )}

          <h2 
            className="text-2xl font-bold mb-4"
            style={{ color: theme.textPrimary }}
          >
            {notice.title}
          </h2>

          <div 
            className="flex items-center gap-3 text-sm mb-6 pb-4" 
            style={{ color: theme.textMuted, borderBottom: `1px solid ${theme.border}` }}
          >
            <span>{notice.author_nickname}</span>
            <span className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              {notice.view_count}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {new Date(notice.created_at).toLocaleDateString()}
            </span>
          </div>

          <div 
            className="prose max-w-none leading-relaxed"
            style={{ color: theme.textPrimary }}
            dangerouslySetInnerHTML={{ __html: notice.content }}
          />
        </div>

        {/* 2. 댓글 */}
        <div 
          className="my-4 rounded-2xl shadow-sm p-6"
          style={{ 
            backgroundColor: theme.bgCard,
            border: `1px solid ${theme.border}`
          }}
        >
          <h3 
            className="text-lg font-bold mb-4"
            style={{ color: theme.textPrimary }}
          >
            댓글
          </h3>
                    <div style={{
            backgroundColor: isDark ? theme.bgCard : '#FFFFFF',
            color: isDark ? theme.textPrimary : '#000000'
          }}>
            <div dangerouslySetInnerHTML={{
              __html: '<livere-comment client-id="gSoyK4WDjal75heUDfIB"></livere-comment>'
            }} />
          </div>

        </div>

        {/* 3. 다른 공지사항 목록 */}
        {otherNotices.length > 0 && (
          <div 
            className="my-4 rounded-2xl shadow-sm overflow-hidden"
            style={{ 
              backgroundColor: theme.bgCard,
              border: `1px solid ${theme.border}`
            }}
          >
            <div className="px-6 py-4" style={{ borderBottom: `1px solid ${theme.border}` }}>
              <h3 
                className="text-base font-bold"
                style={{ color: theme.textPrimary }}
              >
                다른 공지사항
              </h3>
            </div>
            <div>
              {otherNotices.map((item, index) => (
                <div
                  key={item.id}
                  onClick={() => {
                    router.push(`/notices/${item.id}`);
                    window.scrollTo(0, 0);
                  }}
                  className="px-6 py-4 cursor-pointer transition-colors hover:opacity-80"
                  style={{ 
                    borderBottom: index < otherNotices.length - 1 ? `1px solid ${theme.border}` : 'none'
                  }}
                >
                  <div className="flex items-start gap-2 mb-1">
                    {item.is_pinned && (
                      <span 
                        className="px-1.5 py-0.5 text-xs font-bold rounded"
                        style={{ 
                          backgroundColor: `${theme.accent}15`,
                          color: theme.accent 
                        }}
                      >
                        <Pin className="w-2.5 h-2.5 inline" />
                      </span>
                    )}
                    <h4 
                      className="font-medium text-sm flex-1 line-clamp-1"
                      style={{ color: theme.textPrimary }}
                    >
                      {item.title}
                    </h4>
                  </div>
                  <div className="flex items-center gap-2 text-xs" style={{ color: theme.textMuted }}>
                    <span>{item.author_nickname}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {item.view_count}
                    </span>
                    <span>·</span>
                    <span>{new Date(item.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
