"use client";

import { useEffect, useState, useRef } from "react";
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
} from "lucide-react";

export default function VideosPage() {
  const { theme, isDark, mounted } = useTheme();
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  
  // 메인 모달 관련
  const [modalVideo, setModalVideo] = useState<any>(null);
  const modalVideoRef = useRef<HTMLVideoElement | null>(null);
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
  
  // 댓글 좋아요 관련
  const [commentLikes, setCommentLikes] = useState<{ [key: number]: { count: number; liked: boolean } }>({});
  
  const [likes, setLikes] = useState<{ [key: number]: { count: number; liked: boolean } }>({});
  const [submitting, setSubmitting] = useState(false);
  
  // 더블탭 관련
  const lastTapRef = useRef<number>(0);
  const [seekIndicator, setSeekIndicator] = useState<string | null>(null);
  
  const videoContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    checkUser();
    fetchVideos();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    
    if (user) {
      // 프로필 정보 가져오기
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("nickname, profile_image:avatar_url")
        .eq("id", user.id)
        .single();
      
      if (!error && profile) {
        setUserProfile({ nickname: profile.nickname, profile_image: profile.profile_image });
      }
    }
  };

  const fetchVideos = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("videos")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (data) {
      setVideos(data);
      const likesData: { [key: number]: { count: number; liked: boolean } } = {};
      for (const video of data) {
        likesData[video.id] = { count: video.like_count || 0, liked: false };
      }
      setLikes(likesData);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userLikes } = await supabase
          .from("video_likes")
          .select("video_id")
          .eq("user_id", user.id);
        
        if (userLikes) {
          userLikes.forEach(like => {
            if (likesData[like.video_id]) {
              likesData[like.video_id].liked = true;
            }
          });
          setLikes({ ...likesData });
        }
      }
    }
    setLoading(false);
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

  // 설명란 포맷팅 함수 추가
  const formatDescription = (description: string) => {
    if (!description) return null;
    
    return description.split('\n').map((line, index) => {
      const trimmedLine = line.trim();
      
      // 빈 줄
      if (trimmedLine === '') {
        return <div key={index} className="h-2" />;
      }
      
      // 섹션 제목 (■로 시작)
      if (trimmedLine.startsWith('■')) {
        return (
          <h3 
            key={index} 
            className="font-bold text-base mt-4 mb-2 pb-1"
            style={{ color: theme.accent, borderBottom: `1px solid ${theme.border}` }}
          >
            {trimmedLine}
          </h3>
        );
      }
      
      // 뉴스 항목 (▲로 시작)
      if (trimmedLine.startsWith('▲')) {
        return (
          <p 
            key={index} 
            className="text-sm leading-relaxed mb-4 pl-1"
            style={{ color: theme.textSecondary }}
          >
            <span style={{ color: theme.accent, fontWeight: 'bold' }}>▲</span>
            {trimmedLine.slice(1)}
          </p>
        );
      }
      
      // 뉴스 항목 (•로 시작) - 호환용
      if (trimmedLine.startsWith('•')) {
        return (
          <p 
            key={index} 
            className="text-sm leading-relaxed mb-4 pl-1"
            style={{ color: theme.textSecondary }}
          >
            <span style={{ color: theme.accent, fontWeight: 'bold' }}>▲</span>
            {trimmedLine.slice(1)}
          </p>
        );
      }
      
      // 일반 텍스트
      return (
        <p 
          key={index} 
          className="text-sm leading-relaxed mb-1"
          style={{ color: theme.textSecondary }}
        >
          {trimmedLine}
        </p>
      );
    });
  };

  const fetchComments = async (videoId: number, sort: 'latest' | 'popular') => {
    try {
      // 모든 댓글 가져오기 (profiles 조인)
      const { data, error } = await supabase
        .from("video_comments")
        .select(`
          *,
          profiles (nickname, avatar_url)
        `)
        .eq("video_id", videoId)
        .order(sort === 'popular' ? "like_count" : "created_at", { ascending: false });
      
      if (error) {
        console.error("댓글 조회 오류:", error);
        // 조인 실패시 프로필 없이 가져오기
        const { data: fallbackData } = await supabase
          .from("video_comments")
          .select("*")
          .eq("video_id", videoId)
          .order("created_at", { ascending: false });
        
        const topLevel = (fallbackData || []).filter(c => !c.parent_id);
        setComments(topLevel.map(c => ({ ...c, profiles: null })));
        
        const counts: { [key: number]: number } = {};
        for (const comment of topLevel) {
          counts[comment.id] = (fallbackData || []).filter(c => c.parent_id === comment.id).length;
        }
        setReplyCounts(counts);
        return;
      }
      
      // 최상위 댓글만 필터 (parent_id가 null이거나 undefined)
      const topLevelComments = (data || []).filter(c => !c.parent_id);
      
      // profiles를 profile_image로 매핑
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
      
      // 각 댓글의 답글 수 계산
      const counts: { [key: number]: number } = {};
      for (const comment of topLevelComments) {
        const replyCount = (data || []).filter(c => c.parent_id === comment.id).length;
        counts[comment.id] = replyCount;
      }
      setReplyCounts(counts);
      
      // 댓글 좋아요 정보 설정
      const likesData: { [key: number]: { count: number; liked: boolean } } = {};
      for (const comment of data || []) {
        likesData[comment.id] = { count: comment.like_count || 0, liked: false };
      }
      
      // 로그인한 사용자의 좋아요 여부 확인
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
      console.error("댓글 조회 실패:", e);
      setComments([]);
    }
  };

  const fetchReplies = async (commentId: number) => {
    try {
      const { data, error } = await supabase
        .from("video_comments")
        .select(`
          *,
          profiles (nickname, avatar_url)
        `)
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
    } catch (e) {
      console.error("답글 조회 실패:", e);
    }
  };

  const toggleReplies = (commentId: number) => {
    // 이미 로딩 중이면 무시
    if (loadingReplies.has(commentId)) return;
    
    if (expandedReplies.has(commentId)) {
      // 접기
      setExpandedReplies(prev => {
        const next = new Set(prev);
        next.delete(commentId);
        return next;
      });
    } else {
      // 펼치기
      setLoadingReplies(prev => new Set(prev).add(commentId));
      
      fetchReplies(commentId).then(() => {
        setExpandedReplies(prev => new Set(prev).add(commentId));
        setLoadingReplies(prev => {
          const next = new Set(prev);
          next.delete(commentId);
          return next;
        });
        
        // 스크롤
        setTimeout(() => {
          const element = document.getElementById(`comment-${commentId}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      });
    }
  };

  const openModal = async (video: any) => {
    console.log("=== openModal 호출 ===");
    console.log("클릭한 비디오 ID:", video.id);
    console.log("클릭한 비디오 제목:", video.title);
    console.log("클릭한 비디오 URL:", video.video_url);
    
    // 먼저 modalVideo를 null로 설정해서 이전 비디오 언마운트
    setModalVideo(null);
    
    // 이전 비디오 정지
    if (modalVideoRef.current) {
      modalVideoRef.current.pause();
      modalVideoRef.current.src = "";
      modalVideoRef.current.load();
      modalVideoRef.current = null;
    }
    
    // 상태 초기화
    setShowDescription(false);
    setNewComment("");
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    setShowControls(true);
    setIsFullscreen(false);
    setShowCommentModal(false);
    setCommentSort('latest');
    setReplyTo(null);
    setReplyText("");
    setExpandedReplies(new Set());
    setReplies({});
    setReplyCounts({});
    
    // 약간의 딜레이 후 새 비디오 설정 (React가 이전 컴포넌트 정리할 시간)
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // 새 비디오 설정
    console.log("setModalVideo 호출:", video.id, video.title);
    setModalVideo(video);
    
    // 조회수 증가
    await supabase.from("videos").update({ view_count: (video.view_count || 0) + 1 }).eq("id", video.id);
    setVideos(prev => prev.map(v => v.id === video.id ? { ...v, view_count: (v.view_count || 0) + 1 } : v));
    
    await fetchComments(video.id, 'latest');
  };

  const closeModal = () => {
    if (modalVideoRef.current) {
      modalVideoRef.current.pause();
    }
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
    setModalVideo(null);
    setComments([]);
    setIsFullscreen(false);
    setShowCommentModal(false);
    setReplyTo(null);
  };

  const togglePlay = () => {
    if (!modalVideoRef.current) return;
    
    if (isPlaying) {
      modalVideoRef.current.pause();
    } else {
      modalVideoRef.current.play();
    }
  };

  const handleVideoTap = (e: React.MouseEvent) => {
    const now = Date.now();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    
    if (now - lastTapRef.current < 300) {
      if (x < width / 3) {
        if (modalVideoRef.current) {
          modalVideoRef.current.currentTime = Math.max(0, modalVideoRef.current.currentTime - 10);
          setSeekIndicator("-10초");
          setTimeout(() => setSeekIndicator(null), 800);
        }
      } else if (x > (width * 2) / 3) {
        if (modalVideoRef.current) {
          modalVideoRef.current.currentTime = Math.min(duration, modalVideoRef.current.currentTime + 10);
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
    if (modalVideoRef.current) {
      modalVideoRef.current.currentTime = time;
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
    } catch (e) {
      console.log("Fullscreen error:", e);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // 뒤로가기 핸들링
  useEffect(() => {
    const handlePopState = () => {
      if (showCommentModal) {
        setShowCommentModal(false);
      } else if (modalVideo) {
        closeModal();
      }
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [showCommentModal, modalVideo]);

  // 실시간 댓글 구독
  useEffect(() => {
    if (!modalVideo) return;

    const channel = supabase
      .channel(`video-comments-${modalVideo.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'video_comments',
          filter: `video_id=eq.${modalVideo.id}`
        },
        async (payload) => {
          const newComment = payload.new as any;
          
          // 내가 작성한 댓글이면 무시 (이미 추가됨)
          if (newComment.user_id === user?.id) return;
          
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
          
          if (!newComment.parent_id) {
            // 최상위 댓글
            setComments(prev => [commentWithProfile, ...prev]);
            setReplyCounts(prev => ({ ...prev, [newComment.id]: 0 }));
            setCommentLikes(prev => ({ ...prev, [newComment.id]: { count: 0, liked: false } }));
            setModalVideo((prev: any) => prev ? { ...prev, comment_count: (prev.comment_count || 0) + 1 } : prev);
          } else {
            // 답글
            setReplies(prev => ({
              ...prev,
              [newComment.parent_id]: [...(prev[newComment.parent_id] || []), commentWithProfile]
            }));
            setReplyCounts(prev => ({
              ...prev,
              [newComment.parent_id]: (prev[newComment.parent_id] || 0) + 1
            }));
            setCommentLikes(prev => ({ ...prev, [newComment.id]: { count: 0, liked: false } }));
            setModalVideo((prev: any) => prev ? { ...prev, comment_count: (prev.comment_count || 0) + 1 } : prev);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [modalVideo?.id, user?.id]);

  const handleLike = async (videoId: number) => {
    if (!user) {
      alert("로그인이 필요합니다");
      return;
    }

    const current = likes[videoId];
    if (!current) return;

    if (current.liked) {
      await supabase.from("video_likes").delete().eq("video_id", videoId).eq("user_id", user.id);
      await supabase.from("videos").update({ like_count: Math.max(0, current.count - 1) }).eq("id", videoId);
      setLikes(prev => ({ ...prev, [videoId]: { count: current.count - 1, liked: false } }));
    } else {
      await supabase.from("video_likes").insert({ video_id: videoId, user_id: user.id });
      await supabase.from("videos").update({ like_count: current.count + 1 }).eq("id", videoId);
      setLikes(prev => ({ ...prev, [videoId]: { count: current.count + 1, liked: true } }));
    }
  };

  const handleComment = async () => {
    if (!user) {
      alert("로그인이 필요합니다");
      return;
    }
    if (!newComment.trim() || !modalVideo) return;

    setSubmitting(true);
    
    try {
      const { data, error } = await supabase
        .from("video_comments")
        .insert({
          video_id: modalVideo.id,
          user_id: user.id,
          content: newComment.trim(),
          parent_id: null
        })
        .select("*")
        .single();

      if (error) {
        console.error("댓글 작성 오류:", error);
        alert("댓글 작성에 실패했습니다: " + error.message);
        setSubmitting(false);
        return;
      }

      if (data) {
        // 프로필 정보 추가
        const commentWithProfile = {
          ...data,
          profiles: userProfile || { nickname: user.email?.split('@')[0], profile_image: null }
        };
        setComments(prev => [commentWithProfile, ...prev]);
        setReplyCounts(prev => ({ ...prev, [data.id]: 0 }));
        setNewComment("");
        await supabase.from("videos").update({ comment_count: (modalVideo.comment_count || 0) + 1 }).eq("id", modalVideo.id);
        setVideos(prev => prev.map(v => v.id === modalVideo.id ? { ...v, comment_count: (v.comment_count || 0) + 1 } : v));
        setModalVideo((prev: any) => prev ? { ...prev, comment_count: (prev.comment_count || 0) + 1 } : prev);
      }
    } catch (e) {
      console.error("댓글 작성 실패:", e);
      alert("댓글 작성에 실패했습니다");
    }
    setSubmitting(false);
  };

  const handleReply = async () => {
    if (!user) {
      alert("로그인이 필요합니다");
      return;
    }
    if (!replyText.trim() || !replyTo || !modalVideo) return;

    setSubmitting(true);
    
    try {
      const { data, error } = await supabase
        .from("video_comments")
        .insert({
          video_id: modalVideo.id,
          user_id: user.id,
          content: replyText.trim(),
          parent_id: replyTo.id
        })
        .select("*")
        .single();

      if (error) {
        console.error("답글 작성 오류:", error);
        alert("답글 작성에 실패했습니다: " + error.message);
        setSubmitting(false);
        return;
      }

      if (data) {
        // 프로필 정보 추가
        const replyWithProfile = {
          ...data,
          profiles: userProfile || { nickname: user.email?.split('@')[0], profile_image: null }
        };
        // 답글 목록에 추가
        setReplies(prev => ({
          ...prev,
          [replyTo.id]: [...(prev[replyTo.id] || []), replyWithProfile]
        }));
        // 답글 수 증가
        setReplyCounts(prev => ({
          ...prev,
          [replyTo.id]: (prev[replyTo.id] || 0) + 1
        }));
        // 답글 펼치기
        setExpandedReplies(prev => new Set(prev).add(replyTo.id));
        setReplyText("");
        setReplyTo(null);
        
        // 댓글 수 증가
        await supabase.from("videos").update({ comment_count: (modalVideo.comment_count || 0) + 1 }).eq("id", modalVideo.id);
        setModalVideo((prev: any) => prev ? { ...prev, comment_count: (prev.comment_count || 0) + 1 } : prev);
      }
    } catch (e) {
      console.error("답글 작성 실패:", e);
      alert("답글 작성에 실패했습니다");
    }
    setSubmitting(false);
  };

  const handleShare = async (video: any) => {
    const url = `${window.location.origin}/videos/${video.id}`;
    
    try {
      await navigator.clipboard.writeText(url);
      alert(`링크가 복사되었습니다!\n${url}`);
    } catch (e) {
      // 클립보드 API 실패 시 fallback
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
      // 좋아요 취소
      await supabase.from("video_comment_likes").delete().eq("comment_id", commentId).eq("user_id", user.id);
      await supabase.from("video_comments").update({ like_count: Math.max(0, current.count - 1) }).eq("id", commentId);
      setCommentLikes(prev => ({ ...prev, [commentId]: { count: current.count - 1, liked: false } }));
    } else {
      // 좋아요
      await supabase.from("video_comment_likes").insert({ comment_id: commentId, user_id: user.id });
      await supabase.from("video_comments").update({ like_count: current.count + 1 }).eq("id", commentId);
      setCommentLikes(prev => ({ ...prev, [commentId]: { count: current.count + 1, liked: true } }));
    }
  };

  const handleCommentSort = async (sort: 'latest' | 'popular') => {
    setCommentSort(sort);
    if (modalVideo) {
      await fetchComments(modalVideo.id, sort);
    }
  };

  const openCommentModal = () => {
    window.history.pushState(null, '', window.location.href);
    setShowCommentModal(true);
  };

  const startReply = (comment: any) => {
    setReplyTo(comment);
    setReplyText("");
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.bgMain }}>
        <div className="w-10 h-10 border-2 rounded-full animate-spin" style={{ borderColor: theme.border, borderTopColor: theme.accent }}></div>
      </div>
    );
  }

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
          
          {/* 좋아요 + 답글 버튼 */}
          <div className="flex items-center gap-4">
            {/* 좋아요 버튼 */}
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
            
            {/* 답글 버튼 (최상위 댓글만) */}
            {!isReply && (
              <>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); startReply(comment); }}
                  className="text-xs font-medium py-1 px-2 -ml-2 active:opacity-70"
                  style={{ color: theme.textMuted }}
                >
                  답글 달기
                </button>
                
                {/* 답글 보기 버튼 */}
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

  return (
    <div className="min-h-screen pb-24 transition-colors duration-300" style={{ backgroundColor: theme.bgMain }}>
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

      {/* 헤더 */}
      <header className="sticky top-0 z-50" style={{ backgroundColor: theme.bgMain, borderBottom: `1px solid ${theme.borderLight}` }}>
        <div className="max-w-[640px] mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="p-1 -ml-1 rounded-lg" style={{ color: theme.textPrimary }}>
            <ArrowLeft className="w-6 h-6" strokeWidth={1.5} />
          </Link>
          <h1 className="text-lg font-bold" style={{ color: theme.textPrimary }}>🎬 영상</h1>
        </div>
      </header>

      <main className="max-w-[640px] mx-auto px-4 py-4 hide-scrollbar">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-2 rounded-full animate-spin" style={{ borderColor: theme.border, borderTopColor: theme.accent }}></div>
          </div>
        ) : videos.length === 0 ? (
          <div className="rounded-2xl py-16 text-center" style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}>
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: theme.bgInput }}>
              <Video className="w-7 h-7" style={{ color: theme.textMuted }} strokeWidth={1.5} />
            </div>
            <p className="font-medium" style={{ color: theme.textPrimary }}>영상이 없습니다</p>
          </div>
        ) : (
          <div className="space-y-4">
            {videos.map((video) => (
              <div
                key={video.id}
                className="rounded-2xl overflow-hidden cursor-pointer"
                style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}
                onClick={() => openModal(video)}
              >
                {/* 썸네일 */}
                <div 
                  className="relative aspect-video" 
                  style={{ backgroundColor: isDark ? '#000' : '#1a1a1a' }}
                >
                  {video.thumbnail_url ? (
                    <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Video className="w-16 h-16" style={{ color: theme.textMuted }} strokeWidth={1} />
                    </div>
                  )}
                  
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                    <div 
                      className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
                      style={{ backgroundColor: theme.accent }}
                    >
                      <Play className="w-7 h-7 ml-1" style={{ color: isDark ? '#121212' : '#FFFFFF' }} fill={isDark ? '#121212' : '#FFFFFF'} strokeWidth={0} />
                    </div>
                  </div>

                  {video.duration && (
                    <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                      {video.duration}
                    </div>
                  )}
                </div>

                {/* 제목/정보/공유 */}
                <div className="p-4">
                  <h3 className="font-bold mb-1 line-clamp-2" style={{ color: theme.textPrimary }}>
                    {video.title}
                  </h3>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm" style={{ color: theme.textMuted }}>
                      <span>조회수 {video.view_count || 0}회</span>
                      <span>·</span>
                      <span>{formatDate(video.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* 좋아요 수 */}
                      <div className="flex items-center gap-1 text-sm" style={{ color: theme.textMuted }}>
                        <Heart className="w-4 h-4" strokeWidth={1.5} />
                        <span>{video.like_count || 0}</span>
                      </div>
                      {/* 댓글 수 */}
                      <div className="flex items-center gap-1 text-sm" style={{ color: theme.textMuted }}>
                        <MessageCircle className="w-4 h-4" strokeWidth={1.5} />
                        <span>{video.comment_count || 0}</span>
                      </div>
                      {/* 공유 */}
                      <button 
                        className="p-2 rounded-lg"
                        style={{ backgroundColor: theme.bgInput }}
                        onClick={(e) => { e.stopPropagation(); handleShare(video); }}
                      >
                        <Share2 className="w-5 h-5" style={{ color: theme.textMuted }} strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* 메인 모달 - 전체 화면 */}
      {modalVideo && (
        <div 
          className="fixed inset-0 z-[100] flex justify-center"
          style={{ backgroundColor: theme.bgMain }}
        >
          <div className="w-full max-w-[640px] flex flex-col h-full">
            {/* 비디오 플레이어 - 상단 고정, 타일형 */}
            <div className="p-3 flex-shrink-0" style={{ backgroundColor: theme.bgMain }}>
              <div 
                ref={videoContainerRef}
                className={`relative bg-black rounded-2xl overflow-hidden ${isFullscreen ? 'fixed inset-0 z-[200] rounded-none' : 'aspect-video'}`}
                onClick={handleVideoTap}
              >
              {modalVideo.video_url ? (
                <video
                  key={modalVideo.id}
                  ref={modalVideoRef}
                  src={modalVideo.video_url}
                  poster={modalVideo.thumbnail_url}
                  className="w-full h-full object-contain"
                  playsInline
                  autoPlay
                  onPlay={() => { setIsPlaying(true); setShowControls(false); }}
                  onPause={() => { setIsPlaying(false); setShowControls(true); }}
                  onTimeUpdate={() => {
                    if (modalVideoRef.current) {
                      setCurrentTime(modalVideoRef.current.currentTime);
                    }
                  }}
                  onLoadedMetadata={() => {
                    if (modalVideoRef.current) {
                      setDuration(modalVideoRef.current.duration);
                    }
                  }}
                  onEnded={() => { setIsPlaying(false); setShowControls(true); }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Video className="w-20 h-20" style={{ color: '#666' }} strokeWidth={1} />
                </div>
              )}
              
              {/* 10초 인디케이터 */}
              {seekIndicator && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="bg-black/70 rounded-full px-6 py-3">
                    <span className="text-white text-lg font-bold">{seekIndicator}</span>
                  </div>
                </div>
              )}

              {/* 컨트롤 오버레이 */}
              {showControls && (
                <>
                  <div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/60 to-transparent">
                    <button onClick={(e) => { e.stopPropagation(); closeModal(); }} className="p-2 rounded-full bg-black/40">
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

            {/* 스크롤 가능한 컨텐츠 */}
            {!isFullscreen && (
              <div className="flex-1 overflow-y-auto hide-scrollbar">
                {/* 제목 */}
                <div className="p-4" style={{ borderBottom: `1px solid ${theme.border}` }}>
                  <h2 className="font-bold text-lg mb-2" style={{ color: theme.textPrimary }}>{modalVideo.title}</h2>
                  
                  {/* 조회수, 날짜, 설명보기, 좋아요, 공유 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm" style={{ color: theme.textMuted }}>
                      <span>조회수 {modalVideo.view_count || 0}회</span>
                      <span>·</span>
                      <span>{formatDate(modalVideo.created_at)}</span>
                      {modalVideo.description && (
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
                      {/* 좋아요 */}
                      <button 
                        className="p-2 rounded-lg flex items-center gap-1"
                        style={{ backgroundColor: likes[modalVideo.id]?.liked ? theme.redBg : theme.bgInput }}
                        onClick={() => handleLike(modalVideo.id)}
                      >
                        <Heart 
                          className="w-5 h-5" 
                          style={{ color: likes[modalVideo.id]?.liked ? theme.red : theme.textMuted }} 
                          fill={likes[modalVideo.id]?.liked ? theme.red : 'none'}
                          strokeWidth={1.5} 
                        />
                        <span className="text-sm" style={{ color: likes[modalVideo.id]?.liked ? theme.red : theme.textMuted }}>
                          {likes[modalVideo.id]?.count || 0}
                        </span>
                      </button>
                      
                      {/* 공유 */}
                      <button 
                        className="p-2 rounded-lg"
                        style={{ backgroundColor: theme.bgInput }}
                        onClick={() => handleShare(modalVideo)}
                      >
                        <Share2 className="w-5 h-5" style={{ color: theme.textMuted }} strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                  
                  {/* 설명란 (토글) - 문단 나누기 적용 */}
                  {showDescription && modalVideo.description && (
                    <div 
                      className="mt-3 p-4 rounded-xl"
                      style={{ backgroundColor: theme.bgInput }}
                    >
                      {formatDescription(modalVideo.description)}
                    </div>
                  )}
                </div>

                {/* 댓글 미리보기 영역 - 클릭하면 모달 열림 */}
                <div 
                  className="p-4 cursor-pointer"
                  style={{ borderBottom: `1px solid ${theme.border}` }}
                  onClick={openCommentModal}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <MessageCircle className="w-5 h-5" style={{ color: theme.textPrimary }} strokeWidth={1.5} />
                    <span className="font-semibold" style={{ color: theme.textPrimary }}>
                      댓글 {modalVideo.comment_count || 0}
                    </span>
                  </div>
                  
                  {/* 댓글 입력창 모양 (클릭용) */}
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

                {/* 다음 영상 목록 */}
                <div className="p-4">
                  <h3 className="font-semibold mb-3" style={{ color: theme.textPrimary }}>다음 영상</h3>
                  <div className="space-y-4">
                    {videos.filter(v => v.id !== modalVideo.id).map((video) => (
                      <div 
                        key={video.id} 
                        className="cursor-pointer rounded-2xl overflow-hidden"
                        style={{ backgroundColor: theme.bgInput, border: `1px solid ${theme.border}` }}
                        onClick={() => openModal(video)}
                      >
                        {/* 썸네일 */}
                        <div className="relative aspect-video bg-black">
                          {video.thumbnail_url ? (
                            <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Video className="w-12 h-12" style={{ color: '#666' }} strokeWidth={1} />
                            </div>
                          )}
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                            <div 
                              className="w-12 h-12 rounded-full flex items-center justify-center"
                              style={{ backgroundColor: theme.accent }}
                            >
                              <Play className="w-6 h-6 ml-0.5" style={{ color: isDark ? '#121212' : '#FFFFFF' }} fill={isDark ? '#121212' : '#FFFFFF'} strokeWidth={0} />
                            </div>
                          </div>
                          {video.duration && (
                            <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">
                              {video.duration}
                            </div>
                          )}
                        </div>
                        {/* 정보 */}
                        <div className="p-3">
                          <h4 className="font-medium text-sm line-clamp-2 mb-1" style={{ color: theme.textPrimary }}>
                            {video.title}
                          </h4>
                          <p className="text-xs" style={{ color: theme.textMuted }}>
                            조회수 {video.view_count || 0}회 · {formatDate(video.created_at)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 댓글 모달 - 영상은 보이고 아래만 어둡게 */}
      {showCommentModal && modalVideo && (
        <div 
          className="fixed inset-0 z-[150] flex justify-center pointer-events-none"
        >
          {/* 영상 영역 아래부터 어둡게 */}
          <div 
            className="absolute left-0 right-0 bottom-0 pointer-events-auto"
            style={{ top: 'min(360px, 56.25vw)' }}
            onClick={() => setShowCommentModal(false)}
          >
            <div className="absolute inset-0 bg-black/40" />
          </div>
          
          {/* 모달 */}
          <div 
            className="absolute bottom-0 w-full max-w-[640px] rounded-t-3xl flex flex-col overflow-hidden pointer-events-auto"
            style={{ 
              backgroundColor: theme.bgCard,
              height: '60vh'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 핸들바 */}
            <div className="flex justify-center py-2 flex-shrink-0">
              <div className="w-10 h-1 rounded-full" style={{ backgroundColor: theme.border }} />
            </div>
            
            {/* 헤더 */}
            <div className="flex items-center justify-between px-4 pb-3 flex-shrink-0" style={{ borderBottom: `1px solid ${theme.border}` }}>
              <h3 className="font-bold text-lg" style={{ color: theme.textPrimary }}>
                댓글 {modalVideo.comment_count || 0}개
              </h3>
              <button 
                onClick={() => setShowCommentModal(false)}
                className="p-2 rounded-full"
                style={{ backgroundColor: theme.bgInput }}
              >
                <X className="w-5 h-5" style={{ color: theme.textPrimary }} strokeWidth={1.5} />
              </button>
            </div>
            
            {/* 정렬 옵션 */}
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
            
            {/* 댓글 목록 */}
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
                      
                      {/* 답글 목록 */}
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
            
            {/* 답글 작성 중 표시 */}
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
            
            {/* 댓글/답글 입력 */}
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

      {!modalVideo && <BottomNav />}
    </div>
  );
}
