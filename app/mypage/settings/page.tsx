"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/contexts/ThemeContext";
import BottomNav from "@/components/BottomNav";
import {
  ArrowLeft,
  Bell,
  MessageCircle,
  Heart,
  UserPlus,
  Megaphone,
  Eye,
  User,
  LogOut,
  Trash2,
  FileText,
  Shield,
  Info,
  Mail,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const { theme, isDark, mounted } = useTheme();
  
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // 알림 설정
  const [pushEnabled, setPushEnabled] = useState(true);
  const [commentNotify, setCommentNotify] = useState(true);
  const [likeNotify, setLikeNotify] = useState(true);
  const [followNotify, setFollowNotify] = useState(true);
  const [noticeNotify, setNoticeNotify] = useState(true);
  
  // 개인정보 설정
  const [profilePublic, setProfilePublic] = useState(true);
  
  // 탈퇴
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

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
      setPushEnabled(profileData.push_enabled ?? true);
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
    
    if (!confirm("정말 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
      return;
    }
    
    setDeleting(true);
    
    try {
      await supabase.from("profiles").delete().eq("id", user.id);
      await supabase.auth.signOut();
      alert("회원 탈퇴가 완료되었습니다");
      router.push("/");
    } catch (error) {
      alert("탈퇴 중 오류가 발생했습니다");
      setDeleting(false);
    }
  };

  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
    <button
      onClick={() => onChange(!checked)}
      className="w-12 h-7 rounded-full transition-colors"
      style={{ backgroundColor: checked ? theme.accent : theme.bgInput }}
    >
      <div
        className="w-5 h-5 rounded-full shadow transition-transform mx-1"
        style={{ 
          backgroundColor: '#FFFFFF',
          transform: checked ? 'translateX(20px)' : 'translateX(0)',
        }}
      />
    </button>
  );

  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.bgMain }}>
        <div className="w-10 h-10 border-2 rounded-full animate-spin" style={{ borderColor: theme.border, borderTopColor: theme.accent }}></div>
      </div>
    );
  }

  const notificationSettings = [
    { label: "푸시 알림", desc: "모든 알림 받기", checked: pushEnabled, onChange: handlePushToggle, icon: Bell },
    { label: "댓글 알림", desc: "내 글에 댓글이 달리면 알림", checked: commentNotify, onChange: handleCommentToggle, icon: MessageCircle },
    { label: "좋아요 알림", desc: "내 글에 좋아요가 달리면 알림", checked: likeNotify, onChange: handleLikeToggle, icon: Heart },
    { label: "팔로우 알림", desc: "누군가 나를 팔로우하면 알림", checked: followNotify, onChange: handleFollowToggle, icon: UserPlus },
    { label: "공지사항 알림", desc: "새로운 공지사항이 등록되면 알림", checked: noticeNotify, onChange: handleNoticeToggle, icon: Megaphone },
  ];

  return (
    <div className="min-h-screen pb-24 transition-colors duration-300" style={{ backgroundColor: theme.bgMain }}>
      {/* 헤더 */}
      <header className="sticky top-0 z-50" style={{ backgroundColor: theme.bgMain, borderBottom: `1px solid ${theme.borderLight}` }}>
        <div className="max-w-[640px] mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1 -ml-1 rounded-lg" style={{ color: theme.textPrimary }}>
            <ArrowLeft className="w-6 h-6" strokeWidth={1.5} />
          </button>
          <h1 className="text-lg font-bold" style={{ color: theme.textPrimary }}>설정</h1>
        </div>
      </header>

      <main className="max-w-[640px] mx-auto px-4 py-4">
        {/* 알림 설정 */}
        <section className="rounded-2xl p-4 mb-4" style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}>
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: theme.textMuted }}>
            <Bell className="w-4 h-4" strokeWidth={1.5} />
            알림 설정
          </h3>
          
          <div className="space-y-4">
            {notificationSettings.map((setting, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: theme.bgInput }}>
                    <setting.icon className="w-4 h-4" style={{ color: theme.accent }} strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="font-medium text-sm" style={{ color: theme.textPrimary }}>{setting.label}</p>
                    <p className="text-xs" style={{ color: theme.textMuted }}>{setting.desc}</p>
                  </div>
                </div>
                <Toggle checked={setting.checked} onChange={setting.onChange} />
              </div>
            ))}
          </div>
        </section>

        {/* 개인정보 설정 */}
        <section className="rounded-2xl p-4 mb-4" style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}>
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: theme.textMuted }}>
            <Eye className="w-4 h-4" strokeWidth={1.5} />
            개인정보 설정
          </h3>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: theme.bgInput }}>
                <User className="w-4 h-4" style={{ color: theme.accent }} strokeWidth={1.5} />
              </div>
              <div>
                <p className="font-medium text-sm" style={{ color: theme.textPrimary }}>프로필 공개</p>
                <p className="text-xs" style={{ color: theme.textMuted }}>다른 사용자가 내 프로필을 볼 수 있음</p>
              </div>
            </div>
            <Toggle checked={profilePublic} onChange={handleProfilePublicToggle} />
          </div>
        </section>

        {/* 계정 관리 */}
        <section className="rounded-2xl overflow-hidden mb-4" style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}>
          <h3 className="text-sm font-bold px-4 pt-4 pb-2 flex items-center gap-2" style={{ color: theme.textMuted }}>
            <User className="w-4 h-4" strokeWidth={1.5} />
            계정 관리
          </h3>
          
          <Link href="/mypage/edit" className="flex items-center justify-between p-4 transition-colors" style={{ borderBottom: `1px solid ${theme.border}` }}>
            <span style={{ color: theme.textPrimary }}>프로필 수정</span>
            <ChevronRight className="w-5 h-5" style={{ color: theme.textMuted }} strokeWidth={1.5} />
          </Link>
          
          <button onClick={handleLogout} className="w-full flex items-center justify-between p-4 text-left transition-colors" style={{ borderBottom: `1px solid ${theme.border}` }}>
            <span style={{ color: theme.textPrimary }}>로그아웃</span>
            <LogOut className="w-5 h-5" style={{ color: theme.textMuted }} strokeWidth={1.5} />
          </button>
          
          <button onClick={() => setShowDeleteModal(true)} className="w-full flex items-center justify-between p-4 text-left transition-colors">
            <span style={{ color: theme.red }}>회원 탈퇴</span>
            <Trash2 className="w-5 h-5" style={{ color: theme.red }} strokeWidth={1.5} />
          </button>
        </section>

        {/* 앱 정보 */}
        <section className="rounded-2xl overflow-hidden mb-4" style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}>
          <h3 className="text-sm font-bold px-4 pt-4 pb-2 flex items-center gap-2" style={{ color: theme.textMuted }}>
            <Info className="w-4 h-4" strokeWidth={1.5} />
            앱 정보
          </h3>
          
          <Link href="/terms" className="flex items-center justify-between p-4 transition-colors" style={{ borderBottom: `1px solid ${theme.border}` }}>
            <span style={{ color: theme.textPrimary }}>이용약관</span>
            <ChevronRight className="w-5 h-5" style={{ color: theme.textMuted }} strokeWidth={1.5} />
          </Link>
          
          <Link href="/privacy" className="flex items-center justify-between p-4 transition-colors" style={{ borderBottom: `1px solid ${theme.border}` }}>
            <span style={{ color: theme.textPrimary }}>개인정보처리방침</span>
            <ChevronRight className="w-5 h-5" style={{ color: theme.textMuted }} strokeWidth={1.5} />
          </Link>
          
          <div className="flex items-center justify-between p-4">
            <span style={{ color: theme.textPrimary }}>앱 버전</span>
            <span style={{ color: theme.textMuted }}>1.0.0</span>
          </div>
        </section>

        {/* 고객센터 */}
        <section className="rounded-2xl overflow-hidden" style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}>
          <h3 className="text-sm font-bold px-4 pt-4 pb-2 flex items-center gap-2" style={{ color: theme.textMuted }}>
            <Mail className="w-4 h-4" strokeWidth={1.5} />
            고객센터
          </h3>
          
          <a href="mailto:support@yeojumarket.com" className="flex items-center justify-between p-4 transition-colors" style={{ borderBottom: `1px solid ${theme.border}` }}>
            <span style={{ color: theme.textPrimary }}>문의하기</span>
            <span className="text-sm" style={{ color: theme.textMuted }}>support@yeojumarket.com</span>
          </a>
          
          <Link href="/notices" className="flex items-center justify-between p-4 transition-colors">
            <span style={{ color: theme.textPrimary }}>공지사항</span>
            <ChevronRight className="w-5 h-5" style={{ color: theme.textMuted }} strokeWidth={1.5} />
          </Link>
        </section>
      </main>

      {/* 회원 탈퇴 모달 */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={() => setShowDeleteModal(false)}>
          <div className="rounded-2xl p-6 w-full max-w-sm" style={{ backgroundColor: theme.bgCard }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-6 h-6" style={{ color: theme.red }} strokeWidth={1.5} />
              <h3 className="text-xl font-bold" style={{ color: theme.textPrimary }}>회원 탈퇴</h3>
            </div>
            <p className="text-sm mb-4" style={{ color: theme.textSecondary }}>
              회원 탈퇴 시 모든 데이터가 삭제되며 복구할 수 없습니다.
              탈퇴를 원하시면 <strong style={{ color: theme.red }}>'회원탈퇴'</strong>를 입력해주세요.
            </p>
            
            <input
              type="text"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="회원탈퇴"
              className="w-full px-4 py-3 rounded-xl mb-4 outline-none"
              style={{ backgroundColor: theme.bgInput, border: `1px solid ${theme.border}`, color: theme.textPrimary }}
            />
            
            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteConfirm(""); }}
                className="flex-1 py-3 rounded-xl font-semibold"
                style={{ backgroundColor: theme.bgInput, color: theme.textPrimary, border: `1px solid ${theme.border}` }}
              >
                취소
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting || deleteConfirm !== "회원탈퇴"}
                className="flex-1 py-3 rounded-xl font-semibold disabled:opacity-50"
                style={{ backgroundColor: theme.red, color: '#FFFFFF' }}
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
