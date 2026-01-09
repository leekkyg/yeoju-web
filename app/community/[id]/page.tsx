"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const R2_WORKER_URL = "https://yeoju-r2-worker.kkyg9300.workers.dev";
const linkPreviewCache = new Map<string, any>();

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.id as string;
  
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [playingVideo, setPlayingVideo] = useState(false);
  const [linkPreview, setLinkPreview] = useState<any>(null);
  
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  
  // 댓글
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
  
  const emojis = ['😀', '😂', '🥹', '😍', '🥰', '😎', '🤔', '😢', '😡', '👍', '👎', '❤️', '🔥', '👏', '🎉', '💯', '🙏', '😱', '🤣', '😊'];

  useEffect(() => {
    if (postId) {
      fetchPost();
      fetchComments();
      incrementViewCount();
    }
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      setUser(user);
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("*").eq("email", user.email).single();
        setUserProfile(profile);
      }
    });
  }, [postId]);

  const fetchPost = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("posts").select("*").eq("id", postId).single();
    if (error || !data) {
      router.push('/community');
      return;
    }
    setPost(data);
    
    // 링크 미리보기
    const urls = extractLinks(data.content || '');
    if (urls.length > 0 && !getYoutubeId(urls[0])) {
      const preview = await fetchLinkPreview(urls[0]);
      if (preview) setLinkPreview(preview);
    }
    
    // 좋아요 상태 확인
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: like } = await supabase.from("likes").select("id").eq("user_id", user.id).eq("post_id", postId).single();
      if (like) setPost((p: any) => ({ ...p, liked: true }));
    }
    
    setLoading(false);
  };

  const fetchComments = async () => {
    setLoadingComments(true);
    const { data } = await supabase.from("comments").select("*").eq("post_id", postId).order("created_at", { ascending: true });
    setComments(data || []);
    setLoadingComments(false);
  };

  const incrementViewCount = async () => {
  try {
    await supabase.rpc('increment_view_count', { post_id: parseInt(postId) });
  } catch {
    const { data } = await supabase.from("posts").select("view_count").eq("id", postId).single();
    await supabase.from("posts").update({ view_count: (data?.view_count || 0) + 1 }).eq("id", postId);
  }
};

  const fetchLinkPreview = async (url: string): Promise<any> => {
    if (linkPreviewCache.has(url)) return linkPreviewCache.get(url);
    try {
      const response = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`);
      const data = await response.json();
      if (data.status === 'success' && data.data) {
        const preview = {
          title: data.data.title || getDomain(url),
          description: data.data.description || '',
          image: data.data.image?.url || data.data.logo?.url || null,
          url: url,
          domain: getDomain(url),
        };
        linkPreviewCache.set(url, preview);
        return preview;
      }
    } catch (error) {
      console.error('Link preview error:', error);
    }
    return { title: getDomain(url), url, domain: getDomain(url), image: null };
  };

  // 좋아요
  const handleLike = async () => {
    if (!user) return alert("로그인 필요");
    const { data: existing } = await supabase.from("likes").select("id").eq("user_id", user.id).eq("post_id", post.id).single();
    if (existing) {
      await supabase.from("likes").delete().eq("id", existing.id);
      await supabase.from("posts").update({ like_count: Math.max(0, (post.like_count || 0) - 1) }).eq("id", post.id);
      setPost({ ...post, like_count: Math.max(0, (post.like_count || 0) - 1), liked: false });
    } else {
      await supabase.from("likes").insert({ user_id: user.id, post_id: post.id });
      await supabase.from("posts").update({ like_count: (post.like_count || 0) + 1 }).eq("id", post.id);
      setPost({ ...post, like_count: (post.like_count || 0) + 1, liked: true });
    }
  };

  // 댓글 이미지 선택
  const handleCommentImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith('image/')) return;
    setCommentImages([file]);
    const reader = new FileReader();
    reader.onload = (e) => setCommentImagePreviews([e.target?.result as string]);
    reader.readAsDataURL(file);
  };

  const addEmoji = (emoji: string) => {
    setNewComment(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const uploadSmallFile = async (file: File): Promise<string> => {
    const ext = file.name.split('.').pop();
    const fileName = `comments/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
    const response = await fetch(`${R2_WORKER_URL}/${fileName}`, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
    const data = await response.json();
    return data.url;
  };

  const getClientIP = async (): Promise<string> => {
    try { const res = await fetch('https://api.ipify.org?format=json'); return (await res.json()).ip; } catch { return ''; }
  };

  // 댓글 작성
  const handleComment = async () => {
    if (!user || (!newComment.trim() && commentImages.length === 0)) return;
    
    try {
      let imageUrl = null;
      if (commentImages.length > 0) {
        imageUrl = await uploadSmallFile(commentImages[0]);
      }
      
      const ipAddress = await getClientIP();
      const nickname = userProfile?.nickname || user.email?.split('@')[0] || '사용자';
      const { data, error } = await supabase.from("comments").insert({
        post_id: post.id,
        user_id: user.id,
        content: newComment,
        author_nickname: nickname,
        parent_id: replyingTo?.id || null,
        image_url: imageUrl,
        is_anonymous: isAnonymousComment,
        ip_address: ipAddress,
      }).select().single();
      
      if (error) throw error;
      
      setComments(prev => [...prev, data]);
      setNewComment("");
      setCommentImages([]);
      setCommentImagePreviews([]);
      setReplyingTo(null);
      setIsAnonymousComment(false);
      
      await supabase.from("posts").update({ comment_count: (post.comment_count || 0) + 1 }).eq("id", post.id);
      setPost({ ...post, comment_count: (post.comment_count || 0) + 1 });
    } catch (error: any) {
      alert("댓글 작성 실패: " + error.message);
    }
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert('링크가 복사되었습니다');
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('링크가 복사되었습니다');
    }
  };

  const extractLinks = (text: string): string[] => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text?.match(urlRegex) || [];
  };

  const getYoutubeId = (url: string): string | null => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([^&\s?]+)/);
    return match ? match[1] : null;
  };

  const getYoutubeThumbnail = (url: string): string | null => {
    const id = getYoutubeId(url);
    return id ? `https://img.youtube.com/vi/${id}/maxresdefault.jpg` : null;
  };

  const getDomain = (url: string): string => {
    try { return new URL(url).hostname.replace('www.', ''); } catch { return url; }
  };

  const openLink = (url: string) => window.open(url, '_blank');

  const formatDate = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const m = Math.floor(diff / 60000), h = Math.floor(diff / 3600000), dd = Math.floor(diff / 86400000);
    if (m < 60) return `${m}분 전`; if (h < 24) return `${h}시간 전`; if (dd < 7) return `${dd}일 전`;
    return new Date(d).toLocaleDateString("ko-KR");
  };

  const getMediaItems = (post: any): {url: string, type: 'image' | 'video'}[] => {
    if (!post?.images) return [];
    let urls = typeof post.images === 'string' ? JSON.parse(post.images) : post.images;
    return urls.map((url: string) => ({ url, type: /\.(mp4|mov|webm|avi)/i.test(url) ? 'video' : 'image' }));
  };

  const openLightbox = (items: any[], idx: number) => { setLightboxImages(items.map(m => m.url)); setLightboxIndex(idx); };
  const closeLightbox = () => { setLightboxImages([]); setLightboxIndex(0); };
  const isVideoUrl = (url: string) => /\.(mp4|mov|webm|avi)/i.test(url);

  const isAdmin = userProfile?.role === 'admin';
  const getAuthorName = () => isAdmin && post?.is_anonymous ? `익명 (${post.author_nickname || '?'})` : post?.is_anonymous ? '익명' : post?.author_nickname || '알수없음';

  // 댓글 컴포넌트
  const CommentItem = ({ comment, depth = 0 }: { comment: any, depth?: number }) => {
    const replies = comments.filter(c => c.parent_id === comment.id);
    const isExpanded = expandedComments.has(comment.id);
    const showReplies = expandedReplies.has(comment.id);
    const isLong = comment.content?.length > 150;
    
    const getCommentAuthor = () => {
      if (isAdmin && comment.is_anonymous) {
        return `익명 (${comment.author_nickname || '?'})`;
      }
      return comment.is_anonymous ? '익명' : comment.author_nickname;
    };

    return (
      <div className={`${depth > 0 ? 'ml-10 mt-3' : ''}`}>
        <div className="flex gap-3">
          <div className="w-9 h-9 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-gray-600 text-sm font-bold">{comment.is_anonymous ? '?' : comment.author_nickname?.[0]?.toUpperCase() || 'U'}</span>
          </div>
          <div className="flex-1">
            <div className="bg-gray-100 rounded-2xl px-4 py-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900">{getCommentAuthor()}</span>
                {comment.is_anonymous && <span className="text-xs text-gray-400 bg-gray-200 px-1 py-0.5 rounded">익명</span>}
              </div>
              {isAdmin && comment.ip_address && (
                <span className="text-xs text-red-400">IP: {comment.ip_address}</span>
              )}
              <p className="text-gray-800 mt-0.5">
                {isLong && !isExpanded ? (
                  <>
                    {comment.content.slice(0, 150)}...
                    <button onClick={() => setExpandedComments(prev => new Set(prev).add(comment.id))} className="text-gray-500 ml-1 font-medium">더보기</button>
                  </>
                ) : comment.content}
              </p>
              {comment.image_url && (
                <img src={comment.image_url} alt="" className="mt-2 max-w-[250px] rounded-lg cursor-pointer" onClick={() => openLightbox([{url: comment.image_url}], 0)} />
              )}
            </div>
            <div className="flex items-center gap-4 mt-1 ml-3">
              <span className="text-xs text-gray-500">{formatDate(comment.created_at)}</span>
              {depth === 0 && (
                <button onClick={() => setReplyingTo(comment)} className="text-xs text-gray-600 font-semibold hover:text-gray-800">답글 달기</button>
              )}
            </div>
            
            {replies.length > 0 && depth === 0 && (
              <button 
                onClick={() => setExpandedReplies(prev => {
                  const n = new Set(prev);
                  if (n.has(comment.id)) n.delete(comment.id);
                  else n.add(comment.id);
                  return n;
                })}
                className="text-sm text-gray-600 font-semibold mt-2 ml-3 flex items-center gap-2"
              >
                <span className="w-8 h-px bg-gray-400"></span>
                {showReplies ? '답글 숨기기' : `답글 ${replies.length}개 보기`}
              </button>
            )}
            
            {showReplies && replies.map(reply => (
              <CommentItem key={reply.id} comment={reply} depth={depth + 1} />
            ))}
          </div>
        </div>
      </div>
    );
  };

  const YoutubeLogo = () => (
    <svg viewBox="0 0 68 48" className="w-16 h-12">
      <path d="M66.52 7.74c-.78-2.93-2.49-5.41-5.42-6.19C55.79.13 34 0 34 0S12.21.13 6.9 1.55c-2.93.78-4.63 3.26-5.42 6.19C.06 13.05 0 24 0 24s.06 10.95 1.48 16.26c.78 2.93 2.49 5.41 5.42 6.19C12.21 47.87 34 48 34 48s21.79-.13 27.1-1.55c2.93-.78 4.64-3.26 5.42-6.19C67.94 34.95 68 24 68 24s-.06-10.95-1.48-16.26z" fill="#f00"/>
      <path d="M45 24L27 14v20" fill="#fff"/>
    </svg>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!post) return null;

  const links = extractLinks(post.content || '');
  const firstLink = links[0];
  const youtubeId = firstLink ? getYoutubeId(firstLink) : null;
  const youtubeThumbnail = firstLink ? getYoutubeThumbnail(firstLink) : null;
  const mediaItems = getMediaItems(post);

  return (
    <div className="min-h-screen bg-gray-100 pb-24 md:pb-10">
      {/* 라이트박스 */}
      {lightboxImages.length > 0 && (
        <div className="fixed inset-0 bg-black z-[100] flex items-center justify-center" onClick={closeLightbox}>
          <button className="absolute top-4 right-4 text-white text-4xl z-10" onClick={closeLightbox}>×</button>
          {lightboxImages.length > 1 && <div className="absolute top-4 left-4 text-white text-sm bg-black/50 px-3 py-1 rounded-full z-10">{lightboxIndex + 1} / {lightboxImages.length}</div>}
          <div className="w-full h-full flex items-center justify-center">
            {isVideoUrl(lightboxImages[lightboxIndex]) ? <video src={lightboxImages[lightboxIndex]} controls autoPlay className="max-w-full max-h-full" /> : <img src={lightboxImages[lightboxIndex]} alt="" className="max-w-full max-h-full object-contain" />}
          </div>
        </div>
      )}

      {/* 헤더 */}
      <header className="bg-gray-900 sticky top-0 z-50">
        <div className="max-w-[631px] mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="text-gray-400 hover:text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <h1 className="text-white font-bold text-lg">게시글</h1>
          </div>
        </div>
      </header>

      <main className="max-w-[631px] mx-auto">
        {/* 게시글 */}
        <div className="bg-white">
          {/* 헤더 */}
          <div className="flex items-center gap-3 p-4">
            <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center">
              <span className="text-white font-bold">{post.is_anonymous ? '?' : (post.author_nickname?.[0]?.toUpperCase() || 'U')}</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-900">{getAuthorName()}</span>
                {post.is_anonymous && <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">익명</span>}
              </div>
              <span className="text-sm text-gray-500">{formatDate(post.created_at)}</span>
            </div>
          </div>

          {/* 내용 */}
          <div className="px-4 pb-4">
            <p className="text-gray-900 whitespace-pre-wrap text-lg">{post.content}</p>
          </div>

          {/* 유튜브 */}
          {youtubeId && (
            <div className="w-full">
              {playingVideo ? (
                <div className="relative w-full aspect-video bg-black">
                  <iframe 
                    src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0`}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="relative w-full cursor-pointer" onClick={() => setPlayingVideo(true)}>
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
            <div className="cursor-pointer" onClick={() => openLink(firstLink)}>
              {linkPreview.image && (
                <img src={linkPreview.image} alt="" className="w-full h-52 object-cover" />
              )}
              <div className="px-4 py-3 bg-gray-50">
                <p className="text-xs text-gray-500 uppercase">{linkPreview.domain}</p>
                <p className="font-semibold text-gray-900 mt-1 line-clamp-2">{linkPreview.title}</p>
                {linkPreview.description && <p className="text-sm text-gray-600 mt-1 line-clamp-2">{linkPreview.description}</p>}
              </div>
            </div>
          )}

          {/* 미디어 */}
          {mediaItems.length > 0 && (
            <div>
              {mediaItems.map((item, idx) => (
                <div key={idx} className="cursor-pointer" onClick={() => openLightbox(mediaItems, idx)}>
                  {item.type === 'video' ? (
                    <video src={item.url} controls className="w-full" onClick={(e) => e.stopPropagation()} />
                  ) : (
                    <img src={item.url} alt="" className="w-full" />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 좋아요/댓글 수 */}
          <div className="px-4 py-2 flex items-center gap-4 text-sm text-gray-500">
            {(post.like_count || 0) > 0 && <span>좋아요 {post.like_count}개</span>}
            {(post.comment_count || 0) > 0 && <span>댓글 {post.comment_count}개</span>}
            {(post.view_count || 0) > 0 && <span>조회 {post.view_count}</span>}
          </div>

          {/* 액션 버튼 */}
          <div className="flex items-center border-t border-gray-100">
            <button onClick={handleLike} className={`flex-1 flex items-center justify-center gap-2 py-3 ${post.liked ? 'text-blue-500' : 'text-gray-500'}`}>
              <svg className="w-6 h-6" fill={post.liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" /></svg>
              <span className="font-medium">좋아요</span>
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 py-3 text-gray-500">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              <span className="font-medium">댓글</span>
            </button>
            <button onClick={handleShare} className="flex-1 flex items-center justify-center gap-2 py-3 text-gray-500">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
              <span className="font-medium">공유</span>
            </button>
          </div>
        </div>

        {/* 댓글 섹션 */}
        <div className="bg-white mt-2 p-4">
          <h3 className="font-bold text-gray-900 mb-4">댓글 {post.comment_count || 0}</h3>
          
          {loadingComments ? (
            <div className="text-center py-4"><div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" /></div>
          ) : comments.filter(c => !c.parent_id).length === 0 ? (
            <p className="text-center text-gray-500 py-8">첫 댓글을 남겨보세요</p>
          ) : (
            <div className="space-y-4">
              {comments.filter(c => !c.parent_id).map((comment) => (
                <CommentItem key={comment.id} comment={comment} />
              ))}
            </div>
          )}
        </div>

        {/* 댓글 입력 - 고정 */}
        {user && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 md:relative md:border-t-0 md:mt-2">
            <div className="max-w-[631px] mx-auto">
              {replyingTo && (
                <div className="flex items-center justify-between bg-gray-100 px-3 py-2 rounded-lg mb-2">
                  <span className="text-sm text-gray-600">{replyingTo.author_nickname}님에게 답글 작성 중</span>
                  <button onClick={() => setReplyingTo(null)} className="text-gray-500"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
              )}
              
              {commentImagePreviews.length > 0 && (
                <div className="mb-2 relative inline-block">
                  <img src={commentImagePreviews[0]} alt="" className="h-20 rounded-lg" />
                  <button onClick={() => { setCommentImages([]); setCommentImagePreviews([]); }} className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs">✕</button>
                </div>
              )}
              
              <div className="flex items-end gap-2">
                <div className="flex-1 relative">
                  <input 
                    type="text" 
                    value={newComment} 
                    onChange={(e) => setNewComment(e.target.value)} 
                    placeholder={replyingTo ? "답글을 입력하세요" : "댓글을 입력하세요"} 
                    className="w-full pl-4 pr-24 py-3 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-amber-500" 
                    onKeyDown={(e) => e.key === 'Enter' && handleComment()} 
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-1 text-gray-500 hover:text-amber-500">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </button>
                    <input type="file" ref={commentImageRef} accept="image/*" className="hidden" onChange={handleCommentImageSelect} />
                    <button onClick={() => commentImageRef.current?.click()} className="p-1 text-gray-500 hover:text-amber-500">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </button>
                  </div>
                  
                  {showEmojiPicker && (
                    <div className="absolute bottom-14 right-0 bg-white rounded-xl shadow-lg border border-gray-200 p-2 grid grid-cols-10 gap-1 z-10">
                      {emojis.map(emoji => (
                        <button key={emoji} onClick={() => addEmoji(emoji)} className="w-8 h-8 text-xl hover:bg-gray-100 rounded">{emoji}</button>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* 익명 체크박스 */}
                <label className="flex items-center gap-1 cursor-pointer select-none whitespace-nowrap">
                  <input type="checkbox" checked={isAnonymousComment} onChange={(e) => setIsAnonymousComment(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-amber-500 focus:ring-amber-500" />
                  <span className="text-sm text-gray-600">익명</span>
                </label>
                
                <button onClick={handleComment} disabled={!newComment.trim() && commentImages.length === 0} className="px-5 py-3 bg-amber-500 text-gray-900 font-bold rounded-full disabled:opacity-50">등록</button>
              </div>
            </div>
          </div>
        )}
        
        {!user && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 text-center md:relative md:border-t-0 md:mt-2">
            <span className="text-gray-500">댓글을 작성하려면 </span>
            <Link href="/login" className="text-amber-600 font-bold">로그인</Link>
            <span className="text-gray-500">하세요</span>
          </div>
        )}
      </main>
    </div>
  );
}
