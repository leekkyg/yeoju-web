"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/contexts/ThemeContext";
import {
  ArrowLeft,
  Search,
  MoreVertical,
  Shield,
  Ban,
  MessageSquare,
  MapPin,
  Clock,
  X,
  Send,
  ChevronDown,
  UserX,
  PenOff,
  MessageCircleOff,
  Check,
} from "lucide-react";

export default function AdminUsersPage() {
  const router = useRouter();
  const { theme, isDark, mounted } = useTheme();
  
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showMuteModal, setShowMuteModal] = useState(false);
  const [muteType, setMuteType] = useState<"post" | "comment">("post");
  const [muteDays, setMuteDays] = useState(1);
  const [muteReason, setMuteReason] = useState("");
  const [ipLogs, setIpLogs] = useState<any[]>([]);
  const [showIpLogs, setShowIpLogs] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageTitle, setMessageTitle] = useState("");
  const [messageContent, setMessageContent] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  useEffect(() => {
    checkAdminAndFetch();
  }, []);

  const checkAdminAndFetch = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) { router.push("/login"); return; }

    const { data: profile } = await supabase.from("profiles").select("*").eq("email", user.email).single();
    if (profile?.role !== "admin") { alert("관리자 권한이 없습니다"); router.push("/"); return; }

    await fetchUsers();
    setLoading(false);
  };

  const fetchUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    setUsers(data || []);
  };

  const fetchIpLogs = async (userId: string) => {
    const { data } = await supabase
      .from("user_ip_logs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);
    setIpLogs(data || []);
    setShowIpLogs(true);
  };

  const handleSendMessage = async () => {
    if (!selectedUser || !messageTitle.trim() || !messageContent.trim()) {
      alert("제목과 내용을 입력해주세요");
      return;
    }
    
    setSendingMessage(true);
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    
    const { error } = await supabase.from("messages").insert({
      sender_id: user?.id,
      receiver_id: selectedUser.id,
      title: messageTitle,
      content: messageContent,
      is_admin_message: true
    });
    
    if (error) {
      alert("메시지 전송 실패");
    } else {
      await supabase.from("notifications").insert({
        user_id: selectedUser.id,
        type: "message",
        message: `✉️ 새 쪽지: ${messageTitle}`,
        from_user_id: user?.id
      });
      
      alert(`${selectedUser.nickname}님에게 메시지를 보냈습니다`);
      setShowMessageModal(false);
      setMessageTitle("");
      setMessageContent("");
    }
    
    setSendingMessage(false);
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!confirm(`역할을 '${newRole}'로 변경하시겠습니까?`)) return;
    
    await supabase.from("profiles").update({ role: newRole }).eq("id", userId);
    setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
    setSelectedUser((prev: any) => prev ? { ...prev, role: newRole } : null);
    alert("역할이 변경되었습니다");
  };

  const handleBan = async (userId: string, isBanned: boolean) => {
    const action = isBanned ? "차단 해제" : "차단";
    if (!confirm(`이 회원을 ${action}하시겠습니까?`)) return;
    
    await supabase.from("profiles").update({ is_banned: !isBanned }).eq("id", userId);
    setUsers(users.map(u => u.id === userId ? { ...u, is_banned: !isBanned } : u));
    setSelectedUser((prev: any) => prev ? { ...prev, is_banned: !isBanned } : null);
    alert(`${action}되었습니다`);
  };

  const handleMute = async () => {
    if (!selectedUser || !muteReason.trim()) {
      alert("제재 사유를 입력해주세요");
      return;
    }

    const muteUntil = new Date();
    muteUntil.setDate(muteUntil.getDate() + muteDays);

    const updateData: any = { mute_reason: muteReason };
    if (muteType === "post") {
      updateData.mute_post_until = muteUntil.toISOString();
    } else {
      updateData.mute_comment_until = muteUntil.toISOString();
    }

    await supabase.from("profiles").update(updateData).eq("id", selectedUser.id);
    
    setUsers(users.map(u => u.id === selectedUser.id ? { ...u, ...updateData } : u));
    setSelectedUser((prev: any) => prev ? { ...prev, ...updateData } : null);
    
    setShowMuteModal(false);
    setMuteReason("");
    setMuteDays(1);
    alert(`${muteType === "post" ? "글쓰기" : "댓글"} 제한이 ${muteDays}일간 적용되었습니다`);
  };

  const handleUnmute = async (userId: string, type: "post" | "comment") => {
    const field = type === "post" ? "mute_post_until" : "mute_comment_until";
    const label = type === "post" ? "글쓰기" : "댓글";
    
    if (!confirm(`${label} 제한을 해제하시겠습니까?`)) return;

    await supabase.from("profiles").update({ [field]: null }).eq("id", userId);
    setUsers(users.map(u => u.id === userId ? { ...u, [field]: null } : u));
    setSelectedUser((prev: any) => prev ? { ...prev, [field]: null } : null);
    alert(`${label} 제한이 해제되었습니다`);
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString("ko-KR", { year: "numeric", month: "short", day: "numeric" });
  const formatDateTime = (d: string) => new Date(d).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  const isMuted = (user: any, type: "post" | "comment") => {
    const field = type === "post" ? "mute_post_until" : "mute_comment_until";
    if (!user[field]) return false;
    return new Date(user[field]) > new Date();
  };

  const getMuteRemaining = (until: string) => {
    const diff = new Date(until).getTime() - Date.now();
    if (diff <= 0) return "만료됨";
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return `${days}일 ${hours}시간`;
    return `${hours}시간`;
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.nickname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === "all" || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  if (!mounted || loading) {
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
        <div className="max-w-[640px] mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/admin" className="p-1 -ml-1 rounded-lg" style={{ color: theme.textPrimary }}>
            <ArrowLeft className="w-6 h-6" strokeWidth={1.5} />
          </Link>
          <h1 className="text-lg font-bold" style={{ color: theme.textPrimary }}>👥 회원 관리</h1>
        </div>
      </header>

      <main className="max-w-[640px] mx-auto px-4 py-4">
        {/* 검색 & 필터 */}
        <section className="rounded-2xl p-4 mb-4" style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}>
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: theme.textMuted }} strokeWidth={1.5} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="닉네임 또는 이메일 검색"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-[15px] outline-none"
                style={{ backgroundColor: theme.bgInput, border: `1px solid ${theme.border}`, color: theme.textPrimary }}
              />
            </div>
            <div className="relative">
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="w-full md:w-auto px-4 py-2.5 pr-10 rounded-xl text-[15px] outline-none appearance-none"
                style={{ backgroundColor: theme.bgInput, border: `1px solid ${theme.border}`, color: theme.textPrimary }}
              >
                <option value="all">전체 역할</option>
                <option value="admin">관리자</option>
                <option value="user">일반회원</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: theme.textMuted }} />
            </div>
          </div>
        </section>

        {/* 통계 */}
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-sm" style={{ color: theme.textMuted }}>총 {filteredUsers.length}명</span>
        </div>

        {/* 회원 목록 */}
        <section className="rounded-2xl overflow-hidden" style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}>
          {filteredUsers.length === 0 ? (
            <div className="p-8 text-center" style={{ color: theme.textMuted }}>검색 결과가 없습니다</div>
          ) : (
            filteredUsers.map((user, index) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4"
                style={{ 
                  borderBottom: index !== filteredUsers.length - 1 ? `1px solid ${theme.border}` : 'none',
                  backgroundColor: user.is_banned ? theme.redBg : 'transparent'
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center overflow-hidden"
                    style={{ backgroundColor: user.role === "admin" ? theme.accent : theme.bgInput, border: `1px solid ${theme.border}` }}
                  >
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-bold" style={{ color: user.role === "admin" ? (isDark ? '#121212' : '#FFFFFF') : theme.textMuted }}>
                        {user.nickname?.[0]?.toUpperCase() || "U"}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold" style={{ color: theme.textPrimary }}>{user.nickname || "이름없음"}</span>
                      {user.role === "admin" && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: `${theme.accent}20`, color: theme.accent }}>관리자</span>
                      )}
                      {user.is_banned && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: theme.redBg, color: theme.red }}>차단</span>
                      )}
                      {isMuted(user, "post") && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: `${theme.accent}15`, color: theme.accent }}>글제한</span>
                      )}
                      {isMuted(user, "comment") && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: `${theme.accent}15`, color: theme.accent }}>댓글제한</span>
                      )}
                    </div>
                    <p className="text-sm" style={{ color: theme.textMuted }}>{user.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedUser(user)}
                  className="p-2 rounded-lg transition-colors"
                  style={{ color: theme.textMuted }}
                >
                  <MoreVertical className="w-5 h-5" strokeWidth={1.5} />
                </button>
              </div>
            ))
          )}
        </section>
      </main>

      {/* 회원 상세 모달 */}
      {selectedUser && !showMuteModal && !showIpLogs && !showMessageModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={() => setSelectedUser(null)}>
          <div className="rounded-2xl p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto" style={{ backgroundColor: theme.bgCard }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-4 mb-6">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden"
                style={{ backgroundColor: selectedUser.role === "admin" ? theme.accent : theme.bgInput, border: `2px solid ${theme.border}` }}
              >
                {selectedUser.avatar_url ? (
                  <img src={selectedUser.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold" style={{ color: selectedUser.role === "admin" ? (isDark ? '#121212' : '#FFFFFF') : theme.textMuted }}>
                    {selectedUser.nickname?.[0]?.toUpperCase() || "U"}
                  </span>
                )}
              </div>
              <div>
                <h3 className="text-xl font-bold" style={{ color: theme.textPrimary }}>{selectedUser.nickname || "이름없음"}</h3>
                <p className="text-sm" style={{ color: theme.textMuted }}>{selectedUser.email}</p>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between py-2" style={{ borderBottom: `1px solid ${theme.border}` }}>
                <span style={{ color: theme.textMuted }}>가입일</span>
                <span style={{ color: theme.textPrimary }}>{formatDate(selectedUser.created_at)}</span>
              </div>
              <div className="flex justify-between py-2" style={{ borderBottom: `1px solid ${theme.border}` }}>
                <span style={{ color: theme.textMuted }}>역할</span>
                <span className="font-semibold" style={{ color: selectedUser.role === "admin" ? theme.accent : theme.textPrimary }}>
                  {selectedUser.role === "admin" ? "관리자" : "일반회원"}
                </span>
              </div>
              <div className="flex justify-between py-2" style={{ borderBottom: `1px solid ${theme.border}` }}>
                <span style={{ color: theme.textMuted }}>상태</span>
                <span className="font-semibold" style={{ color: selectedUser.is_banned ? theme.red : theme.success }}>
                  {selectedUser.is_banned ? "차단됨" : "정상"}
                </span>
              </div>
            </div>

            {/* 제재 현황 */}
            <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: theme.bgInput }}>
              <h4 className="font-bold mb-3" style={{ color: theme.textPrimary }}>🔇 제재 현황</h4>
              
              <div className="flex items-center justify-between py-2" style={{ borderBottom: `1px solid ${theme.border}` }}>
                <div>
                  <span className="text-sm font-medium" style={{ color: theme.textPrimary }}>글쓰기</span>
                  {isMuted(selectedUser, "post") && (
                    <p className="text-xs" style={{ color: theme.accent }}>{getMuteRemaining(selectedUser.mute_post_until)} 남음</p>
                  )}
                </div>
                {isMuted(selectedUser, "post") ? (
                  <button onClick={() => handleUnmute(selectedUser.id, "post")} className="px-3 py-1 text-xs rounded-full font-bold" style={{ backgroundColor: theme.success, color: '#FFF' }}>해제</button>
                ) : (
                  <button onClick={() => { setMuteType("post"); setShowMuteModal(true); }} className="px-3 py-1 text-xs rounded-full font-bold" style={{ backgroundColor: theme.accent, color: isDark ? '#121212' : '#FFF' }}>제한</button>
                )}
              </div>
              
              <div className="flex items-center justify-between py-2">
                <div>
                  <span className="text-sm font-medium" style={{ color: theme.textPrimary }}>댓글</span>
                  {isMuted(selectedUser, "comment") && (
                    <p className="text-xs" style={{ color: theme.accent }}>{getMuteRemaining(selectedUser.mute_comment_until)} 남음</p>
                  )}
                </div>
                {isMuted(selectedUser, "comment") ? (
                  <button onClick={() => handleUnmute(selectedUser.id, "comment")} className="px-3 py-1 text-xs rounded-full font-bold" style={{ backgroundColor: theme.success, color: '#FFF' }}>해제</button>
                ) : (
                  <button onClick={() => { setMuteType("comment"); setShowMuteModal(true); }} className="px-3 py-1 text-xs rounded-full font-bold" style={{ backgroundColor: theme.accent, color: isDark ? '#121212' : '#FFF' }}>제한</button>
                )}
              </div>

              {selectedUser.mute_reason && (
                <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${theme.border}` }}>
                  <p className="text-xs" style={{ color: theme.textMuted }}>제재 사유:</p>
                  <p className="text-sm" style={{ color: theme.textPrimary }}>{selectedUser.mute_reason}</p>
                </div>
              )}
            </div>

            {/* 역할 변경 */}
            <div className="mb-4">
              <p className="text-sm font-bold mb-2" style={{ color: theme.textPrimary }}>역할 변경</p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleRoleChange(selectedUser.id, "user")}
                  className="flex-1 py-2.5 rounded-xl font-semibold transition-colors"
                  style={{ backgroundColor: selectedUser.role === "user" ? theme.accent : theme.bgInput, color: selectedUser.role === "user" ? (isDark ? '#121212' : '#FFF') : theme.textPrimary, border: `1px solid ${theme.border}` }}
                >
                  일반회원
                </button>
                <button
                  onClick={() => handleRoleChange(selectedUser.id, "admin")}
                  className="flex-1 py-2.5 rounded-xl font-semibold transition-colors"
                  style={{ backgroundColor: selectedUser.role === "admin" ? theme.accent : theme.bgInput, color: selectedUser.role === "admin" ? (isDark ? '#121212' : '#FFF') : theme.textPrimary, border: `1px solid ${theme.border}` }}
                >
                  관리자
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <button onClick={() => setShowMessageModal(true)} className="w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2" style={{ backgroundColor: theme.accent, color: isDark ? '#121212' : '#FFF' }}>
                <MessageSquare className="w-5 h-5" strokeWidth={1.5} /> 쪽지 보내기
              </button>
              <button onClick={() => fetchIpLogs(selectedUser.id)} className="w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2" style={{ backgroundColor: theme.bgInput, color: theme.textPrimary, border: `1px solid ${theme.border}` }}>
                <MapPin className="w-5 h-5" strokeWidth={1.5} /> IP 기록 보기
              </button>
              <button
                onClick={() => handleBan(selectedUser.id, selectedUser.is_banned)}
                className="w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
                style={{ backgroundColor: selectedUser.is_banned ? theme.success : theme.red, color: '#FFF' }}
              >
                {selectedUser.is_banned ? <><Check className="w-5 h-5" strokeWidth={1.5} /> 차단 해제</> : <><Ban className="w-5 h-5" strokeWidth={1.5} /> 회원 차단</>}
              </button>
              <button onClick={() => setSelectedUser(null)} className="w-full py-3 font-semibold" style={{ color: theme.textMuted }}>닫기</button>
            </div>
          </div>
        </div>
      )}

      {/* 벙어리 설정 모달 */}
      {showMuteModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 z-[110] flex items-center justify-center p-4" onClick={() => setShowMuteModal(false)}>
          <div className="rounded-2xl p-6 w-full max-w-sm" style={{ backgroundColor: theme.bgCard }} onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4" style={{ color: theme.textPrimary }}>
              🔇 {muteType === "post" ? "글쓰기" : "댓글"} 제한
            </h3>
            <p className="text-sm mb-4" style={{ color: theme.textMuted }}>
              <strong style={{ color: theme.textPrimary }}>{selectedUser.nickname}</strong>님에게 {muteType === "post" ? "글쓰기" : "댓글"} 제한을 적용합니다.
            </p>

            <div className="mb-4">
              <p className="text-sm font-medium mb-2" style={{ color: theme.textPrimary }}>제한 기간</p>
              <div className="grid grid-cols-5 gap-2">
                {[1, 3, 7, 14, 30].map(day => (
                  <button
                    key={day}
                    onClick={() => setMuteDays(day)}
                    className="py-2 rounded-lg text-sm font-semibold"
                    style={{ backgroundColor: muteDays === day ? theme.accent : theme.bgInput, color: muteDays === day ? (isDark ? '#121212' : '#FFF') : theme.textPrimary, border: `1px solid ${theme.border}` }}
                  >
                    {day}일
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <p className="text-sm font-medium mb-2" style={{ color: theme.textPrimary }}>제재 사유</p>
              <textarea
                value={muteReason}
                onChange={(e) => setMuteReason(e.target.value)}
                placeholder="제재 사유를 입력하세요"
                rows={3}
                className="w-full px-4 py-3 rounded-xl text-[15px] outline-none resize-none"
                style={{ backgroundColor: theme.bgInput, border: `1px solid ${theme.border}`, color: theme.textPrimary }}
              />
            </div>

            <div className="flex gap-2">
              <button onClick={() => setShowMuteModal(false)} className="flex-1 py-3 rounded-xl font-semibold" style={{ backgroundColor: theme.bgInput, color: theme.textPrimary, border: `1px solid ${theme.border}` }}>취소</button>
              <button onClick={handleMute} className="flex-1 py-3 rounded-xl font-semibold" style={{ backgroundColor: theme.accent, color: isDark ? '#121212' : '#FFF' }}>{muteDays}일 제한</button>
            </div>
          </div>
        </div>
      )}

      {/* IP 로그 모달 */}
      {showIpLogs && selectedUser && (
        <div className="fixed inset-0 bg-black/50 z-[110] flex items-center justify-center p-4" onClick={() => setShowIpLogs(false)}>
          <div className="rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto" style={{ backgroundColor: theme.bgCard }} onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4" style={{ color: theme.textPrimary }}>📍 {selectedUser.nickname}님의 IP 기록</h3>
            
            {ipLogs.length === 0 ? (
              <p className="text-center py-8" style={{ color: theme.textMuted }}>기록이 없습니다</p>
            ) : (
              <div className="space-y-2">
                {ipLogs.map((log, index) => (
                  <div key={index} className="rounded-xl p-3" style={{ backgroundColor: theme.bgInput }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-sm font-bold" style={{ color: theme.textPrimary }}>{log.ip_address}</span>
                      <span className="text-xs" style={{ color: theme.textMuted }}>{formatDateTime(log.created_at)}</span>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: theme.bgCard, color: theme.textMuted }}>{log.action || "접속"}</span>
                    {log.user_agent && <p className="text-xs mt-1 truncate" style={{ color: theme.textMuted }}>{log.user_agent}</p>}
                  </div>
                ))}
              </div>
            )}

            <button onClick={() => setShowIpLogs(false)} className="w-full mt-4 py-3 rounded-xl font-semibold" style={{ backgroundColor: theme.accent, color: isDark ? '#121212' : '#FFF' }}>닫기</button>
          </div>
        </div>
      )}

      {/* 메시지 보내기 모달 */}
      {showMessageModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 z-[110] flex items-center justify-center p-4" onClick={() => setShowMessageModal(false)}>
          <div className="rounded-2xl p-6 w-full max-w-md" style={{ backgroundColor: theme.bgCard }} onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4" style={{ color: theme.textPrimary }}>✉️ 쪽지 보내기</h3>
            <p className="text-sm mb-4" style={{ color: theme.textMuted }}>
              <strong style={{ color: theme.textPrimary }}>{selectedUser.nickname}</strong>님에게 쪽지를 보냅니다.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: theme.textPrimary }}>제목</label>
                <input
                  type="text"
                  value={messageTitle}
                  onChange={(e) => setMessageTitle(e.target.value)}
                  placeholder="제목을 입력하세요"
                  className="w-full px-4 py-3 rounded-xl text-[15px] outline-none"
                  style={{ backgroundColor: theme.bgInput, border: `1px solid ${theme.border}`, color: theme.textPrimary }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: theme.textPrimary }}>내용</label>
                <textarea
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  placeholder="내용을 입력하세요"
                  rows={5}
                  className="w-full px-4 py-3 rounded-xl resize-none text-[15px] outline-none"
                  style={{ backgroundColor: theme.bgInput, border: `1px solid ${theme.border}`, color: theme.textPrimary }}
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button onClick={() => { setShowMessageModal(false); setMessageTitle(""); setMessageContent(""); }} className="flex-1 py-3 rounded-xl font-semibold" style={{ backgroundColor: theme.bgInput, color: theme.textPrimary, border: `1px solid ${theme.border}` }}>취소</button>
              <button onClick={handleSendMessage} disabled={sendingMessage} className="flex-1 py-3 rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2" style={{ backgroundColor: theme.accent, color: isDark ? '#121212' : '#FFF' }}>
                <Send className="w-4 h-4" strokeWidth={1.5} />
                {sendingMessage ? "전송 중..." : "보내기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
