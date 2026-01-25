"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/contexts/ThemeContext";
import { ArrowLeft, Plus, Trash2, ImagePlus, X, Loader2, ExternalLink, Move, Pencil } from "lucide-react";

const R2_WORKER_URL = "https://yeoju-r2-worker.kkyg9300.workers.dev";

interface Partner {
  id: number;
  name: string;
  image_url: string;
  link_url?: string;
  width?: number;
  height?: number;
  created_at: string;
}

export default function PartnersAdminPage() {
  const router = useRouter();
  const { theme, mounted } = useTheme();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  const [name, setName] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  
  const [imageSize, setImageSize] = useState({ width: 200, height: 200 });
  const [isResizing, setIsResizing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [startSize, setStartSize] = useState({ width: 200, height: 200 });
  const [originalRatio, setOriginalRatio] = useState(1);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    checkAuth();
    fetchPartners();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }
    
    // 관리자 체크
    const { data: admin } = await supabase
      .from("admins")
      .select("id")
      .eq("user_id", user.id)
      .single();
    
    if (!admin) {
      alert("관리자만 접근 가능합니다.");
      router.push("/");
      return;
    }
  };

  const fetchPartners = async () => {
    const { data } = await supabase
      .from("partners")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setPartners(data);
    setLoading(false);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setImageFile(file);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setImagePreview(result);
      
      const img = new Image();
      img.onload = () => {
        const ratio = img.width / img.height;
        setOriginalRatio(ratio);
        let w = img.width;
        let h = img.height;
        if (w > 300) { w = 300; h = 300 / ratio; }
        if (h > 300) { h = 300; w = 300 * ratio; }
        setImageSize({ width: w, height: h });
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  const handleResizeStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsResizing(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setStartPos({ x: clientX, y: clientY });
    setStartSize({ ...imageSize });
  };

  useEffect(() => {
    if (!isResizing) return;
    
    const handleMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const delta = ((clientX - startPos.x) + (clientY - startPos.y)) / 2;
      let newWidth = Math.max(100, Math.min(400, startSize.width + delta));
      let newHeight = newWidth / originalRatio;
      if (newHeight < 100) { newHeight = 100; newWidth = 100 * originalRatio; }
      if (newHeight > 400) { newHeight = 400; newWidth = 400 * originalRatio; }
      setImageSize({ width: newWidth, height: newHeight });
    };
    
    const handleEnd = () => setIsResizing(false);
    
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleMove);
    window.addEventListener('touchend', handleEnd);
    
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isResizing, startPos, startSize, originalRatio]);

  // 커뮤니티와 동일한 업로드 방식
  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const ext = file.name.split('.').pop();
      const fileName = `partners/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
      
      const response = await fetch(`${R2_WORKER_URL}/${fileName}`, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type }
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.url;
      }
      return null;
    } catch (error) {
      console.error("Upload error:", error);
      return null;
    }
  };

  const handleEdit = (partner: Partner) => {
    setEditingPartner(partner);
    setName(partner.name);
    setLinkUrl(partner.link_url || "");
    setImagePreview(partner.image_url);
    setImageSize({ width: partner.width || 200, height: partner.height || 200 });
    setOriginalRatio((partner.width || 200) / (partner.height || 200));
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      alert("업체명을 입력해주세요.");
      return;
    }
    if (!editingPartner && !imageFile) {
      alert("이미지를 선택해주세요.");
      return;
    }
    setUploading(true);

    let imageUrl = editingPartner?.image_url || null;
    
    // 새 이미지가 있으면 업로드
    if (imageFile) {
      imageUrl = await uploadImage(imageFile);
      if (!imageUrl) {
        alert("이미지 업로드에 실패했습니다.");
        setUploading(false);
        return;
      }
    }

    if (editingPartner) {
      // 수정
      const { error } = await supabase.from("partners").update({
        name: name.trim(),
        image_url: imageUrl,
        link_url: linkUrl.trim() || null,
        width: Math.round(imageSize.width),
        height: Math.round(imageSize.height)
      }).eq("id", editingPartner.id);

      if (error) {
        alert("수정에 실패했습니다.");
        setUploading(false);
        return;
      }
    } else {
      // 등록
      const { error } = await supabase.from("partners").insert({
        name: name.trim(),
        image_url: imageUrl,
        link_url: linkUrl.trim() || null,
        width: Math.round(imageSize.width),
        height: Math.round(imageSize.height)
      });

      if (error) {
        alert("저장에 실패했습니다.");
        setUploading(false);
        return;
      }
    }

    closeModal();
    fetchPartners();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    const { error } = await supabase.from("partners").delete().eq("id", id);
    if (!error) setPartners(prev => prev.filter(p => p.id !== id));
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingPartner(null);
    setName("");
    setLinkUrl("");
    setImageFile(null);
    setImagePreview(null);
    setImageSize({ width: 200, height: 200 });
    setUploading(false);
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.bgPrimary }}>
      <header className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center px-4 border-b" style={{ backgroundColor: theme.bgPrimary, borderColor: theme.border }}>
        <button onClick={() => router.back()} className="p-2 -ml-2">
          <ArrowLeft className="w-6 h-6" style={{ color: theme.textPrimary }} />
        </button>
        <h1 className="flex-1 text-center font-bold text-lg" style={{ color: theme.textPrimary }}>파트너스 관리</h1>
        <button onClick={() => setShowModal(true)} className="p-2 -mr-2">
          <Plus className="w-6 h-6" style={{ color: theme.gold }} />
        </button>
      </header>

      <main className="pt-14 pb-8 px-4 max-w-[631px] mx-auto">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: theme.gold }} />
          </div>
        ) : partners.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <ImagePlus className="w-16 h-16 mb-4" style={{ color: theme.textMuted }} />
            <p style={{ color: theme.textMuted }}>등록된 파트너가 없습니다</p>
            <button onClick={() => setShowModal(true)} className="mt-4 px-6 py-3 rounded-xl font-medium" style={{ backgroundColor: theme.gold, color: '#000' }}>
              첫 파트너 등록하기
            </button>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {partners.map((partner) => (
              <div key={partner.id} className="flex items-center gap-3 p-3 rounded-2xl" style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.border}` }}>
                <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-gray-200">
                  <img src={partner.image_url} alt={partner.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate" style={{ color: theme.textPrimary }}>{partner.name}</p>
                  <p className="text-xs" style={{ color: theme.textMuted }}>{partner.width} x {partner.height}px</p>
                  {partner.link_url && (
                    <a href={partner.link_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs mt-1" style={{ color: theme.textMuted }}>
                      <ExternalLink className="w-3 h-3" />
                      <span className="truncate">{partner.link_url}</span>
                    </a>
                  )}
                </div>
                <button onClick={() => handleEdit(partner)} className="p-2 rounded-full" style={{ backgroundColor: 'rgba(212, 175, 55, 0.1)' }}>
                  <Pencil className="w-5 h-5" style={{ color: theme.gold }} />
                </button>
                <button onClick={() => handleDelete(partner.id)} className="p-2 rounded-full" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
                  <Trash2 className="w-5 h-5 text-red-500" />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={closeModal}>
          <div className="w-full max-w-[631px] rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto" style={{ backgroundColor: theme.bgPrimary }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold" style={{ color: theme.textPrimary }}>{editingPartner ? '파트너 수정' : '파트너 등록'}</h2>
              <button onClick={closeModal} className="p-1"><X className="w-6 h-6" style={{ color: theme.textMuted }} /></button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{ color: theme.textSecondary }}>{editingPartner ? '배너 이미지 (변경 시 선택)' : '배너 이미지 *'}</label>
              <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageSelect} className="hidden" />
              {imagePreview ? (
                <div className="flex flex-col items-center">
                  <div className="relative inline-block border-2 border-dashed rounded-xl overflow-hidden" style={{ width: imageSize.width, height: imageSize.height, borderColor: theme.gold }}>
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" draggable={false} />
                    <button onClick={() => { setImageFile(null); setImagePreview(null); }} className="absolute top-2 right-2 p-1 rounded-full bg-black/50">
                      <X className="w-4 h-4 text-white" />
                    </button>
                    <div onMouseDown={handleResizeStart} onTouchStart={handleResizeStart} className="absolute bottom-0 right-0 w-8 h-8 cursor-se-resize flex items-center justify-center" style={{ backgroundColor: theme.gold }}>
                      <Move className="w-4 h-4 text-black" />
                    </div>
                  </div>
                  <p className="mt-3 text-sm" style={{ color: theme.textMuted }}>{Math.round(imageSize.width)} x {Math.round(imageSize.height)}px</p>
                </div>
              ) : (
                <button onClick={() => fileInputRef.current?.click()} className="w-full h-48 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2" style={{ borderColor: theme.border }}>
                  <ImagePlus className="w-10 h-10" style={{ color: theme.textMuted }} />
                  <span style={{ color: theme.textMuted }}>이미지 선택</span>
                </button>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{ color: theme.textSecondary }}>업체명 *</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="파트너 업체명" className="w-full px-4 py-3 rounded-xl outline-none" style={{ backgroundColor: theme.bgInput, color: theme.textPrimary, border: `1px solid ${theme.border}` }} />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2" style={{ color: theme.textSecondary }}>링크 URL (선택)</label>
              <input type="url" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://example.com" className="w-full px-4 py-3 rounded-xl outline-none" style={{ backgroundColor: theme.bgInput, color: theme.textPrimary, border: `1px solid ${theme.border}` }} />
            </div>

            <button onClick={handleSubmit} disabled={uploading || !name.trim() || (!editingPartner && !imageFile)} className="w-full py-4 rounded-xl font-bold text-lg disabled:opacity-50 flex items-center justify-center gap-2" style={{ backgroundColor: theme.gold, color: '#000' }}>
              {uploading ? (<><Loader2 className="w-5 h-5 animate-spin" />업로드 중...</>) : (editingPartner ? '수정하기' : '등록하기')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
