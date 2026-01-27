"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/contexts/ThemeContext";
import BottomNav from "@/components/BottomNav";
import {
  ArrowLeft,
  Bookmark,
  Heart,
  MessageCircle,
  Trash2,
  FileText,
  Play,
  Film,
} from "lucide-react";

export default function BookmarksPage() {
  const router = useRouter();
  const { theme, isDark, mounted } = useTheme();
  
  const [user, setUser] = useState<any>(null);
  const [bookmarkedPosts, setBookmarkedPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUserAndFetch();
  }, []);

  const checkUserAndFetch = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    
    if (!user) {
      router.push("/login");
      return;
    }
    
    setUser(user);
    await fetchBookmarkedPosts(user.id);
    setLoading(false);
  };

  const fetchBookmarkedPosts = async (userId: string) => {
    const { data: bookmarks, error: bookmarkError } = await supabase
      .from("post_bookmarks")
      .select("post_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    
    if (bookmarkError || !bookmarks || bookmarks.length === 0) {
      setBookmarkedPosts([]);
      return;
    }
    
    const postIds = bookmarks.map(b => b.post_id);
    const { data: posts } = await supabase
      .from("posts")
      .select("id, content, created_at, user_id, is_anonymous, like_count, comment_count, images")
      .in("id", postIds);
    
    const postsMap = new Map((posts || []).map(p => [p.id, p]));
    const result = bookmarks.map(b => {
      const post = postsMap.get(b.post_id);
      if (post) {
        return { ...post, bookmarked_at: b.created_at, is_deleted: false };
      } else {
        return { id: b.post_id, bookmarked_at: b.created_at, is_deleted: true };
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

  const getYoutubeId = (text: string) => {
    const match = text?.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
  };

  if (!mounted || loading) {
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
          <button onClick={() => router.back()} className="p-1 -ml-1 rounded-lg" style={{ color: theme.textPrimary }}>
            <ArrowLeft className="w-6 h-6" strokeWidth={1.5} />
          </button>
          <h1 className="text-lg font-bold" style={{ color: theme.textPrimary }}>저장한 글</h1>
          <span className="text-sm" style={{ color: theme.textMuted }}>({bookmarkedPosts.length})</span>
        </div>
      </header>

      <main className="max-w-[640px] mx-auto px-4 py-4">
        {bookmarkedPosts.length === 0 ? (
          <div className="rounded-2xl p-8 text-center" style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}>
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: theme.bgInput }}>
              <Bookmark className="w-7 h-7" style={{ color: theme.textMuted }} strokeWidth={1.5} />
            </div>
            <p className="text-lg font-medium mb-1" style={{ color: theme.textPrimary }}>저장한 글이 없습니다</p>
            <p className="text-sm mb-4" style={{ color: theme.textMuted }}>게시글의 메뉴(⋮)에서 저장할 수 있어요</p>
            <Link 
              href="/community" 
              className="inline-block px-6 py-3 rounded-xl font-semibold"
              style={{ backgroundColor: theme.accent, color: isDark ? '#121212' : '#FFFFFF' }}
            >
              커뮤니티 가기
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}>
            {bookmarkedPosts.map((post, index) => (
              <div key={post.id} style={{ borderBottom: index !== bookmarkedPosts.length - 1 ? `1px solid ${theme.border}` : 'none' }}>
                {post.is_deleted ? (
                  <div className="p-4 flex items-center justify-between" style={{ backgroundColor: theme.bgInput }}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.bgMain }}>
                        <span className="text-sm font-bold" style={{ color: theme.textMuted }}>{index + 1}</span>
                      </div>
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: theme.bgMain }}>
                        <Trash2 className="w-5 h-5" style={{ color: theme.textMuted }} strokeWidth={1.5} />
                      </div>
                      <div>
                        <p className="font-medium" style={{ color: theme.textMuted }}>삭제된 게시글입니다</p>
                        <p className="text-xs mt-0.5" style={{ color: theme.textMuted }}>저장일: {formatDate(post.bookmarked_at)}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeBookmark(post.id)}
                      className="px-3 py-1.5 text-sm rounded-lg font-medium"
                      style={{ backgroundColor: theme.redBg, color: theme.red }}
                    >
                      제거
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Link href={`/community?post=${post.id}`} className="block p-4 transition-colors">
                      <div className="flex gap-3">
                        {/* 순번 */}
                        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: theme.accent }}>
                          <span className="text-sm font-bold" style={{ color: isDark ? '#121212' : '#FFFFFF' }}>{index + 1}</span>
                        </div>
                        
                        {/* 썸네일 */}
                        {(() => {
                          let images: string[] = [];
                          try {
                            if (post.images) {
                              images = typeof post.images === 'string' ? JSON.parse(post.images) : post.images;
                            }
                          } catch (e) {}
                          
                          const youtubeId = getYoutubeId(post.content || '');
                          const hasVideo = post.content?.match(/v\.daum\.net|tv\.naver\.com|vimeo\.com/);
                          
                          if (images.length > 0) {
                            return (
                              <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0" style={{ backgroundColor: theme.bgInput }}>
                                <img src={images[0]} alt="" className="w-full h-full object-cover" />
                              </div>
                            );
                          } else if (youtubeId) {
                            return (
                              <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 relative" style={{ backgroundColor: theme.bgInput }}>
                                <img src={`https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`} alt="" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                  <div className="w-5 h-5 bg-red-600 rounded-full flex items-center justify-center">
                                    <Play className="w-2.5 h-2.5 text-white ml-0.5" fill="white" />
                                  </div>
                                </div>
                              </div>
                            );
                          } else if (hasVideo) {
                            return (
                              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${theme.accent}15` }}>
                                <Film className="w-5 h-5" style={{ color: theme.accent }} strokeWidth={1.5} />
                              </div>
                            );
                          } else {
                            return (
                              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: theme.bgInput }}>
                                <FileText className="w-5 h-5" style={{ color: theme.accent }} strokeWidth={1.5} />
                              </div>
                            );
                          }
                        })()}
                        
                        {/* 내용 */}
                        <div className="flex-1 min-w-0 pr-8">
                          <p className="line-clamp-2 text-sm" style={{ color: theme.textPrimary }}>{post.content}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs" style={{ color: theme.textMuted }}>
                            <span>{formatDate(post.bookmarked_at)} 저장</span>
                            <span className="flex items-center gap-0.5">
                              <Heart className="w-3 h-3" style={{ color: theme.red }} strokeWidth={1.5} />
                              {post.like_count || 0}
                            </span>
                            <span className="flex items-center gap-0.5">
                              <MessageCircle className="w-3 h-3" strokeWidth={1.5} />
                              {post.comment_count || 0}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                    
                    {/* 삭제 버튼 */}
                    <button
                      onClick={() => removeBookmark(post.id)}
                      className="absolute top-4 right-4 p-2 rounded-full transition-colors"
                      style={{ color: theme.accent }}
                    >
                      <Bookmark className="w-5 h-5" fill={theme.accent} strokeWidth={1.5} />
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
