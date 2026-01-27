"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const R2_WORKER_URL = "https://yeoju-r2-worker.kkyg9300.workers.dev";

export default function NoticeEditPage() {
  const params = useParams();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // 기존 이미지
  const [existingImages, setExistingImages] = useState<string[]>([]);
  
  // 새 미디어
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<{url: string, type: 'image' | 'video'}[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 유튜브/링크
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [showYoutubeInput, setShowYoutubeInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => { const user = session?.user;
      setUser(user);
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("*").eq("email", user.email).single();
        setUserProfile(profile);
        
        if (profile?.role !== "admin") {
          alert("관리자만 수정할 수 있습니다");
          router.push("/notices");
          return;
        }
        
        fetchNotice();
      } else {
        alert("로그인이 필요합니다");
        router.push("/login");
      }
    });
  }, [params.id]);

  const fetchNotice = async () => {
    const { data } = await supabase
      .from("notices")
      .select("*")
      .eq("id", Number(params.id))
      .single();
    
    if (data) {
      setTitle(data.title);
      setContent(data.content || "");
      setIsPinned(data.is_pinned || false);
      setExistingImages(data.images || []);
    }
    setLoading(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      if (file.size > 100 * 1024 * 1024) { alert(`${file.name}: 100MB 이하만`); continue; }
      const totalCount = existingImages.length + mediaFiles.length + 1;
      if (totalCount > 10) { alert("최대 10개"); break; }
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

  const removeExistingImage = (index: number) => {
    setExistingImages(existingImages.filter((_, i) => i !== index));
  };

  const removeNewMedia = (index: number) => {
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
    if (!youtubeId) { alert("유효한 유튜브 링크가 아닙니다"); return; }
    setContent(prev => prev + `\n[youtube:${youtubeId}]\n`);
    setYoutubeUrl("");
    setShowYoutubeInput(false);
  };

  const addLink = () => {
    if (!linkUrl.trim()) return;
    const text = linkText.trim() || linkUrl;
    setContent(prev => prev + `\n[link:${linkUrl}|${text}]\n`);
    setLinkUrl("");
    setLinkText("");
    setShowLinkInput(false);
  };

  const handleSubmit = async () => {
    if (!title.trim()) { alert("제목을 입력하세요"); return; }

    setSaving(true);
    try {
      // 새 이미지 업로드
      const newUrls: string[] = [];
      for (let i = 0; i < mediaFiles.length; i++) {
        setUploadProgress(Math.round(((i + 1) / mediaFiles.length) * 100));
        const url = await uploadFile(mediaFiles[i]);
        newUrls.push(url);
      }

      const allImages = [...existingImages, ...newUrls];

      const { error } = await supabase
        .from("notices")
        .update({
          title: title.trim(),
          content: content.trim(),
          is_pinned: isPinned,
          images: allImages,
          updated_at: new Date().toISOString(),
        })
        .eq("id", Number(params.id));

      if (error) throw error;
      router.push(`/notices/${params.id}`);
    } catch (error: any) {
      alert("저장 실패: " + error.message);
    }
    setSaving(false);
  };

  const isAdmin = userProfile?.role === "admin";

  if (loading || !isAdmin) {
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
            <h1 className="text-white font-bold text-lg">공지사항 수정</h1>
          </div>
          <button
            onClick={handleSubmit}
            disabled={saving || !title.trim()}
            className="px-4 py-1.5 bg-amber-500 text-gray-900 font-bold text-sm rounded-full disabled:opacity-50"
          >
            {saving ? `${uploadProgress}%` : "저장"}
          </button>
        </div>
      </header>

      <main className="max-w-[631px] mx-auto p-4">
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {/* 중요 공지 체크 */}
          <div className="px-4 py-3 border-b border-gray-100">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-amber-500 focus:ring-amber-500"
              />
              <span className="text-gray-900 font-medium">📌 중요 공지</span>
            </label>
          </div>

          {/* 제목 */}
          <div className="px-4 py-3 border-b border-gray-100">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목을 입력하세요"
              maxLength={100}
              className="w-full text-lg font-bold text-gray-900 placeholder-gray-400 focus:outline-none"
            />
          </div>

          {/* 툴바 */}
          <div className="px-4 py-2 border-b border-gray-100 flex items-center gap-1">
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*,video/*" multiple className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-500 hover:text-amber-500 hover:bg-gray-100 rounded-lg flex items-center gap-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-xs">사진</span>
            </button>
            <button onClick={() => setShowYoutubeInput(!showYoutubeInput)} className={`p-2 hover:bg-gray-100 rounded-lg flex items-center gap-1 ${showYoutubeInput ? 'text-red-500' : 'text-gray-500 hover:text-red-500'}`}>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
              </svg>
              <span className="text-xs">유튜브</span>
            </button>
            <button onClick={() => setShowLinkInput(!showLinkInput)} className={`p-2 hover:bg-gray-100 rounded-lg flex items-center gap-1 ${showLinkInput ? 'text-blue-500' : 'text-gray-500 hover:text-blue-500'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <span className="text-xs">링크</span>
            </button>
          </div>

          {/* 유튜브 입력 */}
          {showYoutubeInput && (
            <div className="px-4 py-3 border-b border-gray-100 bg-red-50">
              <div className="flex gap-2">
                <input type="text" value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} placeholder="유튜브 링크" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                <button onClick={addYoutubeLink} className="px-4 py-2 bg-red-500 text-white font-bold text-sm rounded-lg">추가</button>
              </div>
            </div>
          )}

          {/* 링크 입력 */}
          {showLinkInput && (
            <div className="px-4 py-3 border-b border-gray-100 bg-blue-50 space-y-2">
              <input type="text" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="URL" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              <div className="flex gap-2">
                <input type="text" value={linkText} onChange={(e) => setLinkText(e.target.value)} placeholder="표시 텍스트 (선택)" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                <button onClick={addLink} className="px-4 py-2 bg-blue-500 text-white font-bold text-sm rounded-lg">추가</button>
              </div>
            </div>
          )}

          {/* 기존 이미지 */}
          {existingImages.length > 0 && (
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-xs text-gray-500 mb-2">기존 이미지</p>
              <div className="flex gap-2 flex-wrap">
                {existingImages.map((url, index) => (
                  <div key={index} className="relative">
                    <img src={url} alt="" className="w-24 h-24 object-cover rounded-lg" />
                    <button onClick={() => removeExistingImage(index)} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-sm font-bold shadow">✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 새 미디어 프리뷰 */}
          {mediaPreviews.length > 0 && (
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-xs text-gray-500 mb-2">새로 추가</p>
              <div className="flex gap-2 flex-wrap">
                {mediaPreviews.map((preview, index) => (
                  <div key={index} className="relative">
                    {preview.type === 'video' ? (
                      <div className="w-24 h-24 bg-gray-900 rounded-lg relative overflow-hidden">
                        <video src={preview.url} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                        </div>
                      </div>
                    ) : (
                      <img src={preview.url} alt="" className="w-24 h-24 object-cover rounded-lg" />
                    )}
                    <button onClick={() => removeNewMedia(index)} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-sm font-bold shadow">✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 내용 */}
          <div className="px-4 py-3">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="내용을 입력하세요"
              rows={15}
              className="w-full text-gray-900 placeholder-gray-400 focus:outline-none resize-none leading-relaxed"
            />
          </div>
        </div>
      </main>
    </div>
  );
}
