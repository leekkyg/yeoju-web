"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/contexts/ThemeContext";
import { ArrowLeft, Newspaper, ExternalLink } from "lucide-react";
import BottomNav from "@/components/BottomNav";

export default function NewsPage() {
  const { theme, isDark, mounted } = useTheme();
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("news")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    setNews(data || []);
    setLoading(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.bgMain }}>
        <div className="w-10 h-10 border-2 rounded-full animate-spin" style={{ borderColor: theme.border, borderTopColor: theme.accent }}></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 transition-colors duration-300" style={{ backgroundColor: theme.bgMain }}>
      {/* 헤더 */}
      <header className="sticky top-0 z-50" style={{ backgroundColor: theme.bgMain, borderBottom: `1px solid ${theme.borderLight}` }}>
        <div className="max-w-[640px] mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="p-1 -ml-1 rounded-lg" style={{ color: theme.textPrimary }}>
            <ArrowLeft className="w-6 h-6" strokeWidth={1.5} />
          </Link>
          <h1 className="text-lg font-bold" style={{ color: theme.textPrimary }}>📰 여주 뉴스</h1>
        </div>
      </header>

      <main className="max-w-[640px] mx-auto px-4 py-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-2 rounded-full animate-spin" style={{ borderColor: theme.border, borderTopColor: theme.accent }}></div>
          </div>
        ) : news.length === 0 ? (
          <div className="rounded-2xl py-16 text-center" style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}>
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: theme.bgInput }}>
              <Newspaper className="w-7 h-7" style={{ color: theme.textMuted }} strokeWidth={1.5} />
            </div>
            <p className="font-medium" style={{ color: theme.textPrimary }}>아직 뉴스가 없습니다</p>
            <p className="text-sm mt-1" style={{ color: theme.textMuted }}>새로운 뉴스가 등록되면 알려드릴게요</p>
          </div>
        ) : (
          <div className="space-y-3">
            {news.map((item) => (
              <a 
                key={item.id} 
                href={item.link} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="block rounded-2xl p-4 transition-all"
                style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}
              >
                <h3 className="font-bold mb-2 line-clamp-2" style={{ color: theme.textPrimary }}>{item.title}</h3>
                <div className="flex items-center gap-2 text-xs">
                  <span 
                    className="px-2 py-0.5 rounded font-medium"
                    style={{ backgroundColor: `${theme.accent}20`, color: theme.accent }}
                  >
                    {item.source}
                  </span>
                  <span style={{ color: theme.textMuted }}>{formatDate(item.created_at)}</span>
                  <span className="ml-auto flex items-center gap-1" style={{ color: theme.accent }}>
                    <ExternalLink className="w-3 h-3" strokeWidth={1.5} />
                    기사보기
                  </span>
                </div>
              </a>
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
