"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/contexts/ThemeContext";
import BottomNav from "@/components/BottomNav";
import {
  ArrowLeft,
  Camera,
  Trash2,
  Mail,
  User,
  Info,
  AlertCircle,
} from "lucide-react";

const R2_WORKER_URL = "https://yeoju-r2-worker.kkyg9300.workers.dev";

export default function ProfileEditPage() {
  const router = useRouter();
  const { theme, isDark, mounted } = useTheme();
  
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [nickname, setNickname] = useState("");
  const [originalNickname, setOriginalNickname] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [canChangeNickname, setCanChangeNickname] = useState(true);
  const [daysUntilChange, setDaysUntilChange] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    
    if (!user) {
      router.push("/login");
      return;
    }
    
    setUser(user);
    
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    
    if (profileData) {
      setProfile(profileData);
      setNickname(profileData.nickname || "");
      setOriginalNickname(profileData.nickname || "");
      setAvatarUrl(profileData.avatar_url || null);
      setAvatarPreview(profileData.avatar_url || null);
      
      if (profileData.nickname_changed_at) {
        const lastChanged = new Date(profileData.nickname_changed_at);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - lastChanged.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays < 30) {
          setCanChangeNickname(false);
          setDaysUntilChange(30 - diffDays);
        }
      }
    }
    
    setLoading(false);
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("이미지는 5MB 이하만 가능합니다");
      return;
    }

    if (!file.type.startsWith("image/")) {
      alert("이미지 파일만 업로드 가능합니다");
      return;
    }

    setAvatarFile(file);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setAvatarPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadAvatar = async (file: File): Promise<string> => {
    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `avatars/${user.id}-${Date.now()}.${ext}`;
    
    const response = await fetch(`${R2_WORKER_URL}/${fileName}`, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type || 'image/jpeg' }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`업로드 실패: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    if (!data.url) {
      throw new Error("서버에서 URL을 반환하지 않았습니다");
    }
    return data.url;
  };

  const handleSave = async () => {
    if (!nickname.trim()) {
      alert("닉네임을 입력해주세요");
      return;
    }

    const nicknameChanged = nickname.trim() !== originalNickname;
    if (nicknameChanged && !canChangeNickname) {
      alert(`닉네임은 ${daysUntilChange}일 후에 변경 가능합니다`);
      return;
    }

    setSaving(true);
    
    try {
      let newAvatarUrl = avatarUrl;
      
      if (avatarFile) {
        newAvatarUrl = await uploadAvatar(avatarFile);
      }

      const updateData: any = {
        avatar_url: newAvatarUrl,
      };

      if (nicknameChanged) {
        updateData.nickname = nickname.trim();
        updateData.nickname_changed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", user.id);

      if (error) throw error;

      alert("프로필이 수정되었습니다");
      router.push("/mypage");
    } catch (error: any) {
      alert("저장 실패: " + error.message);
    }
    
    setSaving(false);
  };

  const removeAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    setAvatarUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.bgMain }}>
        <div className="w-10 h-10 border-2 rounded-full animate-spin" style={{ borderColor: theme.border, borderTopColor: theme.accent }}></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 transition-colors duration-300" style={{ backgroundColor: theme.bgMain }}>
      {/* 헤더 */}
      <header
        className="sticky top-0 z-50"
        style={{ backgroundColor: theme.bgMain, borderBottom: `1px solid ${theme.borderLight}` }}
      >
        <div className="max-w-[640px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-1 -ml-1 rounded-lg transition-colors"
              style={{ color: theme.textPrimary }}
            >
              <ArrowLeft className="w-6 h-6" strokeWidth={1.5} />
            </button>
            <h1 className="text-lg font-bold" style={{ color: theme.textPrimary }}>프로필 수정</h1>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 rounded-full text-sm font-semibold transition-colors disabled:opacity-50"
            style={{ backgroundColor: theme.accent, color: isDark ? '#121212' : '#FFFFFF' }}
          >
            {saving ? "저장중..." : "저장"}
          </button>
        </div>
      </header>

      <main className="max-w-[640px] mx-auto px-4 py-4">
        {/* 프로필 사진 */}
        <section
          className="rounded-2xl p-6 mb-4"
          style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}
        >
          <div className="flex items-center gap-2 mb-5">
            <Camera className="w-5 h-5" style={{ color: theme.accent }} strokeWidth={1.5} />
            <span className="font-semibold" style={{ color: theme.textPrimary }}>프로필 사진</span>
          </div>
          
          <div className="flex flex-col items-center">
            <div className="relative">
              {avatarPreview ? (
                <img 
                  src={avatarPreview} 
                  alt="프로필" 
                  className="w-24 h-24 rounded-2xl object-cover"
                  style={{ border: `3px solid ${theme.border}` }}
                />
              ) : (
                <div
                  className="w-24 h-24 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: theme.bgInput, border: `3px solid ${theme.border}` }}
                >
                  <span className="text-3xl font-bold" style={{ color: theme.accent }}>
                    {nickname?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "?"}
                  </span>
                </div>
              )}
              
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-xl flex items-center justify-center shadow-lg"
                style={{ backgroundColor: theme.accent }}
              >
                <Camera className="w-4 h-4" style={{ color: isDark ? '#121212' : '#FFFFFF' }} strokeWidth={2} />
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarSelect}
              className="hidden"
            />

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                style={{ backgroundColor: theme.bgInput, color: theme.accent, border: `1px solid ${theme.border}` }}
              >
                사진 변경
              </button>
              {avatarPreview && (
                <button
                  onClick={removeAvatar}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-1.5 transition-colors"
                  style={{ backgroundColor: theme.redBg, color: theme.red, border: `1px solid ${theme.red}30` }}
                >
                  <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                  삭제
                </button>
              )}
            </div>
          </div>
        </section>

        {/* 기본 정보 */}
        <section
          className="rounded-2xl p-6"
          style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}
        >
          <div className="flex items-center gap-2 mb-5">
            <User className="w-5 h-5" style={{ color: theme.accent }} strokeWidth={1.5} />
            <span className="font-semibold" style={{ color: theme.textPrimary }}>기본 정보</span>
          </div>
          
          {/* 이메일 */}
          <div className="mb-5">
            <label className="flex items-center gap-1.5 text-sm mb-2" style={{ color: theme.textMuted }}>
              <Mail className="w-4 h-4" strokeWidth={1.5} />
              이메일
            </label>
            <input
              type="email"
              value={user?.email || ""}
              disabled
              className="w-full px-4 py-3 rounded-xl text-[15px] transition-colors"
              style={{ backgroundColor: theme.bgInput, color: theme.textMuted, border: `1px solid ${theme.border}` }}
            />
          </div>

          {/* 닉네임 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-1.5 text-sm" style={{ color: theme.textMuted }}>
                <User className="w-4 h-4" strokeWidth={1.5} />
                닉네임 <span style={{ color: theme.red }}>*</span>
              </label>
              {!canChangeNickname && (
                <span className="text-xs font-medium flex items-center gap-1" style={{ color: theme.red }}>
                  <AlertCircle className="w-3 h-3" strokeWidth={1.5} />
                  {daysUntilChange}일 후 변경 가능
                </span>
              )}
            </div>
            <input
              type="text"
              value={nickname}
              onChange={(e) => canChangeNickname && setNickname(e.target.value)}
              placeholder="닉네임을 입력하세요"
              maxLength={20}
              disabled={!canChangeNickname}
              className="w-full px-4 py-3 rounded-xl text-[15px] outline-none transition-colors"
              style={{
                backgroundColor: canChangeNickname ? theme.bgInput : theme.bgMain,
                color: canChangeNickname ? theme.textPrimary : theme.textMuted,
                border: `1px solid ${theme.border}`,
                cursor: canChangeNickname ? 'text' : 'not-allowed',
              }}
            />
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs" style={{ color: theme.textMuted }}>닉네임은 30일에 1회만 변경 가능</p>
              <p className="text-xs" style={{ color: theme.textMuted }}>{nickname.length}/20</p>
            </div>
          </div>
        </section>

        {/* 안내 */}
        <section
          className="mt-4 rounded-2xl p-4"
          style={{ backgroundColor: `${theme.accent}15`, border: `1px solid ${theme.accent}30` }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Info className="w-4 h-4" style={{ color: theme.accent }} strokeWidth={1.5} />
            <span className="text-sm font-semibold" style={{ color: theme.accent }}>안내</span>
          </div>
          <ul className="text-xs space-y-1.5" style={{ color: theme.textSecondary }}>
            <li className="flex items-start gap-1.5">
              <span style={{ color: theme.accent }}>•</span>
              프로필 사진은 5MB 이하의 이미지만 가능합니다
            </li>
            <li className="flex items-start gap-1.5">
              <span style={{ color: theme.accent }}>•</span>
              닉네임은 한 달(30일)에 1회만 변경할 수 있습니다
            </li>
          </ul>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
