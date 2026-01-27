"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/contexts/ThemeContext";

const R2_WORKER_URL = "https://yeoju-r2-worker.kkyg9300.workers.dev";

interface Comment {
  id: number;
  notice_id: number;
  user_id: string;
  parent_id: number | null;
  content: string;
  author_nickname: string;
  author_profile_image: string | null;
  created_at: string;
  replies?: Comment[];
}

function NoticesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme, isDark, mounted } = useTheme();
  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);

  // ✅ 바텀시트 (상세보기)
  const [selectedNotice, setSelectedNotice] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isSheetClosing, setIsSheetClosing] = useState(false);
  const [prevNotice, setPrevNotice] = useState<any>(null);
  const [nextNotice, setNextNotice] = useState<any>(null);
  
  // 댓글
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const replyInputRef = useRef<HTMLInputElement>(null);
  
  // 수정 모드
  const [isEditMode, setIsEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editIsPinned, setEditIsPinned] = useState(false);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newMediaFiles, setNewMediaFiles] = useState<File[]>([]);
  const [newMediaPreviews, setNewMediaPreviews] = useState<{url: string, type: 'image' | 'video'}[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 라이트박스
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  
  // ✅ URL 파라미터로 자동 열기 처리 완료 여부
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  useEffect(() => {
    fetchNotices();
    supabase.auth.getSession().then(async ({ data: { session } }) => { const user = session?.user;
      setUser(user);
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("*").eq("email", user.email).single();
        setUserProfile(profile);
      }
    });
  }, []);

  // ✅ URL 파라미터로 공지 자동 열기 (링크 공유 시)
  useEffect(() => {
    if (!loading && !initialLoadDone) {
      const noticeId = searchParams.get('id');
if (noticeId) {
  const id = parseInt(noticeId);
  if (!isNaN(id)) {  // ← NaN 체크 추가
    openNotice(id);
  }
}
      setInitialLoadDone(true);
    }
  }, [loading, searchParams, initialLoadDone]);

  const fetchNotices = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("notices")
      .select("*")
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });
    setNotices(data || []);
    setLoading(false);
  };

  // ✅ 글 선택 → 바텀시트 열기
  const openNotice = async (noticeId: number) => {
    setDetailLoading(true);
    setIsSheetOpen(true);
    document.body.style.overflow = 'hidden';
    
    // URL 변경 (히스토리에 추가)
    window.history.pushState({ noticeId }, '', `/notices/${noticeId}`);
    
    await loadNoticeData(noticeId);
    setDetailLoading(false);
  };

  // ✅ 공지 데이터 불러오기
  const loadNoticeData = async (noticeId: number) => {
    const { data } = await supabase
      .from("notices")
      .select("*")
      .eq("id", noticeId)
      .single();
    
    if (data) {
      setSelectedNotice(data);
      
      // 조회수 증가
      await supabase
        .from("notices")
        .update({ view_count: (data.view_count || 0) + 1 })
        .eq("id", noticeId);
      
      // 이전글
      const { data: prev } = await supabase
        .from("notices")
        .select("id, title")
        .lt("id", noticeId)
        .order("id", { ascending: false })
        .limit(1)
        .single();
      setPrevNotice(prev);
      
      // 다음글
      const { data: next } = await supabase
        .from("notices")
        .select("id, title")
        .gt("id", noticeId)
        .order("id", { ascending: true })
        .limit(1)
        .single();
      setNextNotice(next);
      
      // 댓글
      fetchComments(noticeId);
    }
  };

  // ✅ 이전글/다음글 로드 (모달 유지)
  const navigateToNotice = async (noticeId: number) => {
    setDetailLoading(true);
    window.history.replaceState({ noticeId }, '', `/notices/${noticeId}`);
    await loadNoticeData(noticeId);
    setDetailLoading(false);
  };

  // ✅ 바텀시트 닫기
  const closeSheet = () => {
    setIsSheetClosing(true);
    setTimeout(() => {
      setIsSheetOpen(false);
      setIsSheetClosing(false);
      setSelectedNotice(null);
      setIsEditMode(false);
      setComments([]);
      document.body.style.overflow = 'unset';
      window.history.pushState({}, '', '/notices');
    }, 300);
  };

  // 브라우저 뒤로가기 처리
  useEffect(() => {
    const handlePopState = () => {
      if (isSheetOpen) {
        setIsSheetClosing(true);
        setTimeout(() => {
          setIsSheetOpen(false);
          setIsSheetClosing(false);
          setSelectedNotice(null);
          document.body.style.overflow = 'unset';
        }, 300);
      }
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isSheetOpen]);

  const fetchComments = async (noticeId: number) => {
    const { data } = await supabase
      .from("notice_comments")
      .select("*")
      .eq("notice_id", noticeId)
      .order("created_at", { ascending: true });
    
    if (data) {
      const rootComments: Comment[] = [];
      const commentMap = new Map<number, Comment>();
      data.forEach(comment => commentMap.set(comment.id, { ...comment, replies: [] }));
      data.forEach(comment => {
        const c = commentMap.get(comment.id)!;
        if (comment.parent_id) {
          const parent = commentMap.get(comment.parent_id);
          if (parent) { parent.replies = parent.replies || []; parent.replies.push(c); }
        } else { rootComments.push(c); }
      });
      setComments(rootComments);
    }
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / 86400000);
    
    if (days === 0) return date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
    if (days < 7) return `${days}일 전`;
    return date.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\. /g, '.').replace('.', '');
  };

  const formatFullDate = (d: string) => {
    return new Date(d).toLocaleDateString("ko-KR", {
      year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  };

  const formatCommentDate = (d: string) => {
    const date = new Date(d);
    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 1) return "방금 전";
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;
    return date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
  };

  const isNew = (d: string) => Date.now() - new Date(d).getTime() < 3 * 24 * 60 * 60 * 1000;
  const hasAttachments = (notice: any) => (notice.images?.length || 0) + (notice.attachments?.length || 0) > 0;

  // 수정 모드
  const enterEditMode = () => {
    setEditTitle(selectedNotice.title);
    setEditContent(selectedNotice.content || "");
    setEditIsPinned(selectedNotice.is_pinned || false);
    setExistingImages(selectedNotice.images || []);
    setNewMediaFiles([]);
    setNewMediaPreviews([]);
    setIsEditMode(true);
  };

  const cancelEditMode = () => {
    setIsEditMode(false);
    setNewMediaFiles([]);
    setNewMediaPreviews([]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      if (file.size > 100 * 1024 * 1024) { alert(`${file.name}: 100MB 이하만`); continue; }
      if (existingImages.length + newMediaFiles.length + 1 > 10) { alert("최대 10개"); break; }
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');
      if (!isVideo && !isImage) continue;
      setNewMediaFiles(prev => [...prev, file]);
      const reader = new FileReader();
      reader.onload = (e) => setNewMediaPreviews(prev => [...prev, { url: e.target?.result as string, type: isVideo ? 'video' : 'image' }]);
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeExistingImage = (index: number) => setExistingImages(existingImages.filter((_, i) => i !== index));
  const removeNewMedia = (index: number) => {
    setNewMediaFiles(newMediaFiles.filter((_, i) => i !== index));
    setNewMediaPreviews(newMediaPreviews.filter((_, i) => i !== index));
  };

  const uploadFile = async (file: File): Promise<string> => {
    const ext = file.name.split('.').pop();
    const fileName = `notices/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
    const response = await fetch(`${R2_WORKER_URL}/${fileName}`, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
    const data = await response.json();
    return data.url;
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) { alert("제목을 입력하세요"); return; }
    setSaving(true);
    try {
      const newUrls: string[] = [];
      for (let i = 0; i < newMediaFiles.length; i++) {
        setUploadProgress(Math.round(((i + 1) / newMediaFiles.length) * 100));
        const url = await uploadFile(newMediaFiles[i]);
        newUrls.push(url);
      }
      const allImages = [...existingImages, ...newUrls];
      const { error } = await supabase.from("notices").update({
        title: editTitle.trim(), content: editContent.trim(), is_pinned: editIsPinned,
        images: allImages, updated_at: new Date().toISOString(),
      }).eq("id", selectedNotice.id);
      if (error) throw error;
      setIsEditMode(false);
      await loadNoticeData(selectedNotice.id);
      fetchNotices(); // 목록도 갱신
    } catch (error: any) {
      alert("저장 실패: " + error.message);
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    await supabase.from("notices").delete().eq("id", selectedNotice.id);
    closeSheet();
    fetchNotices();
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim() || !user) return;
    setSubmittingComment(true);
    const { error } = await supabase.from("notice_comments").insert({
      notice_id: selectedNotice.id, user_id: user.id, content: commentText.trim(),
      author_nickname: userProfile?.nickname || user.email?.split("@")[0] || "익명",
      author_profile_image: userProfile?.profile_image || null,
    });
    if (!error) { setCommentText(""); fetchComments(selectedNotice.id); }
    setSubmittingComment(false);
  };

  const handleSubmitReply = async () => {
    if (!replyText.trim() || !user || !replyTo) return;
    setSubmittingComment(true);
    const { error } = await supabase.from("notice_comments").insert({
      notice_id: selectedNotice.id, user_id: user.id, parent_id: replyTo.id, content: replyText.trim(),
      author_nickname: userProfile?.nickname || user.email?.split("@")[0] || "익명",
      author_profile_image: userProfile?.profile_image || null,
    });
    if (!error) { setReplyText(""); setReplyTo(null); fetchComments(selectedNotice.id); }
    setSubmittingComment(false);
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!confirm("댓글을 삭제하시겠습니까?")) return;
    await supabase.from("notice_comments").delete().eq("id", commentId);
    fetchComments(selectedNotice.id);
  };

  const renderContent = (content: string) => {
    if (!content) return null;
    const parts = content.split(/(\[youtube:[^\]]+\]|\[link:[^\]]+\])/g);
    return parts.map((part, index) => {
      const youtubeMatch = part.match(/\[youtube:([^\]]+)\]/);
      if (youtubeMatch) {
        return (
          <div key={index} className="my-4 aspect-video rounded-xl overflow-hidden bg-black">
            <iframe src={`https://www.youtube.com/embed/${youtubeMatch[1]}`} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
          </div>
        );
      }
      const linkMatch = part.match(/\[link:([^|]+)\|([^\]]+)\]/);
      if (linkMatch) {
        return <a key={index} href={linkMatch[1]} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:underline" style={{ color: theme.accent }}><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>{linkMatch[2]}</a>;
      }
      return <span key={index}>{part}</span>;
    });
  };

  const renderComment = (comment: Comment, isReply = false) => {
    const isOwner = user?.id === comment.user_id;
    return (
      <div key={comment.id} className={isReply ? 'ml-10 mt-3' : 'py-4'}>
        <div className="flex gap-3">
          <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden" style={{ backgroundColor: theme.accent }}>
            {comment.author_profile_image ? <img src={comment.author_profile_image} className="w-full h-full object-cover" /> : <span className="text-xs font-bold" style={{ color: isDark ? '#121212' : '#fff' }}>{comment.author_nickname?.charAt(0)}</span>}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm" style={{ color: theme.textPrimary }}>{comment.author_nickname}</span>
              <span className="text-xs" style={{ color: theme.textMuted }}>{formatCommentDate(comment.created_at)}</span>
            </div>
            <p className="text-sm mt-1" style={{ color: theme.textSecondary }}>{comment.content}</p>
            <div className="flex items-center gap-3 mt-2">
              {!isReply && <button onClick={() => { setReplyTo(comment); setTimeout(() => replyInputRef.current?.focus(), 100); }} className="text-xs" style={{ color: theme.textMuted }}>답글</button>}
              {isOwner && <button onClick={() => handleDeleteComment(comment.id)} className="text-xs" style={{ color: theme.red }}>삭제</button>}
            </div>
          </div>
        </div>
        {comment.replies?.map(reply => renderComment(reply, true))}
        {replyTo?.id === comment.id && (
          <div className="ml-10 mt-3 flex gap-2">
            <input ref={replyInputRef} type="text" value={replyText} onChange={(e) => setReplyText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSubmitReply()} placeholder={`${comment.author_nickname}에게 답글...`} className="flex-1 px-3 py-2 rounded-lg text-sm focus:outline-none" style={{ backgroundColor: theme.bgInput, color: theme.textPrimary }} />
            <button onClick={handleSubmitReply} disabled={!replyText.trim() || submittingComment} className="px-3 py-2 rounded-lg text-sm font-bold disabled:opacity-50" style={{ backgroundColor: theme.accent, color: isDark ? '#121212' : '#fff' }}>등록</button>
            <button onClick={() => { setReplyTo(null); setReplyText(""); }} className="px-2 py-2 text-sm" style={{ color: theme.textMuted }}>취소</button>
          </div>
        )}
      </div>
    );
  };

  const isAdmin = userProfile?.role === "admin";
  const pinnedNotices = notices.filter(n => n.is_pinned);
  const normalNotices = notices.filter(n => !n.is_pinned);
  const images = selectedNotice?.images || [];
  const totalComments = comments.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 md:pb-10" style={{ backgroundColor: theme.bgMain }}>
      {/* 라이트박스 */}
      {lightboxImage && (
        <div className="fixed inset-0 bg-black z-[200] flex items-center justify-center" onClick={() => setLightboxImage(null)}>
          <button className="absolute top-4 right-4 text-white text-4xl z-10">×</button>
          <img src={lightboxImage} className="max-w-full max-h-full object-contain" />
        </div>
      )}

      {/* 헤더 */}
      <header className="sticky top-0 z-50 border-b" style={{ backgroundColor: theme.bgCard, borderColor: theme.border }}>
        <div className="max-w-[640px] mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" style={{ color: theme.textSecondary }}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="font-bold text-lg" style={{ color: theme.textPrimary }}>공지사항</h1>
          </div>
          {isAdmin && (
            <Link href="/notices/write" className="px-4 py-1.5 font-bold text-sm rounded-full" style={{ backgroundColor: theme.accent, color: isDark ? '#121212' : '#fff' }}>
              글쓰기
            </Link>
          )}
        </div>
      </header>

      <main className="max-w-[640px] mx-auto pt-4">
        <div className="px-4 mb-3 flex items-center justify-between">
          <span className="text-sm" style={{ color: theme.textMuted }}>총 {notices.length}개의 공지</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: theme.accent }} />
          </div>
        ) : notices.length === 0 ? (
          <div className="text-center py-20 mx-4 rounded-2xl" style={{ backgroundColor: theme.bgCard }}>
            <svg className="w-16 h-16 mx-auto mb-4" style={{ color: theme.textMuted }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p style={{ color: theme.textMuted }}>공지사항이 없습니다</p>
          </div>
        ) : (
          <div className="mx-4 space-y-4">
              {/* 고정 공지 */}
               {pinnedNotices.length > 0 && (
                <div className="rounded-2xl overflow-hidden border" style={{ borderColor: theme.accent, backgroundColor: theme.bgCard }}>
                <div className="px-4 py-2 flex items-center gap-2 border-b" style={{ borderColor: theme.border }}>
                <svg className="w-4 h-4" style={{ color: theme.accent }} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
                  </svg>
                  <span className="text-sm font-bold" style={{ color: theme.accent }}>중요 공지</span>
                </div>
                {pinnedNotices.map((notice, index) => (
                  <button
                    key={notice.id}
                    onClick={() => openNotice(notice.id)}
                    className="flex items-start px-4 py-4 w-full text-left transition-colors"
                    style={{ borderTop: index > 0 ? `1px solid ${theme.border}` : 'none' }}
                  >
                    <div className="w-10 flex-shrink-0">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: theme.accent }}>
                        <svg className="w-4 h-4" style={{ color: isDark ? '#121212' : '#fff' }} fill="currentColor" viewBox="0 0 24 24">
                          <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold truncate" style={{ color: theme.accent }}>{notice.title}</h3>
                        {hasAttachments(notice) && <svg className="w-4 h-4 flex-shrink-0" style={{ color: theme.textMuted }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs" style={{ color: theme.textMuted }}>{formatDate(notice.created_at)}</span>
                        <span className="text-xs" style={{ color: theme.border }}>·</span>
                        <span className="text-xs" style={{ color: theme.textMuted }}>조회 {notice.view_count || 0}</span>
                      </div>
                    </div>
                    <svg className="w-5 h-5 flex-shrink-0 ml-2 mt-1" style={{ color: theme.accent }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
              </div>
            )}

            {/* 일반 공지 */}
            {normalNotices.length > 0 && (
              <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: theme.bgCard }}>
                {normalNotices.map((notice, index) => (
                  <button
                    key={notice.id}
                    onClick={() => openNotice(notice.id)}
                    className="flex items-start px-4 py-4 w-full text-left transition-colors"
                    style={{ borderTop: index > 0 ? `1px solid ${theme.border}` : 'none', backgroundColor: index % 2 === 0 ? theme.bgCard : isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}
                  >
                    <div className="w-10 flex-shrink-0">
                      <span className="text-sm font-medium inline-flex items-center justify-center w-7 h-7 rounded-full" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', color: theme.textMuted }}>
                        {normalNotices.length - index}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isNew(notice.created_at) && <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: theme.accent, color: isDark ? '#121212' : '#fff' }}>NEW</span>}
                        <h3 className="truncate" style={{ color: theme.textPrimary }}>{notice.title}</h3>
                        {hasAttachments(notice) && <svg className="w-4 h-4 flex-shrink-0" style={{ color: theme.textMuted }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs" style={{ color: theme.textMuted }}>{formatDate(notice.created_at)}</span>
                        <span className="text-xs" style={{ color: theme.border }}>·</span>
                        <span className="text-xs" style={{ color: theme.textMuted }}>조회 {notice.view_count || 0}</span>
                      </div>
                    </div>
                    <svg className="w-5 h-5 flex-shrink-0 ml-2 mt-1" style={{ color: theme.textMuted }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ========== 바텀시트 ========== */}
      {isSheetOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center">
          <div 
            className={`absolute inset-0 bg-black transition-opacity duration-300 ${isSheetClosing ? 'opacity-0' : 'opacity-60'}`}
            onClick={closeSheet}
          />
          
          <div 
            className={`relative w-full max-w-[640px] rounded-t-3xl flex flex-col transition-transform duration-300 ease-out ${isSheetClosing ? 'translate-y-full' : 'translate-y-0'}`}
            style={{ backgroundColor: theme.bgCard, maxHeight: '95vh', height: '95vh', animation: !isSheetClosing ? 'slideUp 0.3s ease-out' : undefined }}
          >
            <style jsx>{`
              @keyframes slideUp {
                from { transform: translateY(100%); }
                to { transform: translateY(0); }
              }
            `}</style>

            {/* 드래그 핸들 */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full" style={{ backgroundColor: theme.border }} />
            </div>

            {/* 헤더 */}
            <div className="px-4 pb-3 flex items-center justify-between border-b" style={{ borderColor: theme.border }}>
              <div className="flex items-center gap-3">
                <button onClick={isEditMode ? cancelEditMode : closeSheet} style={{ color: theme.textSecondary }}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <h1 className="font-bold text-lg" style={{ color: theme.textPrimary }}>{isEditMode ? "공지사항 수정" : "공지사항"}</h1>
              </div>
              {isAdmin && selectedNotice && !isEditMode && (
                <div className="flex items-center gap-3">
                  <button onClick={enterEditMode} className="text-sm" style={{ color: theme.accent }}>수정</button>
                  <button onClick={handleDelete} className="text-sm" style={{ color: theme.red }}>삭제</button>
                </div>
              )}
              {isEditMode && (
                <button onClick={handleSaveEdit} disabled={saving || !editTitle.trim()} className="px-4 py-1.5 font-bold text-sm rounded-full disabled:opacity-50" style={{ backgroundColor: theme.accent, color: isDark ? '#121212' : '#fff' }}>
                  {saving ? `${uploadProgress}%` : "저장"}
                </button>
              )}
            </div>

            {/* 로딩 */}
            {detailLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: theme.accent }} />
              </div>
            ) : isEditMode ? (
              /* 수정 모드 */
              <div className="flex-1 overflow-y-auto">
                <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: theme.border }}>
                  <span className="font-medium" style={{ color: theme.textPrimary }}>📌 중요 공지</span>
                  <div className="relative w-11 h-6 cursor-pointer" onClick={() => setEditIsPinned(!editIsPinned)}>
                    <div className="w-full h-full rounded-full transition-colors" style={{ backgroundColor: editIsPinned ? theme.accent : theme.border }} />
                    <div className="absolute top-[2px] left-[2px] w-5 h-5 bg-white rounded-full transition-transform" style={{ transform: editIsPinned ? 'translateX(20px)' : 'translateX(0)' }} />
                  </div>
                </div>
                <div className="px-4 py-3 border-b" style={{ borderColor: theme.border }}>
                  <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="제목을 입력하세요" maxLength={100} className="w-full text-lg font-bold focus:outline-none" style={{ backgroundColor: 'transparent', color: theme.textPrimary }} />
                </div>
                <div className="px-4 py-2 border-b flex items-center gap-2" style={{ borderColor: theme.border }}>
                  <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*,video/*" multiple className="hidden" />
                  <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm" style={{ backgroundColor: theme.bgInput, color: theme.textSecondary }}>📷 사진/동영상</button>
                </div>
                {existingImages.length > 0 && (
                  <div className="px-4 py-3 border-b" style={{ borderColor: theme.border }}>
                    <p className="text-xs mb-2" style={{ color: theme.textMuted }}>기존 이미지</p>
                    <div className="flex gap-2 flex-wrap">
                      {existingImages.map((url, index) => (
                        <div key={index} className="relative">
                          <img src={url} className="w-20 h-20 object-cover rounded-lg" />
                          <button onClick={() => removeExistingImage(index)} className="absolute -top-2 -right-2 w-6 h-6 rounded-full text-white text-sm font-bold" style={{ backgroundColor: theme.red }}>✕</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {newMediaPreviews.length > 0 && (
                  <div className="px-4 py-3 border-b" style={{ borderColor: theme.border }}>
                    <p className="text-xs mb-2" style={{ color: theme.textMuted }}>새로 추가</p>
                    <div className="flex gap-2 flex-wrap">
                      {newMediaPreviews.map((preview, index) => (
                        <div key={index} className="relative">
                          {preview.type === 'video' ? <div className="w-20 h-20 bg-gray-900 rounded-lg flex items-center justify-center"><svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg></div> : <img src={preview.url} className="w-20 h-20 object-cover rounded-lg" />}
                          <button onClick={() => removeNewMedia(index)} className="absolute -top-2 -right-2 w-6 h-6 rounded-full text-white text-sm font-bold" style={{ backgroundColor: theme.red }}>✕</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="px-4 py-3">
                  <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} placeholder="내용을 입력하세요" rows={15} className="w-full focus:outline-none resize-none leading-relaxed" style={{ backgroundColor: 'transparent', color: theme.textPrimary }} />
                </div>
              </div>
            ) : selectedNotice && (
              /* 보기 모드 */
              <>
                <div className="flex-1 overflow-y-auto">
                  <div className="px-4 py-5 border-b" style={{ borderColor: theme.border }}>
                    {selectedNotice.is_pinned && (
                      <div className="flex items-center gap-2 mb-3">
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded" style={{ backgroundColor: theme.accent, color: isDark ? '#121212' : '#fff' }}>
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" /></svg>
                          중요
                        </span>
                      </div>
                    )}
                    <h1 className="text-xl font-bold leading-tight" style={{ color: theme.textPrimary }}>{selectedNotice.title}</h1>
                    <div className="flex items-center gap-3 mt-4 text-sm" style={{ color: theme.textMuted }}>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.accent }}>
                          <span className="text-xs font-bold" style={{ color: isDark ? '#121212' : '#fff' }}>관</span>
                        </div>
                        <span className="font-medium" style={{ color: theme.textSecondary }}>{selectedNotice.author_nickname || "관리자"}</span>
                      </div>
                      <span style={{ color: theme.border }}>|</span>
                      <span>{formatFullDate(selectedNotice.created_at)}</span>
                      <span style={{ color: theme.border }}>|</span>
                      <span>조회 {selectedNotice.view_count || 0}</span>
                    </div>
                  </div>

                  <div className="px-4 py-6 border-b" style={{ borderColor: theme.border }}>
                    {images.length > 0 && (
                      <div className="mb-6 space-y-3">
                        {images.map((img: string, idx: number) => (
                          <img key={idx} src={img} className="w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity" onClick={() => setLightboxImage(img)} />
                        ))}
                      </div>
                    )}
                    <div className="whitespace-pre-wrap leading-relaxed" style={{ color: theme.textSecondary }}>{renderContent(selectedNotice.content)}</div>
                  </div>

                  <div className="border-b" style={{ borderColor: theme.border }}>
                    {nextNotice && (
                      <button onClick={() => navigateToNotice(nextNotice.id)} className="flex items-center px-4 py-3 border-b w-full text-left" style={{ borderColor: theme.border }}>
                        <div className="flex items-center gap-2 w-20 flex-shrink-0">
                          <svg className="w-4 h-4" style={{ color: theme.textMuted }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                          <span className="text-sm" style={{ color: theme.textMuted }}>다음글</span>
                        </div>
                        <span className="truncate" style={{ color: theme.textPrimary }}>{nextNotice.title}</span>
                      </button>
                    )}
                    {prevNotice && (
                      <button onClick={() => navigateToNotice(prevNotice.id)} className="flex items-center px-4 py-3 w-full text-left">
                        <div className="flex items-center gap-2 w-20 flex-shrink-0">
                          <svg className="w-4 h-4" style={{ color: theme.textMuted }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                          <span className="text-sm" style={{ color: theme.textMuted }}>이전글</span>
                        </div>
                        <span className="truncate" style={{ color: theme.textPrimary }}>{prevNotice.title}</span>
                      </button>
                    )}
                  </div>

                  <div className="px-4 py-4">
                    <div className="flex items-center gap-2 mb-4">
                      <svg className="w-5 h-5" style={{ color: theme.textPrimary }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                      <span className="font-bold" style={{ color: theme.textPrimary }}>댓글</span>
                      <span style={{ color: theme.accent }}>{totalComments}</span>
                    </div>
                    {comments.length === 0 ? (
                      <div className="text-center py-8"><p className="text-sm" style={{ color: theme.textMuted }}>첫 댓글을 남겨보세요!</p></div>
                    ) : (
                      <div className="divide-y" style={{ borderColor: theme.border }}>{comments.map(comment => renderComment(comment))}</div>
                    )}
                  </div>
                </div>

                <div className="px-4 py-3 border-t" style={{ borderColor: theme.border, backgroundColor: theme.bgCard }}>
                  {user ? (
                    <div className="flex gap-2">
                      <input type="text" value={commentText} onChange={(e) => setCommentText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSubmitComment()} placeholder="댓글을 입력하세요..." className="flex-1 px-4 py-3 rounded-xl text-sm focus:outline-none" style={{ backgroundColor: theme.bgInput, color: theme.textPrimary }} />
                      <button onClick={handleSubmitComment} disabled={!commentText.trim() || submittingComment} className="px-4 py-3 rounded-xl font-bold text-sm disabled:opacity-50" style={{ backgroundColor: theme.accent, color: isDark ? '#121212' : '#fff' }}>등록</button>
                    </div>
                  ) : (
                    <button onClick={() => router.push("/login")} className="block w-full py-3 text-center rounded-xl" style={{ backgroundColor: theme.bgInput, color: theme.textMuted }}>로그인하고 댓글 작성하기</button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 하단 네비게이션 */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t z-50" style={{ backgroundColor: theme.bgCard, borderColor: theme.border }}>
        <div className="flex">
          <Link href="/" className="flex-1 py-3 flex flex-col items-center gap-1"><svg className="w-6 h-6" style={{ color: theme.textMuted }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg><span className="text-xs" style={{ color: theme.textMuted }}>홈</span></Link>
          <Link href="/community" className="flex-1 py-3 flex flex-col items-center gap-1"><svg className="w-6 h-6" style={{ color: theme.textMuted }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg><span className="text-xs" style={{ color: theme.textMuted }}>커뮤니티</span></Link>
          <Link href="/market" className="flex-1 py-3 flex flex-col items-center gap-1"><svg className="w-6 h-6" style={{ color: theme.textMuted }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg><span className="text-xs" style={{ color: theme.textMuted }}>마켓</span></Link>
          <Link href="/videos" className="flex-1 py-3 flex flex-col items-center gap-1"><svg className="w-6 h-6" style={{ color: theme.textMuted }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg><span className="text-xs" style={{ color: theme.textMuted }}>영상</span></Link>
          <Link href="/mypage" className="flex-1 py-3 flex flex-col items-center gap-1"><svg className="w-6 h-6" style={{ color: theme.textMuted }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg><span className="text-xs" style={{ color: theme.textMuted }}>MY</span></Link>
        </div>
      </nav>
    </div>
  );
}

// Suspense로 감싸서 useSearchParams 사용 가능하게
export default function NoticesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#121212' }}>
        <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#d4af37' }} />
      </div>
    }>
      <NoticesPageContent />
    </Suspense>
  );
}
