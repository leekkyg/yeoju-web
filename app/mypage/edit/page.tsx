"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";

const R2_WORKER_URL = "https://yeoju-r2-worker.kkyg9300.workers.dev";

export default function ProfileEditPage() {
  const router = useRouter();
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
    const { data: { user } } = await supabase.auth.getUser();
    
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
      
      // 닉네임 변경 가능 여부 체크
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
    const ext = file.name.split('.').pop();
    const fileName = `avatars/${user.id}-${Date.now()}.${ext}`;
    
    const response = await fetch(`${R2_WORKER_URL}/${fileName}`, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type }
    });
    
    const data = await response.json();
    return data.url;
  };

  const handleSave = async () => {
    if (!nickname.trim()) {
      alert("닉네임을 입력해주세요");
      return;
    }

    // 닉네임이 변경되었는데 변경 불가능한 경우
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

      // 닉네임이 변경된 경우에만 업데이트
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* 헤더 */}
      <header className="bg-white sticky top-0 z-50 border-b border-gray-100">
        <div className="max-w-[631px] mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-gray-900 font-bold text-lg">프로필 수정</h1>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 bg-emerald-500 text-white font-semibold text-sm rounded-full disabled:opacity-50"
          >
            {saving ? "저장중..." : "저장"}
          </button>
        </div>
      </header>

      <main className="max-w-[631px] mx-auto px-4 py-6">
        {/* 프로필 사진 */}
        <div className="bg-white rounded-2xl p-6 mb-4">
          <p className="text-sm font-medium text-gray-500 mb-4">프로필 사진</p>
          
          <div className="flex flex-col items-center">
            <div className="relative">
              {avatarPreview ? (
                <img 
                  src={avatarPreview} 
                  alt="프로필" 
                  className="w-24 h-24 rounded-full object-cover border-4 border-emerald-100"
                />
              ) : (
                <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center">
                  <span className="text-emerald-600 font-bold text-3xl">
                    {nickname?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "?"}
                  </span>
                </div>
              )}
              
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarSelect}
              className="hidden"
            />

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-emerald-50 text-emerald-600 font-medium text-sm rounded-lg"
              >
                사진 변경
              </button>
              {avatarPreview && (
                <button
                  onClick={removeAvatar}
                  className="px-4 py-2 bg-gray-100 text-gray-600 font-medium text-sm rounded-lg"
                >
                  삭제
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 기본 정보 */}
        <div className="bg-white rounded-2xl p-6">
          <p className="text-sm font-medium text-gray-500 mb-4">기본 정보</p>
          
          {/* 이메일 (수정 불가) */}
          <div className="mb-4">
            <label className="block text-sm text-gray-600 mb-1">이메일</label>
            <input
              type="email"
              value={user?.email || ""}
              disabled
              className="w-full px-4 py-3 bg-gray-100 text-gray-500 rounded-xl"
            />
          </div>

          {/* 닉네임 */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm text-gray-600">닉네임 *</label>
              {!canChangeNickname && (
                <span className="text-xs text-red-500">{daysUntilChange}일 후 변경 가능</span>
              )}
            </div>
            <input
              type="text"
              value={nickname}
              onChange={(e) => canChangeNickname && setNickname(e.target.value)}
              placeholder="닉네임을 입력하세요"
              maxLength={20}
              disabled={!canChangeNickname}
              className={`w-full px-4 py-3 rounded-xl border focus:outline-none ${
                canChangeNickname 
                  ? 'bg-gray-50 text-gray-900 border-gray-200 focus:border-emerald-500' 
                  : 'bg-gray-100 text-gray-500 border-gray-200 cursor-not-allowed'
              }`}
            />
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-gray-400">닉네임은 한 달에 1회만 변경할 수 있습니다</p>
              <p className="text-xs text-gray-400">{nickname.length}/20</p>
            </div>
          </div>
        </div>

        {/* 안내 */}
        <div className="mt-4 p-4 bg-emerald-50 rounded-xl">
          <p className="text-emerald-700 text-sm font-medium mb-1">💡 안내</p>
          <ul className="text-emerald-600 text-xs space-y-1">
            <li>• 프로필 사진은 5MB 이하의 이미지만 가능합니다</li>
            <li>• 닉네임은 한 달(30일)에 1회만 변경할 수 있습니다</li>
          </ul>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
