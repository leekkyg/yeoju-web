"use client";

import { useEffect, useState, useRef, Suspense, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/contexts/ThemeContext";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import VideoPlayer from "@/components/VideoPlayer";
import { 
  X, ChevronLeft, ChevronRight, Play, Camera, MoreVertical, Bell,
  Image as ImageIcon, Send, Smile, ThumbsUp, MessageCircle, Share2, 
  Bookmark, Edit, Trash2, Flag
} from "lucide-react";

const R2_WORKER_URL = "https://yeoju-r2-worker.kkyg9300.workers.dev";
const CHUNK_SIZE = 5 * 1024 * 1024;
const MAX_FILE_SIZE = 100 * 1024 * 1024;
const PARALLEL_UPLOADS = 1;
const linkPreviewCache = new Map<string, any>();

interface CommunityPageContentProps {
  initialPosts: any[];
}

function CommunityPageContent({ initialPosts }: CommunityPageContentProps) {
  const { theme, isDark, mounted } = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  
  // 서버에서 받은 데이터로 초기화 (로딩 없이 바로 렌더링)
  const [posts, setPosts] = useState<any[]>(initialPosts);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [expandedPosts, setExpandedPosts] = useState<Set<number>>(new Set());
  const [playingVideo, setPlayingVideo] = useState<number | null>(null);
  const videoTimesRef = useRef<Map<string, number>>(new Map());
  const [modalStartTime, setModalStartTime] = useState(0);
  const [expandedCommentPost, setExpandedCommentPost] = useState<number | null>(null);
  
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  
  const [profileModal, setProfileModal] = useState<any>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  
  const [unreadCount, setUnreadCount] = useState(0);
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);
  
  const [editingPost, setEditingPost] = useState<any>(null);
  const [editContent, setEditContent] = useState("");
  
  const [reportModal, setReportModal] = useState<any>(null);
  const [reportReason, setReportReason] = useState("");
  const [confirmPostModal, setConfirmPostModal] = useState(false);
  const [bookmarkedPosts, setBookmarkedPosts] = useState<Set<number>>(new Set());
  
  const [detailModal, setDetailModal] = useState<any>(null);
  const [photoModeOpen, setPhotoModeOpen] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [expandedComments, setExpandedComments] = useState<Set<number>>(new Set());
  const [expandedReplies, setExpandedReplies] = useState<Set<number>>(new Set());
  const [commentImages, setCommentImages] = useState<File[]>([]);
  const [commentImagePreviews, setCommentImagePreviews] = useState<string[]>([]);
  const commentImageRef = useRef<HTMLInputElement>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isAnonymousComment, setIsAnonymousComment] = useState(false);
  const [commentSort, setCommentSort] = useState<'oldest' | 'newest' | 'popular' | 'replies'>('oldest');
  const commentInputRef = useRef<HTMLInputElement>(null);
  const detailContentRef = useRef<HTMLDivElement>(null);
  
  const [listAds, setListAds] = useState<any[]>([]);
  const [detailAd, setDetailAd] = useState<any>(null);
  
  // 좋아요/댓글 작성자 목록 모달
  const [likersModal, setLikersModal] = useState<{ postId: number; users: any[] } | null>(null);
  const [commentersModal, setCommentersModal] = useState<{ postId: number; users: any[] } | null>(null);
  
  const [editProfileModal, setEditProfileModal] = useState(false);
  const [editNickname, setEditNickname] = useState("");
  const [editingProfile, setEditingProfile] = useState(false);
  const profileAvatarRef = useRef<HTMLInputElement>(null);
  
  const [content, setContent] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<{url: string, type: 'image' | 'video'}[]>([]);
  const [posting, setPosting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isWriting, setIsWriting] = useState(false);
  const writeBoxRef = useRef<HTMLDivElement>(null);
  
  const [writingLinkPreview, setWritingLinkPreview] = useState<any>(null);
  const [loadingLinkPreview, setLoadingLinkPreview] = useState(false);
  const [postLinkPreviews, setPostLinkPreviews] = useState<Map<number, any>>(new Map());
  
  const postRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const mainRef = useRef<HTMLDivElement>(null);

  const emojis = ['😀', '😂', '🥹', '😍', '🥰', '😎', '🤔', '😢', '😡', '👍', '👎', '❤️', '🔥', '👏', '🎉', '💯', '🙏', '😱', '🤣', '😊'];

  const isMutedPost = () => !userProfile?.mute_post_until ? false : new Date(userProfile.mute_post_until) > new Date();
  const isMutedComment = () => !userProfile?.mute_comment_until ? false : new Date(userProfile.mute_comment_until) > new Date();
  const getMuteMessage = (type: "post" | "comment") => {
    const until = type === "post" ? userProfile?.mute_post_until : userProfile?.mute_comment_until;
    if (!until) return "";
    const endDate = new Date(until);
    const formatted = endDate.toLocaleDateString("ko-KR", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
    return `${type === "post" ? "글쓰기" : "댓글"} 제한 중입니다.\n\n사유: ${userProfile?.mute_reason || "커뮤니티 규정 위반"}\n해제일: ${formatted}`;
  };

  const fetchAds = async () => {
    const { data: listData } = await supabase.from("ads").select("*").eq("position", "post_list").eq("is_active", true);
    setListAds(listData || []);
    const { data: detailData } = await supabase.from("ads").select("*").eq("position", "post_detail").eq("is_active", true);
    if (detailData?.length) setDetailAd(detailData[Math.floor(Math.random() * detailData.length)]);
  };

  const getRandomListAd = () => listAds.length === 0 ? null : listAds[Math.floor(Math.random() * listAds.length)];

  // URL 파라미터로 게시물 자동 열기
  useEffect(() => {
    if (!loading && !initialLoadDone && posts.length > 0) {
      const postId = searchParams.get('post');
      if (postId) {
        const post = posts.find(p => p.id === parseInt(postId));
        if (post) openDetailModal(post);
      }
      setInitialLoadDone(true);
    }
  }, [loading, posts, searchParams, initialLoadDone]);

  useEffect(() => {
    // fetchPosts() 제거 - 서버에서 이미 가져옴
    fetchAds();
    supabase.auth.getSession().then(async ({ data: { session } }) => { const user = session?.user;
      setUser(user);
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("*").eq("email", user.email).single();
        setUserProfile(profile);
        fetchUnreadCount(user.id);
        const { data: bookmarks } = await supabase.from("post_bookmarks").select("post_id").eq("user_id", user.id);
        if (bookmarks) setBookmarkedPosts(new Set(bookmarks.map(b => b.post_id)));
      }
    });
  }, []);

  // 🔥 실시간 게시글 구독
  useEffect(() => {
    const channel = supabase
      .channel('posts-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts'
        },
        async (payload) => {
          const newPost = payload.new as any;
          
          // 내가 작성한 글이면 무시 (이미 추가됨)
          if (user && newPost.user_id === user.id) return;
          
          // 중복 방지
          setPosts(prev => {
            if (prev.some(p => p.id === newPost.id)) return prev;
            return [newPost, ...prev];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'posts'
        },
        (payload) => {
          const updatedPost = payload.new as any;
          setPosts(prev => 
            prev.map(p => p.id === updatedPost.id ? { ...p, ...updatedPost } : p)
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'posts'
        },
        (payload) => {
          const deletedId = (payload.old as any).id;
          setPosts(prev => prev.filter(p => p.id !== deletedId));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (writeBoxRef.current && !writeBoxRef.current.contains(e.target as Node)) {
        if (!content.trim() && mediaFiles.length === 0) setIsWriting(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [content, mediaFiles]);

  useEffect(() => {
    const urls = extractLinks(content);
    if (urls.length > 0 && !writingLinkPreview) {
      const youtubeId = getYoutubeId(urls[0]);
      if (youtubeId) {
        setWritingLinkPreview({
          title: '유튜브 동영상',
          image: `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`,
          url: urls[0],
          domain: 'youtube.com',
          isYoutube: true,
          youtubeId
        });
      } else {
        fetchLinkPreview(urls[0]).then(preview => { if (preview) setWritingLinkPreview(preview); });
      }
    } else if (urls.length === 0) setWritingLinkPreview(null);
  }, [content]);

  useEffect(() => {
    posts.forEach(post => {
      const urls = extractLinks(post.content || '');
      if (urls.length > 0 && !postLinkPreviews.has(post.id)) {
        const youtubeId = getYoutubeId(urls[0]);
        if (!youtubeId) fetchLinkPreview(urls[0]).then(preview => {
          if (preview) setPostLinkPreviews(prev => new Map(prev).set(post.id, preview));
        });
      }
    });
  }, [posts]);

  // 스크롤 감지용 ref (리렌더링 방지)
  const expandedPostsRef = useRef(expandedPosts);
  const playingVideoRef = useRef(playingVideo);
  useEffect(() => { expandedPostsRef.current = expandedPosts; }, [expandedPosts]);
  useEffect(() => { playingVideoRef.current = playingVideo; }, [playingVideo]);

  // 스크롤 시 펼쳐진 글 자동 접기 + 영상 정지
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const postId = Number(entry.target.getAttribute('data-post-id'));
          if (!entry.isIntersecting && postId) {
            // 펼쳐진 글 접기
            if (expandedPostsRef.current.has(postId)) {
              setExpandedPosts(prev => {
                const n = new Set(prev);
                n.delete(postId);
                return n;
              });
            }
            // 재생 중인 영상 정지
            if (playingVideoRef.current === postId) {
              setPlayingVideo(null);
            }
          }
        });
      },
      { threshold: 0.1 }
    );

    postRefs.current.forEach((el, postId) => {
      el.setAttribute('data-post-id', String(postId));
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, [posts]);

  useEffect(() => {
    if (detailModal) {
      document.body.style.overflow = 'hidden';
      // 브라우저 히스토리에 상태 추가 (뒤로가기 처리용)
      window.history.pushState({ modal: true }, '', `/community/${detailModal.id}`);
      setTimeout(() => setDetailModalVisible(true), 10);
    } else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [detailModal]);

  // 뒤로가기 버튼 처리
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (detailModal) {
        e.preventDefault();
        closeDetailModal();
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [detailModal]);
// ============================================================
// 🔥 실시간 댓글 구독
// ============================================================
useEffect(() => {
  if (!detailModal) return;

  const postId = detailModal.id;

  const channel = supabase
    .channel(`comments:post:${postId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'comments',
        filter: `post_id=eq.${postId}`
      },
      async (payload) => {
        // 내가 작성한 댓글이면 무시 (이미 추가됨)
        if (user && payload.new.user_id === user.id) return;
        
        const newComment = payload.new as any;
        
        // 중복 방지
        setComments(prev => {
          if (prev.some(c => c.id === newComment.id)) return prev;
          return [...prev, { ...newComment, liked: false }];
        });
        
        // 댓글 카운트 업데이트
        setDetailModal((prev: any) => {
          if (!prev) return prev;
          return { ...prev, comment_count: (prev.comment_count || 0) + 1 };
        });
        
        setPosts(prevPosts => 
          prevPosts.map(p => 
            p.id === postId 
              ? { ...p, comment_count: (p.comment_count || 0) + 1 }
              : p
          )
        );
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'comments',
        filter: `post_id=eq.${postId}`
      },
      (payload) => {
        const deletedId = (payload.old as any).id;
        setComments(prev => prev.filter(c => c.id !== deletedId));
        
        setDetailModal((prev: any) => {
          if (!prev) return prev;
          return { ...prev, comment_count: Math.max(0, (prev.comment_count || 0) - 1) };
        });
        
        setPosts(prevPosts => 
          prevPosts.map(p => 
            p.id === postId 
              ? { ...p, comment_count: Math.max(0, (p.comment_count || 0) - 1) }
              : p
          )
        );
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'comments',
        filter: `post_id=eq.${postId}`
      },
      (payload) => {
        const updatedComment = payload.new as any;
        setComments(prev => 
          prev.map(c => c.id === updatedComment.id ? { ...c, ...updatedComment } : c)
        );
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [detailModal?.id, user]);

  const fetchLinkPreview = async (url: string): Promise<any> => {
    if (linkPreviewCache.has(url)) return linkPreviewCache.get(url);
    if (getYoutubeId(url)) return null;
    try {
      setLoadingLinkPreview(true);
      const response = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`);
      const data = await response.json();
      if (data.status === 'success' && data.data) {
        const preview = { title: data.data.title || getDomain(url), description: data.data.description || '', image: data.data.image?.url || data.data.logo?.url || null, url, domain: getDomain(url) };
        linkPreviewCache.set(url, preview);
        setLoadingLinkPreview(false);
        return preview;
      }
    } catch (error) { console.error('Link preview error:', error); }
    setLoadingLinkPreview(false);
    return { title: getDomain(url), url, domain: getDomain(url), image: null };
  };

  const fetchUnreadCount = async (userId: string) => {
    const { count } = await supabase.from("notifications").select("*", { count: 'exact', head: true }).eq("user_id", userId).eq("is_read", false);
    setUnreadCount(count || 0);
  };

  const fetchPosts = async () => {
    setLoading(true);
    const { data: posts } = await supabase.from("posts").select("*").order("created_at", { ascending: false });
    
    if (!posts || posts.length === 0) {
      setPosts([]);
      setLoading(false);
      return;
    }
    
    const userIds = [...new Set(posts.map(p => p.user_id).filter(Boolean))];
    const { data: profiles } = await supabase.from("profiles").select("id, avatar_url").in("id", userIds);
    
    const profileMap = new Map();
    profiles?.forEach(p => profileMap.set(p.id, p.avatar_url));
    
    const postsWithAvatar = posts.map(post => ({
      ...post,
      author_avatar_url: profileMap.get(post.user_id) || null
    }));
    
    setPosts(postsWithAvatar);
    setLoading(false);
  };

  const togglePost = (postId: number) => setExpandedPosts(prev => { const n = new Set(prev); if (n.has(postId)) n.delete(postId); else n.add(postId); return n; });

  const openDetailModal = async (post: any, scrollToComments: boolean = false, photoMode: boolean = false) => {
    setPlayingVideo(null);
    setDetailModal(post);
    setPhotoModeOpen(photoMode);
    setLoadingComments(true);
    setReplyingTo(null);
    setNewComment("");
    setCommentImages([]);
    setCommentImagePreviews([]);

    try {
      const { data, error } = await supabase
        .from("comments")
        .select("*")
        .eq("post_id", post.id)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("댓글 에러:", error);
        setComments([]);
        setLoadingComments(false);
        return;
      }

      let commentsData = data || [];

      // 댓글 작성자 프로필 정보 가져오기
      if (commentsData.length > 0) {
        const userIds = [...new Set(commentsData.map(c => c.user_id).filter(Boolean))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, avatar_url")
          .in("id", userIds);
        
        const profileMap = new Map();
        profiles?.forEach(p => profileMap.set(p.id, p.avatar_url));
        
        commentsData = commentsData.map(c => ({
          ...c,
          author_avatar_url: profileMap.get(c.user_id) || null
        }));
      }

      if (commentsData.length > 0 && user) {
        try {
          const { data: likedComments } = await supabase
            .from("comment_likes")
            .select("comment_id")
            .eq("user_id", user.id);
          const likedIds = new Set(likedComments?.map(l => l.comment_id) || []);
          commentsData = commentsData.map(c => ({ ...c, liked: likedIds.has(c.id) }));
        } catch (e) {
          // 좋아요 정보 실패해도 댓글은 보여줌
        }
      }
      
      setComments(commentsData);
    } catch (err) {
      console.error("댓글 로드 실패:", err);
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  };

  const closeDetailModal = () => { 
    setDetailModalVisible(false); 
    setTimeout(() => { setDetailModal(null); setComments([]); }, 300); 
  };

  const toggleCommentSection = async (post: any) => {
    if (expandedCommentPost === post.id) {
      setExpandedCommentPost(null);
      setComments([]);
      return;
    }
    
    setExpandedCommentPost(post.id);
    setLoadingComments(true);
    setReplyingTo(null);
    setNewComment("");
    setCommentImages([]);
    setCommentImagePreviews([]);

    try {
      const { data, error } = await supabase
        .from("comments")
        .select("*")
        .eq("post_id", post.id)
        .order("created_at", { ascending: true });

      if (error) {
        setComments([]);
        setLoadingComments(false);
        return;
      }

      let commentsData = data || [];

      if (commentsData.length > 0) {
        const userIds = [...new Set(commentsData.map(c => c.user_id).filter(Boolean))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, avatar_url")
          .in("id", userIds);
        
        const profileMap = new Map();
        profiles?.forEach(p => profileMap.set(p.id, p.avatar_url));
        
        commentsData = commentsData.map(c => ({
          ...c,
          author_avatar_url: profileMap.get(c.user_id) || null
        }));
      }

      if (commentsData.length > 0 && user) {
        try {
          const { data: likedComments } = await supabase
            .from("comment_likes")
            .select("comment_id")
            .eq("user_id", user.id);
          const likedIds = new Set(likedComments?.map(l => l.comment_id) || []);
          commentsData = commentsData.map(c => ({ ...c, liked: likedIds.has(c.id) }));
        } catch (e) {}
      }
      
      setComments(commentsData);
    } catch (err) {
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) { alert(`${file.name}: 100MB 이하만 업로드 가능합니다`); continue; }
      if (mediaFiles.length + 1 > 10) { alert("최대 10개"); break; }
      const isVideo = file.type.startsWith('video/'), isImage = file.type.startsWith('image/');
      if (!isVideo && !isImage) continue;
      setMediaFiles(prev => [...prev, file]);
      const reader = new FileReader();
      reader.onload = (e) => setMediaPreviews(prev => [...prev, { url: e.target?.result as string, type: isVideo ? 'video' : 'image' }]);
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeMedia = (index: number) => { setMediaFiles(mediaFiles.filter((_, i) => i !== index)); setMediaPreviews(mediaPreviews.filter((_, i) => i !== index)); };
// 영상 첫 프레임 캡처
const captureVideoThumbnail = (file: File): Promise<string | null> => {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    
    video.onloadeddata = () => {
      video.currentTime = 1; // 1초 지점 캡처
    };
    
    video.onseeked = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          const thumbnailFile = new File([blob], 'thumbnail.jpg', { type: 'image/jpeg' });
          uploadSmallFile(thumbnailFile).then(url => resolve(url)).catch(() => resolve(null));
        } else {
          resolve(null);
        }
        URL.revokeObjectURL(video.src);
      }, 'image/jpeg', 0.8);
    };
    
    video.onerror = () => resolve(null);
    video.src = URL.createObjectURL(file);
  });
};
  const compressImage = async (file: File): Promise<File> => {
    if (!file.type.startsWith('image/') || file.size < 1024 * 1024) return file;
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d'), img = new window.Image();
      img.onload = () => { let { width, height } = img; const maxSize = 2048; if (width > maxSize || height > maxSize) { if (width > height) { height = (height / width) * maxSize; width = maxSize; } else { width = (width / height) * maxSize; height = maxSize; } } canvas.width = width; canvas.height = height; ctx?.drawImage(img, 0, 0, width, height); canvas.toBlob((blob) => { if (blob) resolve(new File([blob], file.name, { type: 'image/jpeg' })); else resolve(file); }, 'image/jpeg', 0.85); };
      img.src = URL.createObjectURL(file);
    });
  };

  const uploadSmallFile = async (file: File): Promise<string> => {
    console.log("업로드 시작:", file.name, file.size, file.type);
    try {
      const processedFile = await compressImage(file);
      console.log("압축 완료:", processedFile.size);
      const ext = file.name.split('.').pop() || 'jpg';
      const fileName = `posts/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
      console.log("업로드 URL:", `${R2_WORKER_URL}/${fileName}`);
      
      const response = await fetch(`${R2_WORKER_URL}/${fileName}`, { 
        method: 'PUT', 
        body: processedFile, 
        headers: { 'Content-Type': processedFile.type || 'application/octet-stream' }
      });
      
      console.log("응답 상태:", response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("업로드 실패 응답:", errorText);
        throw new Error(`업로드 실패: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log("업로드 결과:", data);
      
      if (!data.url) {
        console.error("URL이 응답에 없음:", data);
        throw new Error("서버에서 URL을 반환하지 않았습니다");
      }
      
      return data.url;
    } catch (error: any) {
      console.error("업로드 에러:", error);
      alert(`파일 업로드 실패: ${error.message || '알 수 없는 오류'}`);
      throw error;
    }
  };

  const uploadLargeFile = async (file: File, fileIndex: number, totalFilesCount: number): Promise<string> => {
    try {
      const createRes = await fetch(`${R2_WORKER_URL}/multipart/create`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ fileName: file.name, contentType: file.type }) 
      });
      
      if (!createRes.ok) {
        throw new Error(`멀티파트 생성 실패: ${createRes.status}`);
      }
      
      const { uploadId, key } = await createRes.json();
      if (!uploadId || !key) {
        throw new Error("멀티파트 업로드 초기화 실패");
      }
      
      const totalParts = Math.ceil(file.size / CHUNK_SIZE);
      const parts: { partNumber: number; etag: string }[] = [];
      let completedParts = 0;
      
      const uploadChunk = async (partIndex: number, retries = 5): Promise<{ partNumber: number; etag: string }> => {
        const start = partIndex * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);
        
        for (let attempt = 0; attempt < retries; attempt++) {
          try {
            console.log(`파트 ${partIndex + 1} 업로드 시도 ${attempt + 1}/${retries}`);
            
            const partRes = await fetch(`${R2_WORKER_URL}/multipart/upload/${key}`, { 
              method: 'PUT', 
              headers: { 'X-Upload-Id': uploadId, 'X-Part-Number': String(partIndex + 1) }, 
              body: chunk 
            });
            
            if (!partRes.ok) {
              const errorText = await partRes.text();
              console.error(`파트 ${partIndex + 1} 실패:`, partRes.status, errorText);
              throw new Error(`파트 ${partIndex + 1} 업로드 실패: ${partRes.status}`);
            }
            
            const partData = await partRes.json();
            if (!partData.etag) {
              throw new Error(`파트 ${partIndex + 1} etag 없음`);
            }
            
            completedParts++;
            const fileProgress = (completedParts / totalParts) * 100;
            setUploadProgress(Math.round(((fileIndex + fileProgress / 100) / totalFilesCount) * 100));
            console.log(`파트 ${partIndex + 1} 완료`);
            return { partNumber: partIndex + 1, etag: partData.etag };
          } catch (error: any) {
            console.error(`파트 ${partIndex + 1} 에러 (시도 ${attempt + 1}):`, error.message);
            if (attempt === retries - 1) throw error;
            const waitTime = 2000 * (attempt + 1);
            console.log(`${waitTime}ms 후 재시도...`);
            await new Promise(r => setTimeout(r, waitTime));
          }
        }
        throw new Error(`파트 ${partIndex + 1} 업로드 실패`);
      };
      
      for (let i = 0; i < totalParts; i += PARALLEL_UPLOADS) {
        const batch = [];
        for (let j = i; j < Math.min(i + PARALLEL_UPLOADS, totalParts); j++) {
          batch.push(uploadChunk(j));
        }
        const results = await Promise.all(batch);
        parts.push(...results);
      }
      
      parts.sort((a, b) => a.partNumber - b.partNumber);
      
      const completeRes = await fetch(`${R2_WORKER_URL}/multipart/complete`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ fileKey: key, uploadId, parts }) 
      });
      
      if (!completeRes.ok) {
        throw new Error(`멀티파트 완료 실패: ${completeRes.status}`);
      }
      
      const result = await completeRes.json();
      if (!result.url) {
        throw new Error("서버에서 URL을 반환하지 않았습니다");
      }
      
      return result.url;
    } catch (error: any) {
      console.error("대용량 파일 업로드 에러:", error);
      alert(`대용량 파일 업로드 실패: ${error.message || '알 수 없는 오류'}`);
      throw error;
    }
  };

  const uploadFile = async (file: File, fileIndex: number, totalFilesCount: number): Promise<string> => {
    setCurrentFileIndex(fileIndex + 1);
    if (file.size > 100 * 1024 * 1024) throw new Error("100MB 이하만 업로드 가능합니다");
    const url = await uploadSmallFile(file);
    setUploadProgress(Math.round(((fileIndex + 1) / totalFilesCount) * 100));
    return url;
  };

  const getClientIP = async (): Promise<string> => { try { return (await (await fetch('https://api.ipify.org?format=json')).json()).ip; } catch { return ''; } };

  const notifyFollowers = async (postId: number) => {
    if (!user) return;
    const { data: followers } = await supabase.from("follows").select("follower_id").eq("following_id", user.id);
    if (!followers?.length) return;
    const nickname = userProfile?.nickname || user.email?.split('@')[0] || '사용자';
    await supabase.from("notifications").insert(followers.map(f => ({ user_id: f.follower_id, type: 'new_post', from_user_id: user.id, from_user_nickname: nickname, post_id: postId, message: `${nickname}님이 새 글을 작성했습니다` })));
  };

  const handlePostButtonClick = () => {
    if (!user) return alert("로그인이 필요합니다");
    if (userProfile?.is_banned) return alert("이용이 정지된 계정입니다");
    if (isMutedPost()) return alert(getMuteMessage("post"));
    if (!content.trim() && mediaFiles.length === 0) return alert("내용을 입력하세요");
    setConfirmPostModal(true);
  };

  const handlePost = async () => {
    console.log("handlePost 시작, 파일 개수:", mediaFiles.length);
    console.log("파일 정보:", mediaFiles.map(f => ({name: f.name, size: f.size, type: f.type})));
    setConfirmPostModal(false); setPosting(true); setUploadProgress(0); setTotalFiles(mediaFiles.length); setCurrentFileIndex(0);
    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < mediaFiles.length; i++) uploadedUrls.push(await uploadFile(mediaFiles[i], i, mediaFiles.length));
      const ipAddress = await getClientIP();
      const nickname = userProfile?.nickname || user.email?.split('@')[0] || '사용자';
      // 영상이 있으면 썸네일 생성
