"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function NewsPage() {
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

  return (
    <div className="min-h-screen bg-gray-100 pb-24">
      <header className="bg-gray-900 sticky top-0 z-50">
        <div className="max-w-[631px] mx-auto px-4 h-14 flex items-center">
          <Link href="/" className="text-gray-400 hover:text-white mr-3">←</Link>
          <h1 className="text-white font-bold text-lg">여주 소식</h1>
        </div>
      </header>

      <main className="max-w-[631px] mx-auto px-4 py-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : news.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl shadow-md">
            <p className="text-gray-500 font-medium">아직 소식이 없습니다</p>
          </div>
        ) : (
          <div className="space-y-3">
            {news.map((item) => (
              <a key={item.id} href={item.link} target="_blank" rel="noopener noreferrer" className="block bg-white rounded-xl p-4 shadow-md hover:shadow-lg transition-all">
                <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">{item.title}</h3>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">{item.source}</span>
                  <span>{formatDate(item.created_at)}</span>
                  <span className="ml-auto text-amber-600">→ 기사보기</span>
                </div>
              </a>
            ))}
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 z-50">
        <div className="flex max-w-[631px] mx-auto">
          <Link href="/" className="flex-1 py-3 text-center text-xs text-gray-500">홈</Link>
          <Link href="/community" className="flex-1 py-3 text-center text-xs text-gray-500">커뮤니티</Link>
          <Link href="/news" className="flex-1 py-3 text-center text-xs text-amber-500 font-bold">소식</Link>
          <Link href="/videos" className="flex-1 py-3 text-center text-xs text-gray-500">영상</Link>
          <Link href="/mypage" className="flex-1 py-3 text-center text-xs text-gray-500">MY</Link>
        </div>
      </nav>
    </div>
  );
}