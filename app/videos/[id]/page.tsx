"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function VideoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [video, setVideo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [relatedVideos, setRelatedVideos] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [commentMenuId, setCommentMenuId] = useState<number | null>(null);
  const [showProfileModal, setShowProfileModal] = useState<any>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [showShareModal, setShowShareModal] = useState(false);
  const [commentLikes, setCommentLikes] = useState<{[key: number]: {liked: boolean, disliked: boolean, likeCount: number, dislikeCount: number}}>({});
  
  // 플레이어 상태
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  
  // 광고 관련 상태
  const [midAd, setMidAd] = useState<any>(null);
  const [showAd, setShowAd] = useState(false);
  const [adCountdown, setAdCountdown] = useState(5);
  const [adShown, setAdShown] = useState(false);
  const [adTriggerTime, setAdTriggerTime] = useState(30);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // video_id를 정수로 변환하는 헬퍼 함수
  const getVideoId = () => parseInt(params.id as string);

  useEffect(() => {
    if (params.id) {
      fetchVideo();
      fetchComments();
      fetchMidAd();
      checkUser();
    }
  }, [params.id]);

  // 실시간 댓글 구독
  useEffect(() => {
    const videoId = getVideoId();
    const channel = supabase
      .channel(`video_comments_${videoId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'video_comments',
          filter: `video_id=eq.${videoId}`
        },
        (payload) => {
          fetchComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [params.id]);

  // 컨트롤 자동 숨김
  useEffect(() => {
    if (isPlaying && showControls) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isPlaying, showControls]);

  // 광고 카운트다운
  useEffect(() => {
    if (showAd && adCountdown > 0) {
      const timer = setTimeout(() => {
        setAdCountdown(adCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [showAd, adCountdown]);

  // 전체화면 변경 감지
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
    
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      setIsAdmin(profile?.role === "admin");
      
      // 좋아요 상태 확인
      const { data: like } = await supabase
        .from("video_likes")
        .select("id")
        .eq("video_id", getVideoId())
        .eq("user_id", user.id)
        .single();
      setIsLiked(!!like);
    }
  };

  const fetchVideo = async () => {
    setLoading(true);
    const videoId = getVideoId();
    const { data } = await supabase
      .from("videos")
      .select("*")
      .eq("id", videoId)
      .single();

    if (data) {
      setVideo(data);
      setLikeCount(data.like_count || 0);
      
      if (data.duration) {
        const midPoint = Math.floor(data.duration / 2);
        setAdTriggerTime(Math.min(midPoint, 30));
      }

      await supabase
        .from("videos")
        .update({ view_count: (data.view_count || 0) + 1 })
        .eq("id", videoId);

      const { data: related } = await supabase
        .from("videos")
        .select("*")
        .neq("id", videoId)
        .order("created_at", { ascending: false });
      setRelatedVideos(related || []);
    }
    setLoading(false);
  };

  const fetchComments = async () => {
    const videoId = getVideoId();
    const { data, error } = await supabase
      .from("video_comments")
      .select("*, profiles(id, nickname, avatar_url)")
      .eq("video_id", videoId)
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("댓글 불러오기 에러:", error);
    } else {
      setComments(data || []);
      if (data && data.length > 0) {
        fetchCommentLikes(data.map(c => c.id));
      }
    }
  };

  const fetchCommentLikes = async (commentIds: number[]) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    // 좋아요 수
    const { data: likeCounts } = await supabase
      .from("video_comment_likes")
      .select("comment_id")
      .in("comment_id", commentIds);
    
    // 싫어요 수
    const { data: dislikeCounts } = await supabase
      .from("video_comment_dislikes")
      .select("comment_id")
      .in("comment_id", commentIds);
    
    let userLikes: number[] = [];
    let userDislikes: number[] = [];
    
    if (user) {
      const { data: myLikes } = await supabase
        .from("video_comment_likes")
        .select("comment_id")
        .eq("user_id", user.id)
        .in("comment_id", commentIds);
      userLikes = myLikes?.map(l => l.comment_id) || [];
      
      const { data: myDislikes } = await supabase
        .from("video_comment_dislikes")
        .select("comment_id")
        .eq("user_id", user.id)
        .in("comment_id", commentIds);
      userDislikes = myDislikes?.map(l => l.comment_id) || [];
    }
    
    const likesObj: {[key: number]: {liked: boolean, disliked: boolean, likeCount: number, dislikeCount: number}} = {};
    commentIds.forEach(id => {
      const likeCount = likeCounts?.filter(l => l.comment_id === id).length || 0;
      const dislikeCount = dislikeCounts?.filter(l => l.comment_id === id).length || 0;
      likesObj[id] = {
        liked: userLikes.includes(id),
        disliked: userDislikes.includes(id),
        likeCount,
        dislikeCount
      };
    });
    setCommentLikes(likesObj);
  };

  const fetchMidAd = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from("ads")
      .select("*")
      .eq("position", "video_mid")
      .eq("is_active", true)
      .or(`start_date.is.null,start_date.lte.${today}`)
      .or(`end_date.is.null,end_date.gte.${today}`);
    
    if (data && data.length > 0) {
      const filteredAds = data.filter(ad => {
        if (!ad.target_type || ad.target_type === "all") return true;
        if (ad.target_type === "page" && ad.target_pages?.length) {
          return ad.target_pages.includes("videos");
        }
        return true;
      });

      if (filteredAds.length === 0) return;

      const pinned = filteredAds.filter(ad => ad.is_pinned).sort((a, b) => (a.pin_order || 0) - (b.pin_order || 0));
      let selectedAd;
      if (pinned.length > 0) {
        selectedAd = pinned[0];
      } else {
        const randomIndex = Math.floor(Math.random() * filteredAds.length);
        selectedAd = filteredAds[randomIndex];
      }
      setMidAd(selectedAd);
      setAdTriggerTime(selectedAd.trigger_time || 30);
    }
  };

  // 좋아요 토글
  const handleLike = async () => {
    if (!currentUser) {
      alert("로그인이 필요합니다");
      return;
    }

    const videoId = getVideoId();

    if (isLiked) {
      await supabase
        .from("video_likes")
        .delete()
        .eq("video_id", videoId)
        .eq("user_id", currentUser.id);
      
      await supabase
        .from("videos")
        .update({ like_count: Math.max(0, likeCount - 1) })
        .eq("id", videoId);
      
      setIsLiked(false);
      setLikeCount(prev => Math.max(0, prev - 1));
    } else {
      await supabase
        .from("video_likes")
        .insert({ video_id: videoId, user_id: currentUser.id });
      
      await supabase
        .from("videos")
        .update({ like_count: likeCount + 1 })
        .eq("id", videoId);
      
      setIsLiked(true);
      setLikeCount(prev => prev + 1);
    }
  };

  // 댓글 좋아요 토글
  const handleCommentLike = async (commentId: number) => {
    if (!currentUser) {
      alert("로그인이 필요합니다");
      return;
    }

    const current = commentLikes[commentId];
    
    // 이미 싫어요 했으면 싫어요 취소
    if (current?.disliked) {
      await supabase
        .from("video_comment_dislikes")
        .delete()
        .eq("comment_id", commentId)
        .eq("user_id", currentUser.id);
    }
    
    if (current?.liked) {
      await supabase
        .from("video_comment_likes")
        .delete()
        .eq("comment_id", commentId)
        .eq("user_id", currentUser.id);
      
      setCommentLikes(prev => ({
        ...prev,
        [commentId]: { 
          ...prev[commentId],
          liked: false, 
          likeCount: Math.max(0, (prev[commentId]?.likeCount || 1) - 1) 
        }
      }));
    } else {
      await supabase
        .from("video_comment_likes")
        .insert({ comment_id: commentId, user_id: currentUser.id });
      
      setCommentLikes(prev => ({
        ...prev,
        [commentId]: { 
          liked: true, 
          disliked: false,
          likeCount: (prev[commentId]?.likeCount || 0) + 1,
          dislikeCount: current?.disliked ? Math.max(0, (prev[commentId]?.dislikeCount || 1) - 1) : (prev[commentId]?.dislikeCount || 0)
        }
      }));
    }
  };

  // 댓글 싫어요 토글
  const handleCommentDislike = async (commentId: number) => {
    if (!currentUser) {
      alert("로그인이 필요합니다");
      return;
    }

    const current = commentLikes[commentId];
    
    // 이미 좋아요 했으면 좋아요 취소
    if (current?.liked) {
      await supabase
        .from("video_comment_likes")
        .delete()
        .eq("comment_id", commentId)
        .eq("user_id", currentUser.id);
    }
    
    if (current?.disliked) {
      await supabase
        .from("video_comment_dislikes")
        .delete()
        .eq("comment_id", commentId)
        .eq("user_id", currentUser.id);
      
      setCommentLikes(prev => ({
        ...prev,
        [commentId]: { 
          ...prev[commentId],
          disliked: false, 
          dislikeCount: Math.max(0, (prev[commentId]?.dislikeCount || 1) - 1) 
        }
      }));
    } else {
      await supabase
        .from("video_comment_dislikes")
        .insert({ comment_id: commentId, user_id: currentUser.id });
      
      setCommentLikes(prev => ({
        ...prev,
        [commentId]: { 
          liked: false,
          disliked: true, 
          likeCount: current?.liked ? Math.max(0, (prev[commentId]?.likeCount || 1) - 1) : (prev[commentId]?.likeCount || 0),
          dislikeCount: (prev[commentId]?.dislikeCount || 0) + 1
        }
      }));
    }
  };

  // 공유 - 카카오톡
  const shareKakao = () => {
    const url = window.location.href;
    if (typeof window !== 'undefined' && (window as any).Kakao) {
      const Kakao = (window as any).Kakao;
      if (!Kakao.isInitialized()) {
        Kakao.init('YOUR_KAKAO_JAVASCRIPT_KEY');
      }
      Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title: video.title,
          description: video.description || '여주마켓에서 영상을 확인하세요',
          imageUrl: video.thumbnail_url || '',
          link: {
            mobileWebUrl: url,
            webUrl: url,
          },
        },
        buttons: [
          {
            title: '영상 보기',
            link: {
              mobileWebUrl: url,
              webUrl: url,
            },
          },
        ],
      });
    } else {
      const kakaoUrl = `https://story.kakao.com/share?url=${encodeURIComponent(url)}`;
      window.open(kakaoUrl, '_blank', 'width=600,height=400');
    }
    setShowShareModal(false);
  };

  // 공유 - 페이스북
  const shareFacebook = () => {
    const url = window.location.href;
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    window.open(facebookUrl, '_blank', 'width=600,height=400');
    setShowShareModal(false);
  };

  // 공유 - 네이버 밴드
  const shareBand = () => {
    const url = window.location.href;
    const title = video.title;
    const bandUrl = `https://band.us/plugin/share?body=${encodeURIComponent(title)}&route=${encodeURIComponent(url)}`;
    window.open(bandUrl, '_blank', 'width=600,height=400');
    setShowShareModal(false);
  };

  // 공유 - 링크 복사
  const copyLink = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      alert("링크가 복사되었습니다");
    } catch (e) {
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert("링크가 복사되었습니다");
    }
    setShowShareModal(false);
  };

  // 플레이어 컨트롤
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
    
    if (midAd && !adShown && videoRef.current.currentTime >= adTriggerTime) {
      videoRef.current.pause();
      setIsPlaying(false);
      setShowAd(true);
      setAdShown(true);
      setAdCountdown(5);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.volume = vol;
      setVolume(vol);
      setIsMuted(vol === 0);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      if (isMuted) {
        videoRef.current.volume = volume || 0.5;
        videoRef.current.muted = false;
        setIsMuted(false);
      } else {
        videoRef.current.muted = true;
        setIsMuted(true);
      }
    }
  };

  const toggleFullscreen = () => {
    if (!playerRef.current) return;
    if (!isFullscreen) {
      playerRef.current.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const closeAd = () => {
    setShowAd(false);
    if (videoRef.current) {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleAdClick = () => {
    if (midAd?.link_url) {
      window.open(midAd.link_url, "_blank");
    }
  };

  // 댓글 작성
  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;
    if (!currentUser) {
      alert("로그인이 필요합니다");
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.from("video_comments").insert({
        video_id: getVideoId(),
        user_id: currentUser.id,
        content: newComment.trim(),
      }).select();
      
      if (error) {
        console.error("댓글 작성 에러:", error);
        alert("댓글 작성에 실패했습니다: " + error.message);
      } else {
        setNewComment("");
        await fetchComments();
      }
    } catch (err) {
      console.error("댓글 작성 예외:", err);
      alert("댓글 작성에 실패했습니다");
    }
    setSubmitting(false);
  };

  // 댓글 수정
  const handleEditComment = async (commentId: number) => {
    if (!editingContent.trim()) return;
    const { error } = await supabase
      .from("video_comments")
      .update({ content: editingContent.trim() })
      .eq("id", commentId);
    
    if (!error) {
      setEditingCommentId(null);
      setEditingContent("");
      await fetchComments();
    }
  };

  // 댓글 삭제
  const handleDeleteComment = async (commentId: number) => {
    if (!confirm("댓글을 삭제하시겠습니까?")) return;
    await supabase.from("video_comments").delete().eq("id", commentId);
    setCommentMenuId(null);
    await fetchComments();
  };

  // 영상 삭제
  const handleDeleteVideo = async () => {
    if (!confirm("영상을 삭제하시겠습니까?")) return;
    await supabase.from("videos").delete().eq("id", getVideoId());
    router.push("/videos");
  };

  // 신고
  const handleReport = () => {
    alert("신고가 접수되었습니다.");
    setShowMenu(false);
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

  const formatLikeCount = (count: number) => {
    if (count >= 10000) return `${(count / 10000).toFixed(1)}만`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}천`;
    return count.toString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-900 text-xl mb-4">영상을 찾을 수 없습니다</p>
          <Link href="/videos" className="text-red-500 font-bold">목록으로</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-24 md:pb-10">
      {/* 비디오 플레이어 */}
      <div 
        ref={playerRef}
        className="relative bg-black w-full"
        onMouseMove={() => setShowControls(true)}
        onMouseLeave={() => {
          if (isPlaying) setShowControls(false);
          setShowVolumeSlider(false);
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className={`${isFullscreen ? 'w-full h-full' : 'max-w-5xl mx-auto'}`}>
          <div className={`relative ${isFullscreen ? 'h-full' : 'aspect-video'}`}>
            <video
              ref={videoRef}
              src={video.video_url}
              poster={video.thumbnail_url}
              className="w-full h-full bg-black"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
              onClick={togglePlay}
              controlsList="nodownload"
              disablePictureInPicture
            />
            
            {/* 재생/일시정지 오버레이 */}
            {!isPlaying && !showAd && (
              <div 
                className="absolute inset-0 flex items-center justify-center cursor-pointer bg-black/30"
                onClick={togglePlay}
              >
                <div className="w-20 h-20 rounded-full bg-red-600/90 flex items-center justify-center hover:bg-red-600 transition-colors">
                  <svg className="w-10 h-10 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </div>
              </div>
            )}

            {/* 커스텀 컨트롤 */}
            <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent transition-opacity duration-300 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              {/* 진행바 */}
              <div className="px-4 pt-10">
                <input
                  type="range"
                  min={0}
                  max={duration || 0}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-1.5 bg-white/30 rounded-full appearance-none cursor-pointer hover:h-2 transition-all"
                  style={{
                    background: `linear-gradient(to right, #ff0000 0%, #ff0000 ${(currentTime / duration) * 100}%, rgba(255,255,255,0.3) ${(currentTime / duration) * 100}%, rgba(255,255,255,0.3) 100%)`
                  }}
                />
              </div>
              
              {/* 컨트롤 버튼들 - 아이콘 크기 통일 (w-7 h-7) */}
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-4">
                  {/* 재생/일시정지 */}
                  <button onClick={togglePlay} className="text-white hover:text-white/80">
                    {isPlaying ? (
                      <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                      </svg>
                    ) : (
                      <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    )}
                  </button>
                  
                  {/* 볼륨 */}
                  <div 
                    className="flex items-center gap-2"
                    onMouseEnter={() => setShowVolumeSlider(true)}
                    onMouseLeave={() => setShowVolumeSlider(false)}
                  >
                    <button onClick={toggleMute} className="text-white hover:text-white/80">
                      {isMuted || volume === 0 ? (
                        <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                        </svg>
                      ) : (
                        <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                        </svg>
                      )}
                    </button>
                    <div className={`flex items-center overflow-hidden transition-all duration-200 ${showVolumeSlider ? 'w-24' : 'w-0'}`}>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        className="w-full h-1.5 bg-white/30 rounded-full appearance-none cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, #fff 0%, #fff ${(isMuted ? 0 : volume) * 100}%, rgba(255,255,255,0.3) ${(isMuted ? 0 : volume) * 100}%, rgba(255,255,255,0.3) 100%)`
                        }}
                      />
                    </div>
                  </div>
                  
                  {/* 시간 */}
                  <span className="text-white text-sm font-medium">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>
                
                <div className="flex items-center gap-3">
                  {/* 전체화면 */}
                  <button onClick={toggleFullscreen} className="text-white hover:text-white/80">
                    {isFullscreen ? (
                      <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                      </svg>
                    ) : (
                      <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* 광고 오버레이 */}
            {showAd && midAd && (
              <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center z-20">
                <div className="absolute top-4 left-4 bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded">
                  광고
                </div>
                
                <button
                  onClick={adCountdown === 0 ? closeAd : undefined}
                  className={`absolute top-4 right-4 px-4 py-2 rounded text-sm font-bold transition-all ${
                    adCountdown === 0 
                      ? "bg-white text-black hover:bg-gray-200 cursor-pointer" 
                      : "bg-gray-700 text-gray-300 cursor-not-allowed"
                  }`}
                >
                  {adCountdown > 0 ? `${adCountdown}초 후 스킵 가능` : "광고 스킵 ▶"}
                </button>
                
                <div className="max-w-lg w-full mx-4 cursor-pointer" onClick={handleAdClick}>
                  {midAd.video_url ? (
                    <video src={midAd.video_url} autoPlay muted className="w-full rounded-xl" onEnded={() => setAdCountdown(0)} />
                  ) : midAd.image_url ? (
                    <img src={midAd.image_url} alt={midAd.title} className="w-full rounded-xl hover:scale-105 transition-transform" />
                  ) : (
                    <div className="bg-gradient-to-r from-red-500 to-orange-500 p-8 rounded-xl text-center">
                      <p className="text-white text-2xl font-bold">{midAd.title}</p>
                    </div>
                  )}
                  <p className="text-white text-center mt-4 font-medium">{midAd.title}</p>
                  {midAd.link_url && (
                    <p className="text-blue-400 text-center text-sm mt-2">자세히 알아보기</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 영상 정보 & 댓글 */}
      <div className="max-w-5xl mx-auto px-4">
        {/* 영상 정보 */}
        <div className="py-4">
          <h1 className="text-lg font-semibold text-gray-900 mb-2">{video.title}</h1>
          
          <div className="flex items-center justify-between flex-wrap gap-3 py-2 border-b border-gray-200">
            <div className="text-sm text-gray-600">
              조회수 {(video.view_count || 0).toLocaleString()}회 · {formatDate(video.created_at)}
            </div>
            
            <div className="flex items-center gap-2">
              {/* 좋아요 */}
              <button 
                onClick={handleLike}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors ${isLiked ? 'bg-red-100 text-red-600' : 'bg-gray-100 hover:bg-gray-200'}`}
              >
                <svg className="w-5 h-5" fill={isLiked ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                </svg>
                <span className="font-medium text-sm">{formatLikeCount(likeCount)}</span>
              </button>
              
              {/* 공유 */}
              <button 
                onClick={() => setShowShareModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/>
                </svg>
                <span className="font-medium text-sm">공유</span>
              </button>
              
              {/* 더보기 메뉴 */}
              <div className="relative">
                <button 
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-1.5 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                  </svg>
                </button>
                
                {showMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)}></div>
                    <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg py-2 min-w-[150px] z-50">
                      {isAdmin ? (
                        <>
                          <button 
                            onClick={() => { router.push(`/admin/videos/edit/${params.id}`); setShowMenu(false); }}
                            className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
                          >
                            수정
                          </button>
                          <button 
                            onClick={handleDeleteVideo}
                            className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm text-red-500"
                          >
                            삭제
                          </button>
                        </>
                      ) : (
                        <button 
                          onClick={handleReport}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
                        >
                          신고
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          
          {/* 설명 */}
          {video.description && (
            <div className="mt-3 p-3 bg-gray-100 rounded-xl">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{video.description}</p>
            </div>
          )}
        </div>

        {/* 댓글 섹션 */}
        <div className="py-4">
          <h2 className="font-semibold text-gray-900 mb-4">댓글 {comments.length}개</h2>
          
          {/* 댓글 입력 */}
          <div className="flex gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0 overflow-hidden">
              <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            </div>
            <div className="flex-1">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={currentUser ? "댓글 추가..." : "로그인 후 댓글을 작성할 수 있습니다"}
                disabled={!currentUser}
                className="w-full border-b border-gray-300 focus:border-gray-900 outline-none py-2 bg-transparent transition-colors disabled:opacity-50 text-sm"
                onKeyPress={(e) => e.key === "Enter" && handleSubmitComment()}
              />
              {newComment && (
                <div className="flex justify-end gap-2 mt-2">
                  <button
                    onClick={() => setNewComment("")}
                    className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleSubmitComment}
                    disabled={submitting || !newComment.trim()}
                    className="px-4 py-2 text-sm bg-blue-500 text-white rounded-full font-medium disabled:opacity-50 disabled:bg-gray-300 hover:bg-blue-600 transition-colors"
                  >
                    {submitting ? "등록 중..." : "댓글"}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 댓글 목록 */}
          <div className="space-y-4">
            {comments.length === 0 ? (
              <p className="text-gray-500 text-center py-8 text-sm">첫 댓글을 남겨보세요!</p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <button
                    onClick={() => setShowProfileModal(comment.profiles)}
                    className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0 overflow-hidden hover:opacity-80"
                  >
                    {comment.profiles?.avatar_url ? (
                      <img src={comment.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                      </svg>
                    )}
                  </button>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setShowProfileModal(comment.profiles)}
                          className="font-medium text-gray-900 text-sm hover:underline"
                        >
                          {comment.profiles?.nickname || "익명"}
                        </button>
                        <span className="text-gray-500 text-xs">
                          {formatDate(comment.created_at)}
                        </span>
                      </div>
                      
                      {/* 댓글 메뉴 (본인 또는 관리자만) */}
                      {(currentUser?.id === comment.user_id || isAdmin) && (
                        <div className="relative">
                          <button 
                            onClick={() => setCommentMenuId(commentMenuId === comment.id ? null : comment.id)}
                            className="p-1 hover:bg-gray-100 rounded-full"
                          >
                            <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                            </svg>
                          </button>
                          
                          {commentMenuId === comment.id && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setCommentMenuId(null)}></div>
                              <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg py-1 min-w-[100px] z-50">
                                {currentUser?.id === comment.user_id && (
                                  <button 
                                    onClick={() => { 
                                      setEditingCommentId(comment.id); 
                                      setEditingContent(comment.content); 
                                      setCommentMenuId(null);
                                    }}
                                    className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
                                  >
                                    수정
                                  </button>
                                )}
                                {(currentUser?.id === comment.user_id || isAdmin) && (
                                  <button 
                                    onClick={() => handleDeleteComment(comment.id)}
                                    className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm text-red-500"
                                  >
                                    삭제
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {editingCommentId === comment.id ? (
                      <div className="mt-1">
                        <input
                          type="text"
                          value={editingContent}
                          onChange={(e) => setEditingContent(e.target.value)}
                          className="w-full border-b border-gray-300 focus:border-gray-900 outline-none py-1 text-sm"
                          autoFocus
                        />
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => { setEditingCommentId(null); setEditingContent(""); }}
                            className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded-full"
                          >
                            취소
                          </button>
                          <button
                            onClick={() => handleEditComment(comment.id)}
                            className="px-3 py-1 text-xs bg-blue-500 text-white rounded-full hover:bg-blue-600"
                          >
                            저장
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-gray-800 text-sm mt-1">{comment.content}</p>
                        {/* 댓글 좋아요/싫어요 버튼 */}
                        <div className="flex items-center gap-3 mt-2">
                          <button
                            onClick={() => handleCommentLike(comment.id)}
                            className={`flex items-center gap-1 text-xs ${commentLikes[comment.id]?.liked ? 'text-blue-500' : 'text-gray-500 hover:text-gray-700'}`}
                          >
                            <svg className="w-4 h-4" fill={commentLikes[comment.id]?.liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                            </svg>
                            {(commentLikes[comment.id]?.likeCount || 0) > 0 && (
                              <span>{commentLikes[comment.id]?.likeCount}</span>
                            )}
                          </button>
                          <button
                            onClick={() => handleCommentDislike(comment.id)}
                            className={`flex items-center gap-1 text-xs ${commentLikes[comment.id]?.disliked ? 'text-red-500' : 'text-gray-500 hover:text-gray-700'}`}
                          >
                            <svg className="w-4 h-4" fill={commentLikes[comment.id]?.disliked ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v5a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2m5-6h2.5a2 2 0 012 2v6a2 2 0 01-2 2H17" />
                            </svg>
                            {(commentLikes[comment.id]?.dislikeCount || 0) > 0 && (
                              <span>{commentLikes[comment.id]?.dislikeCount}</span>
                            )}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 다른 영상 */}
        {relatedVideos.length > 0 && (
          <div className="border-t border-gray-200 py-4">
            <h3 className="font-semibold text-gray-900 mb-4">다른 영상</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {relatedVideos.map((rv) => (
                <Link key={rv.id} href={`/videos/${rv.id}`} className="block group">
                  <div className="relative aspect-video bg-gray-200 rounded-xl overflow-hidden mb-2">
                    {rv.thumbnail_url ? (
                      <img src={rv.thumbnail_url} alt={rv.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-14 h-14 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                      </div>
                    )}
                    {rv.duration && (
                      <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">
                        {rv.duration}
                      </div>
                    )}
                  </div>
                  <h4 className="text-gray-900 font-medium line-clamp-2 leading-tight text-sm">{rv.title}</h4>
                  <p className="text-gray-500 text-xs mt-1">조회수 {(rv.view_count || 0).toLocaleString()}회</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 공유 모달 */}
      {showShareModal && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50"
          onClick={() => setShowShareModal(false)}
        >
          <div 
            className="bg-white rounded-t-2xl md:rounded-2xl p-6 w-full max-w-sm mx-0 md:mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">공유하기</h3>
            
            <div className="grid grid-cols-4 gap-4">
              {/* 카카오톡 */}
              <button
                onClick={shareKakao}
                className="flex flex-col items-center gap-2"
              >
                <div className="w-14 h-14 rounded-full bg-[#FEE500] flex items-center justify-center">
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="#3C1E1E">
                    <path d="M12 3c-5.52 0-10 3.58-10 8 0 2.84 1.89 5.33 4.71 6.72l-.7 2.61a.5.5 0 00.77.54l3.12-2.08c.69.1 1.39.16 2.1.16 5.52 0 10-3.58 10-8s-4.48-8-10-8z"/>
                  </svg>
                </div>
                <span className="text-xs text-gray-700">카카오톡</span>
              </button>
              
              {/* 페이스북 */}
              <button
                onClick={shareFacebook}
                className="flex flex-col items-center gap-2"
              >
                <div className="w-14 h-14 rounded-full bg-[#1877F2] flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </div>
                <span className="text-xs text-gray-700">페이스북</span>
              </button>
              
              {/* 네이버 밴드 - 실제 밴드 아이콘 */}
              <button
                onClick={shareBand}
                className="flex flex-col items-center gap-2"
              >
                <div className="w-14 h-14 rounded-full bg-[#5AC466] flex items-center justify-center overflow-hidden">
                  <svg className="w-9 h-9" viewBox="0 0 24 24" fill="white">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-1v-4H9v4H8v-4.5c0-.28.22-.5.5-.5h3c.28 0 .5.22.5.5V17zm5 0h-1v-2h-2v2h-1v-2.5c0-.28.22-.5.5-.5h3c.28 0 .5.22.5.5V17zm-3-5c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm-4.5 0c-.83 0-1.5-.67-1.5-1.5S7.67 9 8.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm7 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
                  </svg>
                </div>
                <span className="text-xs text-gray-700">밴드</span>
              </button>
              
              {/* 링크 복사 */}
              <button
                onClick={copyLink}
                className="flex flex-col items-center gap-2"
              >
                <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center">
                  <svg className="w-7 h-7 text-gray-700" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
                <span className="text-xs text-gray-700">링크복사</span>
              </button>
            </div>
            
            <button
              onClick={() => setShowShareModal(false)}
              className="w-full mt-6 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* 프로필 모달 */}
      {showProfileModal && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowProfileModal(null)}
        >
          <div 
            className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center">
              <div className="w-24 h-24 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden mb-4">
                {showProfileModal.avatar_url ? (
                  <img src={showProfileModal.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <svg className="w-12 h-12 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                )}
              </div>
              <h3 className="text-xl font-bold text-gray-900">{showProfileModal.nickname || "익명"}</h3>
            </div>
            <button
              onClick={() => setShowProfileModal(null)}
              className="w-full mt-6 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* 하단 네비게이션 */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
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
            <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              <path d="M15.91 11.672a.375.375 0 010 .656l-5.603 3.113a.375.375 0 01-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112z" />
            </svg>
            <span className="text-xs font-bold text-red-500">영상</span>
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
