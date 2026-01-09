"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const R2_WORKER_URL = "https://yeoju-r2-worker.kkyg9300.workers.dev";
const CHUNK_SIZE = 50 * 1024 * 1024;
const MAX_FILE_SIZE = 3 * 1024 * 1024 * 1024;
const PARALLEL_UPLOADS = 5;

const linkPreviewCache = new Map<string, any>();

export default function CommunityPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [expandedPosts, setExpandedPosts] = useState<Set<number>>(new Set());
  const [playingVideo, setPlayingVideo] = useState<number | null>(null);
  
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
  
  // 댓글 모달
  const [commentModal, setCommentModal] = useState<any>(null);
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
  
  const [editProfileModal, setEditProfileModal] = useState(false);
  const [editNickname, setEditNickname] = useState("");
  const [editingProfile, setEditingProfile] = useState(false);
  const profileAvatarRef = useRef<HTMLInputElement>(null);
  
  // 글쓰기 상태
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

  // 이모지 목록
  const emojis = ['😀', '😂', '🥹', '😍', '🥰', '😎', '🤔', '😢', '😡', '👍', '👎', '❤️', '🔥', '👏', '🎉', '💯', '🙏', '😱', '🤣', '😊'];

  useEffect(() => {
    fetchPosts();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      setUser(user);
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("*").eq("email", user.email).single();
        setUserProfile(profile);
        fetchUnreadCount(user.id);
      }
    });
  }, []);

  // 글쓰기 영역 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (writeBoxRef.current && !writeBoxRef.current.contains(e.target as Node)) {
        if (!content.trim() && mediaFiles.length === 0) {
          setIsWriting(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [content, mediaFiles]);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const postId = parseInt(entry.target.getAttribute('data-post-id') || '0');
        if (!entry.isIntersecting && expandedPosts.has(postId)) {
          setExpandedPosts(prev => { const n = new Set(prev); n.delete(postId); return n; });
        }
      });
    }, { threshold: 0, rootMargin: '-100px 0px -100px 0px' });
    postRefs.current.forEach((ref) => { if (ref) observer.observe(ref); });
    return () => observer.disconnect();
  }, [posts, expandedPosts]);

  useEffect(() => {
    const urls = extractLinks(content);
    if (urls.length > 0 && !writingLinkPreview) {
      fetchLinkPreview(urls[0]).then(preview => {
        if (preview) setWritingLinkPreview(preview);
      });
    } else if (urls.length === 0) {
      setWritingLinkPreview(null);
    }
  }, [content]);

  useEffect(() => {
    posts.forEach(post => {
      const urls = extractLinks(post.content || '');
      if (urls.length > 0 && !postLinkPreviews.has(post.id)) {
        const youtubeId = getYoutubeId(urls[0]);
        if (!youtubeId) {
          fetchLinkPreview(urls[0]).then(preview => {
            if (preview) {
              setPostLinkPreviews(prev => new Map(prev).set(post.id, preview));
            }
          });
        }
      }
    });
  }, [posts]);

  const fetchLinkPreview = async (url: string): Promise<any> => {
    if (linkPreviewCache.has(url)) return linkPreviewCache.get(url);
    if (getYoutubeId(url)) return null;
    
    try {
      setLoadingLinkPreview(true);
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
        setLoadingLinkPreview(false);
        return preview;
      }
    } catch (error) {
      console.error('Link preview error:', error);
    }
    setLoadingLinkPreview(false);
    return { title: getDomain(url), url, domain: getDomain(url), image: null };
  };

  const fetchUnreadCount = async (userId: string) => {
    const { count } = await supabase.from("notifications").select("*", { count: 'exact', head: true }).eq("user_id", userId).eq("is_read", false);
    setUnreadCount(count || 0);
  };

  const fetchPosts = async () => {
    setLoading(true);
    const { data } = await supabase.from("posts").select("*").order("created_at", { ascending: false });
    setPosts(data || []);
    setLoading(false);
  };

  const togglePost = (postId: number) => {
    setExpandedPosts(prev => { const n = new Set(prev); if (n.has(postId)) n.delete(postId); else n.add(postId); return n; });
  };

  // 헤더 클릭 시 최상단으로
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) { alert(`${file.name}: 3GB 이하만`); continue; }
      if (mediaFiles.length + 1 > 10) { alert("최대 10개"); break; }
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');
      if (!isVideo && !isImage) continue;
      setMediaFiles(prev => [...prev, file]);
      const reader = new FileReader();
      reader.onload = (e) => setMediaPreviews(prev => [...prev, { url: e.target?.result as string, type: isVideo ? 'video' : 'image' }]);
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeMedia = (index: number) => {
    setMediaFiles(mediaFiles.filter((_, i) => i !== index));
    setMediaPreviews(mediaPreviews.filter((_, i) => i !== index));
  };

  const compressImage = async (file: File): Promise<File> => {
    if (!file.type.startsWith('image/') || file.size < 1024 * 1024) return file;
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        const maxSize = 2048;
        if (width > maxSize || height > maxSize) {
          if (width > height) { height = (height / width) * maxSize; width = maxSize; }
          else { width = (width / height) * maxSize; height = maxSize; }
        }
        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) resolve(new File([blob], file.name, { type: 'image/jpeg' }));
          else resolve(file);
        }, 'image/jpeg', 0.85);
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const uploadSmallFile = async (file: File): Promise<string> => {
    const processedFile = await compressImage(file);
    const ext = file.name.split('.').pop();
    const fileName = `posts/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
    const response = await fetch(`${R2_WORKER_URL}/${fileName}`, { method: 'PUT', body: processedFile, headers: { 'Content-Type': processedFile.type } });
    const data = await response.json();
    return data.url;
  };

  const uploadLargeFile = async (file: File, fileIndex: number, totalFilesCount: number): Promise<string> => {
    const createRes = await fetch(`${R2_WORKER_URL}/multipart/create`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName: file.name, contentType: file.type }),
    });
    const { uploadId, key } = await createRes.json();
    const totalParts = Math.ceil(file.size / CHUNK_SIZE);
    const parts: { partNumber: number; etag: string }[] = [];
    let completedParts = 0;

    const uploadChunk = async (partIndex: number) => {
      const start = partIndex * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);
      const partRes = await fetch(`${R2_WORKER_URL}/multipart/upload/${key}`, {
        method: 'PUT', headers: { 'X-Upload-Id': uploadId, 'X-Part-Number': String(partIndex + 1) }, body: chunk,
      });
      const partData = await partRes.json();
      completedParts++;
      const fileProgress = (completedParts / totalParts) * 100;
      const overallProgress = ((fileIndex + fileProgress / 100) / totalFilesCount) * 100;
      setUploadProgress(Math.round(overallProgress));
      return { partNumber: partIndex + 1, etag: partData.etag };
    };

    for (let i = 0; i < totalParts; i += PARALLEL_UPLOADS) {
      const batch = [];
      for (let j = i; j < Math.min(i + PARALLEL_UPLOADS, totalParts); j++) batch.push(uploadChunk(j));
      const results = await Promise.all(batch);
      parts.push(...results);
    }
    parts.sort((a, b) => a.partNumber - b.partNumber);
    const completeRes = await fetch(`${R2_WORKER_URL}/multipart/complete`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileKey: key, uploadId, parts }),
    });
    const completeData = await completeRes.json();
    return completeData.url;
  };

  const uploadFile = async (file: File, fileIndex: number, totalFilesCount: number): Promise<string> => {
    setCurrentFileIndex(fileIndex + 1);
    if (file.size > 100 * 1024 * 1024) return uploadLargeFile(file, fileIndex, totalFilesCount);
    const url = await uploadSmallFile(file);
    setUploadProgress(Math.round(((fileIndex + 1) / totalFilesCount) * 100));
    return url;
  };

  const getClientIP = async (): Promise<string> => {
    try { const res = await fetch('https://api.ipify.org?format=json'); return (await res.json()).ip; } catch { return ''; }
  };

  const notifyFollowers = async (postId: number) => {
    if (!user) return;
    const { data: followers } = await supabase.from("follows").select("follower_id").eq("following_id", user.id);
    if (!followers?.length) return;
    const nickname = userProfile?.nickname || user.email?.split('@')[0] || '사용자';
    await supabase.from("notifications").insert(followers.map(f => ({
      user_id: f.follower_id, type: 'new_post', from_user_id: user.id, from_user_nickname: nickname, post_id: postId, message: `${nickname}님이 새 글을 작성했습니다`,
    })));
  };

  const handlePostClick = () => {
    if (!user) return alert("로그인 필요");
    if (!content.trim() && mediaFiles.length === 0) return alert("내용을 입력하세요");
    setConfirmPostModal(true);
  };

  const handlePost = async () => {
    setConfirmPostModal(false);
    setPosting(true);
    setUploadProgress(0);
    setTotalFiles(mediaFiles.length);
    setCurrentFileIndex(0);
    
    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < mediaFiles.length; i++) {
        const url = await uploadFile(mediaFiles[i], i, mediaFiles.length);
        uploadedUrls.push(url);
      }
      const ipAddress = await getClientIP();
      const nickname = userProfile?.nickname || user.email?.split('@')[0] || '사용자';
      const { data: newPost, error } = await supabase.from("posts").insert({
        title: content.slice(0, 50), content, images: uploadedUrls, is_anonymous: isAnonymous,
        author_nickname: nickname, ip_address: ipAddress, user_id: user.id,
      }).select().single();
      if (error) throw error;
      if (!isAnonymous && newPost) await notifyFollowers(newPost.id);
      setContent(""); setMediaFiles([]); setMediaPreviews([]); setIsAnonymous(false); setUploadProgress(0);
      setWritingLinkPreview(null);
      setIsWriting(false);
      fetchPosts();
    } catch (error: any) { alert("게시 실패: " + error.message); }
    setPosting(false);
  };

  const handleDelete = async (postId: number) => {
    if (!confirm("삭제하시겠습니까?")) return;
    await supabase.from("posts").delete().eq("id", postId);
    setPosts(posts.filter(p => p.id !== postId));
    setMenuOpenId(null);
  };

  const handleEditStart = (post: any) => { setEditingPost(post); setEditContent(post.content); setMenuOpenId(null); };

  const handleEditSave = async () => {
    if (!editingPost) return;
    await supabase.from("posts").update({ content: editContent }).eq("id", editingPost.id);
    setPosts(posts.map(p => p.id === editingPost.id ? { ...p, content: editContent } : p));
    setEditingPost(null);
  };

  const handleReport = async () => {
    if (!user || !reportModal || !reportReason.trim()) { alert("신고 사유를 입력하세요"); return; }
    await supabase.from("reports").insert({
      reporter_id: user.id, post_id: reportModal.postId, reported_user_id: reportModal.userId, reason: reportReason,
    });
    alert("신고가 접수되었습니다");
    setReportModal(null); setReportReason("");
  };

  const handleLike = async (post: any) => {
    if (!user) return alert("로그인 필요");
    const { data: existing } = await supabase.from("likes").select("id").eq("user_id", user.id).eq("post_id", post.id).single();
    if (existing) {
      await supabase.from("likes").delete().eq("id", existing.id);
      await supabase.from("posts").update({ like_count: Math.max(0, (post.like_count || 0) - 1) }).eq("id", post.id);
      setPosts(posts.map(p => p.id === post.id ? { ...p, like_count: Math.max(0, (p.like_count || 0) - 1), liked: false } : p));
    } else {
      await supabase.from("likes").insert({ user_id: user.id, post_id: post.id });
      await supabase.from("posts").update({ like_count: (post.like_count || 0) + 1 }).eq("id", post.id);
      setPosts(posts.map(p => p.id === post.id ? { ...p, like_count: (p.like_count || 0) + 1, liked: true } : p));
    }
  };

  // 댓글 열기
  const openComments = async (post: any) => {
    setCommentModal(post);
    setLoadingComments(true);
    setReplyingTo(null);
    setNewComment("");
    setCommentImages([]);
    setCommentImagePreviews([]);
    const { data } = await supabase.from("comments").select("*").eq("post_id", post.id).order("created_at", { ascending: true });
    setComments(data || []);
    setLoadingComments(false);
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

  // 이모지 추가
  const addEmoji = (emoji: string) => {
    setNewComment(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  // 익명 댓글 상태
  const [isAnonymousComment, setIsAnonymousComment] = useState(false);

  // 댓글 작성
  const handleComment = async () => {
    if (!user || !commentModal || (!newComment.trim() && commentImages.length === 0)) return;
    
    try {
      let imageUrl = null;
      if (commentImages.length > 0) {
        imageUrl = await uploadSmallFile(commentImages[0]);
      }
      
      const ipAddress = await getClientIP();
      const nickname = userProfile?.nickname || user.email?.split('@')[0] || '사용자';
      const { data, error } = await supabase.from("comments").insert({
        post_id: commentModal.id,
        user_id: user.id,
        content: newComment,
        author_nickname: nickname,
        parent_id: replyingTo?.id || null,
        image_url: imageUrl,
        is_anonymous: isAnonymousComment,
        ip_address: ipAddress,
      }).select().single();
      
      if (error) throw error;
      
      // 실시간 추가
      setComments(prev => [...prev, data]);
      setNewComment("");
      setCommentImages([]);
      setCommentImagePreviews([]);
      setReplyingTo(null);
      setIsAnonymousComment(false);
      
      // 댓글 수 증가
      await supabase.from("posts").update({ comment_count: (commentModal.comment_count || 0) + 1 }).eq("id", commentModal.id);
      setPosts(posts.map(p => p.id === commentModal.id ? { ...p, comment_count: (p.comment_count || 0) + 1 } : p));
      setCommentModal({ ...commentModal, comment_count: (commentModal.comment_count || 0) + 1 });
    } catch (error: any) {
      alert("댓글 작성 실패: " + error.message);
    }
  };

  // 공유 (링크 복사)
  const handleShare = async (post: any) => {
    const shareUrl = `${window.location.origin}/community/${post.id}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert('링크가 복사되었습니다');
    } catch {
      // fallback
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

  const openEditProfile = () => { setEditNickname(userProfile?.nickname || ''); setEditProfileModal(true); setProfileModal(null); };
  const canChangeNickname = () => {
    if (!userProfile) return true;
    const changedAt = userProfile.nickname_changed_at ? new Date(userProfile.nickname_changed_at) : null;
    if (!changedAt) return true;
    const daysDiff = Math.floor((Date.now() - changedAt.getTime()) / 86400000);
    return daysDiff >= 30 || (userProfile.nickname_change_count || 0) < 3;
  };
  const getNicknameChangeInfo = () => {
    if (!userProfile?.nickname_changed_at) return { remaining: 3, daysUntilReset: 0 };
    const daysDiff = Math.floor((Date.now() - new Date(userProfile.nickname_changed_at).getTime()) / 86400000);
    if (daysDiff >= 30) return { remaining: 3, daysUntilReset: 0 };
    return { remaining: Math.max(0, 3 - (userProfile.nickname_change_count || 0)), daysUntilReset: 30 - daysDiff };
  };
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !file.type.startsWith('image/')) return;
    setEditingProfile(true);
    try {
      const fileName = `avatars/${user.id}-${Date.now()}.${file.name.split('.').pop()}`;
      const response = await fetch(`${R2_WORKER_URL}/${fileName}`, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      const data = await response.json();
      await supabase.from("profiles").update({ avatar_url: data.url }).eq("email", user.email);
      setUserProfile({ ...userProfile, avatar_url: data.url });
    } catch (e: any) { alert("실패: " + e.message); }
    setEditingProfile(false);
  };
  const handleSaveNickname = async () => {
    if (!user || !editNickname.trim() || editNickname === userProfile?.nickname) { setEditProfileModal(false); return; }
    if (!canChangeNickname()) { alert("30일 동안 3회만 변경 가능"); return; }
    setEditingProfile(true);
    const now = new Date();
    const changedAt = userProfile?.nickname_changed_at ? new Date(userProfile.nickname_changed_at) : null;
    let newCount = changedAt && Math.floor((now.getTime() - changedAt.getTime()) / 86400000) < 30 ? (userProfile?.nickname_change_count || 0) + 1 : 1;
    await supabase.from("profiles").update({ nickname: editNickname, nickname_changed_at: now.toISOString(), nickname_change_count: newCount }).eq("email", user.email);
    setUserProfile({ ...userProfile, nickname: editNickname, nickname_changed_at: now.toISOString(), nickname_change_count: newCount });
    setEditProfileModal(false);
    setEditingProfile(false);
  };

  const formatDate = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const m = Math.floor(diff / 60000), h = Math.floor(diff / 3600000), dd = Math.floor(diff / 86400000);
    if (m < 60) return `${m}분 전`; if (h < 24) return `${h}시간 전`; if (dd < 7) return `${dd}일 전`;
    return new Date(d).toLocaleDateString("ko-KR");
  };
  const formatFullDate = (d: string) => new Date(d).toLocaleDateString("ko-KR", { year: 'numeric', month: 'long', day: 'numeric' });

  const getMediaItems = (post: any): {url: string, type: 'image' | 'video'}[] => {
    if (!post.images) return [];
    let urls = typeof post.images === 'string' ? JSON.parse(post.images) : post.images;
    return urls.map((url: string) => ({ url, type: /\.(mp4|mov|webm|avi)/i.test(url) ? 'video' : 'image' }));
  };

  const isAdmin = userProfile?.role === 'admin';
  const getAuthorName = (post: any) => isAdmin && post.is_anonymous ? `익명 (${post.author_nickname || '?'})` : post.is_anonymous ? '익명' : post.author_nickname || '알수없음';
  const canModify = (post: any) => (user && post.user_id === user.id) || isAdmin;

  const checkFollowStatus = async (targetUserId: string) => {
    if (!user) return false;
    const { data } = await supabase.from("follows").select("id").eq("follower_id", user.id).eq("following_id", targetUserId).single();
    return !!data;
  };
  const handleFollow = async () => {
    if (!user || !profileModal) return;
    setFollowLoading(true);
    if (isFollowing) {
      await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", profileModal.userId);
      setIsFollowing(false);
    } else {
      await supabase.from("follows").insert({ follower_id: user.id, following_id: profileModal.userId });
      setIsFollowing(true);
      const nickname = userProfile?.nickname || user.email?.split('@')[0] || '사용자';
      await supabase.from("notifications").insert({ user_id: profileModal.userId, type: 'follow', from_user_id: user.id, from_user_nickname: nickname, message: `${nickname}님이 팔로우합니다` });
    }
    setFollowLoading(false);
  };
  const handleProfileClick = async (post: any) => {
    if (post.is_anonymous && !isAdmin) { setReportModal({ postId: post.id, userId: post.user_id, isAnonymous: true }); return; }
    const { count: postCount } = await supabase.from("posts").select("*", { count: 'exact', head: true }).eq("user_id", post.user_id).eq("is_anonymous", false);
    const { count: followerCount } = await supabase.from("follows").select("*", { count: 'exact', head: true }).eq("following_id", post.user_id);
    const { count: followingCount } = await supabase.from("follows").select("*", { count: 'exact', head: true }).eq("follower_id", post.user_id);
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", post.user_id).single();
    setIsFollowing(await checkFollowStatus(post.user_id));
    setProfileModal({ nickname: post.author_nickname || '알수없음', postCount: postCount || 0, followerCount: followerCount || 0, followingCount: followingCount || 0, createdAt: profile?.created_at, avatarUrl: profile?.avatar_url, userId: post.user_id, isOwnProfile: user && post.user_id === user.id });
  };

  const openLightbox = (items: any[], idx: number) => { setLightboxImages(items.map(m => m.url)); setLightboxIndex(idx); };
  const closeLightbox = () => { setLightboxImages([]); setLightboxIndex(0); };
  const prevImage = () => setLightboxIndex(p => p === 0 ? lightboxImages.length - 1 : p - 1);
  const nextImage = () => setLightboxIndex(p => p === lightboxImages.length - 1 ? 0 : p + 1);
  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.targetTouches[0].clientX);
  const handleTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX);
  const handleTouchEnd = () => { if (touchStart - touchEnd > 75) nextImage(); if (touchStart - touchEnd < -75) prevImage(); };
  const isVideoUrl = (url: string) => /\.(mp4|mov|webm|avi)/i.test(url);

  // 댓글 컴포넌트
  const CommentItem = ({ comment, depth = 0 }: { comment: any, depth?: number }) => {
    const replies = comments.filter(c => c.parent_id === comment.id);
    const isExpanded = expandedComments.has(comment.id);
    const showReplies = expandedReplies.has(comment.id);
    const isLong = comment.content?.length > 150;
    
    // 댓글 작성자 이름 (관리자는 익명이어도 실제 닉네임 표시)
    const getCommentAuthor = () => {
      if (isAdmin && comment.is_anonymous) {
        return `익명 (${comment.author_nickname || '?'})`;
      }
      return comment.is_anonymous ? '익명' : comment.author_nickname;
    };

    return (
      <div className={`${depth > 0 ? 'ml-10 mt-2' : ''}`}>
        <div className="flex gap-3">
          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-gray-600 text-xs font-bold">{comment.is_anonymous ? '?' : comment.author_nickname?.[0]?.toUpperCase() || 'U'}</span>
          </div>
          <div className="flex-1">
            <div className="bg-gray-100 rounded-2xl px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900 text-sm">{getCommentAuthor()}</span>
                {comment.is_anonymous && <span className="text-xs text-gray-400 bg-gray-200 px-1 py-0.5 rounded">익명</span>}
              </div>
              {/* 관리자용 IP 표시 */}
              {isAdmin && comment.ip_address && (
                <span className="text-xs text-red-400">IP: {comment.ip_address}</span>
              )}
              <p className="text-gray-800 text-sm mt-0.5">
                {isLong && !isExpanded ? (
                  <>
                    {comment.content.slice(0, 150)}...
                    <button onClick={() => setExpandedComments(prev => new Set(prev).add(comment.id))} className="text-gray-500 ml-1">더보기</button>
                  </>
                ) : comment.content}
              </p>
              {comment.image_url && (
                <img src={comment.image_url} alt="" className="mt-2 max-w-[200px] rounded-lg cursor-pointer" onClick={() => openLightbox([{url: comment.image_url}], 0)} />
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 ml-2">
              <span className="text-xs text-gray-500">{formatDate(comment.created_at)}</span>
              {depth === 0 && (
                <button onClick={() => setReplyingTo(comment)} className="text-xs text-gray-500 font-medium hover:text-gray-700">답글 달기</button>
              )}
            </div>
            
            {/* 답글 보기 */}
            {replies.length > 0 && depth === 0 && (
              <button 
                onClick={() => setExpandedReplies(prev => {
                  const n = new Set(prev);
                  if (n.has(comment.id)) n.delete(comment.id);
                  else n.add(comment.id);
                  return n;
                })}
                className="text-sm text-gray-600 font-medium mt-2 ml-2 flex items-center gap-1"
              >
                <span className="w-8 h-px bg-gray-400"></span>
                {showReplies ? '답글 숨기기' : `답글 ${replies.length}개 보기`}
              </button>
            )}
            
            {/* 답글 목록 */}
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

  return (
    <div className="min-h-screen bg-gray-100 pb-24 md:pb-10" ref={mainRef}>
      {/* 라이트박스 */}
      {lightboxImages.length > 0 && (
        <div className="fixed inset-0 bg-black z-[100] flex items-center justify-center" onClick={closeLightbox}>
          <button className="absolute top-4 right-4 text-white text-4xl z-10" onClick={closeLightbox}>×</button>
          {lightboxImages.length > 1 && <div className="absolute top-4 left-4 text-white text-sm bg-black/50 px-3 py-1 rounded-full z-10">{lightboxIndex + 1} / {lightboxImages.length}</div>}
          <div className="w-full h-full flex items-center justify-center" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} onClick={(e) => e.stopPropagation()}>
            {isVideoUrl(lightboxImages[lightboxIndex]) ? <video src={lightboxImages[lightboxIndex]} controls autoPlay className="max-w-full max-h-full" onClick={(e) => e.stopPropagation()} /> : <img src={lightboxImages[lightboxIndex]} alt="" className="max-w-full max-h-full object-contain" onClick={closeLightbox} />}
          </div>
          {lightboxImages.length > 1 && (<>
            <button onClick={(e) => { e.stopPropagation(); prevImage(); }} className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-white"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
            <button onClick={(e) => { e.stopPropagation(); nextImage(); }} className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-white"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></button>
          </>)}
        </div>
      )}

      {/* 게시 확인 모달 */}
      {confirmPostModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={() => setConfirmPostModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <p className="text-center text-gray-900 font-medium mb-6">{isAnonymous ? '익명으로 게시물을 등록하시겠습니까?' : '게시물을 등록하시겠습니까?'}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmPostModal(false)} className="flex-1 py-3 bg-gray-200 text-gray-700 font-bold rounded-xl">취소</button>
              <button onClick={handlePost} className="flex-1 py-3 bg-amber-500 text-gray-900 font-bold rounded-xl">확인</button>
            </div>
          </div>
        </div>
      )}

      {/* 신고 모달 */}
      {reportModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={() => { setReportModal(null); setReportReason(""); }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-4">🚨 신고하기</h3>
            {reportModal.isAnonymous && <p className="text-sm text-gray-500 mb-3">익명 사용자를 신고합니다</p>}
            <textarea value={reportReason} onChange={(e) => setReportReason(e.target.value)} placeholder="신고 사유를 입력하세요" className="w-full h-24 p-3 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-red-500 mb-4" />
            <div className="flex gap-3">
              <button onClick={() => { setReportModal(null); setReportReason(""); }} className="flex-1 py-3 bg-gray-200 text-gray-700 font-bold rounded-xl">취소</button>
              <button onClick={handleReport} className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl">신고</button>
            </div>
          </div>
        </div>
      )}

      {/* 댓글 모달 */}
      {commentModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-end md:items-center justify-center" onClick={() => setCommentModal(null)}>
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">댓글 {commentModal.comment_count || 0}</h3>
              <button onClick={() => setCommentModal(null)} className="text-gray-500"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loadingComments ? (
                <div className="text-center py-4"><div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" /></div>
              ) : comments.filter(c => !c.parent_id).length === 0 ? (
                <p className="text-center text-gray-500 py-4">댓글이 없습니다</p>
              ) : (
                comments.filter(c => !c.parent_id).map((comment) => (
                  <CommentItem key={comment.id} comment={comment} />
                ))
              )}
            </div>
            
            {user && (
              <div className="p-4 border-t border-gray-100">
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
                      className="w-full pl-4 pr-24 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-amber-500" 
                      onKeyDown={(e) => e.key === 'Enter' && handleComment()} 
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-1 text-gray-500 hover:text-amber-500">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </button>
                      <input type="file" ref={commentImageRef} accept="image/*" className="hidden" onChange={handleCommentImageSelect} />
                      <button onClick={() => commentImageRef.current?.click()} className="p-1 text-gray-500 hover:text-amber-500">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      </button>
                    </div>
                    
                    {/* 이모지 피커 */}
                    {showEmojiPicker && (
                      <div className="absolute bottom-12 right-0 bg-white rounded-xl shadow-lg border p-2 grid grid-cols-10 gap-1 z-10">
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
                  
                  <button onClick={handleComment} disabled={!newComment.trim() && commentImages.length === 0} className="px-4 py-2 bg-amber-500 text-gray-900 font-bold rounded-full disabled:opacity-50">등록</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 글 수정 모달 */}
      {editingPost && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={() => setEditingPost(null)}>
          <div className="bg-white rounded-2xl p-4 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">게시글 수정</h3>
              <button onClick={() => setEditingPost(null)} className="text-gray-500"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} className="w-full h-40 p-3 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-amber-500" />
            <div className="flex gap-2 mt-4">
              <button onClick={() => setEditingPost(null)} className="flex-1 py-3 bg-gray-200 text-gray-700 font-bold rounded-xl">취소</button>
              <button onClick={handleEditSave} className="flex-1 py-3 bg-amber-500 text-gray-900 font-bold rounded-xl">수정</button>
            </div>
          </div>
        </div>
      )}

      {/* 프로필 수정 모달 */}
      {editProfileModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={() => setEditProfileModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-4">프로필 수정</h3>
            <div className="flex flex-col items-center mb-6">
              <div className="relative">
                <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center overflow-hidden">
                  {userProfile?.avatar_url ? <img src={userProfile.avatar_url} alt="" className="w-full h-full object-cover" /> : <span className="text-white text-3xl font-bold">{userProfile?.nickname?.[0]?.toUpperCase() || 'U'}</span>}
                </div>
                <button onClick={() => profileAvatarRef.current?.click()} className="absolute bottom-0 right-0 w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center shadow-lg">
                  <svg className="w-4 h-4 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </button>
                <input ref={profileAvatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">닉네임</label>
              <input type="text" value={editNickname} onChange={(e) => setEditNickname(e.target.value)} maxLength={20} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500" />
              {getNicknameChangeInfo() && <p className="text-xs text-gray-500 mt-1">{getNicknameChangeInfo()!.remaining > 0 ? `변경 가능: ${getNicknameChangeInfo()!.remaining}회` : `${getNicknameChangeInfo()!.daysUntilReset}일 후 리셋`}</p>}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditProfileModal(false)} className="flex-1 py-3 bg-gray-200 text-gray-700 font-bold rounded-xl">취소</button>
              <button onClick={handleSaveNickname} disabled={editingProfile} className="flex-1 py-3 bg-amber-500 text-gray-900 font-bold rounded-xl disabled:opacity-50">{editingProfile ? '저장 중...' : '저장'}</button>
            </div>
          </div>
        </div>
      )}

      {/* 프로필 모달 */}
      {profileModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={() => setProfileModal(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center overflow-hidden">
                {profileModal.avatarUrl ? <img src={profileModal.avatarUrl} alt="" className="w-full h-full object-cover" /> : <span className="text-white text-2xl font-bold">{profileModal.nickname?.[0]?.toUpperCase() || 'U'}</span>}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900">{profileModal.nickname}</h3>
                {profileModal.createdAt && <p className="text-sm text-gray-500">가입일: {formatFullDate(profileModal.createdAt)}</p>}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-gray-100 rounded-xl p-3 text-center"><p className="text-xl font-bold text-gray-900">{profileModal.postCount}</p><p className="text-xs text-gray-500">게시글</p></div>
              <div className="bg-gray-100 rounded-xl p-3 text-center"><p className="text-xl font-bold text-gray-900">{profileModal.followerCount}</p><p className="text-xs text-gray-500">팔로워</p></div>
              <div className="bg-gray-100 rounded-xl p-3 text-center"><p className="text-xl font-bold text-gray-900">{profileModal.followingCount}</p><p className="text-xs text-gray-500">팔로잉</p></div>
            </div>
            {profileModal.isOwnProfile ? <button onClick={openEditProfile} className="w-full py-3 bg-amber-500 text-gray-900 font-bold rounded-xl mb-3">프로필 수정</button> : user && profileModal.userId !== user.id && <button onClick={handleFollow} disabled={followLoading} className={`w-full py-3 font-bold rounded-xl mb-3 ${isFollowing ? 'bg-gray-200 text-gray-700' : 'bg-amber-500 text-gray-900'}`}>{followLoading ? '처리 중...' : isFollowing ? '팔로잉' : '팔로우'}</button>}
            <button onClick={() => setProfileModal(null)} className="w-full py-3 bg-gray-900 text-white font-bold rounded-xl">닫기</button>
          </div>
        </div>
      )}

      {/* 헤더 - 클릭 시 최상단 */}
      <header className="bg-gray-900 sticky top-0 z-50 cursor-pointer" onClick={scrollToTop}>
        <div className="max-w-[631px] mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-white" onClick={(e) => e.stopPropagation()}><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></Link>
            <h1 className="text-white font-bold text-lg">커뮤니티</h1>
          </div>
          {user && <Link href="/notifications" className="relative text-gray-400 hover:text-white" onClick={(e) => e.stopPropagation()}><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>{unreadCount > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">{unreadCount > 9 ? '9+' : unreadCount}</span>}</Link>}
        </div>
      </header>

      <main className="max-w-[631px] mx-auto px-4 py-4">
        {/* 글쓰기 영역 - 미니멀 */}
        {user && (
          <div ref={writeBoxRef} className="bg-white rounded-xl shadow-md mb-4 overflow-hidden">
            {!isWriting ? (
              /* 축소 상태 */
              <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={() => setIsWriting(true)}>
                <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {userProfile?.avatar_url ? <img src={userProfile.avatar_url} alt="" className="w-full h-full object-cover" /> : <span className="text-gray-900 font-bold text-sm">{userProfile?.nickname?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}</span>}
                </div>
                <div className="flex-1 bg-gray-100 rounded-full px-4 py-2.5">
                  <span className="text-gray-500">무슨 생각을 하고 계신가요?</span>
                </div>
              </div>
            ) : (
              /* 확장 상태 */
              <div className="p-4">
                <div className="flex gap-3">
                  <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {userProfile?.avatar_url ? <img src={userProfile.avatar_url} alt="" className="w-full h-full object-cover" /> : <span className="text-gray-900 font-bold text-sm">{userProfile?.nickname?.[0]?.toUpperCase() || "U"}</span>}
                  </div>
                  <div className="flex-1">
                    <textarea 
                      value={content} 
                      onChange={(e) => setContent(e.target.value)} 
                      placeholder="무슨 생각을 하고 계신가요?" 
                      rows={3} 
                      className="w-full resize-none border-0 focus:outline-none focus:ring-0 text-gray-900 placeholder-gray-400"
                      autoFocus
                      disabled={posting}
                    />
                    
                    {/* 링크 미리보기 */}
                    {writingLinkPreview && (
                      <div className="mt-2 rounded-xl overflow-hidden border border-gray-200 relative">
                        {writingLinkPreview.image && (
                          <img src={writingLinkPreview.image} alt="" className="w-full h-40 object-cover" />
                        )}
                        <div className="p-3 bg-gray-50">
                          <p className="font-medium text-gray-900 text-sm line-clamp-2">{writingLinkPreview.title}</p>
                          {writingLinkPreview.description && <p className="text-xs text-gray-500 line-clamp-2 mt-1">{writingLinkPreview.description}</p>}
                          <p className="text-xs text-gray-400 mt-1">{writingLinkPreview.domain}</p>
                        </div>
                        <button onClick={() => setWritingLinkPreview(null)} className="absolute top-2 right-2 w-6 h-6 bg-black/50 text-white rounded-full text-sm">✕</button>
                      </div>
                    )}
                    
                    {loadingLinkPreview && (
                      <div className="mt-2 p-3 bg-gray-100 rounded-xl flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm text-gray-500">링크 미리보기 로딩 중...</span>
                      </div>
                    )}
                    
                    {/* 미디어 프리뷰 */}
                    {mediaPreviews.length > 0 && (
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {mediaPreviews.map((preview, index) => (
                          <div key={index} className="relative">
                            {preview.type === 'video' ? (
                              <div className="w-20 h-20 bg-gray-900 rounded-lg relative overflow-hidden">
                                <video src={preview.url} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                </div>
                              </div>
                            ) : (
                              <img src={preview.url} alt="" className="w-20 h-20 object-cover rounded-lg" />
                            )}
                            <button onClick={() => removeMedia(index)} disabled={posting} className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs">✕</button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 업로드 진행바 */}
                    {posting && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                          <span className="truncate">{totalFiles > 0 ? `${currentFileIndex}/${totalFiles} 업로드 중...` : '처리 중...'}</span>
                          <span className="font-bold">{uploadProgress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-amber-500 h-2 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* 하단 툴바 */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-1">
                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*,video/*" multiple className="hidden" disabled={posting} />
                    <button onClick={() => fileInputRef.current?.click()} disabled={posting} className="p-2 text-gray-500 hover:text-amber-500 hover:bg-gray-100 rounded-lg disabled:opacity-50">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input type="checkbox" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} disabled={posting} className="w-4 h-4 rounded border-gray-300 text-amber-500 focus:ring-amber-500" />
                      <span className="text-sm text-gray-600">익명</span>
                    </label>
                    <button onClick={handlePostClick} disabled={posting || (!content.trim() && mediaFiles.length === 0)} className="px-5 py-2 bg-amber-500 text-gray-900 font-bold rounded-full disabled:opacity-50">
                      {posting ? "업로드 중..." : "게시"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {!user && (
          <div className="bg-white rounded-xl shadow-md p-4 mb-4 text-center">
            <span className="text-gray-500">로그인하고 글을 작성하세요</span>
            <Link href="/login" className="text-amber-600 font-bold ml-2">로그인</Link>
          </div>
        )}

        {/* 게시글 목록 */}
        {loading ? <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div></div> : posts.length === 0 ? <div className="text-center py-20 bg-white rounded-xl shadow-md"><p className="text-gray-500">게시글이 없습니다</p></div> : (
          <div className="space-y-4">
            {posts.map((post) => {
              const isExpanded = expandedPosts.has(post.id);
              const mediaItems = getMediaItems(post);
              const isLongText = post.content?.length > 100;
              const needsExpand = isLongText || mediaItems.length > 1;
              const links = extractLinks(post.content || '');
              const firstLink = links[0];
              const youtubeId = firstLink ? getYoutubeId(firstLink) : null;
              const youtubeThumbnail = firstLink ? getYoutubeThumbnail(firstLink) : null;
              const linkPreview = postLinkPreviews.get(post.id);
              const isPlaying = playingVideo === post.id;

              return (
                <div key={post.id} ref={(el) => { if (el) postRefs.current.set(post.id, el); }} data-post-id={post.id} className="bg-white rounded-xl shadow-md overflow-hidden">
                  {/* 헤더 */}
                  <div className="flex items-center gap-2 p-4 pb-0">
                    <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center overflow-hidden cursor-pointer hover:ring-2 hover:ring-amber-500" onClick={() => handleProfileClick(post)}>
                      <span className="text-white text-sm font-bold">{post.is_anonymous ? '?' : (post.author_nickname?.[0]?.toUpperCase() || 'U')}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 text-sm cursor-pointer hover:text-amber-600" onClick={() => handleProfileClick(post)}>{getAuthorName(post)}</span>
                        {post.is_anonymous && <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">익명</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">{formatDate(post.created_at)}</span>
                        {isAdmin && post.ip_address && <span className="text-xs text-red-400">IP: {post.ip_address}</span>}
                      </div>
                    </div>
                    
                    <div className="relative">
                      <button type="button" onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === post.id ? null : post.id); }} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" /></svg>
                      </button>
                      {menuOpenId === post.id && (
                        <div className="absolute right-0 top-10 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 min-w-[140px]">
                          {canModify(post) && (<>
                            <button onClick={(e) => { e.stopPropagation(); handleEditStart(post); }} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>수정</button>
                            <button onClick={(e) => { e.stopPropagation(); handleDelete(post.id); }} className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>삭제</button>
                          </>)}
                          <button onClick={(e) => { e.stopPropagation(); setMenuOpenId(null); setReportModal({ postId: post.id, userId: post.user_id }); }} className="w-full px-4 py-2 text-left text-sm text-orange-600 hover:bg-orange-50 flex items-center gap-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>신고</button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 텍스트 */}
                  <div className="px-4 py-3 cursor-pointer" onClick={() => needsExpand && togglePost(post.id)}>
                    {isLongText && !isExpanded ? <p className="text-gray-900 whitespace-pre-wrap">{post.content.slice(0, 100)}...<span className="text-amber-600 text-sm ml-1 font-medium">더 보기</span></p> : <p className="text-gray-900 whitespace-pre-wrap">{post.content}</p>}
                  </div>

                  {/* 유튜브 - 꽉 차게 */}
                  {youtubeId && (
                    <div className="w-full">
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
                        <div className="relative w-full cursor-pointer" onClick={() => setPlayingVideo(post.id)}>
                          <img src={youtubeThumbnail!} alt="" className="w-full aspect-video object-cover" />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors">
                            <YoutubeLogo />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 일반 링크 프리뷰 - 큰 이미지 */}
                  {!youtubeId && linkPreview && (
                    <div className="cursor-pointer" onClick={() => openLink(firstLink)}>
                      {linkPreview.image && (
                        <img src={linkPreview.image} alt="" className="w-full h-52 object-cover" />
                      )}
                      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                        <p className="text-xs text-gray-500 uppercase">{linkPreview.domain}</p>
                        <p className="font-semibold text-gray-900 mt-1 line-clamp-2">{linkPreview.title}</p>
                        {linkPreview.description && <p className="text-sm text-gray-600 mt-1 line-clamp-2">{linkPreview.description}</p>}
                      </div>
                    </div>
                  )}

                  {/* 미디어 */}
                  {mediaItems.length > 0 && (
                    <div>
                      {!isExpanded ? (
                        <div className={`cursor-pointer ${mediaItems.length === 1 ? '' : 'grid grid-cols-2 gap-[2px]'}`} onClick={() => mediaItems.length > 1 ? togglePost(post.id) : openLightbox(mediaItems, 0)}>
                          {mediaItems.slice(0, 4).map((item, idx) => (
                            <div key={idx} className={`relative overflow-hidden ${mediaItems.length === 3 && idx === 0 ? 'row-span-2' : ''}`}>
                              {item.type === 'video' ? <div className="relative"><video src={item.url} className={`w-full object-cover ${mediaItems.length === 1 ? 'max-h-[500px]' : 'h-48'}`} /><div className="absolute inset-0 flex items-center justify-center bg-black/20"><div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center"><svg className="w-6 h-6 text-gray-900 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg></div></div></div> : <img src={item.url} alt="" className={`w-full object-cover ${mediaItems.length === 1 ? 'max-h-[500px]' : 'h-48'}`} />}
                              {idx === 3 && mediaItems.length > 4 && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><span className="text-white text-2xl font-bold">+{mediaItems.length - 4}</span></div>}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div>{mediaItems.map((item, idx) => <div key={idx} className="cursor-pointer" onClick={() => openLightbox(mediaItems, idx)}>{item.type === 'video' ? <video src={item.url} controls className="w-full" onClick={(e) => e.stopPropagation()} /> : <img src={item.url} alt="" className="w-full" />}</div>)}</div>
                      )}
                    </div>
                  )}

                  {isExpanded && needsExpand && <div className="px-4 py-2 text-center"><button onClick={() => togglePost(post.id)} className="text-amber-600 text-sm font-medium">접기</button></div>}

                  {/* 하단 버튼 */}
                  <div className="flex items-center px-4 py-3 border-t border-gray-100">
                    <button onClick={() => handleLike(post)} className={`flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors ${post.liked ? 'text-blue-500' : 'text-gray-500'}`}>
                      <svg className="w-6 h-6" fill={post.liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" /></svg>
                      <span className="font-medium">{post.like_count || 0}</span>
                    </button>
                    <button onClick={() => openComments(post)} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                      <span className="font-medium">{post.comment_count || 0}</span>
                    </button>
                    <button onClick={() => handleShare(post)} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 ml-auto">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                      <span className="font-medium">공유</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 하단 네비게이션 */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 z-50">
        <div className="flex">
          <Link href="/" className="flex-1 py-3 flex flex-col items-center gap-1"><svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg><span className="text-xs text-gray-500">홈</span></Link>
          <Link href="/community" className="flex-1 py-3 flex flex-col items-center gap-1"><svg className="w-6 h-6 text-amber-500" fill="currentColor" viewBox="0 0 24 24"><path d="M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg><span className="text-xs font-bold text-amber-500">커뮤니티</span></Link>
          <Link href="/market" className="flex-1 py-3 flex flex-col items-center gap-1"><svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg><span className="text-xs text-gray-500">마켓</span></Link>
          <Link href="/videos" className="flex-1 py-3 flex flex-col items-center gap-1"><svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg><span className="text-xs text-gray-500">영상</span></Link>
          <Link href="/mypage" className="flex-1 py-3 flex flex-col items-center gap-1"><svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg><span className="text-xs text-gray-500">MY</span></Link>
        </div>
      </nav>
    </div>
  );
}
