"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/contexts/ThemeContext";
import BottomNav from "@/components/BottomNav";
import {
  ArrowLeft,
  Play,
  Pause,
  Heart,
  MessageCircle,
  Share2,
  ChevronDown,
  ChevronUp,
  Send,
  X,
  Video,
  Maximize,
  Minimize,
  CornerDownRight,
  Home,
  UserPlus,
} from "lucide-react";

export default function VideoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const videoId = params.id as string;
  
  const { theme, isDark, mounted } = useTheme();
  const [video, setVideo] = useState<any>(null);
  const [otherVideos, setOtherVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  
  // 비디오 플레이어 관련
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  
  // 댓글 관련
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [commentSort, setCommentSort] = useState<'latest' | 'popular'>('latest');
  const [showCommentModal, setShowCommentModal] = useState(false);
  
  // 답글 관련
  const [replyTo, setReplyTo] = useState<any>(null);
  const [replyText, setReplyText] = useState("");
  const [expandedReplies, setExpandedReplies] = useState<Set<number>>(new Set());
  const [replies, setReplies] = useState<{ [key: number]: any[] }>({});
  const [replyCounts, setReplyCounts] = useState<{ [key: number]: number }>({});
  const [loadingReplies, setLoadingReplies] = useState<Set<number>>(new Set());
  
  // 좋아요 관련
  const [videoLike, setVideoLike] = useState({ count: 0, liked: false });
  const [commentLikes, setCommentLikes] = useState<{ [key: number]: { count: number; liked: boolean } }>({});
  const [submitting, setSubmitting] = useState(false);
  
  // 더블탭 관련
  const lastTapRef = useRef<number>(0);
  const [seekIndicator, setSeekIndicator] = useState<string | null>(null);
  const videoContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (videoId) {
      checkUser();
      fetchVideo();
      fetchOtherVideos();
    }
  }, [videoId]);

  // ============================================================
