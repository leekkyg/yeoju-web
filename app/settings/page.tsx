"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // 알림 설정
  const [pushEnabled, setPushEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [commentNotify, setCommentNotify] = useState(true);
  const [likeNotify, setLikeNotify] = useState(true);
  const [followNotify, setFollowNotify] = useState(true);
  const [noticeNotify, setNoticeNotify] = useState(true);
  
  // 개인정보 설정
  const [profilePublic, setProfilePublic] = useState(true);
  
  // 모달
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

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
      // 설정 불러오기
      setPushEnabled(profileData.push_enabled ?? true);
      setSoundEnabled(profileData.sound_enabled ?? true);
      setCommentNotify(profileData.notify_comment ?? true);
      setLikeNotify(profileData.notify_like ?? true);
      setFollowNotify(profileData.notify_follow ?? true);
      setNoticeNotify(profileData.notify_notice ?? true);
      setProfilePublic(profileData.is_public ?? true);
    }
    
    setLoading(false);
  };

  const updateSetting = async (field: string, value: boolean) => {
    if (!user) return;
    await supabase.from("profiles").update({ [field]: value }).eq("id", user.id);
  };

  const handlePushToggle = (checked: boolean) => {
    setPushEnabled(checked);
    updateSetting("push_enabled", checked);
  };

  const handleSoundToggle = (checked: boolean) => {
    setSoundEnabled(checked);
    updateSetting("sound_enabled", checked);
  };

  const handleCommentToggle = (checked: boolean) => {
    setCommentNotify(checked);
    updateSetting("notify_comment", checked);
  };

  const handleLikeToggle = (checked: boolean) => {
    setLikeNotify(checked);
    updateSetting("notify_like", checked);
  };

  const handleFollowToggle = (checked: boolean) => {
    setFollowNotify(checked);
    updateSetting("notify_follow", checked);
  };

  const handleNoticeToggle = (checked: boolean) => {
    setNoticeNotify(checked);
    updateSetting("notify_notice", checked);
  };

  const handleProfilePublicToggle = (checked: boolean) => {
    setProfilePublic(checked);
    updateSetting("is_public", checked);
  };

  const handleLogout = async () => {
    if (confirm("로그아웃 하시겠습니까?")) {
      await supabase.auth.signOut();
      router.push("/");
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "회원탈퇴") {
      alert("'회원탈퇴'를 정확히 입력해주세요");
      return;
    }
    
    if (!confirm("정말로 탈퇴하시겠습니까? 모든 데이터가 삭제되며 복구할 수 없습니다.")) {
      return;
    }
    
    setDeleting(true);
    
    try {
      // 프로필 삭제 (CASCADE로 관련 데이터 삭제)
      await supabase.from("profiles").delete().eq("id", user.id);
      
      // 로그아웃
      await supabase.auth.signOut();
      
      alert("회원 탈퇴가 완료되었습니다");
      router.push("/");
    } catch (error) {
      alert("탈퇴 처리 중 오류가 발생했습니다");
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
    <button
      onClick={() => onChange(!checked)}
      className={`w-12 h-7 rounded-full transition-colors ${checked ? 'bg-emerald-500' : 'bg-gray-300'}`}
    >
      <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-1 ${checked ? 'translate-x-5' : ''}`} />
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* 헤더 */}
      <header className="bg-white sticky top-0 z-50 border-b border-gray-100">
        <div className="max-w-[631px] mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-gray-900 font-bold text-lg">설정</h1>
        </div>
      </header>

      <main className="max-w-[631px] mx-auto px-4 py-4">
        {/* 알림 설정 */}
        <div className="bg-white rounded-2xl p-4 mb-4">
          <h3 className="text-sm font-bold text-gray-500 mb-4">🔔 알림 설정</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">푸시 알림</p>
                <p className="text-sm text-gray-500">앱 알림 받기</p>
              </div>
              <Toggle checked={pushEnabled} onChange={handlePushToggle} />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">알림 소리</p>
                <p className="text-sm text-gray-500">새 알림/쪽지 도착 시 소리</p>
              </div>
              <Toggle checked={soundEnabled} onChange={handleSoundToggle} />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">댓글 알림</p>
                <p className="text-sm text-gray-500">내 글에 댓글이 달리면 알림</p>
              </div>
              <Toggle checked={commentNotify} onChange={handleCommentToggle} />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">좋아요 알림</p>
                <p className="text-sm text-gray-500">내 글에 좋아요가 달리면 알림</p>
              </div>
              <Toggle checked={likeNotify} onChange={handleLikeToggle} />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">팔로우 알림</p>
                <p className="text-sm text-gray-500">새 팔로워가 생기면 알림</p>
              </div>
              <Toggle checked={followNotify} onChange={handleFollowToggle} />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">공지사항 알림</p>
                <p className="text-sm text-gray-500">새 공지사항이 올라오면 알림</p>
              </div>
              <Toggle checked={noticeNotify} onChange={handleNoticeToggle} />
            </div>
          </div>
        </div>

        {/* 개인정보 설정 */}
        <div className="bg-white rounded-2xl p-4 mb-4">
          <h3 className="text-sm font-bold text-gray-500 mb-4">🔒 개인정보</h3>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">프로필 공개</p>
              <p className="text-sm text-gray-500">다른 사람이 내 프로필을 볼 수 있음</p>
            </div>
            <Toggle checked={profilePublic} onChange={handleProfilePublicToggle} />
          </div>
        </div>

        {/* 계정 관리 */}
        <div className="bg-white rounded-2xl overflow-hidden mb-4">
          <h3 className="text-sm font-bold text-gray-500 px-4 pt-4 pb-2">👤 계정 관리</h3>
          
          <Link 
            href="/mypage/edit"
            className="flex items-center justify-between p-4 hover:bg-gray-50 border-b border-gray-100"
          >
            <span className="text-gray-900">프로필 수정</span>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
          
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 border-b border-gray-100 text-left"
          >
            <span className="text-gray-900">로그아웃</span>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          
          <button 
            onClick={() => setShowDeleteModal(true)}
            className="w-full flex items-center justify-between p-4 hover:bg-red-50 text-left"
          >
            <span className="text-red-500">회원 탈퇴</span>
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* 앱 정보 */}
        <div className="bg-white rounded-2xl overflow-hidden mb-4">
          <h3 className="text-sm font-bold text-gray-500 px-4 pt-4 pb-2">ℹ️ 앱 정보</h3>
          
          <Link 
            href="/terms"
            className="flex items-center justify-between p-4 hover:bg-gray-50 border-b border-gray-100"
          >
            <span className="text-gray-900">이용약관</span>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
          
          <Link 
            href="/privacy"
            className="flex items-center justify-between p-4 hover:bg-gray-50 border-b border-gray-100"
          >
            <span className="text-gray-900">개인정보처리방침</span>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
          
          <div className="flex items-center justify-between p-4">
            <span className="text-gray-900">앱 버전</span>
            <span className="text-gray-500">1.0.0</span>
          </div>
        </div>

        {/* 고객센터 */}
        <div className="bg-white rounded-2xl overflow-hidden">
          <h3 className="text-sm font-bold text-gray-500 px-4 pt-4 pb-2">📞 고객센터</h3>
          
          <a 
            href="mailto:support@yeojumarket.com"
            className="flex items-center justify-between p-4 hover:bg-gray-50 border-b border-gray-100"
          >
            <span className="text-gray-900">문의하기</span>
            <span className="text-gray-500 text-sm">support@yeojumarket.com</span>
          </a>
          
          <Link 
            href="/notices"
            className="flex items-center justify-between p-4 hover:bg-gray-50"
          >
            <span className="text-gray-900">공지사항</span>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </main>

      {/* 회원 탈퇴 모달 */}
      {showDeleteModal && (
        <div 
          className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4"
          onClick={() => setShowDeleteModal(false)}
        >
          <div 
            className="bg-white rounded-2xl p-6 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-gray-900 mb-2">회원 탈퇴</h3>
            <p className="text-gray-600 text-sm mb-4">
              탈퇴 시 모든 데이터가 삭제되며 복구할 수 없습니다.
              계속하시려면 아래에 <strong>'회원탈퇴'</strong>를 입력해주세요.
            </p>
            
            <input
              type="text"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="회원탈퇴"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl mb-4 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            
            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteConfirm(""); }}
                className="flex-1 py-3 bg-gray-200 text-gray-700 font-bold rounded-xl"
              >
                취소
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting || deleteConfirm !== "회원탈퇴"}
                className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl disabled:opacity-50"
              >
                {deleting ? "처리중..." : "탈퇴하기"}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
