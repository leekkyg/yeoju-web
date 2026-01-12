"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";

export default function BookmarksPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [bookmarkedPosts, setBookmarkedPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUserAndFetch();
  }, []);

  const checkUserAndFetch = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      router.push("/login");
      return;
    }
    
    setUser(user);
    await fetchBookmarkedPosts(user.id);
    setLoading(false);
  };

  const fetchBookmarkedPosts = async (userId: string) => {
    // 1. 북마크 목록만 먼저 조회
    const { data: bookmarks, error: bookmarkError } = await supabase
      .from("post_bookmarks")
      .select("post_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    
    if (bookmarkError) {
      console.error("북마크 조회 에러:", bookmarkError);
      setBookmarkedPosts([]);
      return;
    }
    
    if (!bookmarks || bookmarks.length === 0) {
      setBookmarkedPosts([]);
      return;
    }
    
    // 2. post_id 목록으로 게시글 조회
    const postIds = bookmarks.map(b => b.post_id);
    const { data: posts, error: postsError } = await supabase
      .from("posts")
      .select("id, content, created_at, user_id, is_anonymous, like_count, comment_count, images")
      .in("id", postIds);
    
    if (postsError) {
      console.error("게시글 조회 에러:", postsError);
    }
    
    // 3. 북마크 순서대로 정렬 + 삭제된 글 표시
    const postsMap = new Map((posts || []).map(p => [p.id, p]));
    const result = bookmarks.map(b => {
      const post = postsMap.get(b.post_id);
      if (post) {
        return { 
          ...post, 
          bookmarked_at: b.created_at, 
          is_deleted: false 
        };
      } else {
        return { 
          id: b.post_id, 
          bookmarked_at: b.created_at, 
          is_deleted: true 
        };
      }
    });
    
    setBookmarkedPosts(result);
  };

  const removeBookmark = async (postId: number) => {
    if (!user) return;
    await supabase.from("post_bookmarks").delete().eq("user_id", user.id).eq("post_id", postId);
    setBookmarkedPosts(prev => prev.filter(p => p.id !== postId));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return "방금 전";
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;
    return date.toLocaleDateString("ko-KR");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* 헤더 */}
      <header className="bg-white sticky top-0 z-50 border-b border-gray-100">
        <div className="max-w-[631px] mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-gray-900 font-bold text-lg">저장한 글</h1>
          <span className="text-gray-500 text-sm">({bookmarkedPosts.length})</span>
        </div>
      </header>

      <main className="max-w-[631px] mx-auto">
        {bookmarkedPosts.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-6xl mb-4">🔖</div>
            <p className="text-gray-500 text-lg font-medium">저장한 글이 없습니다</p>
            <p className="text-gray-400 text-sm mt-2">게시글의 메뉴(⋮)에서 저장할 수 있어요</p>
            <Link 
              href="/community" 
              className="inline-block mt-4 px-6 py-3 bg-emerald-500 text-white font-semibold rounded-xl"
            >
              커뮤니티 가기
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {bookmarkedPosts.map((post, index) => (
              <div key={post.id} className="bg-white">
                {post.is_deleted ? (
                  // 삭제된 글
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold text-sm">{index + 1}</span>
                      </div>
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                        <span className="text-gray-400">🗑️</span>
                      </div>
                      <div>
                        <p className="text-gray-400 font-medium">삭제된 게시글입니다</p>
                        <p className="text-gray-300 text-xs mt-1">저장일: {formatDate(post.bookmarked_at)}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeBookmark(post.id)}
                      className="px-3 py-1.5 text-sm text-red-500 bg-red-50 rounded-lg"
                    >
                      제거
                    </button>
                  </div>
                ) : (
                  // 정상 글
                  <div className="relative">
                    <Link
                      href={`/community?post=${post.id}`}
                      className="block p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex gap-3">
                        {/* 썸네일 */}
                        {/* 순번 */}
                        <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-bold text-sm">{index + 1}</span>
                        </div>
                        
                        {/* 썸네일 */}
                        {(() => {
                          // 이미지 확인
                          let images: string[] = [];
                          try {
                            if (post.images) {
                              images = typeof post.images === 'string' ? JSON.parse(post.images) : post.images;
                            }
                          } catch (e) {}
                          
                          // 유튜브 ID 추출
                          const getYoutubeId = (text: string) => {
                            const match = text?.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
                            return match ? match[1] : null;
                          };
                          const youtubeId = getYoutubeId(post.content || '');
                          
                          // 동영상 링크 확인 (다음TV, 네이버TV 등)
                          const hasVideo = post.content?.match(/v\.daum\.net|tv\.naver\.com|vimeo\.com/);
                          
                          if (images.length > 0) {
                            return (
                              <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                                <img src={images[0]} alt="" className="w-full h-full object-cover" />
                              </div>
                            );
                          } else if (youtubeId) {
                            return (
                              <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 relative">
                                <img src={`https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`} alt="" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                  <div className="w-5 h-5 bg-red-600 rounded-full flex items-center justify-center">
                                    <svg className="w-2.5 h-2.5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                  </div>
                                </div>
                              </div>
                            );
                          } else if (hasVideo) {
                            return (
                              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <span className="text-xl">🎬</span>
                              </div>
                            );
                          } else {
                            return (
                              <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0">
                                <span className="text-xl">📝</span>
                              </div>
                            );
                          }
                        })()}
                        
                        {/* 내용 */}
                        <div className="flex-1 min-w-0 pr-8">
                          <p className="text-gray-900 line-clamp-2">{post.content}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                            <span>{formatDate(post.bookmarked_at)} 저장</span>
                            <span>❤️ {post.like_count || 0}</span>
                            <span>💬 {post.comment_count || 0}</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                    
                    {/* 삭제 버튼 */}
                    <button
                      onClick={() => removeBookmark(post.id)}
                      className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
