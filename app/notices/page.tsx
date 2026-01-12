"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function NoticesPage() {
  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    fetchNotices();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      setUser(user);
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("*").eq("email", user.email).single();
        setUserProfile(profile);
      }
    });
  }, []);

  const fetchNotices = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("notices")
      .select("*")
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });
    setNotices(data || []);
    setLoading(false);
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / 86400000);
    
    if (days === 0) {
      return date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
    } else if (days < 7) {
      return `${days}일 전`;
    } else {
      return date.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\. /g, '.').replace('.', '');
    }
  };

  const isNew = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    return diff < 3 * 24 * 60 * 60 * 1000; // 3일 이내
  };

  const hasAttachments = (notice: any) => {
    const images = notice.images || [];
    const attachments = notice.attachments || [];
    return images.length > 0 || attachments.length > 0;
  };

  const isAdmin = userProfile?.role === "admin";

  return (
    <div className="min-h-screen bg-gray-100 pb-24 md:pb-10">
      {/* 헤더 */}
      <header className="bg-gray-900 sticky top-0 z-50">
        <div className="max-w-[631px] mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-white font-bold text-lg">공지사항</h1>
          </div>
          {isAdmin && (
            <Link href="/notices/write" className="px-4 py-1.5 bg-amber-500 text-gray-900 font-bold text-sm rounded-full">
              글쓰기
            </Link>
          )}
        </div>
      </header>

      <main className="max-w-[631px] mx-auto pt-4">
        {/* 상단 정보 */}
        <div className="px-4 mb-3 flex items-center justify-between">
          <span className="text-sm text-gray-500">총 {notices.length}개의 공지</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : notices.length === 0 ? (
          <div className="text-center py-20 bg-white mx-4 rounded-xl shadow-md">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-500">공지사항이 없습니다</p>
          </div>
        ) : (
          <div className="bg-white mx-4 rounded-xl shadow-md overflow-hidden">
            {notices.map((notice, index) => (
              <Link
                key={notice.id}
                href={`/notices/${notice.id}`}
                className={`flex items-start px-4 py-4 hover:bg-gray-50 transition-colors ${
                  index !== notices.length - 1 ? "border-b border-gray-100" : ""
                } ${notice.is_pinned ? "bg-amber-50/50" : ""}`}
              >
                {/* 번호 또는 고정 아이콘 */}
                <div className="w-10 flex-shrink-0">
                  {notice.is_pinned ? (
                    <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
                      </svg>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400 font-medium">{notices.length - index}</span>
                  )}
                </div>
                
                {/* 내용 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {notice.is_pinned && (
                      <span className="text-xs text-amber-600 font-bold bg-amber-100 px-1.5 py-0.5 rounded">중요</span>
                    )}
                    {isNew(notice.created_at) && !notice.is_pinned && (
                      <span className="text-xs text-red-500 font-bold bg-red-50 px-1.5 py-0.5 rounded">NEW</span>
                    )}
                    <h3 className={`text-gray-900 truncate ${notice.is_pinned ? "font-bold" : ""}`}>
                      {notice.title}
                    </h3>
                    {hasAttachments(notice) && (
                      <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs text-gray-400">{formatDate(notice.created_at)}</span>
                    <span className="text-xs text-gray-300">·</span>
                    <span className="text-xs text-gray-400">조회 {notice.view_count || 0}</span>
                  </div>
                </div>
                
                {/* 화살표 */}
                <svg className="w-5 h-5 text-gray-300 flex-shrink-0 ml-2 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* 하단 네비게이션 */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 z-50">
        <div className="flex">
          <Link href="/" className="flex-1 py-3 flex flex-col items-center gap-1">
            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs text-gray-500">홈</span>
          </Link>
          <Link href="/community" className="flex-1 py-3 flex flex-col items-center gap-1">
            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-xs text-gray-500">커뮤니티</span>
          </Link>
          <Link href="/market" className="flex-1 py-3 flex flex-col items-center gap-1">
            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <span className="text-xs text-gray-500">마켓</span>
          </Link>
          <Link href="/videos" className="flex-1 py-3 flex flex-col items-center gap-1">
            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs text-gray-500">영상</span>
          </Link>
          <Link href="/mypage" className="flex-1 py-3 flex flex-col items-center gap-1">
            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-xs text-gray-500">MY</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
