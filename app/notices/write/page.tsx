"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const R2_WORKER_URL = "https://yeoju-r2-worker.kkyg9300.workers.dev";
const ONESIGNAL_APP_ID = "67dfc9cd-9827-4481-bc98-66627a0eed45";
const ONESIGNAL_REST_API_KEY = ""; // 서버에서 처리하거나 환경변수로

export default function NoticeWritePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // ✅ 알림 옵션
  const [sendInApp, setSendInApp] = useState(false);
  const [sendPush, setSendPush] = useState(false);
  
  // 미디어
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<{url: string, type: 'image' | 'video'}[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 유튜브 링크
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [showYoutubeInput, setShowYoutubeInput] = useState(false);
  
  // 링크
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [links, setLinks] = useState<{url: string, text: string}[]>([]);
  
  const contentRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      setUser(user);
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("*").eq("email", user.email).single();
        setUserProfile(profile);
        
        if (profile?.role !== "admin") {
          alert("관리자만 작성할 수 있습니다");
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
      if (file.size > 100 * 1024 * 1024) { alert(`${file.name}: 100MB 이하만`); continue; }
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

  const uploadFile = async (file: File): Promise<string> => {
    const ext = file.name.split('.').pop();
    const fileName = `notices/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
    const response = await fetch(`${R2_WORKER_URL}/${fileName}`, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
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
      alert("유효한 유튜브 링크가 아닙니다");
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

  // ✅ 인앱 알림 보내기
  const sendInAppNotifications = async (noticeId: number) => {
    try {
      // 모든 유저 가져오기
      const { data: users } = await supabase.from("profiles").select("id");
      if (!users || users.length === 0) return;

      // 배치로 알림 삽입 (한번에 너무 많으면 나눠서)
      const notifications = users.map(u => ({
        user_id: u.id,
        type: "notice",
        message: `📢 새 공지: ${title}`,
        notice_id: noticeId,
        is_read: false,
      }));

      // 500개씩 나눠서 삽입
      const batchSize = 500;
      for (let i = 0; i < notifications.length; i += batchSize) {
        const batch = notifications.slice(i, i + batchSize);
        await supabase.from("notifications").insert(batch);
      }

      console.log(`인앱 알림 ${users.length}명에게 발송 완료`);
    } catch (error) {
      console.error("인앱 알림 발송 실패:", error);
    }
  };

  // ✅ 푸시 알림 보내기 (OneSignal)
  const sendPushNotifications = async (noticeId: number) => {
    try {
      // API Route를 통해 푸시 발송 (보안상 서버에서 처리)
      const response = await fetch("/api/push-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "📢 새 공지사항",
          message: title,
          url: `/notices/${noticeId}`,
        }),
      });

      if (response.ok) {
        console.log("푸시 알림 발송 완료");
      } else {
        console.error("푸시 알림 발송 실패");
      }
    } catch (error) {
      console.error("푸시 알림 발송 실패:", error);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) { alert("제목을 입력하세요"); return; }
    if (!content.trim() && mediaFiles.length === 0) { alert("내용을 입력하세요"); return; }

    setSaving(true);
    try {
      // 이미지/동영상 업로드
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

      // ✅ 알림 발송
      if (newNotice) {
        if (sendInApp) {
          await sendInAppNotifications(newNotice.id);
        }
        if (sendPush) {
          await sendPushNotifications(newNotice.id);
        }
      }

      router.push("/notices");
    } catch (error: any) {
      alert("저장 실패: " + error.message);
    }
    setSaving(false);
  };

  const isAdmin = userProfile?.role === "admin";

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-10">
      {/* 헤더 */}
      <header className="bg-gray-900 sticky top-0 z-50">
        <div className="max-w-[631px] mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="text-gray-400 hover:text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h1 className="text-white font-bold text-lg">공지사항 작성</h1>
          </div>
          <button
            onClick={handleSubmit}
            disabled={saving || !title.trim()}
            className="px-4 py-1.5 bg-amber-500 text-gray-900 font-bold text-sm rounded-full disabled:opacity-50"
          >
            {saving ? `${uploadProgress}%` : "등록"}
          </button>
        </div>
      </header>

      <main className="max-w-[631px] mx-auto p-4">
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {/* 중요 공지 체크 */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-gray-700 font-medium">📌 중요 공지 (상단 고정)</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={isPinned} onChange={(e) => setIsPinned(e.target.checked)} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>

          {/* ✅ 알림 옵션 */}
          <div className="px-4 py-3 border-b border-gray-100 bg-blue-50">
            <p className="text-blue-800 font-bold text-sm mb-3">🔔 알림 발송</p>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={sendInApp} 
                  onChange={(e) => setSendInApp(e.target.checked)} 
                  className="w-5 h-5 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                />
                <div>
                  <span className="text-gray-900 font-medium">📱 인앱 알림</span>
                  <p className="text-xs text-gray-500">앱 내 알림함에 표시됩니다</p>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={sendPush} 
                  onChange={(e) => setSendPush(e.target.checked)} 
                  className="w-5 h-5 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                />
                <div>
                  <span className="text-gray-900 font-medium">🚀 푸시 알림</span>
                  <p className="text-xs text-gray-500">모든 사용자에게 푸시 발송</p>
                </div>
              </label>
            </div>
          </div>

          {/* 제목 입력 */}
          <div className="px-4 py-3 border-b border-gray-100">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목을 입력하세요"
              maxLength={100}
              className="w-full text-lg font-bold text-gray-900 placeholder-gray-400 focus:outline-none"
            />
            <p className="text-xs text-gray-400 mt-1">{title.length}/100</p>
          </div>

          {/* 툴바 */}
          <div className="px-4 py-2 border-b border-gray-100 flex items-center gap-2">
            <input type="file" ref={fileInputRef} accept="image/*,video/*" multiple className="hidden" onChange={handleFileSelect} />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700"
            >
              📷 사진/동영상
            </button>
            <button
              onClick={() => setShowYoutubeInput(!showYoutubeInput)}
              className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700"
            >
              🎬 유튜브
            </button>
            <button
              onClick={() => setShowLinkInput(!showLinkInput)}
              className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700"
            >
              🔗 링크
            </button>
          </div>

          {/* 유튜브 입력 */}
          {showYoutubeInput && (
            <div className="px-4 py-3 border-b border-gray-100 bg-red-50">
              <p className="text-sm text-red-700 mb-2">유튜브 URL 입력</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <button onClick={addYoutubeLink} className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-bold">
                  추가
                </button>
              </div>
            </div>
          )}

          {/* 링크 입력 */}
          {showLinkInput && (
            <div className="px-4 py-3 border-b border-gray-100 bg-blue-50">
              <p className="text-sm text-blue-700 mb-2">링크 추가</p>
              <div className="space-y-2">
                <input
                  type="text"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="URL (https://...)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={linkText}
                    onChange={(e) => setLinkText(e.target.value)}
                    placeholder="표시 텍스트 (선택)"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button onClick={addLink} className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-bold">
                    추가
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 미디어 미리보기 */}
          {mediaPreviews.length > 0 && (
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="flex gap-2 flex-wrap">
                {mediaPreviews.map((preview, index) => (
                  <div key={index} className="relative">
                    {preview.type === 'video' ? (
                      <div className="w-24 h-24 bg-gray-900 rounded-lg flex items-center justify-center">
                        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    ) : (
                      <img src={preview.url} alt="" className="w-24 h-24 object-cover rounded-lg" />
                    )}
                    <button
                      onClick={() => removeMedia(index)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-sm font-bold"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 본문 입력 */}
          <div className="p-4">
            <textarea
              ref={contentRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="공지 내용을 입력하세요..."
              rows={15}
              className="w-full text-gray-900 placeholder-gray-400 focus:outline-none resize-none"
            />
          </div>
        </div>

        {/* 안내 */}
        <div className="mt-4 p-4 bg-amber-50 rounded-xl">
          <p className="text-amber-800 text-sm font-medium mb-2">💡 작성 팁</p>
          <ul className="text-amber-700 text-xs space-y-1">
            <li>• 중요 공지를 체크하면 목록 상단에 고정됩니다</li>
            <li>• 유튜브 링크는 자동으로 플레이어가 삽입됩니다</li>
            <li>• 이미지와 동영상은 최대 10개까지 첨부 가능합니다</li>
            <li>• 인앱 알림: 앱 내 알림함에서 확인 가능</li>
            <li>• 푸시 알림: 알림 허용한 모든 사용자에게 발송</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
