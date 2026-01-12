"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function NoticeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [notice, setNotice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [prevNotice, setPrevNotice] = useState<any>(null);
  const [nextNotice, setNextNotice] = useState<any>(null);
  
  // 라이트박스
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  useEffect(() => {
    fetchNotice();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      setUser(user);
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("*").eq("email", user.email).single();
        setUserProfile(profile);
      }
    });
  }, [params.id]);

  const fetchNotice = async () => {
    setLoading(true);
    const id = Number(params.id);
    
    const { data } = await supabase
      .from("notices")
      .select("*")
      .eq("id", id)
      .single();
    
    if (data) {
      setNotice(data);
      
      // 조회수 증가
      await supabase
        .from("notices")
        .update({ view_count: (data.view_count || 0) + 1 })
        .eq("id", id);
      
      // 이전글
      const { data: prev } = await supabase
        .from("notices")
        .select("id, title")
        .lt("id", id)
        .order("id", { ascending: false })
        .limit(1)
        .single();
      setPrevNotice(prev);
      
      // 다음글
      const { data: next } = await supabase
        .from("notices")
        .select("id, title")
        .gt("id", id)
        .order("id", { ascending: true })
        .limit(1)
        .single();
      setNextNotice(next);
    }
    
    setLoading(false);
  };

  const formatDate = (d: string) => {
    return new Date(d).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleDelete = async () => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    await supabase.from("notices").delete().eq("id", notice.id);
    router.push("/notices");
  };

  // 콘텐츠 렌더링 (유튜브, 링크 파싱)
  const renderContent = (content: string) => {
    if (!content) return null;
    
    const parts = content.split(/(\[youtube:[^\]]+\]|\[link:[^\]]+\])/g);
    
    return parts.map((part, index) => {
      // 유튜브
      const youtubeMatch = part.match(/\[youtube:([^\]]+)\]/);
      if (youtubeMatch) {
        const videoId = youtubeMatch[1];
        return (
          <div key={index} className="my-4 aspect-video rounded-xl overflow-hidden bg-black">
            <iframe
              src={`https://www.youtube.com/embed/${videoId}`}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        );
      }
      
      // 링크
      const linkMatch = part.match(/\[link:([^|]+)\|([^\]]+)\]/);
      if (linkMatch) {
        const [, url, text] = linkMatch;
        return (
          <a
            key={index}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            {text}
          </a>
        );
      }
      
      // 일반 텍스트 (URL 자동 링크)
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const textParts = part.split(urlRegex);
      
      return textParts.map((textPart, textIndex) => {
        if (urlRegex.test(textPart)) {
          return (
            <a
              key={`${index}-${textIndex}`}
              href={textPart}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline break-all"
            >
              {textPart}
            </a>
          );
        }
        return <span key={`${index}-${textIndex}`}>{textPart}</span>;
      });
    });
  };

  const isAdmin = userProfile?.role === "admin";
  const images = notice?.images || [];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!notice) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">공지사항을 찾을 수 없습니다</p>
          <Link href="/notices" className="text-amber-600 font-bold">
            목록으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-24 md:pb-10">
      {/* 라이트박스 */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 bg-black z-[200] flex items-center justify-center"
          onClick={() => setLightboxImage(null)}
        >
          <button className="absolute top-4 right-4 text-white text-4xl z-10">×</button>
          <img src={lightboxImage} alt="" className="max-w-full max-h-full object-contain" />
        </div>
      )}

      {/* 헤더 */}
      <header className="bg-gray-900 sticky top-0 z-50">
        <div className="max-w-[631px] mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="text-gray-400 hover:text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-white font-bold text-lg">공지사항</h1>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-3">
              <Link href={`/notices/edit/${notice.id}`} className="text-gray-400 hover:text-white text-sm">
                수정
              </Link>
              <button onClick={handleDelete} className="text-red-400 hover:text-red-300 text-sm">
                삭제
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-[631px] mx-auto pt-4">
        <div className="bg-white mx-4 rounded-xl shadow-md overflow-hidden">
          {/* 제목 영역 */}
          <div className="px-4 py-5 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              {notice.is_pinned && (
                <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-bold bg-amber-100 px-2 py-1 rounded">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
                  </svg>
                  중요
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-gray-900 leading-tight">{notice.title}</h1>
            <div className="flex items-center gap-3 mt-4 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">관</span>
                </div>
                <span className="font-medium text-gray-700">{notice.author_nickname || "관리자"}</span>
              </div>
              <span className="text-gray-300">|</span>
              <span>{formatDate(notice.created_at)}</span>
              <span className="text-gray-300">|</span>
              <span>조회 {notice.view_count || 0}</span>
            </div>
          </div>

          {/* 본문 */}
          <div className="px-4 py-6">
            {/* 이미지 */}
            {images.length > 0 && (
              <div className="mb-6 space-y-3">
                {images.map((img: string, idx: number) => (
                  <img 
                    key={idx} 
                    src={img} 
                    alt="" 
                    className="w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setLightboxImage(img)}
                  />
                ))}
              </div>
            )}
            
            {/* 텍스트 콘텐츠 */}
            <div className="text-gray-800 whitespace-pre-wrap leading-relaxed">
              {renderContent(notice.content)}
            </div>
          </div>

          {/* 이전글/다음글 */}
          <div className="border-t border-gray-200">
            {nextNotice && (
              <Link
                href={`/notices/${nextNotice.id}`}
                className="flex items-center px-4 py-3 hover:bg-gray-50 border-b border-gray-100"
              >
                <div className="flex items-center gap-2 w-20 flex-shrink-0">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                  <span className="text-sm text-gray-500">다음글</span>
                </div>
                <span className="text-gray-900 truncate">{nextNotice.title}</span>
              </Link>
            )}
            {prevNotice && (
              <Link
                href={`/notices/${prevNotice.id}`}
                className="flex items-center px-4 py-3 hover:bg-gray-50"
              >
                <div className="flex items-center gap-2 w-20 flex-shrink-0">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  <span className="text-sm text-gray-500">이전글</span>
                </div>
                <span className="text-gray-900 truncate">{prevNotice.title}</span>
              </Link>
            )}
          </div>
        </div>

        {/* 목록 버튼 */}
        <div className="p-4">
          <Link
            href="/notices"
            className="block w-full py-3 bg-gray-900 text-white font-bold rounded-xl text-center"
          >
            목록으로
          </Link>
        </div>
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