let thumbnailUrl = null;
const videoFile = mediaFiles.find(f => f.type.startsWith('video/'));
if (videoFile) {
  thumbnailUrl = await captureVideoThumbnail(videoFile);
}

const { data: newPost, error } = await supabase.from("posts").insert({ 
  title: content.slice(0, 50), 
  content, 
  images: uploadedUrls, 
  is_anonymous: isAnonymous, 
  author_nickname: nickname, 
  ip_address: ipAddress, 
  user_id: user.id,
  thumbnail_url: thumbnailUrl
}).select().single();

      if (error) throw error;
      if (!isAnonymous && newPost) await notifyFollowers(newPost.id);
      setContent(""); setMediaFiles([]); setMediaPreviews([]); setIsAnonymous(false); setUploadProgress(0); setWritingLinkPreview(null); setIsWriting(false);
      fetchPosts();
    } catch (error: any) { alert("게시 실패: " + error.message); }
    setPosting(false);
  };

  const handleDelete = async (postId: number) => { if (!confirm("삭제하시겠습니까?")) return; await supabase.from("posts").delete().eq("id", postId); setPosts(posts.filter(p => p.id !== postId)); setMenuOpenId(null); };
  const handleEditStart = (post: any) => { setEditingPost(post); setEditContent(post.content); setMenuOpenId(null); };
  const handleEditSave = async () => { if (!editingPost) return; await supabase.from("posts").update({ content: editContent }).eq("id", editingPost.id); setPosts(posts.map(p => p.id === editingPost.id ? { ...p, content: editContent } : p)); setEditingPost(null); };
  const handleReport = async () => { if (!user || !reportModal || !reportReason.trim()) { alert("신고 사유를 입력하세요"); return; } await supabase.from("reports").insert({ reporter_id: user.id, post_id: reportModal.postId, reported_user_id: reportModal.userId, reason: reportReason }); alert("신고가 접수되었습니다"); setReportModal(null); setReportReason(""); };

  const handleBookmark = async (postId: number) => {
    if (!user) { alert("로그인이 필요합니다"); return; }
    if (bookmarkedPosts.has(postId)) {
      await supabase.from("post_bookmarks").delete().eq("user_id", user.id).eq("post_id", postId);
      setBookmarkedPosts(prev => { const next = new Set(prev); next.delete(postId); return next; });
    } else {
      await supabase.from("post_bookmarks").insert({ user_id: user.id, post_id: postId });
      setBookmarkedPosts(prev => new Set(prev).add(postId));
    }
    setMenuOpenId(null);
  };

  const handleLike = async (post: any, inModal: boolean = false) => {
    if (!user) return alert("로그인 필요");
    const { data: existing } = await supabase.from("likes").select("id").eq("user_id", user.id).eq("post_id", post.id).single();
    if (existing) {
      await supabase.from("likes").delete().eq("id", existing.id);
      await supabase.from("posts").update({ like_count: Math.max(0, (post.like_count || 0) - 1) }).eq("id", post.id);
      const updated = { ...post, like_count: Math.max(0, (post.like_count || 0) - 1), liked: false };
      setPosts(posts.map(p => p.id === post.id ? updated : p));
      if (inModal) setDetailModal(updated);
    } else {
      await supabase.from("likes").insert({ user_id: user.id, post_id: post.id });
      await supabase.from("posts").update({ like_count: (post.like_count || 0) + 1 }).eq("id", post.id);
      const updated = { ...post, like_count: (post.like_count || 0) + 1, liked: true };
      setPosts(posts.map(p => p.id === post.id ? updated : p));
      if (inModal) setDetailModal(updated);
    }
  };

  const handleCommentImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => { const files = Array.from(e.target.files || []); if (!files.length) return; const file = files[0]; if (!file.type.startsWith('image/')) return; setCommentImages([file]); const reader = new FileReader(); reader.onload = (e) => setCommentImagePreviews([e.target?.result as string]); reader.readAsDataURL(file); };
  const addEmoji = (emoji: string) => { setNewComment(prev => prev + emoji); setShowEmojiPicker(false); };

  const handleCommentLike = async (comment: any) => {
    if (!user) return alert("로그인 필요");
    const { data: existing } = await supabase.from("comment_likes").select("id").eq("user_id", user.id).eq("comment_id", comment.id).single();
    if (existing) {
      await supabase.from("comment_likes").delete().eq("id", existing.id);
      await supabase.from("comments").update({ like_count: Math.max(0, (comment.like_count || 0) - 1) }).eq("id", comment.id);
      setComments(comments.map(c => c.id === comment.id ? { ...c, like_count: Math.max(0, (c.like_count || 0) - 1), liked: false } : c));
    } else {
      await supabase.from("comment_likes").insert({ user_id: user.id, comment_id: comment.id });
      await supabase.from("comments").update({ like_count: (comment.like_count || 0) + 1 }).eq("id", comment.id);
      setComments(comments.map(c => c.id === comment.id ? { ...c, like_count: (c.like_count || 0) + 1, liked: true } : c));
    }
  };

  const handleComment = async () => {
    if (!user) return alert("로그인이 필요합니다");
    if (userProfile?.is_banned) return alert("이용이 정지된 계정입니다");
    if (isMutedComment()) return alert(getMuteMessage("comment"));
    if (!detailModal || (!newComment.trim() && commentImages.length === 0)) return;
    try {
      let imageUrl = null; if (commentImages.length > 0) imageUrl = await uploadSmallFile(commentImages[0]);
      const ipAddress = await getClientIP();
      const nickname = userProfile?.nickname || user.email?.split('@')[0] || '사용자';
      const mentionNickname = replyingTo?.mentionNickname || null;
      const { data, error } = await supabase.from("comments").insert({ 
        post_id: detailModal.id, 
        user_id: user.id, 
        content: newComment, 
        author_nickname: nickname, 
        parent_id: replyingTo?.id || null, 
        image_url: imageUrl, 
        is_anonymous: isAnonymousComment, 
        ip_address: ipAddress,
        mention_nickname: mentionNickname
      }).select().single();
      if (error) throw error;
      setComments(prev => [...prev, data]); setNewComment(""); setCommentImages([]); setCommentImagePreviews([]); setReplyingTo(null); setIsAnonymousComment(false);
      await supabase.from("posts").update({ comment_count: (detailModal.comment_count || 0) + 1 }).eq("id", detailModal.id);
      const updated = { ...detailModal, comment_count: (detailModal.comment_count || 0) + 1 };
      setPosts(posts.map(p => p.id === detailModal.id ? updated : p));
      setDetailModal(updated);
    } catch (error: any) { alert("댓글 작성 실패: " + error.message); }
  };

  const submitCommentInline = async (postId: number) => {
    if (!user) return alert("로그인이 필요합니다");
    if (userProfile?.is_banned) return alert("이용이 정지된 계정입니다");
    if (isMutedComment()) return alert(getMuteMessage("comment"));
    if (!newComment.trim() && commentImages.length === 0) return;
    try {
      let imageUrl = null; if (commentImages.length > 0) imageUrl = await uploadSmallFile(commentImages[0]);
      const ipAddress = await getClientIP();
      const nickname = userProfile?.nickname || user.email?.split('@')[0] || '사용자';
      const mentionNickname = replyingTo?.mentionNickname || null;
      const { data, error } = await supabase.from("comments").insert({ 
        post_id: postId, 
        user_id: user.id, 
        content: newComment, 
        author_nickname: nickname, 
        parent_id: replyingTo?.id || null, 
        image_url: imageUrl, 
        is_anonymous: isAnonymousComment, 
        ip_address: ipAddress,
        mention_nickname: mentionNickname
      }).select().single();
      if (error) throw error;
      
      // 댓글 목록에 추가
      setComments(prev => [...prev, { ...data, author_avatar_url: userProfile?.avatar_url }]); 
      setNewComment(""); 
      setCommentImages([]); 
      setCommentImagePreviews([]); 
      setReplyingTo(null); 
      setIsAnonymousComment(false);
      
      // 댓글 수 업데이트
      const post = posts.find(p => p.id === postId);
      if (post) {
        await supabase.from("posts").update({ comment_count: (post.comment_count || 0) + 1 }).eq("id", postId);
        setPosts(posts.map(p => p.id === postId ? { ...p, comment_count: (p.comment_count || 0) + 1 } : p));
      }
    } catch (error: any) { alert("댓글 작성 실패: " + error.message); }
  };

  // 좋아요 누른 사람 목록 가져오기
  const fetchLikers = async (postId: number) => {
    const { data } = await supabase
      .from("likes")
      .select("user_id, profiles!inner(nickname, avatar_url)")
      .eq("post_id", postId);
    if (data) {
      const users = data.map((d: any) => ({
        nickname: d.profiles?.nickname || '사용자',
        avatar_url: d.profiles?.avatar_url
      }));
      setLikersModal({ postId, users });
    }
  };

  // 댓글 작성자 목록 가져오기
  const fetchCommenters = async (postId: number) => {
    const { data } = await supabase
      .from("comments")
      .select("author_nickname, is_anonymous, user_id")
      .eq("post_id", postId);
    if (data) {
      // 중복 제거 (같은 작성자가 여러 댓글 달았을 수 있음)
      const uniqueUsers = Array.from(new Map(data.map(d => [d.user_id, d])).values());
      const users = uniqueUsers.map((d: any) => ({
        nickname: d.is_anonymous ? '익명' : (d.author_nickname || '사용자'),
        is_anonymous: d.is_anonymous
      }));
      setCommentersModal({ postId, users });
    }
  };

  const handleShare = async (post: any) => { const shareUrl = `${window.location.origin}/community/${post.id}`; try { await navigator.clipboard.writeText(shareUrl); alert('링크가 복사되었습니다'); } catch { const textArea = document.createElement('textarea'); textArea.value = shareUrl; document.body.appendChild(textArea); textArea.select(); document.execCommand('copy'); document.body.removeChild(textArea); alert('링크가 복사되었습니다'); } };

  const extractLinks = (text: string): string[] => text?.match(/(https?:\/\/[^\s]+)/g) || [];
  const getYoutubeId = (url: string): string | null => { const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([^&\s?]+)/); return match ? match[1] : null; };
  const getYoutubeThumbnail = (url: string): string | null => { const id = getYoutubeId(url); return id ? `https://img.youtube.com/vi/${id}/maxresdefault.jpg` : null; };
  const getDomain = (url: string): string => { try { return new URL(url).hostname.replace('www.', ''); } catch { return url; } };
  const openLink = (url: string) => window.open(url, '_blank');

  const openEditProfile = () => { setEditNickname(userProfile?.nickname || ''); setEditProfileModal(true); setProfileModal(null); };
  const canChangeNickname = () => { if (!userProfile) return true; const changedAt = userProfile.nickname_changed_at ? new Date(userProfile.nickname_changed_at) : null; if (!changedAt) return true; const daysDiff = Math.floor((Date.now() - changedAt.getTime()) / 86400000); return daysDiff >= 30 || (userProfile.nickname_change_count || 0) < 3; };
  const getNicknameChangeInfo = () => { if (!userProfile?.nickname_changed_at) return { remaining: 3, daysUntilReset: 0 }; const daysDiff = Math.floor((Date.now() - new Date(userProfile.nickname_changed_at).getTime()) / 86400000); if (daysDiff >= 30) return { remaining: 3, daysUntilReset: 0 }; return { remaining: Math.max(0, 3 - (userProfile.nickname_change_count || 0)), daysUntilReset: 30 - daysDiff }; };
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file || !user || !file.type.startsWith('image/')) return; setEditingProfile(true); try { const fileName = `avatars/${user.id}-${Date.now()}.${file.name.split('.').pop()}`; const response = await fetch(`${R2_WORKER_URL}/${fileName}`, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } }); const data = await response.json(); await supabase.from("profiles").update({ avatar_url: data.url }).eq("email", user.email); setUserProfile({ ...userProfile, avatar_url: data.url }); } catch (e: any) { alert("실패: " + e.message); } setEditingProfile(false); };
  const handleSaveNickname = async () => { if (!user || !editNickname.trim() || editNickname === userProfile?.nickname) { setEditProfileModal(false); return; } if (!canChangeNickname()) { alert("30일 동안 3회만 변경 가능"); return; } setEditingProfile(true); const now = new Date(); const changedAt = userProfile?.nickname_changed_at ? new Date(userProfile.nickname_changed_at) : null; let newCount = changedAt && Math.floor((now.getTime() - changedAt.getTime()) / 86400000) < 30 ? (userProfile?.nickname_change_count || 0) + 1 : 1; await supabase.from("profiles").update({ nickname: editNickname, nickname_changed_at: now.toISOString(), nickname_change_count: newCount }).eq("email", user.email); setUserProfile({ ...userProfile, nickname: editNickname, nickname_changed_at: now.toISOString(), nickname_change_count: newCount }); setEditProfileModal(false); setEditingProfile(false); };

  const formatDate = (d: string) => { const diff = Date.now() - new Date(d).getTime(); const m = Math.floor(diff / 60000), h = Math.floor(diff / 3600000), dd = Math.floor(diff / 86400000); if (m < 60) return `${m}분 전`; if (h < 24) return `${h}시간 전`; if (dd < 7) return `${dd}일 전`; return new Date(d).toLocaleDateString("ko-KR"); };
  const formatFullDate = (d: string) => new Date(d).toLocaleDateString("ko-KR", { year: 'numeric', month: 'long', day: 'numeric' });
  const getMediaItems = (post: any): {url: string, type: 'image' | 'video'}[] => { 
    if (!post?.images) return []; 
    try {
      let urls = typeof post.images === 'string' ? JSON.parse(post.images) : post.images;
      if (!Array.isArray(urls)) {
        console.warn("images가 배열이 아님:", post.images);
        return [];
      }
      const validUrls = urls
        .filter((url: any) => url && typeof url === 'string' && url.trim() !== '')
        .map((url: string) => ({ 
          url: url.trim(), 
          type: /\.(mp4|mov|webm|avi)/i.test(url) ? 'video' as const : 'image' as const 
        }));
      if (validUrls.length !== urls.length) {
        console.warn("일부 URL이 필터링됨:", { 원본: urls, 유효: validUrls });
      }
      return validUrls;
    } catch (e) {
      console.error("이미지 파싱 에러:", e, post.images);
      return [];
    }
  };

  const isAdmin = userProfile?.role === 'admin';
  const getAuthorName = (post: any) => isAdmin && post?.is_anonymous ? `익명 (${post.author_nickname || '?'})` : post?.is_anonymous ? '익명' : post?.author_nickname || '알수없음';
  const canModify = (post: any) => (user && post.user_id === user.id) || isAdmin;

  const checkFollowStatus = async (targetUserId: string) => { if (!user) return false; const { data } = await supabase.from("follows").select("id").eq("follower_id", user.id).eq("following_id", targetUserId).single(); return !!data; };
  const handleFollow = async () => { if (!user || !profileModal) return; setFollowLoading(true); if (isFollowing) { await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", profileModal.userId); setIsFollowing(false); } else { await supabase.from("follows").insert({ follower_id: user.id, following_id: profileModal.userId }); setIsFollowing(true); const nickname = userProfile?.nickname || user.email?.split('@')[0] || '사용자'; await supabase.from("notifications").insert({ user_id: profileModal.userId, type: 'follow', from_user_id: user.id, from_user_nickname: nickname, message: `${nickname}님이 팔로우합니다` }); } setFollowLoading(false); };
  const handleProfileClick = async (post: any) => { if (post.is_anonymous && !isAdmin) { setReportModal({ postId: post.id, userId: post.user_id, isAnonymous: true }); return; } const { count: postCount } = await supabase.from("posts").select("*", { count: 'exact', head: true }).eq("user_id", post.user_id).eq("is_anonymous", false); const { count: followerCount } = await supabase.from("follows").select("*", { count: 'exact', head: true }).eq("following_id", post.user_id); const { count: followingCount } = await supabase.from("follows").select("*", { count: 'exact', head: true }).eq("follower_id", post.user_id); const { data: profile } = await supabase.from("profiles").select("*").eq("id", post.user_id).single(); setIsFollowing(await checkFollowStatus(post.user_id)); setProfileModal({ nickname: post.author_nickname || '알수없음', postCount: postCount || 0, followerCount: followerCount || 0, followingCount: followingCount || 0, createdAt: profile?.created_at, avatarUrl: profile?.avatar_url, userId: post.user_id, isOwnProfile: user && post.user_id === user.id }); };

  const openLightbox = (items: any[], idx: number) => { setLightboxImages(items.map(m => m.url)); setLightboxIndex(idx); };
  const closeLightbox = () => { setLightboxImages([]); setLightboxIndex(0); };
  const prevImage = () => setLightboxIndex(p => p === 0 ? lightboxImages.length - 1 : p - 1);
  const nextImage = () => setLightboxIndex(p => p === lightboxImages.length - 1 ? 0 : p + 1);
  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.targetTouches[0].clientX);
  const handleTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX);
  const handleTouchEnd = () => { if (touchStart - touchEnd > 75) nextImage(); if (touchStart - touchEnd < -75) prevImage(); };
  const isVideoUrl = (url: string) => /\.(mp4|mov|webm|avi)/i.test(url);
  const handleWriteBoxClick = () => { if (!user) return; if (userProfile?.is_banned) { alert("이용이 정지된 계정입니다"); return; } if (isMutedPost()) { alert(getMuteMessage("post")); return; } setIsWriting(true); };

  const YoutubeLogo = () => (<svg viewBox="0 0 68 48" className="w-16 h-12"><path d="M66.52 7.74c-.78-2.93-2.49-5.41-5.42-6.19C55.79.13 34 0 34 0S12.21.13 6.9 1.55c-2.93.78-4.63 3.26-5.42 6.19C.06 13.05 0 24 0 24s.06 10.95 1.48 16.26c.78 2.93 2.49 5.41 5.42 6.19C12.21 47.87 34 48 34 48s21.79-.13 27.1-1.55c2.93-.78 4.64-3.26 5.42-6.19C67.94 34.95 68 24 68 24s-.06-10.95-1.48-16.26z" fill="#f00"/><path d="M45 24L27 14v20" fill="#fff"/></svg>);

  // 광고 컴포넌트
  const AdBanner = ({ ad, type }: { ad: any, type: 'list' | 'detail' }) => {
    if (!ad) return null;
    return (
      <div className="cursor-pointer overflow-hidden rounded-xl" style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }} onClick={() => ad.link_url && window.open(ad.link_url, '_blank')}>
        {ad.image_url ? (
          <div className="relative">
            <img src={ad.image_url} alt={ad.title || "광고"} className="w-full object-cover" style={{ maxHeight: type === 'list' ? '120px' : '150px' }} />
            <span className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded">광고</span>
          </div>
        ) : (
          <div className="p-4 flex items-center gap-3" style={{ background: `linear-gradient(135deg, ${theme.bgInput}, ${theme.bgCard})` }}>
            <span className="text-2xl">📢</span>
            <p className="font-bold text-sm" style={{ color: theme.textPrimary }}>{ad.title}</p>
            <span className="ml-auto text-xs px-2 py-0.5 rounded" style={{ backgroundColor: theme.bgInput, color: theme.textMuted }}>광고</span>
          </div>
        )}
      </div>
    );
  };

  // 인라인 답글 입력 컴포넌트 (별도 분리로 리렌더링 방지)
  const InlineReplyBox = ({ parentComment, mentionNickname, onClose, onSuccess, postId }: { 
    parentComment: any, 
    mentionNickname?: string | null,
    onClose: () => void,
    onSuccess: (newComment: any) => void,
    postId?: number
  }) => {
    const [content, setContent] = useState("");
    const [images, setImages] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [showEmoji, setShowEmoji] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    
    const targetPostId = postId || detailModal?.id;
    
    useEffect(() => {
      // 자동 포커스 제거 - 모바일 키보드 방지
    }, []);
    
    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) {
        setImages([files[0]]);
        const reader = new FileReader();
        reader.onload = (ev) => setImagePreviews([ev.target?.result as string]);
        reader.readAsDataURL(files[0]);
      }
    };
    
    const handleSubmit = async () => {
      if (!user || (!content.trim() && images.length === 0) || submitting) return;
      if (userProfile?.is_banned) return alert("이용이 정지된 계정입니다");
      if (!targetPostId) return;
      
      setSubmitting(true);
      try {
        let imageUrl = null;
        if (images.length > 0) imageUrl = await uploadSmallFile(images[0]);
        const ipAddress = await getClientIP();
        const nickname = userProfile?.nickname || user.email?.split('@')[0] || '사용자';
        
        const { data, error } = await supabase.from("comments").insert({ 
          post_id: targetPostId, 
          user_id: user.id, 
          content: content, 
          author_nickname: nickname, 
          parent_id: parentComment.id,
          image_url: imageUrl, 
          is_anonymous: isAnonymous, 
          ip_address: ipAddress,
          mention_nickname: mentionNickname || null
        }).select().single();
        
        if (error) throw error;
        onSuccess(data);
        onClose();
      } catch (error: any) { 
        alert("댓글 작성 실패: " + error.message); 
      } finally {
        setSubmitting(false);
      }
    };
    
    const inlineEmojis = ['😀', '😂', '🥹', '😍', '👍', '❤️', '🔥', '👏', '🎉', '💯'];
    
    return (
      <div className="mt-2 ml-10 p-3 rounded-xl" style={{ backgroundColor: theme.bgInput }}>
        {/* 답글 대상 표시 */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs" style={{ color: theme.accent }}>
            {mentionNickname ? `@${mentionNickname}` : parentComment.author_nickname}님에게 답글
          </span>
          <button onClick={onClose} style={{ color: theme.textMuted }}>
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {/* 이미지 미리보기 */}
        {imagePreviews.length > 0 && (
          <div className="relative inline-block mb-2">
            <img src={imagePreviews[0]} alt="" className="w-20 h-20 object-cover rounded-lg" />
            <button 
              onClick={() => { setImages([]); setImagePreviews([]); }}
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
              style={{ backgroundColor: theme.red, color: '#fff' }}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
        
        {/* 입력창 */}
        <div className="flex items-center gap-2">
          <input 
            ref={inputRef}
            type="text" 
            value={content} 
            onChange={(e) => setContent(e.target.value)} 
            placeholder="답글 달기..."
            className="flex-1 bg-transparent focus:outline-none text-sm"
            style={{ color: theme.textPrimary }}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmit()}
          />
        </div>
        
        {/* 이모티콘 패널 */}
        {showEmoji && (
          <div className="flex flex-wrap gap-1 mt-2 p-2 rounded-lg" style={{ backgroundColor: theme.bgInput }}>
            {inlineEmojis.map(emoji => (
              <button 
                key={emoji} 
                onClick={() => { setContent(prev => prev + emoji); setShowEmoji(false); }}
                className="text-lg hover:scale-110 transition-transform"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
        
        {/* 하단 버튼들 */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            {/* 사진 */}
            <input type="file" ref={fileRef} accept="image/*" onChange={handleImageSelect} className="hidden" />
            <button onClick={() => fileRef.current?.click()} style={{ color: theme.textMuted }}>
              <ImageIcon className="w-5 h-5" />
            </button>
            {/* 이모티콘 */}
            <button onClick={() => setShowEmoji(!showEmoji)} style={{ color: showEmoji ? theme.accent : theme.textMuted }}>
              <Smile className="w-5 h-5" />
            </button>
            {/* 익명 */}
            <label className="flex items-center gap-1 cursor-pointer">
              <input 
                type="checkbox" 
                checked={isAnonymous} 
                onChange={(e) => setIsAnonymous(e.target.checked)} 
                className="w-3 h-3 rounded"
                style={{ accentColor: theme.accent }}
              />
              <span className="text-xs" style={{ color: theme.textMuted }}>익명</span>
            </label>
          </div>
          
          {/* 전송 버튼 */}
          <button 
            onClick={handleSubmit}
            disabled={submitting || (!content.trim() && images.length === 0)}
            className="px-3 py-1 rounded-full text-sm font-medium disabled:opacity-50"
            style={{ backgroundColor: theme.accent, color: isDark ? '#121212' : '#fff' }}
          >
            {submitting ? '...' : '전송'}
          </button>
        </div>
      </div>
    );
  };

  // 인라인 답글 상태
  const [inlineReplyTarget, setInlineReplyTarget] = useState<{ parentComment: any, mentionNickname?: string | null } | null>(null);

  // 댓글 컴포넌트
  const CommentItem = ({ comment, depth = 0, parentId = null, isInline = false, inlinePostId = null }: { comment: any, depth?: number, parentId?: number | null, isInline?: boolean, inlinePostId?: number | null }) => {
    const replies = comments.filter(c => Number(c.parent_id) === Number(comment.id));
    const isExpanded = expandedComments.has(comment.id);
    const showReplies = expandedReplies.has(comment.id);
    const isLong = comment.content?.length > 150;
    const getCommentAuthor = () => isAdmin && comment.is_anonymous ? `익명 (${comment.author_nickname || '?'})` : comment.is_anonymous ? '익명' : comment.author_nickname;
    
    // 인라인 모드에서는 posts에서 찾기
    const currentPost = isInline ? posts.find(p => p.id === inlinePostId) : detailModal;
    const isPostAuthor = currentPost && comment.user_id === currentPost.user_id;
    const hasReplies = replies.length > 0;
    
    // 이 댓글에 인라인 입력창이 열려있는지
    const isInlineOpen = inlineReplyTarget?.parentComment?.id === comment.id;
    
    // 답글 달기 클릭
    const handleReplyClick = () => {
      if (depth === 0) {
        // 원댓글에 답글
        setInlineReplyTarget({ parentComment: comment, mentionNickname: null });
        if (!expandedReplies.has(comment.id) && hasReplies) {
          setExpandedReplies(prev => new Set(prev).add(comment.id));
        }
      } else {
        // 대댓글에 답글 → 원댓글 아래에 입력창 + 멘션
        const parentComment = comments.find(c => c.id === parentId);
        setInlineReplyTarget({ 
          parentComment: parentComment, 
          mentionNickname: comment.is_anonymous ? '익명' : comment.author_nickname 
        });
      }
    };
    
    // 답글 작성 성공
    const handleReplySuccess = (newComment: any) => {
      setComments(prev => [...prev, newComment]);
      if (currentPost) {
        const postId = isInline ? inlinePostId : detailModal?.id;
        supabase.from("posts").update({ comment_count: (currentPost.comment_count || 0) + 1 }).eq("id", postId);
        const updated = { ...currentPost, comment_count: (currentPost.comment_count || 0) + 1 };
        setPosts(posts.map(p => p.id === postId ? updated : p));
        if (!isInline && detailModal) setDetailModal(updated);
      }
    };
    
    return (
      <div className={`${depth === 0 ? 'mb-3' : 'mb-2 ml-10'}`}>
        {/* 댓글 본체 */}
        <div className="flex gap-2">
          {/* 프로필 */}
          <div 
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden" 
            style={{ backgroundColor: theme.bgInput }}
          >
            {comment.is_anonymous ? (
              <span className="text-xs font-bold" style={{ color: theme.textSecondary }}>?</span>
            ) : comment.author_avatar_url ? (
              <img src={comment.author_avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-bold" style={{ color: theme.textSecondary }}>
                {comment.author_nickname?.[0]?.toUpperCase() || 'U'}
              </span>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            {/* 댓글 박스 */}
            <div className="rounded-2xl px-3 py-2" style={{ backgroundColor: theme.bgInput }}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm" style={{ color: theme.textPrimary }}>{getCommentAuthor()}</span>
                {isPostAuthor && (
                  <span className="text-xs" style={{ color: theme.accent }}>ㆍ작성자</span>
                )}
              </div>
              {isAdmin && comment.ip_address && <span className="text-xs" style={{ color: theme.red }}>IP: {comment.ip_address}</span>}
              <p className="text-sm mt-0.5" style={{ color: theme.textPrimary }}>
                {comment.mention_nickname && (
                  <span className="font-semibold mr-1" style={{ color: theme.accent }}>@{comment.mention_nickname}</span>
                )}
                {isLong && !isExpanded ? (
                  <>
                    {comment.content.slice(0, 150)}...
                    <button onClick={() => setExpandedComments(prev => new Set(prev).add(comment.id))} style={{ color: theme.textMuted }} className="ml-1">더보기</button>
                  </>
                ) : comment.content}
              </p>
              {comment.image_url && (
                <img src={comment.image_url} alt="" className="mt-2 max-w-[200px] rounded-lg cursor-pointer" onClick={() => openLightbox([{url: comment.image_url}], 0)} />
              )}
            </div>
            
            {/* 액션 버튼 */}
            <div className="flex items-center gap-3 mt-1 ml-2">
              <span className="text-xs" style={{ color: theme.textMuted }}>{formatDate(comment.created_at)}</span>
              <button 
                onClick={() => handleCommentLike(comment)} 
                className="text-xs font-medium flex items-center gap-1" 
                style={{ color: comment.liked ? '#3B82F6' : theme.textMuted }}
              >
                좋아요{(comment.like_count || 0) > 0 && <span>{comment.like_count}</span>}
              </button>
              <button 
                onClick={handleReplyClick} 
                className="text-xs font-medium" 
                style={{ color: theme.textMuted }}
              >
                답글 달기
              </button>
            </div>
            
            {/* 답글 보기/숨기기 - 원댓글에만 */}
            {hasReplies && depth === 0 && (
              <button 
                onClick={() => setExpandedReplies(prev => { 
                  const n = new Set(prev); 
                  if (n.has(comment.id)) n.delete(comment.id); 
                  else n.add(comment.id); 
                  return n; 
                })} 
                className="text-sm font-medium mt-2 ml-2" 
                style={{ color: theme.accent }}
              >
                {showReplies ? '답글 숨기기' : `답글 ${replies.length}개 보기`}
              </button>
            )}
          </div>
        </div>
        
        {/* 답글 목록 - 원댓글 아래에 */}
        {depth === 0 && showReplies && hasReplies && (
          <div className="mt-2">
            {replies.map((reply) => (
              <CommentItem 
                key={reply.id} 
                comment={reply} 
                depth={1} 
                parentId={comment.id}
                isInline={isInline}
                inlinePostId={inlinePostId}
              />
            ))}
          </div>
        )}
        
        {/* 인라인 답글 입력창 - 원댓글 아래에만 */}
        {depth === 0 && isInlineOpen && user && (
          <InlineReplyBox
            parentComment={comment}
            mentionNickname={inlineReplyTarget?.mentionNickname}
            onClose={() => setInlineReplyTarget(null)}
            onSuccess={handleReplySuccess}
            postId={isInline ? inlinePostId! : detailModal?.id}
          />
        )}
      </div>
    );
  };

  // 포스트 렌더링
  const renderPost = (post: any) => {
    const isExpanded = expandedPosts.has(post.id);
    const mediaItems = getMediaItems(post);
    const hasNewline = (post.content || '').includes('\n');
    const isLongText = (post.content?.length > 80) || hasNewline;
    const links = extractLinks(post.content || '');
    const firstLink = links[0];
    const youtubeId = firstLink ? getYoutubeId(firstLink) : null;
    const youtubeThumbnail = firstLink ? getYoutubeThumbnail(firstLink) : null;
    const linkPreview = postLinkPreviews.get(post.id);
    const isPlaying = playingVideo === post.id;

    return (
      <div key={post.id} ref={(el) => { if (el) postRefs.current.set(post.id, el); }} className="rounded-2xl overflow-hidden" style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}>
        {/* 헤더 */}
        <div className="flex items-center gap-2 p-4 pb-0">
          <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden cursor-pointer" style={{ backgroundColor: theme.accent }} onClick={() => handleProfileClick(post)}>
            {post.is_anonymous ? (
              <span className="text-sm font-bold" style={{ color: isDark ? '#121212' : '#fff' }}>?</span>
            ) : post.author_avatar_url ? (
              <img src={post.author_avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm font-bold" style={{ color: isDark ? '#121212' : '#fff' }}>{post.author_nickname?.[0]?.toUpperCase() || 'U'}</span>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm cursor-pointer" style={{ color: theme.textPrimary }} onClick={() => handleProfileClick(post)}>{getAuthorName(post)}</span>
              {post.is_anonymous && <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: theme.bgInput, color: theme.textMuted }}>익명</span>}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: theme.textMuted }}>{formatDate(post.created_at)}</span>
              {isAdmin && post.ip_address && <span className="text-xs" style={{ color: theme.red }}>IP: {post.ip_address}</span>}
            </div>
          </div>
          <div className="relative">
            <button onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === post.id ? null : post.id); }} className="p-2 rounded-full" style={{ color: theme.textMuted }}>
              <MoreVertical className="w-5 h-5" />
            </button>
            {menuOpenId === post.id && (
              <div className="absolute right-0 top-10 rounded-lg shadow-lg py-1 z-50 min-w-[140px]" style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.border}` }}>
                {user && <button onClick={(e) => { e.stopPropagation(); handleBookmark(post.id); }} className="w-full px-4 py-2 text-left text-sm flex items-center gap-2" style={{ color: theme.textPrimary }}><Bookmark className="w-4 h-4" fill={bookmarkedPosts.has(post.id) ? "currentColor" : "none"} />{bookmarkedPosts.has(post.id) ? "저장 취소" : "저장"}</button>}
                {canModify(post) && (<><button onClick={(e) => { e.stopPropagation(); handleEditStart(post); }} className="w-full px-4 py-2 text-left text-sm flex items-center gap-2" style={{ color: theme.textPrimary }}><Edit className="w-4 h-4" />수정</button><button onClick={(e) => { e.stopPropagation(); handleDelete(post.id); }} className="w-full px-4 py-2 text-left text-sm flex items-center gap-2" style={{ color: theme.red }}><Trash2 className="w-4 h-4" />삭제</button></>)}
                <button onClick={(e) => { e.stopPropagation(); setMenuOpenId(null); setReportModal({ postId: post.id, userId: post.user_id }); }} className="w-full px-4 py-2 text-left text-sm flex items-center gap-2" style={{ color: '#F97316' }}><Flag className="w-4 h-4" />신고</button>
              </div>
            )}
          </div>
        </div>

        {/* 본문 - 2줄 기준 */}
        <div className="px-4 py-3">
          {isLongText && !isExpanded ? (
            <div>
              <p className="text-[15px] whitespace-pre-wrap line-clamp-2" style={{ color: theme.textPrimary }}>{post.content}</p>
              <button onClick={() => togglePost(post.id)} className="text-sm font-medium mt-1" style={{ color: theme.accent }}>더보기</button>
            </div>
          ) : (
            <div>
              <p className="text-[15px] whitespace-pre-wrap" style={{ color: theme.textPrimary }}>{post.content}</p>
              {isLongText && isExpanded && <button onClick={() => togglePost(post.id)} className="text-sm font-medium mt-1" style={{ color: theme.accent }}>접기</button>}
            </div>
          )}
        </div>

        {/* 유튜브 */}
        {youtubeId && (<div className="w-full">{isPlaying ? (<div className="relative w-full aspect-video bg-black"><iframe src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0`} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen /></div>) : (<div className="relative w-full cursor-pointer" onClick={() => setPlayingVideo(post.id)}><img src={youtubeThumbnail!} alt="" className="w-full aspect-video object-cover" /><div className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors"><YoutubeLogo /></div></div>)}</div>)}

        {/* 링크 프리뷰 */}
        {!youtubeId && linkPreview && (<div className="cursor-pointer" onClick={() => openLink(firstLink)}>{linkPreview.image && <img src={linkPreview.image} alt="" className="w-full h-82 object-cover" />}<div className="px-4 py-3" style={{ backgroundColor: theme.bgInput, borderTop: `1px solid ${theme.borderLight}` }}><p className="text-xs uppercase" style={{ color: theme.textMuted }}>{linkPreview.domain}</p><p className="font-semibold mt-1 line-clamp-2" style={{ color: theme.textPrimary }}>{linkPreview.title}</p>{linkPreview.description && <p className="text-sm mt-1 line-clamp-2" style={{ color: theme.textSecondary }}>{linkPreview.description}</p>}</div></div>)}

       {/* 미디어 */}
{mediaItems.length > 0 && (
  <div className={`cursor-pointer ${mediaItems.length === 1 ? '' : 'grid grid-cols-2 gap-[2px]'}`}>
    {mediaItems.slice(0, 4).map((item, idx) => (
      <div key={idx} className={`relative overflow-hidden rounded-xl ${mediaItems.length === 3 && idx === 0 ? 'row-span-2' : ''}`}>
        {item.type === 'video' ? (
          <VideoPlayer 
            src={item.url} 
            className={mediaItems.length === 1 ? 'max-h-[500px]' : 'h-48'}
            startTime={0}
          />
        ) : (
          <img src={item.url} alt="" className={`w-full object-cover rounded-xl cursor-pointer ${mediaItems.length === 1 ? 'max-h-[500px]' : 'h-48'}`} onClick={() => openLightbox(mediaItems, idx)} />
        )}
        {idx === 3 && mediaItems.length > 4 && <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl"><span className="text-white text-2xl font-bold">+{mediaItems.length - 4}</span></div>}
      </div>
    ))}
  </div>
)}

        {/* 액션 버튼 */}
        <div className="flex items-center px-4 py-3" style={{ borderTop: `1px solid ${theme.borderLight}` }}>
          <button onClick={() => handleLike(post)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors" style={{ color: post.liked ? '#3B82F6' : theme.textSecondary }}>
            <ThumbsUp className="w-5 h-5" fill={post.liked ? 'currentColor' : 'none'} /><span className="text-sm font-medium">좋아요 {post.like_count || 0}</span>
          </button>
          <button onClick={() => toggleCommentSection(post)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors" style={{ color: expandedCommentPost === post.id ? theme.accent : theme.textSecondary }}>
            <MessageCircle className="w-5 h-5" /><span className="text-sm font-medium">댓글 {post.comment_count || 0}</span>
          </button>
          <button onClick={() => handleShare(post)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors ml-auto" style={{ color: theme.textSecondary }}>
            <Share2 className="w-5 h-5" /><span className="text-sm font-medium">공유</span>
          </button>
        </div>

        {/* 인라인 댓글 섹션 */}
        {expandedCommentPost === post.id && (
          <div style={{ borderTop: `1px solid ${theme.borderLight}` }}>
            {/* 댓글 목록 */}
            <div className="max-h-[400px] overflow-y-auto">
              {loadingComments ? (
                <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: theme.border, borderTopColor: theme.accent }} /></div>
              ) : comments.length === 0 ? (
                <div className="text-center py-8" style={{ color: theme.textMuted }}>첫 댓글을 남겨보세요!</div>
              ) : (
                <div className="py-2">
                  {(() => {
                    const rootComments = comments.filter(c => !c.parent_id);
                    const sortedComments = [...rootComments].sort((a, b) => {
                      if (commentSort === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                      if (commentSort === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                      if (commentSort === 'popular') return (b.like_count || 0) - (a.like_count || 0);
                      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                    });
                    return sortedComments.map(comment => <CommentItem key={comment.id} comment={comment} depth={0} isInline={true} inlinePostId={post.id} />);
                  })()}
                </div>
              )}
            </div>

            {/* 댓글 입력 */}
            {user && (
              <InlineCommentInput postId={post.id} />
            )}
          </div>
        )}
      </div>
    );
  };

  // 인라인 댓글 입력 컴포넌트
  const InlineCommentInput = ({ postId }: { postId: number }) => {
    const [text, setText] = useState("");
    const [images, setImages] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const fileRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) {
        setImages([files[0]]);
        const reader = new FileReader();
        reader.onload = (ev) => setImagePreviews([ev.target?.result as string]);
        reader.readAsDataURL(files[0]);
      }
    };

    const handleSubmit = async () => {
      if (!user) return alert("로그인이 필요합니다");
      if (userProfile?.is_banned) return alert("이용이 정지된 계정입니다");
      if (!text.trim() && images.length === 0) return;
      try {
        let imageUrl = null; 
        if (images.length > 0) imageUrl = await uploadSmallFile(images[0]);
        const ipAddress = await getClientIP();
        const nickname = userProfile?.nickname || user.email?.split('@')[0] || '사용자';
        const { data, error } = await supabase.from("comments").insert({ 
          post_id: postId, 
          user_id: user.id, 
          content: text, 
          author_nickname: nickname, 
          parent_id: replyingTo?.id || null, 
          image_url: imageUrl, 
          is_anonymous: false, 
          ip_address: ipAddress,
          mention_nickname: replyingTo?.mentionNickname || null
        }).select().single();
        if (error) throw error;
        
        setComments(prev => [...prev, { ...data, author_avatar_url: userProfile?.avatar_url }]); 
        setText(""); 
        setImages([]);
        setImagePreviews([]);
        setReplyingTo(null);
        
        const post = posts.find(p => p.id === postId);
        if (post) {
          await supabase.from("posts").update({ comment_count: (post.comment_count || 0) + 1 }).eq("id", postId);
          setPosts(posts.map(p => p.id === postId ? { ...p, comment_count: (p.comment_count || 0) + 1 } : p));
        }
      } catch (error: any) { alert("댓글 작성 실패: " + error.message); }
    };

    return (
      <div className="p-4" style={{ borderTop: `1px solid ${theme.borderLight}` }}>
        {replyingTo && (
          <div className="flex items-center gap-2 mb-2 text-sm" style={{ color: theme.textMuted }}>
            <span>@{replyingTo.nickname}에게 답글</span>
            <button onClick={() => setReplyingTo(null)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"><X className="w-4 h-4" /></button>
          </div>
        )}
        {imagePreviews.length > 0 && (
          <div className="flex gap-2 mb-2 flex-wrap">
            {imagePreviews.map((preview, index) => (
              <div key={index} className="relative">
                <img src={preview} alt="" className="w-16 h-16 object-cover rounded-lg" />
                <button onClick={() => { setImages(prev => prev.filter((_, i) => i !== index)); setImagePreviews(prev => prev.filter((_, i) => i !== index)); }} className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.red, color: '#fff' }}><X className="w-3 h-3" /></button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2">
          <div className="flex-1 rounded-2xl px-4 py-2" style={{ backgroundColor: theme.bgInput }}>
            <textarea 
              value={text} 
              onChange={(e) => setText(e.target.value)} 
              placeholder="댓글을 입력하세요..." 
              rows={1} 
              className="w-full resize-none border-0 focus:outline-none focus:ring-0 text-sm" 
              style={{ backgroundColor: 'transparent', color: theme.textPrimary }} 
            />
          </div>
          <input type="file" ref={fileRef} onChange={handleFileSelect} accept="image/*" className="hidden" />
          <button onClick={() => fileRef.current?.click()} className="p-2 rounded-full" style={{ color: theme.textMuted }}><ImageIcon className="w-5 h-5" /></button>
          <button onClick={handleSubmit} disabled={!text.trim() && images.length === 0} className="p-2 rounded-full disabled:opacity-50" style={{ color: theme.accent }}><Send className="w-5 h-5" /></button>
        </div>
      </div>
    );
  };

  const renderPostsWithAds = () => {
    const elements: React.ReactNode[] = [];
    posts.forEach((post, index) => {
      elements.push(renderPost(post));
      if (index === 2 && listAds.length > 0) { const ad = getRandomListAd(); if (ad) elements.push(<AdBanner key={`ad-1`} ad={ad} type="list" />); }
      if (index === 6 && listAds.length > 0) { const ad = getRandomListAd(); if (ad) elements.push(<AdBanner key={`ad-2`} ad={ad} type="list" />); }
    });
    return elements;
  };

  if (!mounted) return <div className="min-h-screen bg-[#121212]" />;

  return (
    <div className="min-h-screen pb-20 transition-colors duration-300" style={{ backgroundColor: theme.bgMain }} ref={mainRef}>
      {/* 라이트박스 */}
      {lightboxImages.length > 0 && (
        <div className="fixed inset-0 bg-black z-[200] flex items-center justify-center" onClick={closeLightbox}>
          <button className="absolute top-4 right-4 text-white z-10" onClick={closeLightbox}><X className="w-8 h-8" /></button>
          {lightboxImages.length > 1 && <div className="absolute top-4 left-4 text-white text-sm bg-black/50 px-3 py-1 rounded-full z-10">{lightboxIndex + 1} / {lightboxImages.length}</div>}
          <div className="w-full h-full flex items-center justify-center p-4" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} onClick={(e) => e.stopPropagation()}>
            {isVideoUrl(lightboxImages[lightboxIndex]) ? (
              <div className="w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
                <VideoPlayer 
                  src={lightboxImages[lightboxIndex]} 
                  className="max-h-[80vh]"
                  startTime={0}
                  autoPlayOnScroll={false}
                  autoPlay={true}
                />
              </div>
            ) : (
              <img src={lightboxImages[lightboxIndex]} alt="" className="max-w-full max-h-full object-contain" onClick={closeLightbox} />
            )}
          </div>
          {lightboxImages.length > 1 && (<><button onClick={(e) => { e.stopPropagation(); prevImage(); }} className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-white"><ChevronLeft className="w-8 h-8" /></button><button onClick={(e) => { e.stopPropagation(); nextImage(); }} className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-white"><ChevronRight className="w-8 h-8" /></button></>)}
        </div>
      )}

      {/* 상세 모달 (바텀시트 스타일) */}
      {detailModal && (
        <div className={`fixed inset-0 z-[100] flex items-end justify-center transition-all duration-300 ${detailModalVisible ? 'bg-black/70' : 'bg-black/0'}`} onClick={closeDetailModal}>
          <div 
            className={`w-full max-w-[631px] h-[95vh] rounded-t-2xl overflow-hidden flex flex-col transform transition-transform duration-300 ease-out ${detailModalVisible ? 'translate-y-0' : 'translate-y-full'}`} 
            style={{ backgroundColor: theme.bgCard }} 
            onClick={(e) => e.stopPropagation()}
          >
            {/* 드래그 핸들 */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full" style={{ backgroundColor: theme.border }}></div>
            </div>
            <div className="flex items-center justify-between px-4 pb-3" style={{ borderBottom: `1px solid ${theme.borderLight}` }}>
              <span className="font-bold" style={{ color: theme.textPrimary }}>{getAuthorName(detailModal)}님의 게시물</span>
              <button onClick={closeDetailModal} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.bgInput, color: theme.textSecondary }}><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto" ref={detailContentRef}>
              <div className="flex items-center gap-3 p-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden" style={{ backgroundColor: theme.accent }}>{detailModal.is_anonymous ? <span className="text-sm font-bold" style={{ color: isDark ? '#121212' : '#fff' }}>?</span> : detailModal.author_avatar_url ? <img src={detailModal.author_avatar_url} alt="" className="w-full h-full object-cover" /> : <span className="text-sm font-bold" style={{ color: isDark ? '#121212' : '#fff' }}>{detailModal.author_nickname?.[0]?.toUpperCase() || 'U'}</span>}</div>
                <div><div className="flex items-center gap-2"><span className="font-bold" style={{ color: theme.textPrimary }}>{getAuthorName(detailModal)}</span>{detailModal.is_anonymous && <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: theme.bgInput, color: theme.textMuted }}>익명</span>}</div><span className="text-sm" style={{ color: theme.textMuted }}>{formatDate(detailModal.created_at)}</span></div>
              </div>
              <div className="px-4 pb-3">
                {((detailModal.content?.length > 80) || detailModal.content?.includes('\n')) && !expandedPosts.has(detailModal.id) ? (
                  <div>
                    <p className="text-[15px] whitespace-pre-wrap line-clamp-2" style={{ color: theme.textPrimary }}>{detailModal.content}</p>
                    <button onClick={() => togglePost(detailModal.id)} className="text-sm font-medium mt-1" style={{ color: theme.accent }}>더보기</button>
                  </div>
                ) : (
                  <div>
                    <p className="text-[15px] whitespace-pre-wrap" style={{ color: theme.textPrimary }}>{detailModal.content}</p>
                    {((detailModal.content?.length > 80) || detailModal.content?.includes('\n')) && (
                      <button onClick={() => togglePost(detailModal.id)} className="text-sm font-medium mt-1" style={{ color: theme.accent }}>접기</button>
                    )}
                  </div>
                )}
              </div>
              {/* 유튜브 */}
{(() => {
  const links = extractLinks(detailModal.content || '');
  const firstLink = links[0];
  const youtubeId = firstLink ? getYoutubeId(firstLink) : null;
  const youtubeThumbnail = firstLink ? getYoutubeThumbnail(firstLink) : null;
  const linkPreview = postLinkPreviews.get(detailModal.id);
  const isPlaying = playingVideo === detailModal.id;
  
  return (
    <>
      {youtubeId && (
        <div className="w-full mb-3">
          {isPlaying ? (
            <div className="relative w-full aspect-video bg-black">
              <iframe 
                src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0`} 
                className="w-full h-full" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" 
                allowFullScreen 
              />
            </div>
          ) : (
            <div className="relative w-full cursor-pointer" onClick={() => setPlayingVideo(detailModal.id)}>
              <img src={youtubeThumbnail!} alt="" className="w-full aspect-video object-cover" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors">
                <YoutubeLogo />
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* 링크 프리뷰 */}
      {!youtubeId && linkPreview && (
        <div className="mx-4 mb-3 rounded-xl overflow-hidden cursor-pointer" style={{ border: `1px solid ${theme.border}` }} onClick={() => openLink(firstLink)}>
          {linkPreview.image && <img src={linkPreview.image} alt="" className="w-full h-40 object-cover" />}
          <div className="px-4 py-3" style={{ backgroundColor: theme.bgInput }}>
            <p className="text-xs uppercase" style={{ color: theme.textMuted }}>{linkPreview.domain}</p>
            <p className="font-semibold mt-1 line-clamp-2" style={{ color: theme.textPrimary }}>{linkPreview.title}</p>
            {linkPreview.description && <p className="text-sm mt-1 line-clamp-2" style={{ color: theme.textSecondary }}>{linkPreview.description}</p>}
          </div>
        </div>
      )}
    </>
  );
})()}
              {detailAd && <div className="px-4 pb-3"><AdBanner ad={detailAd} type="detail" /></div>}
              {getMediaItems(detailModal).length > 0 && (
                <div className={`${getMediaItems(detailModal).length === 1 ? '' : 'grid grid-cols-2 gap-[2px]'}`}>
                  {getMediaItems(detailModal).slice(0, 4).map((item, idx) => (
                    <div key={idx} className={`relative overflow-hidden ${getMediaItems(detailModal).length === 3 && idx === 0 ? 'row-span-2' : ''}`}>
                      {item.type === 'video' ? (
                        <VideoPlayer 
                          src={item.url} 
                          className={getMediaItems(detailModal).length === 1 ? 'max-h-[400px]' : 'h-48'}
                          startTime={0}
                          autoPlayOnScroll={false}
                          autoPlay={idx === 0}
                        />
                      ) : (
                        <img src={item.url} alt="" className={`w-full object-cover cursor-pointer ${getMediaItems(detailModal).length === 1 ? 'max-h-[400px]' : 'h-48'}`} onClick={() => openLightbox(getMediaItems(detailModal), idx)} />
                      )}
                      {idx === 3 && getMediaItems(detailModal).length > 4 && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><span className="text-white text-xl font-bold">+{getMediaItems(detailModal).length - 4}</span></div>}
                    </div>
                  ))}
                </div>
              )}
              <div className="px-4 py-3 flex items-center gap-4 text-sm" style={{ color: theme.textMuted, borderBottom: `1px solid ${theme.borderLight}` }}>{(detailModal.like_count || 0) > 0 && <button onClick={() => fetchLikers(detailModal.id)} className="hover:underline">좋아요 {detailModal.like_count}개</button>}<button onClick={() => fetchCommenters(detailModal.id)} className="hover:underline">댓글 {detailModal.comment_count || 0}개</button></div>
              <div className="flex items-center" style={{ borderBottom: `1px solid ${theme.borderLight}` }}>
                <button onClick={() => handleLike(detailModal, true)} className="flex-1 flex items-center justify-center gap-2 py-3" style={{ color: detailModal.liked ? '#3B82F6' : theme.textSecondary }}><ThumbsUp className="w-5 h-5" fill={detailModal.liked ? 'currentColor' : 'none'} /><span className="font-medium text-sm">좋아요</span></button>
                <button className="flex-1 flex items-center justify-center gap-2 py-3" style={{ color: theme.textSecondary }}><MessageCircle className="w-5 h-5" /><span className="font-medium text-sm">댓글</span></button>
                <button onClick={() => handleShare(detailModal)} className="flex-1 flex items-center justify-center gap-2 py-3" style={{ color: theme.textSecondary }}><Share2 className="w-5 h-5" /><span className="font-medium text-sm">공유</span></button>
              </div>
              <div className="p-4 space-y-4">
                {comments.length > 0 && (<div className="flex items-center gap-2 pb-2" style={{ borderBottom: `1px solid ${theme.borderLight}` }}><span className="text-sm" style={{ color: theme.textMuted }}>정렬:</span>{(['oldest', 'newest', 'popular', 'replies'] as const).map(s => (<button key={s} onClick={() => setCommentSort(s)} className="px-3 py-1 text-sm rounded-full" style={{ backgroundColor: commentSort === s ? theme.accent : theme.bgInput, color: commentSort === s ? (isDark ? '#121212' : '#fff') : theme.textSecondary, fontWeight: commentSort === s ? 'bold' : 'normal' }}>{s === 'oldest' ? '작성순' : s === 'newest' ? '최신순' : s === 'popular' ? '인기순' : '나열순'}</button>))}</div>)}
                {loadingComments ? <div className="text-center py-4"><div className="w-6 h-6 border-2 rounded-full animate-spin mx-auto" style={{ borderColor: theme.border, borderTopColor: theme.accent }} /></div> : comments.filter(c => !c.parent_id).length === 0 ? <p className="text-center py-4" style={{ color: theme.textMuted }}>첫 댓글을 남겨보세요</p> : ([...comments.filter(c => !c.parent_id)].sort((a, b) => { if (commentSort === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime(); if (commentSort === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime(); if (commentSort === 'popular') return (b.like_count || 0) - (a.like_count || 0); const aReplies = comments.filter(c => c.parent_id === a.id).length; const bReplies = comments.filter(c => c.parent_id === b.id).length; return bReplies - aReplies; }).map(c => <CommentItem key={c.id} comment={c} />))}
              </div>
            </div>
            {user ? (
              <div className="p-3" style={{ borderTop: `1px solid ${theme.borderLight}`, backgroundColor: theme.bgCard }}>
                {isMutedComment() && <div className="rounded-lg p-3 mb-2" style={{ backgroundColor: theme.redBg, border: `1px solid ${theme.red}30` }}><p className="text-sm" style={{ color: theme.red }}>⚠️ 댓글 작성이 제한되어 있습니다.</p></div>}
                {replyingTo && <div className="flex items-center justify-between px-3 py-2 rounded-lg mb-2" style={{ backgroundColor: `${theme.accent}20` }}><span className="text-sm" style={{ color: theme.accent }}>{replyingTo.mentionNickname ? `@${replyingTo.mentionNickname}` : replyingTo.author_nickname}님에게 답글</span><button onClick={() => setReplyingTo(null)} style={{ color: theme.accent }}><X className="w-4 h-4" /></button></div>}
                {commentImagePreviews.length > 0 && <div className="mb-2 relative inline-block"><img src={commentImagePreviews[0]} alt="" className="h-16 rounded-lg" /><button onClick={() => { setCommentImages([]); setCommentImagePreviews([]); }} className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs flex items-center justify-center" style={{ backgroundColor: theme.red, color: '#fff' }}><X className="w-3 h-3" /></button></div>}
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden" style={{ backgroundColor: theme.accent }}>{userProfile?.avatar_url ? <img src={userProfile.avatar_url} alt="" className="w-full h-full object-cover" /> : <span className="text-xs font-bold" style={{ color: isDark ? '#121212' : '#fff' }}>{userProfile?.nickname?.[0]?.toUpperCase() || 'U'}</span>}</div>
                  <div className="flex-1 relative">
                    <input ref={commentInputRef} type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder={isMutedComment() ? "댓글 작성이 제한되어 있습니다" : replyingTo ? "답글 달기..." : `${userProfile?.nickname || '사용자'} 이름으로 댓글 달기`} className="w-full pl-4 pr-20 py-2.5 rounded-full focus:outline-none focus:ring-2 text-sm" style={{ backgroundColor: theme.bgInput, color: theme.textPrimary, opacity: isMutedComment() ? 0.5 : 1 }} onKeyDown={(e) => e.key === 'Enter' && handleComment()} disabled={isMutedComment()} />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                      <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-1.5" style={{ color: theme.textMuted }} disabled={isMutedComment()}><Smile className="w-5 h-5" /></button>
                      <input type="file" ref={commentImageRef} accept="image/*" className="hidden" onChange={handleCommentImageSelect} />
                      <button onClick={() => commentImageRef.current?.click()} className="p-1.5" style={{ color: theme.textMuted }} disabled={isMutedComment()}><ImageIcon className="w-5 h-5" /></button>
                      {(newComment.trim() || commentImages.length > 0) && !isMutedComment() && <button onClick={handleComment} className="p-1.5" style={{ color: theme.accent }}><Send className="w-5 h-5" /></button>}
                    </div>
                    {showEmojiPicker && !isMutedComment() && <div className="absolute bottom-12 right-0 rounded-xl shadow-lg p-2 grid grid-cols-10 gap-1 z-10" style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.border}` }}>{emojis.map(e => <button key={e} onClick={() => addEmoji(e)} className="w-7 h-7 text-lg rounded">{e}</button>)}</div>}
                  </div>
                </div>
              </div>
            ) : <div className="p-4 text-center" style={{ borderTop: `1px solid ${theme.borderLight}` }}><span className="text-sm" style={{ color: theme.textMuted }}>댓글을 작성하려면 </span><Link href="/login" className="font-bold text-sm" style={{ color: theme.accent }}>로그인</Link></div>}
          </div>
        </div>
      )}

      {/* 좋아요 누른 사람 목록 모달 */}
      {likersModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={() => setLikersModal(null)}>
          <div className="rounded-2xl w-full max-w-sm max-h-[60vh] overflow-hidden" style={{ backgroundColor: theme.bgCard }} onClick={(e) => e.stopPropagation()}>
            <div className="p-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${theme.border}` }}>
              <h3 className="font-bold" style={{ color: theme.textPrimary }}>좋아요 {likersModal.users.length}명</h3>
              <button onClick={() => setLikersModal(null)} style={{ color: theme.textMuted }}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-2 overflow-y-auto max-h-[50vh]">
              {likersModal.users.length === 0 ? (
                <p className="text-center py-4 text-sm" style={{ color: theme.textMuted }}>좋아요가 없습니다</p>
              ) : (
                likersModal.users.map((user, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-2 rounded-lg">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden" style={{ backgroundColor: theme.accent }}>
                      {user.avatar_url ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" /> : <span className="text-sm font-bold" style={{ color: isDark ? '#121212' : '#fff' }}>{user.nickname?.[0]?.toUpperCase() || 'U'}</span>}
                    </div>
                    <span className="font-medium" style={{ color: theme.textPrimary }}>{user.nickname}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 댓글 작성자 목록 모달 */}
      {commentersModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={() => setCommentersModal(null)}>
          <div className="rounded-2xl w-full max-w-sm max-h-[60vh] overflow-hidden" style={{ backgroundColor: theme.bgCard }} onClick={(e) => e.stopPropagation()}>
            <div className="p-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${theme.border}` }}>
              <h3 className="font-bold" style={{ color: theme.textPrimary }}>댓글 작성자 {commentersModal.users.length}명</h3>
              <button onClick={() => setCommentersModal(null)} style={{ color: theme.textMuted }}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-2 overflow-y-auto max-h-[50vh]">
              {commentersModal.users.length === 0 ? (
                <p className="text-center py-4 text-sm" style={{ color: theme.textMuted }}>댓글이 없습니다</p>
              ) : (
                commentersModal.users.map((user, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-2 rounded-lg">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: user.is_anonymous ? theme.bgInput : theme.accent }}>
                      <span className="text-sm font-bold" style={{ color: user.is_anonymous ? theme.textMuted : (isDark ? '#121212' : '#fff') }}>{user.is_anonymous ? '?' : (user.nickname?.[0]?.toUpperCase() || 'U')}</span>
                    </div>
                    <span className="font-medium" style={{ color: theme.textPrimary }}>{user.nickname}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 확인 모달들 */}
      {confirmPostModal && (<div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={() => setConfirmPostModal(false)}><div className="rounded-2xl p-6 w-full max-w-sm" style={{ backgroundColor: theme.bgCard }} onClick={(e) => e.stopPropagation()}><p className="text-center font-medium mb-6" style={{ color: theme.textPrimary }}>게시물을 등록하시겠습니까?</p><div className="flex gap-3"><button onClick={() => setConfirmPostModal(false)} className="flex-1 py-3 font-bold rounded-xl" style={{ backgroundColor: theme.bgInput, color: theme.textPrimary }}>취소</button><button onClick={handlePost} className="flex-1 py-3 font-bold rounded-xl" style={{ backgroundColor: theme.accent, color: isDark ? '#121212' : '#fff' }}>확인</button></div></div></div>)}
      {reportModal && (<div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={() => { setReportModal(null); setReportReason(""); }}><div className="rounded-2xl p-6 w-full max-w-sm" style={{ backgroundColor: theme.bgCard }} onClick={(e) => e.stopPropagation()}><h3 className="text-lg font-bold mb-4" style={{ color: theme.textPrimary }}>🚨 신고하기</h3>{reportModal.isAnonymous && <p className="text-sm mb-3" style={{ color: theme.textMuted }}>익명 사용자를 신고합니다</p>}<textarea value={reportReason} onChange={(e) => setReportReason(e.target.value)} placeholder="신고 사유를 입력하세요" className="w-full h-24 p-3 rounded-xl resize-none focus:outline-none focus:ring-2 mb-4" style={{ backgroundColor: theme.bgInput, color: theme.textPrimary, border: `1px solid ${theme.border}` }} /><div className="flex gap-3"><button onClick={() => { setReportModal(null); setReportReason(""); }} className="flex-1 py-3 font-bold rounded-xl" style={{ backgroundColor: theme.bgInput, color: theme.textPrimary }}>취소</button><button onClick={handleReport} className="flex-1 py-3 font-bold rounded-xl" style={{ backgroundColor: theme.red, color: '#fff' }}>신고</button></div></div></div>)}
      {editingPost && (<div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={() => setEditingPost(null)}><div className="rounded-2xl p-4 w-full max-w-lg" style={{ backgroundColor: theme.bgCard }} onClick={(e) => e.stopPropagation()}><div className="flex items-center justify-between mb-4"><h3 className="text-lg font-bold" style={{ color: theme.textPrimary }}>게시글 수정</h3><button onClick={() => setEditingPost(null)} style={{ color: theme.textMuted }}><X className="w-6 h-6" /></button></div><textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} className="w-full h-40 p-3 rounded-xl resize-none focus:outline-none focus:ring-2" style={{ backgroundColor: theme.bgInput, color: theme.textPrimary, border: `1px solid ${theme.border}` }} /><div className="flex gap-2 mt-4"><button onClick={() => setEditingPost(null)} className="flex-1 py-3 font-bold rounded-xl" style={{ backgroundColor: theme.bgInput, color: theme.textPrimary }}>취소</button><button onClick={handleEditSave} className="flex-1 py-3 font-bold rounded-xl" style={{ backgroundColor: theme.accent, color: isDark ? '#121212' : '#fff' }}>수정</button></div></div></div>)}
      {editProfileModal && (<div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={() => setEditProfileModal(false)}><div className="rounded-2xl p-6 w-full max-w-sm" style={{ backgroundColor: theme.bgCard }} onClick={(e) => e.stopPropagation()}><h3 className="text-lg font-bold mb-4" style={{ color: theme.textPrimary }}>프로필 수정</h3><div className="flex flex-col items-center mb-6"><div className="relative"><div className="w-24 h-24 rounded-full flex items-center justify-center overflow-hidden" style={{ backgroundColor: theme.accent }}>{userProfile?.avatar_url ? <img src={userProfile.avatar_url} alt="" className="w-full h-full object-cover" /> : <span className="text-3xl font-bold" style={{ color: isDark ? '#121212' : '#fff' }}>{userProfile?.nickname?.[0]?.toUpperCase() || 'U'}</span>}</div><button onClick={() => profileAvatarRef.current?.click()} className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center shadow-lg" style={{ backgroundColor: theme.accent }}><Camera className="w-4 h-4" style={{ color: isDark ? '#121212' : '#fff' }} /></button><input ref={profileAvatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} /></div></div><div className="mb-4"><label className="block text-sm font-medium mb-1" style={{ color: theme.textSecondary }}>닉네임</label><input type="text" value={editNickname} onChange={(e) => setEditNickname(e.target.value)} maxLength={20} className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2" style={{ backgroundColor: theme.bgInput, color: theme.textPrimary, border: `1px solid ${theme.border}` }} />{getNicknameChangeInfo() && <p className="text-xs mt-1" style={{ color: theme.textMuted }}>{getNicknameChangeInfo()!.remaining > 0 ? `변경 가능: ${getNicknameChangeInfo()!.remaining}회` : `${getNicknameChangeInfo()!.daysUntilReset}일 후 리셋`}</p>}</div><div className="flex gap-2"><button onClick={() => setEditProfileModal(false)} className="flex-1 py-3 font-bold rounded-xl" style={{ backgroundColor: theme.bgInput, color: theme.textPrimary }}>취소</button><button onClick={handleSaveNickname} disabled={editingProfile} className="flex-1 py-3 font-bold rounded-xl disabled:opacity-50" style={{ backgroundColor: theme.accent, color: isDark ? '#121212' : '#fff' }}>{editingProfile ? '저장 중...' : '저장'}</button></div></div></div>)}
      {profileModal && (<div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={() => setProfileModal(null)}><div className="rounded-2xl p-6 w-full max-w-sm" style={{ backgroundColor: theme.bgCard }} onClick={(e) => e.stopPropagation()}><div className="flex items-center gap-4 mb-4"><div className="w-16 h-16 rounded-full flex items-center justify-center overflow-hidden" style={{ backgroundColor: theme.accent }}>{profileModal.avatarUrl ? <img src={profileModal.avatarUrl} alt="" className="w-full h-full object-cover" /> : <span className="text-2xl font-bold" style={{ color: isDark ? '#121212' : '#fff' }}>{profileModal.nickname?.[0]?.toUpperCase() || 'U'}</span>}</div><div className="flex-1"><h3 className="text-xl font-bold" style={{ color: theme.textPrimary }}>{profileModal.nickname}</h3>{profileModal.createdAt && <p className="text-sm" style={{ color: theme.textMuted }}>가입일: {formatFullDate(profileModal.createdAt)}</p>}</div></div><div className="grid grid-cols-3 gap-2 mb-4">{[{ label: '게시글', value: profileModal.postCount }, { label: '팔로워', value: profileModal.followerCount }, { label: '팔로잉', value: profileModal.followingCount }].map(item => <div key={item.label} className="rounded-xl p-3 text-center" style={{ backgroundColor: theme.bgInput }}><p className="text-xl font-bold" style={{ color: theme.textPrimary }}>{item.value}</p><p className="text-xs" style={{ color: theme.textMuted }}>{item.label}</p></div>)}</div>{profileModal.isOwnProfile ? <button onClick={openEditProfile} className="w-full py-3 font-bold rounded-xl mb-3" style={{ backgroundColor: theme.accent, color: isDark ? '#121212' : '#fff' }}>프로필 수정</button> : user && profileModal.userId !== user.id && <button onClick={handleFollow} disabled={followLoading} className="w-full py-3 font-bold rounded-xl mb-3" style={{ backgroundColor: isFollowing ? theme.bgInput : theme.accent, color: isFollowing ? theme.textPrimary : (isDark ? '#121212' : '#fff') }}>{followLoading ? '처리 중...' : isFollowing ? '팔로잉' : '팔로우'}</button>}<button onClick={() => setProfileModal(null)} className="w-full py-3 font-bold rounded-xl" style={{ backgroundColor: theme.bgElevated, color: theme.textPrimary }}>닫기</button></div></div>)}

      {/* 헤더 */}
      <Header title="커뮤니티" showBack />

      {/* 메인 */}
      <main className="max-w-[631px] mx-auto py-4">
        {/* 글쓰기 박스 */}
        {user && (
          <div ref={writeBoxRef} className="rounded-2xl mb-4 overflow-hidden" style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}>
            {isMutedPost() && <div className="p-3" style={{ backgroundColor: theme.redBg, borderBottom: `1px solid ${theme.red}30` }}><p className="text-sm" style={{ color: theme.red }}>⚠️ 글쓰기가 제한되어 있습니다.</p></div>}
            {!isWriting ? (
              <div className={`flex items-center gap-3 p-4 cursor-pointer ${isMutedPost() ? 'opacity-50' : ''}`} onClick={handleWriteBoxClick}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden" style={{ backgroundColor: theme.accent }}>{userProfile?.avatar_url ? <img src={userProfile.avatar_url} alt="" className="w-full h-full object-cover" /> : <span className="font-bold text-sm" style={{ color: isDark ? '#121212' : '#fff' }}>{userProfile?.nickname?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}</span>}</div>
                <div className="flex-1 rounded-full px-4 py-2.5" style={{ backgroundColor: theme.bgInput }}><span style={{ color: theme.textMuted }}>{isMutedPost() ? "글쓰기가 제한되어 있습니다" : "무슨 생각을 하고 계신가요?"}</span></div>
              </div>
            ) : (
              <div className="p-4">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden" style={{ backgroundColor: theme.accent }}>{userProfile?.avatar_url ? <img src={userProfile.avatar_url} alt="" className="w-full h-full object-cover" /> : <span className="font-bold text-sm" style={{ color: isDark ? '#121212' : '#fff' }}>{userProfile?.nickname?.[0]?.toUpperCase() || user.email?.split('@')[0]?.[0]?.toUpperCase() || "U"}</span>}</div>
                  <div className="flex-1">
                    <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="무슨 생각을 하고 계신가요?" rows={3} className="w-full resize-none border-0 focus:outline-none focus:ring-0" style={{ backgroundColor: 'transparent', color: theme.textPrimary }} disabled={posting} />
                    {writingLinkPreview && (<div className="mt-2 rounded-xl overflow-hidden relative" style={{ border: `1px solid ${theme.border}` }}>{writingLinkPreview.image && <div className="relative"><img src={writingLinkPreview.image} alt="" className="w-full h-40 object-cover" />{writingLinkPreview.isYoutube && <div className="absolute inset-0 flex items-center justify-center bg-black/20"><YoutubeLogo /></div>}</div>}<div className="p-3" style={{ backgroundColor: theme.bgInput }}><p className="font-medium text-sm line-clamp-2" style={{ color: theme.textPrimary }}>{writingLinkPreview.title}</p>{writingLinkPreview.description && <p className="text-xs line-clamp-2 mt-1" style={{ color: theme.textMuted }}>{writingLinkPreview.description}</p>}<p className="text-xs mt-1" style={{ color: theme.textMuted }}>{writingLinkPreview.domain}</p></div><button onClick={() => setWritingLinkPreview(null)} className="absolute top-2 right-2 w-6 h-6 bg-black/50 text-white rounded-full text-sm flex items-center justify-center"><X className="w-4 h-4" /></button></div>)}
                    {loadingLinkPreview && <div className="mt-2 p-3 rounded-xl flex items-center gap-2" style={{ backgroundColor: theme.bgInput }}><div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: theme.border, borderTopColor: theme.accent }} /><span className="text-sm" style={{ color: theme.textMuted }}>링크 미리보기 로딩 중...</span></div>}
                    {mediaPreviews.length > 0 && <div className="flex gap-2 mt-2 flex-wrap">{mediaPreviews.map((preview, index) => (<div key={index} className="relative">{preview.type === 'video' ? (<div className="w-20 h-20 rounded-lg relative overflow-hidden" style={{ backgroundColor: theme.bgElevated }}><video src={preview.url} className="w-full h-full object-cover" /><div className="absolute inset-0 flex items-center justify-center bg-black/30"><Play className="w-6 h-6 text-white" fill="currentColor" /></div></div>) : (<img src={preview.url} alt="" className="w-20 h-20 object-cover rounded-lg" />)}<button onClick={() => removeMedia(index)} disabled={posting} className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs flex items-center justify-center" style={{ backgroundColor: theme.red, color: '#fff' }}><X className="w-3 h-3" /></button></div>))}</div>}
                    {posting && <div className="mt-3"><div className="flex items-center justify-between text-xs mb-1" style={{ color: theme.textSecondary }}><span className="truncate">{totalFiles > 0 ? `${currentFileIndex}/${totalFiles} 업로드 중...` : '처리 중...'}</span><span className="font-bold">{uploadProgress}%</span></div><div className="w-full rounded-full h-2" style={{ backgroundColor: theme.bgInput }}><div className="h-2 rounded-full transition-all" style={{ width: `${uploadProgress}%`, backgroundColor: theme.accent }} /></div></div>}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: `1px solid ${theme.borderLight}` }}>
                  <div className="flex items-center gap-1"><input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*,video/*" multiple className="hidden" disabled={posting} /><button onClick={() => fileInputRef.current?.click()} disabled={posting} className="p-2 rounded-lg disabled:opacity-50" style={{ color: theme.textMuted }}><ImageIcon className="w-6 h-6" /></button></div>
                  <button onClick={handlePostButtonClick} disabled={posting || (!content.trim() && mediaFiles.length === 0)} className="px-5 py-2 font-bold rounded-full disabled:opacity-50" style={{ backgroundColor: theme.accent, color: isDark ? '#121212' : '#fff' }}>{posting ? "업로드 중..." : "게시"}</button>
                </div>
              </div>
            )}
          </div>
        )}
        {!user && <div className="rounded-2xl p-4 mb-4 text-center" style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}><span style={{ color: theme.textMuted }}>로그인하고 글을 작성하세요</span><Link href="/login" className="font-bold ml-2" style={{ color: theme.accent }}>로그인</Link></div>}

        {/* 게시글 목록 */}
        {loading ? <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: theme.border, borderTopColor: theme.accent }}></div></div> : posts.length === 0 ? <div className="text-center py-20 rounded-2xl" style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}><p style={{ color: theme.textMuted }}>게시글이 없습니다</p></div> : <div className="space-y-3">{renderPostsWithAds()}</div>}
      </main>

      <BottomNav />
    </div>
  );
}

// Suspense로 감싸서 useSearchParams 사용
export default function CommunityClient({ initialPosts }: { initialPosts: any[] }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#121212' }}>
        <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#d4af37' }} />
      </div>
    }>
      <CommunityPageContent initialPosts={initialPosts} />
    </Suspense>
  );
}