// 🔥 실시간 비디오 댓글 구독
// ============================================================
useEffect(() => {
  if (!videoId) return;

  const channel = supabase
    .channel(`video_comments:${videoId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'video_comments',
        filter: `video_id=eq.${videoId}`
      },
      async (payload) => {
        const newComment = payload.new as any;
        
        // 내가 작성한 댓글이면 무시 (이미 추가됨)
        if (user && newComment.user_id === user.id) return;
        
        // 프로필 정보 가져오기
        const { data: profile } = await supabase
          .from("profiles")
          .select("nickname, avatar_url")
          .eq("id", newComment.user_id)
          .single();
        
        const commentWithProfile = {
          ...newComment,
          profiles: profile ? {
            nickname: profile.nickname,
            profile_image: profile.avatar_url
          } : null
        };
        
        if (newComment.parent_id) {
          // 답글인 경우
          setReplies(prev => ({
            ...prev,
            [newComment.parent_id]: [...(prev[newComment.parent_id] || []), commentWithProfile]
          }));
          setReplyCounts(prev => ({
            ...prev,
            [newComment.parent_id]: (prev[newComment.parent_id] || 0) + 1
          }));
        } else {
          // 일반 댓글인 경우
          setComments(prev => {
            if (prev.some(c => c.id === newComment.id)) return prev;
            return [commentWithProfile, ...prev];
          });
          setReplyCounts(prev => ({ ...prev, [newComment.id]: 0 }));
        }
        
        setCommentLikes(prev => ({ ...prev, [newComment.id]: { count: 0, liked: false } }));
        
        // 댓글 카운트 업데이트
        setVideo((prev: any) => prev ? { ...prev, comment_count: (prev.comment_count || 0) + 1 } : prev);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'video_comments',
        filter: `video_id=eq.${videoId}`
      },
      (payload) => {
        const deletedComment = payload.old as any;
        
        if (deletedComment.parent_id) {
          // 답글 삭제
          setReplies(prev => ({
            ...prev,
            [deletedComment.parent_id]: (prev[deletedComment.parent_id] || []).filter(r => r.id !== deletedComment.id)
          }));
          setReplyCounts(prev => ({
            ...prev,
            [deletedComment.parent_id]: Math.max(0, (prev[deletedComment.parent_id] || 0) - 1)
          }));
        } else {
          // 일반 댓글 삭제
          setComments(prev => prev.filter(c => c.id !== deletedComment.id));
        }
        
        setVideo((prev: any) => prev ? { ...prev, comment_count: Math.max(0, (prev.comment_count || 0) - 1) } : prev);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'video_comments',
        filter: `video_id=eq.${videoId}`
      },
      (payload) => {
        const updatedComment = payload.new as any;
        
        // 좋아요 카운트 업데이트
        setCommentLikes(prev => ({
          ...prev,
          [updatedComment.id]: {
            ...prev[updatedComment.id],
            count: updatedComment.like_count || 0
          }
        }));
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [videoId, user]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("nickname, avatar_url")
        .eq("id", user.id)
        .single();
      
      if (profile) {
        setUserProfile({ nickname: profile.nickname, profile_image: profile.avatar_url });
      }
    }
  };

  const fetchVideo = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from("videos")
      .select("*")
      .eq("id", videoId)
      .single();
    
    if (error || !data) {
      setLoading(false);
      return;
    }
    
    setVideo(data);
    setVideoLike({ count: data.like_count || 0, liked: false });
    
    // 조회수 증가
    await supabase.from("videos").update({ view_count: (data.view_count || 0) + 1 }).eq("id", videoId);
    setVideo((prev: any) => prev ? { ...prev, view_count: (prev.view_count || 0) + 1 } : prev);
    
    // 좋아요 여부 확인
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: likeData } = await supabase
        .from("video_likes")
        .select("id")
        .eq("video_id", videoId)
        .eq("user_id", user.id)
        .single();
      
      if (likeData) {
        setVideoLike(prev => ({ ...prev, liked: true }));
      }
    }
    
    await fetchComments(parseInt(videoId), 'latest');
    setLoading(false);
  };

  const fetchOtherVideos = async () => {
    const { data } = await supabase
      .from("videos")
      .select("*")
      .neq("id", videoId)
      .order("created_at", { ascending: false })
      .limit(6);
    
    if (data) {
      setOtherVideos(data);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;
    return date.toLocaleDateString("ko-KR");
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const fetchComments = async (videoId: number, sort: 'latest' | 'popular') => {
    try {
      const { data, error } = await supabase
        .from("video_comments")
        .select(`*, profiles (nickname, avatar_url)`)
        .eq("video_id", videoId)
        .order(sort === 'popular' ? "like_count" : "created_at", { ascending: false });
      
      if (error) {
        setComments([]);
        return;
      }
      
      const topLevelComments = (data || []).filter(c => !c.parent_id);
      const commentsWithProfiles = topLevelComments.map(comment => ({
        ...comment,
        profiles: comment.profiles ? {
          nickname: comment.profiles.nickname,
          profile_image: comment.profiles.avatar_url
        } : null
      }));
      
      setComments(commentsWithProfiles);
      setReplies({});
      setExpandedReplies(new Set());
      
      const counts: { [key: number]: number } = {};
      for (const comment of topLevelComments) {
        const replyCount = (data || []).filter(c => c.parent_id === comment.id).length;
        counts[comment.id] = replyCount;
      }
      setReplyCounts(counts);
      
      const likesData: { [key: number]: { count: number; liked: boolean } } = {};
      for (const comment of data || []) {
        likesData[comment.id] = { count: comment.like_count || 0, liked: false };
      }
      
      if (user) {
        const commentIds = (data || []).map(c => c.id);
        const { data: userLikes } = await supabase
          .from("video_comment_likes")
          .select("comment_id")
          .eq("user_id", user.id)
          .in("comment_id", commentIds);
        
        if (userLikes) {
          userLikes.forEach(like => {
            if (likesData[like.comment_id]) {
              likesData[like.comment_id].liked = true;
            }
          });
        }
      }
      setCommentLikes(likesData);
    } catch (e) {
      setComments([]);
    }
  };

  const fetchReplies = async (commentId: number) => {
    try {
      const { data, error } = await supabase
        .from("video_comments")
        .select(`*, profiles (nickname, avatar_url)`)
        .eq("parent_id", commentId)
        .order("created_at", { ascending: true });
      
      if (!error && data) {
        const repliesWithProfiles = data.map(reply => ({
          ...reply,
          profiles: reply.profiles ? {
            nickname: reply.profiles.nickname,
            profile_image: reply.profiles.avatar_url
          } : null
        }));
        setReplies(prev => ({ ...prev, [commentId]: repliesWithProfiles }));
      }
    } catch (e) {}
  };

  const toggleReplies = (commentId: number) => {
    if (loadingReplies.has(commentId)) return;
    
    if (expandedReplies.has(commentId)) {
      setExpandedReplies(prev => {
        const next = new Set(prev);
        next.delete(commentId);
        return next;
      });
    } else {
      setLoadingReplies(prev => new Set(prev).add(commentId));
      fetchReplies(commentId).then(() => {
        setExpandedReplies(prev => new Set(prev).add(commentId));
        setLoadingReplies(prev => {
          const next = new Set(prev);
          next.delete(commentId);
          return next;
        });
      });
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
  };

  const handleVideoTap = (e: React.MouseEvent) => {
    const now = Date.now();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    
    if (now - lastTapRef.current < 300) {
      if (x < width / 3) {
        if (videoRef.current) {
          videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
          setSeekIndicator("-10초");
          setTimeout(() => setSeekIndicator(null), 800);
        }
      } else if (x > (width * 2) / 3) {
        if (videoRef.current) {
          videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 10);
          setSeekIndicator("+10초");
          setTimeout(() => setSeekIndicator(null), 800);
        }
      } else {
        togglePlay();
      }
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
      setShowControls(prev => !prev);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const toggleFullscreen = async () => {
    if (!videoContainerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await videoContainerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (e) {}
  };

  const handleLike = async () => {
    if (!user) {
      alert("로그인이 필요합니다");
      return;
    }

    if (videoLike.liked) {
      await supabase.from("video_likes").delete().eq("video_id", videoId).eq("user_id", user.id);
      await supabase.from("videos").update({ like_count: Math.max(0, videoLike.count - 1) }).eq("id", videoId);
      setVideoLike({ count: videoLike.count - 1, liked: false });
    } else {
      await supabase.from("video_likes").insert({ video_id: parseInt(videoId), user_id: user.id });
      await supabase.from("videos").update({ like_count: videoLike.count + 1 }).eq("id", videoId);
      setVideoLike({ count: videoLike.count + 1, liked: true });
    }
  };

  const handleComment = async () => {
    if (!user) {
      alert("로그인이 필요합니다");
      return;
    }
    if (!newComment.trim() || !video) return;

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("video_comments")
        .insert({
          video_id: video.id,
          user_id: user.id,
          content: newComment.trim(),
          parent_id: null
        })
        .select("*")
        .single();

      if (!error && data) {
        const commentWithProfile = {
          ...data,
          profiles: userProfile || { nickname: user.email?.split('@')[0], profile_image: null }
        };
        setComments(prev => [commentWithProfile, ...prev]);
        setReplyCounts(prev => ({ ...prev, [data.id]: 0 }));
        setCommentLikes(prev => ({ ...prev, [data.id]: { count: 0, liked: false } }));
        setNewComment("");
        await supabase.from("videos").update({ comment_count: (video.comment_count || 0) + 1 }).eq("id", video.id);
        setVideo((prev: any) => prev ? { ...prev, comment_count: (prev.comment_count || 0) + 1 } : prev);
      }
    } catch (e) {}
    setSubmitting(false);
  };

  const handleReply = async () => {
    if (!user) {
      alert("로그인이 필요합니다");
      return;
    }
    if (!replyText.trim() || !replyTo || !video) return;

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("video_comments")
        .insert({
          video_id: video.id,
          user_id: user.id,
          content: replyText.trim(),
          parent_id: replyTo.id
        })
        .select("*")
        .single();

      if (!error && data) {
        const replyWithProfile = {
          ...data,
          profiles: userProfile || { nickname: user.email?.split('@')[0], profile_image: null }
        };
        setReplies(prev => ({
          ...prev,
          [replyTo.id]: [...(prev[replyTo.id] || []), replyWithProfile]
        }));
        setReplyCounts(prev => ({
          ...prev,
          [replyTo.id]: (prev[replyTo.id] || 0) + 1
        }));
        setExpandedReplies(prev => new Set(prev).add(replyTo.id));
        setCommentLikes(prev => ({ ...prev, [data.id]: { count: 0, liked: false } }));
        setReplyText("");
        setReplyTo(null);
        await supabase.from("videos").update({ comment_count: (video.comment_count || 0) + 1 }).eq("id", video.id);
        setVideo((prev: any) => prev ? { ...prev, comment_count: (prev.comment_count || 0) + 1 } : prev);
      }
    } catch (e) {}
    setSubmitting(false);
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      alert(`링크가 복사되었습니다!\n${url}`);
    } catch (e) {
      const textArea = document.createElement('textarea');
      textArea.value = url;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert(`링크가 복사되었습니다!\n${url}`);
    }
  };

  const handleCommentLike = async (commentId: number) => {
    if (!user) {
      alert("로그인이 필요합니다");
      return;
    }

    const current = commentLikes[commentId];
    if (!current) return;

    if (current.liked) {
      await supabase.from("video_comment_likes").delete().eq("comment_id", commentId).eq("user_id", user.id);
      await supabase.from("video_comments").update({ like_count: Math.max(0, current.count - 1) }).eq("id", commentId);
      setCommentLikes(prev => ({ ...prev, [commentId]: { count: current.count - 1, liked: false } }));
    } else {
      await supabase.from("video_comment_likes").insert({ comment_id: commentId, user_id: user.id });
      await supabase.from("video_comments").update({ like_count: current.count + 1 }).eq("id", commentId);
      setCommentLikes(prev => ({ ...prev, [commentId]: { count: current.count + 1, liked: true } }));
    }
  };

  const handleCommentSort = async (sort: 'latest' | 'popular') => {
    setCommentSort(sort);
    if (video) {
      await fetchComments(video.id, sort);
    }
  };

  const startReply = (comment: any) => {
    setReplyTo(comment);
    setReplyText("");
  };

  // 댓글 렌더링 함수
  const renderComment = (comment: any, isReply = false) => {
    const nickname = comment.profiles?.nickname || '익명';
    const profileImage = comment.profiles?.profile_image;
    const likeInfo = commentLikes[comment.id] || { count: 0, liked: false };
    
    return (
      <div className={`flex gap-3 ${isReply ? 'ml-10' : ''}`}>
        <div 
          className={`${isReply ? 'w-8 h-8' : 'w-10 h-10'} rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden`}
          style={{ backgroundColor: theme.bgInput }}
        >
          {profileImage ? (
            <img src={profileImage} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className={`${isReply ? 'text-xs' : 'text-sm'} font-bold`} style={{ color: theme.accent }}>
              {nickname[0]}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm" style={{ color: theme.textPrimary }}>
              {nickname}
            </span>
            <span className="text-xs" style={{ color: theme.textMuted }}>
              {formatDate(comment.created_at)}
            </span>
          </div>
          <p className="text-sm leading-relaxed mb-2" style={{ color: theme.textSecondary }}>{comment.content}</p>
          
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleCommentLike(comment.id); }}
              className="flex items-center gap-1 py-1 px-2 -ml-2"
            >
              <Heart 
                className="w-4 h-4" 
                style={{ color: likeInfo.liked ? theme.red : theme.textMuted }}
                fill={likeInfo.liked ? theme.red : 'none'}
                strokeWidth={1.5}
              />
              <span className="text-xs" style={{ color: likeInfo.liked ? theme.red : theme.textMuted }}>
                좋아요{likeInfo.count > 0 ? ` ${likeInfo.count}` : ''}
              </span>
            </button>
            
            {!isReply && (
              <>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); startReply(comment); }}
                  className="text-xs font-medium py-1 px-2 -ml-2"
                  style={{ color: theme.textMuted }}
                >
                  답글 달기
                </button>
                
                {(replyCounts[comment.id] || 0) > 0 && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); toggleReplies(comment.id); }}
                    className="flex items-center gap-1 text-xs font-medium py-2 px-3 rounded-lg min-w-[100px]"
                    style={{ color: theme.accent }}
                  >
                    {loadingReplies.has(comment.id) ? (
                      <span>로딩중...</span>
                    ) : expandedReplies.has(comment.id) ? (
                      <>
                        <ChevronUp className="w-4 h-4" />
                        <span>답글 숨기기</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4" />
                        <span>답글 {replyCounts[comment.id]}개 보기</span>
                      </>
                    )}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.bgMain }}>
        <div className="w-10 h-10 border-2 rounded-full animate-spin" style={{ borderColor: theme.border, borderTopColor: theme.accent }}></div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.bgMain }}>
        <div className="w-10 h-10 border-2 rounded-full animate-spin" style={{ borderColor: theme.border, borderTopColor: theme.accent }}></div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ backgroundColor: theme.bgMain }}>
        <p style={{ color: theme.textPrimary }}>영상을 찾을 수 없습니다</p>
        <Link href="/videos" className="px-4 py-2 rounded-lg" style={{ backgroundColor: theme.accent, color: isDark ? '#121212' : '#FFFFFF' }}>
          영상 목록으로
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: theme.bgMain }}>
      {/* 스크롤바 숨김 CSS */}
      <style jsx global>{`
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {/* 상단 CTA 배너 - 비로그인 사용자에게만 */}
      {!user && (
        <div 
          className="sticky top-0 z-50 px-4 py-3 flex items-center justify-between"
          style={{ backgroundColor: theme.accent }}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium" style={{ color: isDark ? '#121212' : '#FFFFFF' }}>
              🎬 여주마켓에서 더 많은 영상을 만나보세요!
            </span>
          </div>
          <Link 
            href="/auth" 
            className="px-3 py-1.5 rounded-full text-xs font-bold"
            style={{ backgroundColor: isDark ? '#121212' : '#FFFFFF', color: theme.accent }}
          >
            가입하기
          </Link>
        </div>
      )}

      {/* 헤더 */}
      <header className="sticky top-0 z-40" style={{ backgroundColor: theme.bgMain, borderBottom: `1px solid ${theme.borderLight}`, top: !user ? '52px' : '0' }}>
        <div className="max-w-[640px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-1 -ml-1 rounded-lg" style={{ color: theme.textPrimary }}>
              <ArrowLeft className="w-6 h-6" strokeWidth={1.5} />
            </button>
            <h1 className="text-lg font-bold" style={{ color: theme.textPrimary }}>🎬 영상</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/" className="p-2 rounded-lg" style={{ backgroundColor: theme.bgInput }}>
              <Home className="w-5 h-5" style={{ color: theme.textPrimary }} strokeWidth={1.5} />
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-[640px] mx-auto">
        {/* 비디오 플레이어 */}
        <div className="p-3" style={{ backgroundColor: theme.bgMain }}>
          <div 
            ref={videoContainerRef}
            className={`relative bg-black rounded-2xl overflow-hidden ${isFullscreen ? 'fixed inset-0 z-[200] rounded-none' : 'aspect-video'}`}
            onClick={handleVideoTap}
          >
            {video.video_url ? (
              <video
                ref={videoRef}
                src={video.video_url}
                poster={video.thumbnail_url}
                className="w-full h-full object-contain"
                playsInline
                autoPlay
                onPlay={() => { setIsPlaying(true); setShowControls(false); }}
                onPause={() => { setIsPlaying(false); setShowControls(true); }}
                onTimeUpdate={() => {
                  if (videoRef.current) {
                    setCurrentTime(videoRef.current.currentTime);
                  }
                }}
                onLoadedMetadata={() => {
                  if (videoRef.current) {
                    setDuration(videoRef.current.duration);
                  }
                }}
                onEnded={() => { setIsPlaying(false); setShowControls(true); }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Video className="w-20 h-20" style={{ color: '#666' }} strokeWidth={1} />
              </div>
            )}
            
            {seekIndicator && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-black/70 rounded-full px-6 py-3">
                  <span className="text-white text-lg font-bold">{seekIndicator}</span>
                </div>
              </div>
            )}

            {showControls && (
              <>
                <div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/60 to-transparent">
                  <button onClick={(e) => { e.stopPropagation(); router.back(); }} className="p-2 rounded-full bg-black/40">
                    <ArrowLeft className="w-5 h-5 text-white" strokeWidth={1.5} />
                  </button>
                </div>

                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div 
                    className="w-16 h-16 rounded-full flex items-center justify-center bg-black/50 pointer-events-auto cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                  >
                    {isPlaying ? (
                      <Pause className="w-8 h-8 text-white" fill="white" strokeWidth={0} />
                    ) : (
                      <Play className="w-8 h-8 text-white ml-1" fill="white" strokeWidth={0} />
                    )}
                  </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
                  <div className="flex items-center gap-2">
                    <span className="text-white text-xs w-10 text-center">{formatTime(currentTime)}</span>
                    <div className="flex-1 relative h-1 bg-white/30 rounded-full">
                      <div 
                        className="absolute top-0 left-0 h-full rounded-full"
                        style={{ width: `${(currentTime / (duration || 1)) * 100}%`, backgroundColor: theme.accent }}
                      />
                      <input
                        type="range"
                        min={0}
                        max={duration || 100}
                        value={currentTime}
                        onChange={handleSeek}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <span className="text-white text-xs w-10 text-center">{formatTime(duration)}</span>
                    <button onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }} className="p-1 ml-1">
                      {isFullscreen ? (
                        <Minimize className="w-5 h-5 text-white" strokeWidth={1.5} />
                      ) : (
                        <Maximize className="w-5 h-5 text-white" strokeWidth={1.5} />
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* 제목 및 정보 */}
        {!isFullscreen && (
          <div className="px-4">
            <div className="py-4" style={{ borderBottom: `1px solid ${theme.border}` }}>
              <h2 className="font-bold text-lg mb-2" style={{ color: theme.textPrimary }}>{video.title}</h2>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm" style={{ color: theme.textMuted }}>
                  <span>조회수 {video.view_count || 0}회</span>
                  <span>·</span>
                  <span>{formatDate(video.created_at)}</span>
                  {video.description && (
                    <>
                      <span>·</span>
                      <button 
                        className="font-medium"
                        style={{ color: theme.accent }}
                        onClick={() => setShowDescription(!showDescription)}
                      >
                        {showDescription ? '설명 접기' : '설명 보기'}
                      </button>
                    </>
                  )}
                </div>
                
                <div className="flex items-center gap-1">
                  <button 
                    className="p-2 rounded-lg flex items-center gap-1"
                    style={{ backgroundColor: videoLike.liked ? theme.redBg : theme.bgInput }}
                    onClick={handleLike}
                  >
                    <Heart 
                      className="w-5 h-5" 
                      style={{ color: videoLike.liked ? theme.red : theme.textMuted }} 
                      fill={videoLike.liked ? theme.red : 'none'}
                      strokeWidth={1.5} 
                    />
                    <span className="text-sm" style={{ color: videoLike.liked ? theme.red : theme.textMuted }}>
                      {videoLike.count || 0}
                    </span>
                  </button>
                  
                  <button 
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: theme.bgInput }}
                    onClick={handleShare}
                  >
                    <Share2 className="w-5 h-5" style={{ color: theme.textMuted }} strokeWidth={1.5} />
                  </button>
                </div>
              </div>
              
              {showDescription && video.description && (
                <div 
                  className="mt-3 p-3 rounded-xl text-sm leading-relaxed"
                  style={{ backgroundColor: theme.bgInput, color: theme.textSecondary }}
                >
                  {video.description}
                </div>
              )}
            </div>

            {/* 댓글 미리보기 */}
            <div 
              className="py-4 cursor-pointer"
              style={{ borderBottom: `1px solid ${theme.border}` }}
              onClick={() => setShowCommentModal(true)}
            >
              <div className="flex items-center gap-2 mb-3">
                <MessageCircle className="w-5 h-5" style={{ color: theme.textPrimary }} strokeWidth={1.5} />
                <span className="font-semibold" style={{ color: theme.textPrimary }}>
                  댓글 {video.comment_count || 0}
                </span>
              </div>
              
              <div 
                className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                style={{ backgroundColor: theme.bgInput, border: `1px solid ${theme.border}` }}
              >
                <div 
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
                  style={{ backgroundColor: theme.accent }}
                >
                  {userProfile?.profile_image ? (
                    <img src={userProfile.profile_image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs font-bold" style={{ color: isDark ? '#121212' : '#FFFFFF' }}>
                      {userProfile?.nickname?.[0] || user?.email?.[0]?.toUpperCase() || '?'}
                    </span>
                  )}
                </div>
                <span className="text-sm" style={{ color: theme.textMuted }}>댓글 추가...</span>
              </div>
            </div>

            {/* 다른 영상 추천 */}
            <div className="py-4">
              <h3 className="font-semibold mb-3" style={{ color: theme.textPrimary }}>다른 영상</h3>
              <div className="space-y-4">
                {otherVideos.map((v) => (
                  <Link 
                    key={v.id} 
                    href={`/videos/${v.id}`}
                    className="flex gap-3 cursor-pointer"
                  >
                    <div className="relative w-40 aspect-video rounded-xl overflow-hidden flex-shrink-0 bg-black">
                      {v.thumbnail_url ? (
                        <img src={v.thumbnail_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Video className="w-8 h-8" style={{ color: '#666' }} strokeWidth={1} />
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: theme.accent }}
                        >
                          <Play className="w-4 h-4 ml-0.5" style={{ color: isDark ? '#121212' : '#FFFFFF' }} fill={isDark ? '#121212' : '#FFFFFF'} strokeWidth={0} />
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm line-clamp-2 mb-1" style={{ color: theme.textPrimary }}>
                        {v.title}
                      </h4>
                      <p className="text-xs" style={{ color: theme.textMuted }}>
                        조회수 {v.view_count || 0}회
                      </p>
                      <p className="text-xs" style={{ color: theme.textMuted }}>
                        {formatDate(v.created_at)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* 가입 유도 카드 - 비로그인 사용자에게만 */}
            {!user && (
              <div 
                className="my-4 p-4 rounded-2xl"
                style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: theme.accent }}
                  >
                    <UserPlus className="w-6 h-6" style={{ color: isDark ? '#121212' : '#FFFFFF' }} />
                  </div>
                  <div>
                    <h3 className="font-bold" style={{ color: theme.textPrimary }}>여주마켓 가입하기</h3>
                    <p className="text-sm" style={{ color: theme.textMuted }}>더 많은 영상과 커뮤니티를 만나보세요</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link 
                    href="/auth" 
                    className="flex-1 py-2.5 rounded-xl text-center font-medium"
                    style={{ backgroundColor: theme.accent, color: isDark ? '#121212' : '#FFFFFF' }}
                  >
                    가입하기
                  </Link>
                  <Link 
                    href="/" 
                    className="flex-1 py-2.5 rounded-xl text-center font-medium"
                    style={{ backgroundColor: theme.bgInput, color: theme.textPrimary }}
                  >
                    둘러보기
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* 댓글 모달 */}
      {showCommentModal && (
        <div className="fixed inset-0 z-[150] flex justify-center pointer-events-none">
          <div 
            className="absolute left-0 right-0 bottom-0 pointer-events-auto"
            style={{ top: 'min(360px, 56.25vw)' }}
            onClick={() => setShowCommentModal(false)}
          >
            <div className="absolute inset-0 bg-black/40" />
          </div>
          
          <div 
            className="absolute bottom-0 w-full max-w-[640px] rounded-t-3xl flex flex-col overflow-hidden pointer-events-auto"
            style={{ backgroundColor: theme.bgCard, height: '60vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center py-2 flex-shrink-0">
              <div className="w-10 h-1 rounded-full" style={{ backgroundColor: theme.border }} />
            </div>
            
            <div className="flex items-center justify-between px-4 pb-3 flex-shrink-0" style={{ borderBottom: `1px solid ${theme.border}` }}>
              <h3 className="font-bold text-lg" style={{ color: theme.textPrimary }}>
                댓글 {video.comment_count || 0}개
              </h3>
              <button 
                onClick={() => setShowCommentModal(false)}
                className="p-2 rounded-full"
                style={{ backgroundColor: theme.bgInput }}
              >
                <X className="w-5 h-5" style={{ color: theme.textPrimary }} strokeWidth={1.5} />
              </button>
            </div>
            
            <div className="flex gap-2 px-4 py-3 flex-shrink-0" style={{ borderBottom: `1px solid ${theme.border}` }}>
              <button
                onClick={() => handleCommentSort('latest')}
                className="px-4 py-1.5 rounded-full text-sm font-medium"
                style={{ 
                  backgroundColor: commentSort === 'latest' ? theme.accent : theme.bgInput,
                  color: commentSort === 'latest' ? (isDark ? '#121212' : '#FFFFFF') : theme.textPrimary
                }}
              >
                최신순
              </button>
              <button
                onClick={() => handleCommentSort('popular')}
                className="px-4 py-1.5 rounded-full text-sm font-medium"
                style={{ 
                  backgroundColor: commentSort === 'popular' ? theme.accent : theme.bgInput,
                  color: commentSort === 'popular' ? (isDark ? '#121212' : '#FFFFFF') : theme.textPrimary
                }}
              >
                인기순
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto hide-scrollbar p-4">
              {comments.length === 0 ? (
                <p className="text-sm text-center py-8" style={{ color: theme.textMuted }}>
                  첫 번째 댓글을 남겨보세요!
                </p>
              ) : (
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div key={comment.id} id={`comment-${comment.id}`}>
                      {renderComment(comment)}
                      
                      {expandedReplies.has(comment.id) && replies[comment.id] && (
                        <div className="mt-3 space-y-3">
                          {replies[comment.id].map((reply) => (
                            <div key={reply.id}>
                              {renderComment(reply, true)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {replyTo && (
              <div 
                className="px-4 py-2 flex items-center justify-between flex-shrink-0"
                style={{ backgroundColor: theme.bgInput, borderTop: `1px solid ${theme.border}` }}
              >
                <div className="flex items-center gap-2">
                  <CornerDownRight className="w-4 h-4" style={{ color: theme.accent }} />
                  <span className="text-sm" style={{ color: theme.textMuted }}>
                    <span style={{ color: theme.textPrimary }}>{replyTo.profiles?.nickname || '익명'}</span>님에게 답글 작성 중
                  </span>
                </div>
                <button onClick={() => setReplyTo(null)}>
                  <X className="w-4 h-4" style={{ color: theme.textMuted }} />
                </button>
              </div>
            )}
            
            <div className="p-4 flex-shrink-0" style={{ borderTop: replyTo ? 'none' : `1px solid ${theme.border}` }}>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={replyTo ? replyText : newComment}
                  onChange={(e) => replyTo ? setReplyText(e.target.value) : setNewComment(e.target.value)}
                  placeholder={user ? (replyTo ? "답글 추가..." : "댓글 추가...") : "로그인이 필요합니다"}
                  disabled={!user}
                  className="flex-1 px-4 py-2.5 rounded-full outline-none text-sm"
                  style={{ backgroundColor: theme.bgInput, border: `1px solid ${theme.border}`, color: theme.textPrimary }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                      replyTo ? handleReply() : handleComment();
                    }
                  }}
                />
                <button
                  onClick={replyTo ? handleReply : handleComment}
                  disabled={!(replyTo ? replyText.trim() : newComment.trim()) || submitting || !user}
                  className="px-4 rounded-full disabled:opacity-50"
                  style={{ backgroundColor: theme.accent, color: isDark ? '#121212' : '#FFFFFF' }}
                >
                  <Send className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
