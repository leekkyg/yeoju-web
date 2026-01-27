"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/contexts/ThemeContext";
import {
  X,
  Image,
  Youtube,
  Link2,
  Pin,
  Bell,
  Smartphone,
  Plus,
  Play,
  Info,
} from "lucide-react";

const R2_WORKER_URL = "https://yeoju-r2-worker.kkyg9300.workers.dev";

export default function NoticeWritePage() {
  const router = useRouter();
  const { theme, isDark, mounted } = useTheme();
  
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // 알림 설정
  const [sendInApp, setSendInApp] = useState(false);
  const [sendPush, setSendPush] = useState(false);
  
  // 미디어
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<{url: string, type: 'image' | 'video'}[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 유튜브
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [showYoutubeInput, setShowYoutubeInput] = useState(false);
  
  // 링크
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [links, setLinks] = useState<{url: string, text: string}[]>([]);
  
  const contentRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => { const user = session?.user;
      setUser(user);
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("*").eq("email", user.email).single();
        setUserProfile(profile);
        
        if (profile?.role !== "admin") {
          alert("관리자만 공지사항을 작성할 수 있습니다");
          router.push("/notices");
        }
      } else {
        alert("로그인이 필요합니다");
        router.push("/login");
      }
    });
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      if (file.size > 100 * 1024 * 1024) { alert(`${file.name}: 100MB 초과`); continue; }
      if (mediaFiles.length + 1 > 10) { alert("최대 10개까지"); break; }
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

  const uploadFile = async (file: File): Promise<string> => {
    const ext = file.name.split('.').pop();
    const fileName = `notices/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
    const response = await fetch(`${R2_WORKER_URL}/${fileName}`, { method: 'PUT', body: file, headers: { 'Content-Type': file.type || 'application/octet-stream' } });
    const data = await response.json();
    return data.url;
  };

  const getYoutubeId = (url: string): string | null => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([^&\s?]+)/);
    return match ? match[1] : null;
  };

  const addYoutubeLink = () => {
    if (!youtubeUrl.trim()) return;
    const youtubeId = getYoutubeId(youtubeUrl);
    if (!youtubeId) {
      alert("올바른 유튜브 URL을 입력해주세요");
      return;
    }
    setContent(prev => prev + `\n[youtube:${youtubeId}]\n`);
    setYoutubeUrl("");
    setShowYoutubeInput(false);
  };

  const addLink = () => {
    if (!linkUrl.trim()) return;
    const text = linkText.trim() || linkUrl;
    setLinks(prev => [...prev, { url: linkUrl, text }]);
    setContent(prev => prev + `\n[link:${linkUrl}|${text}]\n`);
    setLinkUrl("");
    setLinkText("");
    setShowLinkInput(false);
  };

  const sendInAppNotifications = async (noticeId: number) => {
    try {
      const { data: users } = await supabase.from("profiles").select("id");
      if (!users || users.length === 0) return;

      const notifications = users.map(u => ({
        user_id: u.id,
        type: "notice",
        message: `📢 새 공지사항: ${title}`,
        notice_id: noticeId,
        is_read: false,
      }));

      const batchSize = 500;
      for (let i = 0; i < notifications.length; i += batchSize) {
        const batch = notifications.slice(i, i + batchSize);
        await supabase.from("notifications").insert(batch);
      }
    } catch (error) {
      console.error("인앱 알림 전송 오류:", error);
    }
  };

  const sendPushNotifications = async (noticeId: number) => {
    try {
      const response = await fetch("/api/push-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "새 공지사항이 등록되었습니다",
          message: title,
          url: `/notices/${noticeId}`,
        }),
      });

      if (!response.ok) {
        console.error("푸시 알림 전송 실패");
      }
    } catch (error) {
      console.error("푸시 알림 전송 오류:", error);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) { alert("제목을 입력해주세요"); return; }
    if (!content.trim() && mediaFiles.length === 0) { alert("내용을 입력해주세요"); return; }

    setSaving(true);
    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < mediaFiles.length; i++) {
        setUploadProgress(Math.round(((i + 1) / mediaFiles.length) * 100));
        const url = await uploadFile(mediaFiles[i]);
        uploadedUrls.push(url);
      }

      const nickname = userProfile?.nickname || user.email?.split("@")[0] || "관리자";
      const { data: newNotice, error } = await supabase.from("notices").insert({
        title: title.trim(),
        content: content.trim(),
        author_nickname: nickname,
        user_id: user.id,
        is_pinned: isPinned,
        images: uploadedUrls,
      }).select().single();

      if (error) throw error;

      if (newNotice) {
        if (sendInApp) await sendInAppNotifications(newNotice.id);
        if (sendPush) await sendPushNotifications(newNotice.id);
      }

      router.push("/notices");
    } catch (error: any) {
      alert("오류 발생: " + error.message);
    }
    setSaving(false);
  };

  const isAdmin = userProfile?.role === "admin";

  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
    <button
      onClick={() => onChange(!checked)}
      className="relative w-14 h-8 rounded-full transition-all duration-300"
      style={{ 
        backgroundColor: checked ? theme.accent : (isDark ? '#3a3a3a' : '#d1d5db'),
        border: `2px solid ${checked ? theme.accent : (isDark ? '#4a4a4a' : '#9ca3af')}`
      }}
    >
      <div
        className="absolute top-1 w-5 h-5 rounded-full shadow-md transition-all duration-300"
        style={{ 
          backgroundColor: '#FFFFFF',
          left: checked ? '30px' : '4px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }}
      />
      <span 
        className="absolute text-[10px] font-bold transition-opacity duration-300"
        style={{ 
          color: checked ? (isDark ? '#121212' : '#FFFFFF') : (isDark ? '#888' : '#6b7280'),
          left: checked ? '6px' : 'auto',
          right: checked ? 'auto' : '6px',
          top: '50%',
          transform: 'translateY(-50%)'
        }}
      >
        {checked ? 'ON' : 'OFF'}
      </span>
    </button>
  );

  if (!mounted || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.bgMain }}>
        <div className="w-10 h-10 border-2 rounded-full animate-spin" style={{ borderColor: theme.border, borderTopColor: theme.accent }}></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-10 transition-colors duration-300" style={{ backgroundColor: theme.bgMain }}>
      {/* 헤더 */}
      <header className="sticky top-0 z-50" style={{ backgroundColor: theme.bgElevated, borderBottom: `1px solid ${theme.borderLight}` }}>
        <div className="max-w-[640px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-1 -ml-1 rounded-lg" style={{ color: theme.textPrimary }}>
              <X className="w-6 h-6" strokeWidth={1.5} />
            </button>
            <h1 className="font-bold text-lg" style={{ color: theme.textPrimary }}>공지사항 작성</h1>
          </div>
          <button
            onClick={handleSubmit}
            disabled={saving || !title.trim()}
            className="px-4 py-1.5 rounded-full text-sm font-semibold disabled:opacity-50"
            style={{ backgroundColor: theme.accent, color: isDark ? '#121212' : '#FFF' }}
          >
            {saving ? `${uploadProgress}%` : "등록"}
          </button>
        </div>
      </header>

      <main className="max-w-[640px] mx-auto px-4 py-4">
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}>
          {/* 상단 고정 설정 */}
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: `1px solid ${theme.border}` }}>
            <div className="flex items-center gap-2">
              <Pin className="w-4 h-4" style={{ color: theme.accent }} strokeWidth={1.5} />
              <span className="font-medium text-sm" style={{ color: theme.textPrimary }}>상단 고정 (중요 공지)</span>
            </div>
            <Toggle checked={isPinned} onChange={setIsPinned} />
          </div>

          {/* 알림 설정 */}
          <div className="px-4 py-4" style={{ borderBottom: `1px solid ${theme.border}`, backgroundColor: `${theme.accent}10` }}>
            <div className="flex items-center gap-2 mb-3">
              <Bell className="w-4 h-4" style={{ color: theme.accent }} strokeWidth={1.5} />
              <span className="font-semibold text-sm" style={{ color: theme.accent }}>알림 발송 설정</span>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: theme.bgCard }}>
                    <Bell className="w-4 h-4" style={{ color: theme.accent }} strokeWidth={1.5} />
                  </div>
                  <div>
                    <span className="font-medium text-sm" style={{ color: theme.textPrimary }}>인앱 알림 발송</span>
                    <p className="text-xs" style={{ color: theme.textMuted }}>앱 내 알림 센터에 표시</p>
                  </div>
                </div>
                <Toggle checked={sendInApp} onChange={setSendInApp} />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: theme.bgCard }}>
                    <Smartphone className="w-4 h-4" style={{ color: theme.accent }} strokeWidth={1.5} />
                  </div>
                  <div>
                    <span className="font-medium text-sm" style={{ color: theme.textPrimary }}>푸시 알림 발송</span>
                    <p className="text-xs" style={{ color: theme.textMuted }}>모바일 푸시 알림 전송</p>
                  </div>
                </div>
                <Toggle checked={sendPush} onChange={setSendPush} />
              </div>
            </div>
          </div>

          {/* 제목 입력 */}
          <div className="px-4 py-4" style={{ borderBottom: `1px solid ${theme.border}` }}>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목을 입력하세요"
              maxLength={100}
              className="w-full text-lg font-bold outline-none"
              style={{ backgroundColor: 'transparent', color: theme.textPrimary }}
            />
            <p className="text-xs mt-1" style={{ color: theme.textMuted }}>{title.length}/100</p>
          </div>

          {/* 툴바 */}
          <div className="px-4 py-2 flex items-center gap-2" style={{ borderBottom: `1px solid ${theme.border}` }}>
            <input type="file" ref={fileInputRef} accept="image/*,video/*" multiple className="hidden" onChange={handleFileSelect} />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={{ backgroundColor: theme.bgInput, color: theme.textPrimary }}
            >
              <Image className="w-4 h-4" strokeWidth={1.5} />
              사진/동영상
            </button>
            <button
              onClick={() => setShowYoutubeInput(!showYoutubeInput)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={{ backgroundColor: theme.bgInput, color: theme.textPrimary }}
            >
              <Youtube className="w-4 h-4" strokeWidth={1.5} />
              유튜브
            </button>
            <button
              onClick={() => setShowLinkInput(!showLinkInput)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={{ backgroundColor: theme.bgInput, color: theme.textPrimary }}
            >
              <Link2 className="w-4 h-4" strokeWidth={1.5} />
              링크
            </button>
          </div>

          {/* 유튜브 입력 */}
          {showYoutubeInput && (
            <div className="px-4 py-3" style={{ borderBottom: `1px solid ${theme.border}`, backgroundColor: theme.redBg }}>
              <p className="text-sm font-medium mb-2" style={{ color: theme.red }}>유튜브 URL 입력</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.border}`, color: theme.textPrimary }}
                />
                <button onClick={addYoutubeLink} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ backgroundColor: theme.red, color: '#FFF' }}>
                  추가
                </button>
              </div>
            </div>
          )}

          {/* 링크 입력 */}
          {showLinkInput && (
            <div className="px-4 py-3" style={{ borderBottom: `1px solid ${theme.border}`, backgroundColor: `${theme.accent}10` }}>
              <p className="text-sm font-medium mb-2" style={{ color: theme.accent }}>링크 추가</p>
              <div className="space-y-2">
                <input
                  type="text"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="URL (https://...)"
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.border}`, color: theme.textPrimary }}
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={linkText}
                    onChange={(e) => setLinkText(e.target.value)}
                    placeholder="표시할 텍스트 (선택)"
                    className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.border}`, color: theme.textPrimary }}
                  />
                  <button onClick={addLink} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ backgroundColor: theme.accent, color: isDark ? '#121212' : '#FFF' }}>
                    추가
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 미디어 프리뷰 */}
          {mediaPreviews.length > 0 && (
            <div className="px-4 py-3" style={{ borderBottom: `1px solid ${theme.border}` }}>
              <div className="flex gap-2 flex-wrap">
                {mediaPreviews.map((preview, index) => (
                  <div key={index} className="relative">
                    {preview.type === 'video' ? (
                      <div className="w-20 h-20 rounded-xl flex items-center justify-center" style={{ backgroundColor: theme.bgElevated }}>
                        <Play className="w-6 h-6" style={{ color: theme.textPrimary }} fill={theme.textPrimary} />
                      </div>
                    ) : (
                      <img src={preview.url} alt="" className="w-20 h-20 object-cover rounded-xl" />
                    )}
                    <button
                      onClick={() => removeMedia(index)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-xs"
                      style={{ backgroundColor: theme.red, color: '#FFF' }}
                    >
                      <X className="w-3 h-3" strokeWidth={2} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 내용 입력 */}
          <div className="p-4">
            <textarea
              ref={contentRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="내용을 입력하세요..."
              rows={15}
              className="w-full outline-none resize-none"
              style={{ backgroundColor: 'transparent', color: theme.textPrimary }}
            />
          </div>
        </div>

        {/* 안내 */}
        <div className="mt-4 rounded-2xl p-4" style={{ backgroundColor: `${theme.accent}15`, border: `1px solid ${theme.accent}30` }}>
          <div className="flex items-center gap-2 mb-2">
            <Info className="w-4 h-4" style={{ color: theme.accent }} strokeWidth={1.5} />
            <span className="font-semibold text-sm" style={{ color: theme.accent }}>작성 안내</span>
          </div>
          <ul className="text-xs space-y-1" style={{ color: theme.textSecondary }}>
            <li className="flex items-start gap-1.5">
              <span style={{ color: theme.accent }}>•</span>
              공지사항은 모든 사용자에게 중요한 정보를 전달합니다
            </li>
            <li className="flex items-start gap-1.5">
              <span style={{ color: theme.accent }}>•</span>
              상단 고정 시 공지사항 목록 최상단에 표시됩니다
            </li>
            <li className="flex items-start gap-1.5">
              <span style={{ color: theme.accent }}>•</span>
              이미지/동영상은 최대 10개까지, 각 100MB 이하
            </li>
            <li className="flex items-start gap-1.5">
              <span style={{ color: theme.accent }}>•</span>
              인앱 알림: 알림센터에서 확인 가능
            </li>
            <li className="flex items-start gap-1.5">
              <span style={{ color: theme.accent }}>•</span>
              푸시 알림: 앱이 설치된 기기에 직접 전송
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}
