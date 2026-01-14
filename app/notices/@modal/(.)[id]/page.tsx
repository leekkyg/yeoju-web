"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
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

export default function NoticeModalPage() {
  const params = useParams();
  const router = useRouter();
  const { theme, isDark, mounted } = useTheme();
  const [notice, setNotice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [prevNotice, setPrevNotice] = useState<any>(null);
  const [nextNotice, setNextNotice] = useState<any>(null);
  
  // 댓글
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const replyInputRef = useRef<HTMLInputElement>(null);
  
  // 라이트박스
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  
  // 바텀시트 상태
  const [isClosing, setIsClosing] = useState(false);
  
  // ✅ 수정 모드
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

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    fetchNotice();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      setUser(user);
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("*").eq("email", user.email).single();
        setUserProfile(profile);
      }
    });
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [params.id]);

  const fetchNotice = async () => {
    setLoading(true);
    const id = Number(params.id);
    
    const { data } = await supabase
      .from("notices")
      .select("*")
      .eq("id", id)
      .single();
    
    if (data) {
      setNotice(data);
      
      await supabase
        .from("notices")
        .update({ view_count: (data.view_count || 0) + 1 })
        .eq("id", id);
      
      const { data: prev } = await supabase
        .from("notices")
        .select("id, title")
        .lt("id", id)
        .order("id", { ascending: false })
        .limit(1)
        .single();
      setPrevNotice(prev);
      
      const { data: next } = await supabase
        .from("notices")
        .select("id, title")
        .gt("id", id)
        .order("id", { ascending: true })
        .limit(1)
        .single();
      setNextNotice(next);
      
      fetchComments(id);
    }
    
    setLoading(false);
  };

  const fetchComments = async (noticeId: number) => {
    const { data } = await supabase
      .from("notice_comments")
      .select("*")
      .eq("notice_id", noticeId)
      .order("created_at", { ascending: true });
    
    if (data) {
      const rootComments: Comment[] = [];
      const commentMap = new Map<number, Comment>();
      
      data.forEach(comment => {
        commentMap.set(comment.id, { ...comment, replies: [] });
      });
      
      data.forEach(comment => {
        const c = commentMap.get(comment.id)!;
        if (comment.parent_id) {
          const parent = commentMap.get(comment.parent_id);
          if (parent) {
            parent.replies = parent.replies || [];
            parent.replies.push(c);
          }
        } else {
          rootComments.push(c);
        }
      });
      
      setComments(rootComments);
    }
  };

  // ✅ 모달 안에서 다른 글 불러오기 (페이지 전환 없이)
  const loadNotice = async (id: number) => {
    setLoading(true);
    
    const { data } = await supabase
      .from("notices")
      .select("*")
      .eq("id", id)
      .single();
    
    if (data) {
      setNotice(data);
      
      // 조회수 증가
      await supabase
        .from("notices")
        .update({ view_count: (data.view_count || 0) + 1 })
        .eq("id", id);
      
      // 이전글
      const { data: prev } = await supabase
        .from("notices")
        .select("id, title")
        .lt("id", id)
        .order("id", { ascending: false })
        .limit(1)
        .single();
      setPrevNotice(prev);
      
      // 다음글
      const { data: next } = await supabase
        .from("notices")
        .select("id, title")
        .gt("id", id)
        .order("id", { ascending: true })
        .limit(1)
        .single();
      setNextNotice(next);
      
      // 댓글
      fetchComments(id);
      
      // URL 업데이트 (히스토리 변경 없이)
      window.history.replaceState(null, '', `/notices/${id}`);
    }
    
    setLoading(false);
  };

  const formatDate = (d: string) => {
    return new Date(d).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCommentDate = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return "방금 전";
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;
    return date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
  };

  const handleDelete = async () => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    await supabase.from("notices").delete().eq("id", notice.id);
    handleClose();
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      router.back();
    }, 300);
  };

  // ✅ 수정 모드 진입
  const enterEditMode = () => {
    setEditTitle(notice.title);
    setEditContent(notice.content || "");
    setEditIsPinned(notice.is_pinned || false);
    setExistingImages(notice.images || []);
    setNewMediaFiles([]);
    setNewMediaPreviews([]);
    setIsEditMode(true);
  };

  // ✅ 수정 모드 취소
  const cancelEditMode = () => {
    setIsEditMode(false);
    setNewMediaFiles([]);
    setNewMediaPreviews([]);
  };

  // ✅ 파일 선택
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      if (file.size > 100 * 1024 * 1024) { alert(`${file.name}: 100MB 이하만`); continue; }
      const totalCount = existingImages.length + newMediaFiles.length + 1;
      if (totalCount > 10) { alert("최대 10개"); break; }
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

  const removeExistingImage = (index: number) => {
    setExistingImages(existingImages.filter((_, i) => i !== index));
  };

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

  // ✅ 수정 저장
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

      const { error } = await supabase
        .from("notices")
        .update({
          title: editTitle.trim(),
          content: editContent.trim(),
          is_pinned: editIsPinned,
          images: allImages,
          updated_at: new Date().toISOString(),
        })
        .eq("id", notice.id);

      if (error) throw error;
      
      // 수정 완료 후 다시 불러오기
      setIsEditMode(false);
      fetchNotice();
    } catch (error: any) {
      alert("저장 실패: " + error.message);
    }
    setSaving(false);
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim() || !user) return;
    
    setSubmittingComment(true);
    try {
      const { error } = await supabase.from("notice_comments").insert({
        notice_id: notice.id,
        user_id: user.id,
        content: commentText.trim(),
        author_nickname: userProfile?.nickname || user.email?.split("@")[0] || "익명",
        author_profile_image: userProfile?.profile_image || null,
      });
      
      if (!error) {
        setCommentText("");
        fetchComments(notice.id);
      }
    } catch (e) {
      console.error(e);
    }
    setSubmittingComment(false);
  };

  const handleSubmitReply = async () => {
    if (!replyText.trim() || !user || !replyTo) return;
    
    setSubmittingComment(true);
    try {
      const { error } = await supabase.from("notice_comments").insert({
        notice_id: notice.id,
        user_id: user.id,
        parent_id: replyTo.id,
        content: replyText.trim(),
        author_nickname: userProfile?.nickname || user.email?.split("@")[0] || "익명",
        author_profile_image: userProfile?.profile_image || null,
      });
      
      if (!error) {
        setReplyText("");
        setReplyTo(null);
        fetchComments(notice.id);
      }
    } catch (e) {
      console.error(e);
    }
    setSubmittingComment(false);
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!confirm("댓글을 삭제하시겠습니까?")) return;
    await supabase.from("notice_comments").delete().eq("id", commentId);
    fetchComments(notice.id);
  };

  const renderContent = (content: string) => {
    if (!content) return null;
    
    const parts = content.split(/(\[youtube:[^\]]+\]|\[link:[^\]]+\])/g);
    
    return parts.map((part, index) => {
      const youtubeMatch = part.match(/\[youtube:([^\]]+)\]/);
      if (youtubeMatch) {
        const videoId = youtubeMatch[1];
        return (
          <div key={index} className="my-4 aspect-video rounded-xl overflow-hidden bg-black">
            <iframe
              src={`https://www.youtube.com/embed/${videoId}`}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        );
      }
      
      const linkMatch = part.match(/\[link:([^|]+)\|([^\]]+)\]/);
      if (linkMatch) {
        const [, url, text] = linkMatch;
        return (
          <a
            key={index}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:underline"
            style={{ color: theme.accent }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            {text}
          </a>
        );
      }
      
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const textParts = part.split(urlRegex);
      
      return textParts.map((textPart, textIndex) => {
        if (urlRegex.test(textPart)) {
          return (
            <a
              key={`${index}-${textIndex}`}
              href={textPart}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline break-all"
              style={{ color: theme.accent }}
            >
              {textPart}
            </a>
          );
        }
        return <span key={`${index}-${textIndex}`}>{textPart}</span>;
      });
    });
  };

  const renderComment = (comment: Comment, isReply = false) => {
    const isOwner = user?.id === comment.user_id;
    
    return (
      <div key={comment.id} className={`${isReply ? 'ml-10 mt-3' : 'py-4'}`}>
        <div className="flex gap-3">
          <div 
            className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden"
            style={{ backgroundColor: theme.accent }}
          >
            {comment.author_profile_image ? (
              <img src={comment.author_profile_image} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-bold" style={{ color: isDark ? '#121212' : '#fff' }}>
                {comment.author_nickname?.charAt(0) || "?"}
              </span>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm" style={{ color: theme.textPrimary }}>
                {comment.author_nickname}
              </span>
              <span className="text-xs" style={{ color: theme.textMuted }}>
                {formatCommentDate(comment.created_at)}
              </span>
            </div>
            <p className="text-sm mt-1" style={{ color: theme.textSecondary }}>
              {comment.content}
            </p>
            <div className="flex items-center gap-3 mt-2">
              {!isReply && (
                <button 
                  onClick={() => {
                    setReplyTo(comment);
                    setTimeout(() => replyInputRef.current?.focus(), 100);
                  }}
                  className="text-xs"
                  style={{ color: theme.textMuted }}
                >
                  답글
                </button>
              )}
              {isOwner && (
                <button 
                  onClick={() => handleDeleteComment(comment.id)}
                  className="text-xs"
                  style={{ color: theme.red }}
                >
                  삭제
                </button>
              )}
            </div>
          </div>
        </div>
        
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-3">
            {comment.replies.map(reply => renderComment(reply, true))}
          </div>
        )}
        
        {replyTo?.id === comment.id && (
          <div className="ml-10 mt-3 flex gap-2">
            <input
              ref={replyInputRef}
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmitReply()}
              placeholder={`${comment.author_nickname}에게 답글...`}
              className="flex-1 px-3 py-2 rounded-lg text-sm focus:outline-none"
              style={{ backgroundColor: theme.bgInput, color: theme.textPrimary }}
            />
            <button
              onClick={handleSubmitReply}
              disabled={!replyText.trim() || submittingComment}
              className="px-3 py-2 rounded-lg text-sm font-bold disabled:opacity-50"
              style={{ backgroundColor: theme.accent, color: isDark ? '#121212' : '#fff' }}
            >
              등록
            </button>
            <button
              onClick={() => { setReplyTo(null); setReplyText(""); }}
              className="px-2 py-2 text-sm"
              style={{ color: theme.textMuted }}
            >
              취소
            </button>
          </div>
        )}
      </div>
    );
  };

  const isAdmin = userProfile?.role === "admin";
  const images = notice?.images || [];
  const totalComments = comments.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0);

  if (!mounted) return null;

  return (
    <>
      {/* 라이트박스 */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 bg-black z-[200] flex items-center justify-center"
          onClick={() => setLightboxImage(null)}
        >
          <button className="absolute top-4 right-4 text-white text-4xl z-10">×</button>
          <img src={lightboxImage} alt="" className="max-w-full max-h-full object-contain" />
        </div>
      )}

      {/* 바텀시트 오버레이 */}
      <div className="fixed inset-0 z-[100] flex items-end justify-center">
        {/* 배경 */}
        <div 
          className={`absolute inset-0 bg-black transition-opacity duration-300 ease-out ${isClosing ? 'opacity-0' : 'opacity-60'}`}
          onClick={handleClose}
        />
        
        {/* 바텀시트 */}
        <div 
          className={`relative w-full max-w-[640px] rounded-t-3xl flex flex-col transition-transform duration-300 ease-out ${isClosing ? 'translate-y-full' : 'translate-y-0'}`}
          style={{ 
            backgroundColor: theme.bgCard, 
            maxHeight: '95vh',
            height: '95vh',
            animation: !isClosing ? 'slideUp 0.3s ease-out' : undefined
          }}
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
              <button onClick={isEditMode ? cancelEditMode : handleClose} style={{ color: theme.textSecondary }}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <h1 className="font-bold text-lg" style={{ color: theme.textPrimary }}>
                {isEditMode ? "공지사항 수정" : "공지사항"}
              </h1>
            </div>
            {isAdmin && notice && !isEditMode && (
              <div className="flex items-center gap-3">
                <button onClick={enterEditMode} className="text-sm" style={{ color: theme.accent }}>
                  수정
                </button>
                <button onClick={handleDelete} className="text-sm" style={{ color: theme.red }}>
                  삭제
                </button>
              </div>
            )}
            {isEditMode && (
              <button
                onClick={handleSaveEdit}
                disabled={saving || !editTitle.trim()}
                className="px-4 py-1.5 font-bold text-sm rounded-full disabled:opacity-50"
                style={{ backgroundColor: theme.accent, color: isDark ? '#121212' : '#fff' }}
              >
                {saving ? `${uploadProgress}%` : "저장"}
              </button>
            )}
          </div>

          {/* 로딩 */}
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: theme.accent }} />
            </div>
          ) : !notice ? (
            <div className="flex-1 flex items-center justify-center">
              <p style={{ color: theme.textMuted }}>공지사항을 찾을 수 없습니다</p>
            </div>
          ) : isEditMode ? (
            /* ========== 수정 모드 ========== */
            <div className="flex-1 overflow-y-auto">
              {/* 중요 공지 체크 */}
              <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: theme.border }}>
                <span className="font-medium" style={{ color: theme.textPrimary }}>📌 중요 공지 (상단 고정)</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={editIsPinned} onChange={(e) => setEditIsPinned(e.target.checked)} className="sr-only peer" />
                  <div className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:rounded-full after:h-5 after:w-5 after:transition-all"
                    style={{ 
                      backgroundColor: editIsPinned ? theme.accent : theme.border,
                    }}
                  >
                    <div className="absolute top-[2px] left-[2px] w-5 h-5 bg-white rounded-full transition-transform" style={{ transform: editIsPinned ? 'translateX(20px)' : 'translateX(0)' }} />
                  </div>
                </label>
              </div>

              {/* 제목 */}
              <div className="px-4 py-3 border-b" style={{ borderColor: theme.border }}>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="제목을 입력하세요"
                  maxLength={100}
                  className="w-full text-lg font-bold focus:outline-none"
                  style={{ backgroundColor: 'transparent', color: theme.textPrimary }}
                />
              </div>

              {/* 툴바 */}
              <div className="px-4 py-2 border-b flex items-center gap-2" style={{ borderColor: theme.border }}>
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*,video/*" multiple className="hidden" />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm"
                  style={{ backgroundColor: theme.bgInput, color: theme.textSecondary }}
                >
                  📷 사진/동영상
                </button>
              </div>

              {/* 기존 이미지 */}
              {existingImages.length > 0 && (
                <div className="px-4 py-3 border-b" style={{ borderColor: theme.border }}>
                  <p className="text-xs mb-2" style={{ color: theme.textMuted }}>기존 이미지</p>
                  <div className="flex gap-2 flex-wrap">
                    {existingImages.map((url, index) => (
                      <div key={index} className="relative">
                        <img src={url} alt="" className="w-20 h-20 object-cover rounded-lg" />
                        <button 
                          onClick={() => removeExistingImage(index)} 
                          className="absolute -top-2 -right-2 w-6 h-6 rounded-full text-white text-sm font-bold"
                          style={{ backgroundColor: theme.red }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 새 미디어 프리뷰 */}
              {newMediaPreviews.length > 0 && (
                <div className="px-4 py-3 border-b" style={{ borderColor: theme.border }}>
                  <p className="text-xs mb-2" style={{ color: theme.textMuted }}>새로 추가</p>
                  <div className="flex gap-2 flex-wrap">
                    {newMediaPreviews.map((preview, index) => (
                      <div key={index} className="relative">
                        {preview.type === 'video' ? (
                          <div className="w-20 h-20 bg-gray-900 rounded-lg flex items-center justify-center">
                            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                          </div>
                        ) : (
                          <img src={preview.url} alt="" className="w-20 h-20 object-cover rounded-lg" />
                        )}
                        <button 
                          onClick={() => removeNewMedia(index)} 
                          className="absolute -top-2 -right-2 w-6 h-6 rounded-full text-white text-sm font-bold"
                          style={{ backgroundColor: theme.red }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 내용 */}
              <div className="px-4 py-3">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="내용을 입력하세요"
                  rows={15}
                  className="w-full focus:outline-none resize-none leading-relaxed"
                  style={{ backgroundColor: 'transparent', color: theme.textPrimary }}
                />
              </div>
            </div>
          ) : (
            /* ========== 보기 모드 ========== */
            <>
              {/* 스크롤 영역 */}
              <div className="flex-1 overflow-y-auto">
                {/* 제목 영역 */}
                <div className="px-4 py-5 border-b" style={{ borderColor: theme.border }}>
                  {notice.is_pinned && (
                    <div className="flex items-center gap-2 mb-3">
                      <span 
                        className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded"
                        style={{ backgroundColor: theme.accent, color: isDark ? '#121212' : '#fff' }}
                      >
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
                        </svg>
                        중요
                      </span>
                    </div>
                  )}
                  <h1 className="text-xl font-bold leading-tight" style={{ color: theme.textPrimary }}>{notice.title}</h1>
                  <div className="flex items-center gap-3 mt-4 text-sm" style={{ color: theme.textMuted }}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: theme.accent }}
                      >
                        <span className="text-xs font-bold" style={{ color: isDark ? '#121212' : '#fff' }}>관</span>
                      </div>
                      <span className="font-medium" style={{ color: theme.textSecondary }}>{notice.author_nickname || "관리자"}</span>
                    </div>
                    <span style={{ color: theme.border }}>|</span>
                    <span>{formatDate(notice.created_at)}</span>
                    <span style={{ color: theme.border }}>|</span>
                    <span>조회 {notice.view_count || 0}</span>
                  </div>
                </div>

                {/* 본문 */}
                <div className="px-4 py-6 border-b" style={{ borderColor: theme.border }}>
                  {images.length > 0 && (
                    <div className="mb-6 space-y-3">
                      {images.map((img: string, idx: number) => (
                        <img 
                          key={idx} 
                          src={img} 
                          alt="" 
                          className="w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setLightboxImage(img)}
                        />
                      ))}
                    </div>
                  )}
                  
                  <div className="whitespace-pre-wrap leading-relaxed" style={{ color: theme.textSecondary }}>
                    {renderContent(notice.content)}
                  </div>
                </div>

                {/* 이전글/다음글 */}
                <div className="border-b" style={{ borderColor: theme.border }}>
                  {nextNotice && (
                    <button
                      onClick={() => loadNotice(nextNotice.id)}
                      className="flex items-center px-4 py-3 border-b w-full text-left"
                      style={{ borderColor: theme.border }}
                    >
                      <div className="flex items-center gap-2 w-20 flex-shrink-0">
                        <svg className="w-4 h-4" style={{ color: theme.textMuted }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                        <span className="text-sm" style={{ color: theme.textMuted }}>다음글</span>
                      </div>
                      <span className="truncate" style={{ color: theme.textPrimary }}>{nextNotice.title}</span>
                    </button>
                  )}
                  {prevNotice && (
                    <button
                      onClick={() => loadNotice(prevNotice.id)}
                      className="flex items-center px-4 py-3 w-full text-left"
                    >
                      <div className="flex items-center gap-2 w-20 flex-shrink-0">
                        <svg className="w-4 h-4" style={{ color: theme.textMuted }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                        <span className="text-sm" style={{ color: theme.textMuted }}>이전글</span>
                      </div>
                      <span className="truncate" style={{ color: theme.textPrimary }}>{prevNotice.title}</span>
                    </button>
                  )}
                </div>

                {/* 댓글 영역 */}
                <div className="px-4 py-4">
                  <div className="flex items-center gap-2 mb-4">
                    <svg className="w-5 h-5" style={{ color: theme.textPrimary }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span className="font-bold" style={{ color: theme.textPrimary }}>댓글</span>
                    <span style={{ color: theme.accent }}>{totalComments}</span>
                  </div>

                  {comments.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-sm" style={{ color: theme.textMuted }}>첫 댓글을 남겨보세요!</p>
                    </div>
                  ) : (
                    <div className="divide-y" style={{ borderColor: theme.border }}>
                      {comments.map(comment => renderComment(comment))}
                    </div>
                  )}
                </div>
              </div>

              {/* 댓글 입력 */}
              <div className="px-4 py-3 border-t" style={{ borderColor: theme.border, backgroundColor: theme.bgCard }}>
                {user ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSubmitComment()}
                      placeholder="댓글을 입력하세요..."
                      className="flex-1 px-4 py-3 rounded-xl text-sm focus:outline-none"
                      style={{ backgroundColor: theme.bgInput, color: theme.textPrimary }}
                    />
                    <button
                      onClick={handleSubmitComment}
                      disabled={!commentText.trim() || submittingComment}
                      className="px-4 py-3 rounded-xl font-bold text-sm disabled:opacity-50"
                      style={{ backgroundColor: theme.accent, color: isDark ? '#121212' : '#fff' }}
                    >
                      등록
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => router.push("/login")}
                    className="block w-full py-3 text-center rounded-xl"
                    style={{ backgroundColor: theme.bgInput, color: theme.textMuted }}
                  >
                    로그인하고 댓글 작성하기
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
