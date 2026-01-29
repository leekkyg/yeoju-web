"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/contexts/ThemeContext";
import { 
  ArrowLeft, Heart, MessageCircle, Bookmark, Share2, 
  MoreHorizontal, Send, Image as ImageIcon, X,
  ChevronLeft, ChevronRight, Trash2, ThumbsUp, Play
} from "lucide-react";

const R2_WORKER_URL = "https://yeoju-r2-worker.kkyg9300.workers.dev";

// 이미지 배열 안전하게 파싱
const parseImages = (images: any): string[] => {
  if (!images) return [];
  if (Array.isArray(images)) return images;
  if (typeof images === 'string') {
    try {
      const parsed = JSON.parse(images);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

// URL 추출
const extractLinks = (text: string): string[] => {
  const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/g;
  return text?.match(urlRegex) || [];
};

// 도메인 추출
const getDomain = (url: string): string => {
  try { return new URL(url).hostname.replace('www.', ''); } catch { return url; }
};

// 유튜브 ID 추출
const getYoutubeId = (url: string): string | null => {
  const match = url?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([^&\s?]+)/);
  return match ? match[1] : null;
};

// 유튜브 로고
const YoutubeLogo = () => (
  <svg viewBox="0 0 68 48" className="w-16 h-12">
    <path d="M66.52 7.74c-.78-2.93-3.07-5.24-6-6.03C55.18.13 34 0 34 0S12.82.13 7.48 1.71c-2.93.79-5.22 3.1-6 6.03C0 13.08 0 24 0 24s0 10.92 1.48 16.26c.78 2.93 3.07 5.24 6 6.03C12.82 47.87 34 48 34 48s21.18-.13 26.52-1.71c2.93-.79 5.22-3.1 6-6.03C68 34.92 68 24 68 24s0-10.92-1.48-16.26z" fill="#f00"/>
    <path d="M45 24L27 14v20" fill="#fff"/>
  </svg>
);

// 링크 프리뷰 캐시
const linkPreviewCache = new Map<string, any>();

export default function CommunityDetailClient({ postId }: { postId: string }) {
  const router = useRouter();
  const { theme, isDark, mounted } = useTheme();
  
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [bookmarked, setBookmarked] = useState(false);
  
  const [comments, setComments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  
  // 링크 프리뷰
  const [linkPreview, setLinkPreview] = useState<any>(null);
  const [playingYoutube, setPlayingYoutube] = useState(false);

  // 링크 프리뷰 가져오기
  const fetchLinkPreview = async (url: string) => {
    if (linkPreviewCache.has(url)) {
      setLinkPreview(linkPreviewCache.get(url));
      return;
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    try {
      const response = await fetch(
        `https://api.microlink.io/?url=${encodeURIComponent(url)}`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);
      
      // Content-Type 확인 (JSON인지 체크)
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Not JSON response');
      }
      
      const data = await response.json();
      
      if (data.status === 'success' && data.data) {
        const imageUrl = data.data.image?.url || data.data.logo?.url || null;
        const preview = { 
          title: data.data.title || getDomain(url), 
          description: data.data.description || '', 
          image: imageUrl,
          url, 
          domain: getDomain(url) 
        };
        linkPreviewCache.set(url, preview);
        setLinkPreview(preview);
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name !== 'AbortError') {
        console.error('Link preview error:', error);
      }
      const fallback = { title: getDomain(url), url, domain: getDomain(url), image: null, description: '' };
      linkPreviewCache.set(url, fallback);
      setLinkPreview(fallback);
    }
  };

  // 데이터 로드
  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      try {
        // 세션
        const { data: { session } } = await supabase.auth.getSession();
        const currentUser = session?.user || null;
        
        if (isMounted) {
          setUser(currentUser);
        }
        
        if (currentUser) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("email", currentUser.email)
            .single();
          if (isMounted) setUserProfile(profile);
        }
        
        // 게시글
        const { data: postData, error: postError } = await supabase
          .from("posts")
          .select("*")
          .eq("id", postId)
          .single();
        
        if (postError || !postData) {
          if (isMounted) {
            setError(true);
            setLoading(false);
          }
          return;
        }
        
        if (isMounted) {
          setPost(postData);
          setLikeCount(postData.like_count || 0);
          setLoading(false);
          
          // 링크 프리뷰 가져오기
          const urls = extractLinks(postData.content || '');
          if (urls.length > 0) {
            const youtubeId = getYoutubeId(urls[0]);
            if (!youtubeId) {
              fetchLinkPreview(urls[0]);
            }
          }
        }
        
        // 조회수 증가
        await supabase
          .from("posts")
          .update({ view_count: (postData.view_count || 0) + 1 })
          .eq("id", postId);
        
        // 좋아요/북마크 상태
        if (currentUser) {
          const [likeRes, bookmarkRes] = await Promise.all([
            supabase.from("likes").select("id").eq("post_id", postId).eq("user_id", currentUser.id).maybeSingle(),
            supabase.from("post_bookmarks").select("id").eq("post_id", postId).eq("user_id", currentUser.id).maybeSingle()
          ]);
          if (isMounted) {
            setLiked(!!likeRes.data);
            setBookmarked(!!bookmarkRes.data);
          }
        }
        
        // 댓글 로드
        await loadComments(currentUser, isMounted);
        
      } catch (err) {
        console.error("데이터 로드 오류:", err);
        if (isMounted) {
          setError(true);
          setLoading(false);
        }
      }
    };
    
    loadData();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) setUser(session?.user || null);
    });
    
    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [postId]);

  const loadComments = async (currentUser?: any, isMounted = true) => {
    if (isMounted) setLoadingComments(true);
    
    try {
      const { data, error } = await supabase
        .from("comments")
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });
      
      if (error || !isMounted) {
        if (isMounted) setComments([]);
        return;
      }
      
      let commentsData = data || [];
      
      if (commentsData.length > 0) {
        const userIds = [...new Set(commentsData.map(c => c.user_id).filter(Boolean))];
        const activeUser = currentUser || user;
        
        const [profilesResult, likesResult] = await Promise.all([
          userIds.length > 0 
            ? supabase.from("profiles").select("id, avatar_url").in("id", userIds)
            : Promise.resolve({ data: null }),
          activeUser 
            ? supabase.from("comment_likes").select("comment_id").eq("user_id", activeUser.id)
            : Promise.resolve({ data: null })
        ]);
        
        const profileMap = new Map();
        profilesResult.data?.forEach((p: any) => profileMap.set(p.id, p.avatar_url));
        
        const likedIds = new Set(likesResult.data?.map((l: any) => l.comment_id) || []);
        
        commentsData = commentsData.map(c => ({
          ...c,
          author_avatar_url: profileMap.get(c.user_id) || null,
          liked: likedIds.has(c.id)
        }));
      }
      
      if (isMounted) setComments(commentsData);
    } catch (err) {
      console.error("댓글 로드 오류:", err);
      if (isMounted) setComments([]);
    } finally {
      if (isMounted) setLoadingComments(false);
    }
  };

  const handleLike = async () => {
    if (!user) { router.push("/login"); return; }
    
    try {
      if (liked) {
        await supabase.from("likes").delete().eq("post_id", postId).eq("user_id", user.id);
        setLiked(false);
        setLikeCount(prev => Math.max(0, prev - 1));
      } else {
        await supabase.from("likes").insert({ post_id: parseInt(postId), user_id: user.id });
        setLiked(true);
        setLikeCount(prev => prev + 1);
      }
    } catch (err) {
      console.error("좋아요 오류:", err);
    }
  };

  const handleBookmark = async () => {
    if (!user) { router.push("/login"); return; }
    
    try {
      if (bookmarked) {
        await supabase.from("post_bookmarks").delete().eq("post_id", postId).eq("user_id", user.id);
        setBookmarked(false);
      } else {
        await supabase.from("post_bookmarks").insert({ post_id: parseInt(postId), user_id: user.id });
        setBookmarked(true);
      }
    } catch (err) {
      console.error("북마크 오류:", err);
    }
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/community/${postId}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert("링크가 복사되었습니다");
    } catch {
      alert("링크 복사 실패");
    }
  };

  const submitComment = async () => {
    if (!user) { router.push("/login"); return; }
    if (!newComment.trim()) return;
    
    setSubmitting(true);
    
    try {
      const nickname = userProfile?.nickname || user.email?.split("@")[0] || "사용자";
      
      const { data, error } = await supabase.from("comments").insert({
        post_id: parseInt(postId),
        user_id: user.id,
        content: newComment.trim(),
        author_nickname: nickname,
        parent_id: replyingTo?.id || null
      }).select().single();
      
      if (!error && data) {
        setComments(prev => [...prev, { ...data, author_avatar_url: userProfile?.avatar_url, liked: false }]);
        setNewComment("");
        setReplyingTo(null);
      }
    } catch (err) {
      console.error("댓글 작성 오류:", err);
      alert("댓글 작성 실패");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCommentLike = async (comment: any) => {
    if (!user) { router.push("/login"); return; }
    
    try {
      if (comment.liked) {
        await supabase.from("comment_likes").delete().eq("comment_id", comment.id).eq("user_id", user.id);
        setComments(prev => prev.map(c => c.id === comment.id ? { ...c, like_count: Math.max(0, (c.like_count || 0) - 1), liked: false } : c));
      } else {
        await supabase.from("comment_likes").insert({ comment_id: comment.id, user_id: user.id });
        setComments(prev => prev.map(c => c.id === comment.id ? { ...c, like_count: (c.like_count || 0) + 1, liked: true } : c));
      }
    } catch (err) {
      console.error("댓글 좋아요 오류:", err);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!confirm("댓글을 삭제하시겠습니까?")) return;
    try {
      await supabase.from("comments").delete().eq("id", commentId);
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch (err) {
      console.error("댓글 삭제 오류:", err);
    }
  };

  const handleDeletePost = async () => {
    if (!confirm("게시글을 삭제하시겠습니까?")) return;
    try {
      await supabase.from("posts").delete().eq("id", postId);
      router.push("/community");
    } catch (err) {
      console.error("게시글 삭제 오류:", err);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return "방금";
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}일 전`;
    return date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
  };

  const isAdmin = userProfile?.role === "admin";
  const canModify = (user && post?.user_id === user.id) || isAdmin;
  const images = parseImages(post?.images);

  // 로딩
  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.bgMain }}>
        <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: theme.accent }} />
      </div>
    );
  }

  // 에러 또는 게시글 없음
  if (error || !post) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ backgroundColor: theme.bgMain }}>
        <p style={{ color: theme.textPrimary }}>게시물을 찾을 수 없습니다</p>
        <Link href="/community" className="px-4 py-2 rounded-lg font-medium" style={{ backgroundColor: theme.accent, color: isDark ? "#121212" : "#fff" }}>
          돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.bgMain }}>
      {/* 헤더 */}
      <header className="sticky top-0 z-50" style={{ backgroundColor: theme.bgMain, borderBottom: `1px solid ${theme.borderLight}` }}>
        <div className="max-w-[640px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-1 -ml-1" style={{ color: theme.textPrimary }}>
              <ArrowLeft className="w-6 h-6" strokeWidth={1.5} />
            </button>
            <h1 className="text-lg font-bold" style={{ color: theme.textPrimary }}>게시글</h1>
          </div>
          
          {canModify && (
            <div className="relative">
              <button onClick={() => setShowMenu(!showMenu)} className="p-2" style={{ color: theme.textSecondary }}>
                <MoreHorizontal className="w-5 h-5" />
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 py-1 rounded-xl shadow-lg z-50 min-w-[120px]" style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.border}` }}>
                    <button onClick={handleDeletePost} className="w-full px-4 py-2 text-left text-sm flex items-center gap-2" style={{ color: theme.red }}>
                      <Trash2 className="w-4 h-4" /> 삭제
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-[640px] mx-auto pb-20">
        {/* 게시글 */}
        <article className="p-4" style={{ borderBottom: `8px solid ${theme.bgInput}` }}>
          {/* 작성자 */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center" style={{ backgroundColor: theme.accent }}>
              {post.author_avatar_url ? (
                <img src={post.author_avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="font-bold text-sm" style={{ color: isDark ? "#121212" : "#fff" }}>
                  {(post.is_anonymous ? "?" : post.author_nickname?.[0] || "U").toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <p className="font-semibold" style={{ color: theme.textPrimary }}>
                {post.is_anonymous ? "익명" : post.author_nickname || "사용자"}
              </p>
              <p className="text-xs" style={{ color: theme.textMuted }}>{formatTime(post.created_at)}</p>
            </div>
          </div>

          {/* 본문 */}
          <p className="whitespace-pre-wrap mb-4" style={{ color: theme.textPrimary }}>{post.content}</p>

          {/* 이미지/비디오 */}
          {images.length > 0 && (
            <div className="mb-4 space-y-2">
              {images.map((url: string, index: number) => {
                const isVideo = /\.(mp4|mov|webm|avi)/i.test(url);
                if (isVideo) {
                  return (
                    <video key={index} src={url} className="w-full rounded-xl" controls playsInline />
                  );
                }
                return (
                  <img key={index} src={url} alt="" className="w-full rounded-xl cursor-pointer" onClick={() => setLightboxIndex(index)} />
                );
              })}
            </div>
          )}

          {/* 유튜브 */}
          {(() => {
            const urls = extractLinks(post.content || '');
            const youtubeId = urls.length > 0 ? getYoutubeId(urls[0]) : null;
            if (!youtubeId) return null;
            
            return (
              <div className="mb-4 rounded-xl overflow-hidden">
                {playingYoutube ? (
                  <div className="relative w-full aspect-video bg-black">
                    <iframe 
                      src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0`} 
                      className="w-full h-full" 
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" 
                      allowFullScreen 
                    />
                  </div>
                ) : (
                  <div 
                    className="relative w-full cursor-pointer" 
                    onClick={() => setPlayingYoutube(true)}
                  >
                    <img 
                      src={`https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`} 
                      alt="" 
                      className="w-full aspect-video object-cover" 
                      onError={(e) => { e.currentTarget.src = `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`; }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors">
                      <YoutubeLogo />
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* 링크 프리뷰 */}
          {(() => {
            const urls = extractLinks(post.content || '');
            const youtubeId = urls.length > 0 ? getYoutubeId(urls[0]) : null;
            if (youtubeId || !linkPreview) return null;
            
            return (
              <div 
                className="mb-4 cursor-pointer rounded-xl overflow-hidden" 
                style={{ border: `1px solid ${theme.border}` }}
                onClick={() => window.open(linkPreview.url, '_blank')}
              >
                {linkPreview.image && (
                  <div className="relative w-full aspect-[1.91/1] bg-gray-200">
                    <img 
                      src={linkPreview.image} 
                      alt="" 
                      className="w-full h-full object-cover"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  </div>
                )}
                <div className="px-4 py-3" style={{ backgroundColor: theme.bgInput }}>
                  <p className="text-xs uppercase" style={{ color: theme.textMuted }}>{linkPreview.domain}</p>
                  <p className="font-semibold mt-1 line-clamp-2" style={{ color: theme.textPrimary }}>{linkPreview.title}</p>
                  {linkPreview.description && <p className="text-sm mt-1 line-clamp-2" style={{ color: theme.textSecondary }}>{linkPreview.description}</p>}
                </div>
              </div>
            );
          })()}

          {/* 통계 */}
          <div className="flex items-center gap-4 text-sm py-3" style={{ color: theme.textMuted, borderTop: `1px solid ${theme.borderLight}` }}>
            <span>좋아요 {likeCount}</span>
            <span>댓글 {comments.length}</span>
            <span>조회 {post.view_count || 0}</span>
          </div>

          {/* 액션 버튼 */}
          <div className="flex items-center justify-around py-2" style={{ borderTop: `1px solid ${theme.borderLight}` }}>
            <button onClick={handleLike} className="flex items-center gap-2 py-2" style={{ color: liked ? '#3B82F6' : theme.textSecondary }}>
              <ThumbsUp className="w-5 h-5" fill={liked ? 'currentColor' : 'none'} />
              <span className="text-sm">좋아요</span>
            </button>
            <button onClick={handleBookmark} className="flex items-center gap-2 py-2" style={{ color: bookmarked ? theme.accent : theme.textSecondary }}>
              <Bookmark className="w-5 h-5" fill={bookmarked ? 'currentColor' : 'none'} />
              <span className="text-sm">저장</span>
            </button>
            <button onClick={handleShare} className="flex items-center gap-2 py-2" style={{ color: theme.textSecondary }}>
              <Share2 className="w-5 h-5" />
              <span className="text-sm">공유</span>
            </button>
          </div>
        </article>

        {/* 댓글 섹션 */}
        <section className="p-4">
          <h2 className="font-bold mb-4" style={{ color: theme.textPrimary }}>댓글 {comments.length}</h2>
          
          {/* 댓글 목록 */}
          {loadingComments ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: theme.border, borderTopColor: theme.accent }} />
            </div>
          ) : comments.filter(c => !c.parent_id).length === 0 ? (
            <p className="text-center py-8" style={{ color: theme.textMuted }}>첫 댓글을 남겨보세요</p>
          ) : (
            <div className="space-y-4">
              {comments.filter(c => !c.parent_id).map(comment => (
                <div key={comment.id}>
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: theme.bgElevated }}>
                      {comment.author_avatar_url ? (
                        <img src={comment.author_avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold" style={{ color: theme.textMuted }}>
                          {comment.author_nickname?.[0]?.toUpperCase() || "?"}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="rounded-2xl px-3 py-2" style={{ backgroundColor: theme.bgInput }}>
                        <p className="font-semibold text-sm" style={{ color: theme.textPrimary }}>{comment.author_nickname}</p>
                        <p className="text-sm break-words" style={{ color: theme.textPrimary }}>{comment.content}</p>
                      </div>
                      <div className="flex items-center gap-4 mt-1 px-2">
                        <span className="text-xs" style={{ color: theme.textMuted }}>{formatTime(comment.created_at)}</span>
                        <button onClick={() => handleCommentLike(comment)} className="text-xs" style={{ color: comment.liked ? theme.red : theme.textMuted }}>
                          좋아요 {comment.like_count || 0}
                        </button>
                        <button onClick={() => setReplyingTo(comment)} className="text-xs" style={{ color: theme.textMuted }}>답글</button>
                        {(user?.id === comment.user_id || isAdmin) && (
                          <button onClick={() => handleDeleteComment(comment.id)} className="text-xs" style={{ color: theme.red }}>삭제</button>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* 대댓글 */}
                  {comments.filter(c => c.parent_id === comment.id).map(reply => (
                    <div key={reply.id} className="flex gap-3 mt-3 ml-11">
                      <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: theme.bgElevated }}>
                        {reply.author_avatar_url ? (
                          <img src={reply.author_avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs font-bold" style={{ color: theme.textMuted }}>
                            {reply.author_nickname?.[0]?.toUpperCase() || "?"}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="rounded-2xl px-3 py-2" style={{ backgroundColor: theme.bgInput }}>
                          <p className="font-semibold text-sm" style={{ color: theme.textPrimary }}>{reply.author_nickname}</p>
                          <p className="text-sm break-words" style={{ color: theme.textPrimary }}>{reply.content}</p>
                        </div>
                        <div className="flex items-center gap-4 mt-1 px-2">
                          <span className="text-xs" style={{ color: theme.textMuted }}>{formatTime(reply.created_at)}</span>
                          <button onClick={() => handleCommentLike(reply)} className="text-xs" style={{ color: reply.liked ? theme.red : theme.textMuted }}>
                            좋아요 {reply.like_count || 0}
                          </button>
                          {(user?.id === reply.user_id || isAdmin) && (
                            <button onClick={() => handleDeleteComment(reply.id)} className="text-xs" style={{ color: theme.red }}>삭제</button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* 댓글 입력 (하단 고정) */}
      {user && (
        <div className="fixed bottom-0 left-0 right-0 z-50" style={{ backgroundColor: theme.bgCard, borderTop: `1px solid ${theme.border}` }}>
          <div className="max-w-[640px] mx-auto p-3">
            {replyingTo && (
              <div className="flex items-center gap-2 mb-2 px-3 py-1.5 rounded-lg" style={{ backgroundColor: theme.bgInput }}>
                <span className="text-sm" style={{ color: theme.textMuted }}>@{replyingTo.author_nickname}에게 답글</span>
                <button onClick={() => setReplyingTo(null)} style={{ color: theme.textMuted }}><X className="w-4 h-4" /></button>
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="댓글을 입력하세요..."
                className="flex-1 rounded-full px-4 py-2.5 text-sm outline-none"
                style={{ backgroundColor: theme.bgInput, color: theme.textPrimary }}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && submitComment()}
              />
              <button 
                onClick={submitComment} 
                disabled={submitting || !newComment.trim()} 
                className="p-2.5 rounded-full disabled:opacity-50"
                style={{ backgroundColor: theme.accent, color: isDark ? "#121212" : "#fff" }}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 라이트박스 */}
      {lightboxIndex !== null && images.length > 0 && (
        <div className="fixed inset-0 z-[200] bg-black flex items-center justify-center" onClick={() => setLightboxIndex(null)}>
          <button className="absolute top-4 right-4 p-2 z-10" style={{ color: "#fff" }}>
            <X className="w-8 h-8" />
          </button>
          <img 
            src={images[lightboxIndex]} 
            alt="" 
            className="max-w-full max-h-full object-contain" 
            onClick={(e) => e.stopPropagation()} 
          />
          {images.length > 1 && (
            <>
              <button 
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full" 
                onClick={(e) => { e.stopPropagation(); setLightboxIndex(prev => prev! > 0 ? prev! - 1 : images.length - 1); }}
              >
                <ChevronLeft className="w-8 h-8 text-white" />
              </button>
              <button 
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full" 
                onClick={(e) => { e.stopPropagation(); setLightboxIndex(prev => prev! < images.length - 1 ? prev! + 1 : 0); }}
              >
                <ChevronRight className="w-8 h-8 text-white" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
