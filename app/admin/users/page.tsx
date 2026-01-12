"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AdminUsersPage() {
  const router = useRouter();
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
    const { data: { user } } = await supabase.auth.getUser();
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
    
    const { data: { user } } = await supabase.auth.getUser();
    
    // 쪽지 발송
    const { error } = await supabase.from("messages").insert({
      sender_id: user?.id,
      receiver_id: selectedUser.id,
      title: messageTitle,
      content: messageContent,
      is_admin_message: true
    });
    
    if (error) {
      alert("메시지 전송 실패");
      console.error(error);
    } else {
      // 알림 발송
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

  const formatDate = (d: string) => {
    return new Date(d).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDateTime = (d: string) => {
    return new Date(d).toLocaleString("ko-KR", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

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
    if (days > 0) return `${days}일 ${hours}시간 남음`;
    return `${hours}시간 남음`;
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.nickname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === "all" || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  if (loading) {
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
        <div className="max-w-[631px] mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/admin" className="text-gray-400 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-white font-bold text-lg">👥 회원 관리</h1>
        </div>
      </header>

      <main className="max-w-[631px] mx-auto px-4 py-6">
        {/* 검색 & 필터 */}
        <div className="bg-white rounded-xl p-4 shadow-md mb-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="닉네임 또는 이메일 검색"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">전체 역할</option>
              <option value="admin">관리자</option>
              <option value="user">일반회원</option>
            </select>
          </div>
        </div>

        {/* 통계 */}
        <div className="flex items-center justify-between mb-4 px-1">
          <span className="text-sm text-gray-500">총 {filteredUsers.length}명</span>
        </div>

        {/* 회원 목록 */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-gray-500">검색 결과가 없습니다</div>
          ) : (
            filteredUsers.map((user, index) => (
              <div
                key={user.id}
                className={`flex items-center justify-between p-4 ${
                  index !== filteredUsers.length - 1 ? "border-b border-gray-100" : ""
                } ${user.is_banned ? "bg-red-50" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    user.role === "admin" ? "bg-amber-500" : "bg-gray-300"
                  }`}>
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <span className={`font-bold ${user.role === "admin" ? "text-white" : "text-gray-600"}`}>
                        {user.nickname?.[0]?.toUpperCase() || "U"}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-gray-900">{user.nickname || "이름없음"}</span>
                      {user.role === "admin" && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">관리자</span>
                      )}
                      {user.is_banned && (
                        <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold">차단</span>
                      )}
                      {isMuted(user, "post") && (
                        <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-bold">글제한</span>
                      )}
                      {isMuted(user, "comment") && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-bold">댓글제한</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedUser(user)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      </main>

      {/* 회원 상세 모달 */}
      {selectedUser && !showMuteModal && !showIpLogs && !showMessageModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={() => setSelectedUser(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-4 mb-6">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                selectedUser.role === "admin" ? "bg-amber-500" : "bg-gray-300"
              }`}>
                {selectedUser.avatar_url ? (
                  <img src={selectedUser.avatar_url} alt="" className="w-16 h-16 rounded-full object-cover" />
                ) : (
                  <span className={`text-2xl font-bold ${selectedUser.role === "admin" ? "text-white" : "text-gray-600"}`}>
                    {selectedUser.nickname?.[0]?.toUpperCase() || "U"}
                  </span>
                )}
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{selectedUser.nickname || "이름없음"}</h3>
                <p className="text-sm text-gray-500">{selectedUser.email}</p>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">가입일</span>
                <span className="text-gray-900">{formatDate(selectedUser.created_at)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">역할</span>
                <span className={`font-bold ${selectedUser.role === "admin" ? "text-amber-600" : "text-gray-900"}`}>
                  {selectedUser.role === "admin" ? "관리자" : "일반회원"}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">상태</span>
                <span className={selectedUser.is_banned ? "text-red-600 font-bold" : "text-green-600"}>
                  {selectedUser.is_banned ? "차단됨" : "정상"}
                </span>
              </div>
            </div>

            {/* 제재 현황 */}
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <h4 className="font-bold text-gray-700 mb-3">🔇 제재 현황</h4>
              
              {/* 글쓰기 제한 */}
              <div className="flex items-center justify-between py-2 border-b border-gray-200">
                <div>
                  <span className="text-sm font-medium">글쓰기</span>
                  {isMuted(selectedUser, "post") && (
                    <p className="text-xs text-orange-600">{getMuteRemaining(selectedUser.mute_post_until)}</p>
                  )}
                </div>
                {isMuted(selectedUser, "post") ? (
                  <button
                    onClick={() => handleUnmute(selectedUser.id, "post")}
                    className="px-3 py-1 text-xs bg-green-500 text-white rounded-full font-bold"
                  >
                    해제
                  </button>
                ) : (
                  <button
                    onClick={() => { setMuteType("post"); setShowMuteModal(true); }}
                    className="px-3 py-1 text-xs bg-orange-500 text-white rounded-full font-bold"
                  >
                    제한
                  </button>
                )}
              </div>
              
              {/* 댓글 제한 */}
              <div className="flex items-center justify-between py-2">
                <div>
                  <span className="text-sm font-medium">댓글</span>
                  {isMuted(selectedUser, "comment") && (
                    <p className="text-xs text-purple-600">{getMuteRemaining(selectedUser.mute_comment_until)}</p>
                  )}
                </div>
                {isMuted(selectedUser, "comment") ? (
                  <button
                    onClick={() => handleUnmute(selectedUser.id, "comment")}
                    className="px-3 py-1 text-xs bg-green-500 text-white rounded-full font-bold"
                  >
                    해제
                  </button>
                ) : (
                  <button
                    onClick={() => { setMuteType("comment"); setShowMuteModal(true); }}
                    className="px-3 py-1 text-xs bg-purple-500 text-white rounded-full font-bold"
                  >
                    제한
                  </button>
                )}
              </div>

              {selectedUser.mute_reason && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-500">제재 사유:</p>
                  <p className="text-sm text-gray-700">{selectedUser.mute_reason}</p>
                </div>
              )}
            </div>

            {/* 역할 변경 */}
            <div className="space-y-2 mb-4">
              <p className="text-sm font-bold text-gray-700">역할 변경</p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleRoleChange(selectedUser.id, "user")}
                  className={`flex-1 py-2 rounded-lg font-bold ${
                    selectedUser.role === "user" ? "bg-gray-900 text-white" : "bg-gray-200 text-gray-700"
                  }`}
                >
                  일반회원
                </button>
                <button
                  onClick={() => handleRoleChange(selectedUser.id, "admin")}
                  className={`flex-1 py-2 rounded-lg font-bold ${
                    selectedUser.role === "admin" ? "bg-amber-500 text-gray-900" : "bg-gray-200 text-gray-700"
                  }`}
                >
                  관리자
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {/* 메시지 보내기 */}
              <button
                onClick={() => setShowMessageModal(true)}
                className="w-full py-3 bg-emerald-500 text-white rounded-xl font-bold"
              >
                ✉️ 쪽지 보내기
              </button>
              
              {/* IP 로그 보기 */}
              <button
                onClick={() => fetchIpLogs(selectedUser.id)}
                className="w-full py-3 bg-gray-200 text-gray-700 rounded-xl font-bold"
              >
                📍 IP 기록 보기
              </button>
              
              {/* 차단 */}
              <button
                onClick={() => handleBan(selectedUser.id, selectedUser.is_banned)}
                className={`w-full py-3 rounded-xl font-bold ${
                  selectedUser.is_banned
                    ? "bg-green-500 text-white"
                    : "bg-red-500 text-white"
                }`}
              >
                {selectedUser.is_banned ? "🔓 차단 해제" : "🚫 회원 차단"}
              </button>
              
              <button
                onClick={() => setSelectedUser(null)}
                className="w-full py-3 text-gray-500 font-bold"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 벙어리 설정 모달 */}
      {showMuteModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 z-[110] flex items-center justify-center p-4" onClick={() => setShowMuteModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              🔇 {muteType === "post" ? "글쓰기" : "댓글"} 제한
            </h3>
            
            <p className="text-sm text-gray-600 mb-4">
              <strong>{selectedUser.nickname}</strong>님에게 {muteType === "post" ? "글쓰기" : "댓글"} 제한을 적용합니다.
            </p>

            {/* 기간 선택 */}
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">제한 기간</p>
              <div className="grid grid-cols-4 gap-2">
                {[1, 3, 7, 14, 30].map(day => (
                  <button
                    key={day}
                    onClick={() => setMuteDays(day)}
                    className={`py-2 rounded-lg text-sm font-bold ${
                      muteDays === day
                        ? "bg-amber-500 text-gray-900"
                        : "bg-gray-200 text-gray-700"
                    }`}
                  >
                    {day}일
                  </button>
                ))}
              </div>
            </div>

            {/* 사유 입력 */}
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">제재 사유</p>
              <textarea
                value={muteReason}
                onChange={(e) => setMuteReason(e.target.value)}
                placeholder="제재 사유를 입력하세요 (회원에게 표시됩니다)"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowMuteModal(false)}
                className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold"
              >
                취소
              </button>
              <button
                onClick={handleMute}
                className={`flex-1 py-3 ${muteType === "post" ? "bg-orange-500" : "bg-purple-500"} text-white rounded-xl font-bold`}
              >
                {muteDays}일 제한
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IP 로그 모달 */}
      {showIpLogs && selectedUser && (
        <div className="fixed inset-0 bg-black/50 z-[110] flex items-center justify-center p-4" onClick={() => setShowIpLogs(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              📍 {selectedUser.nickname}님의 IP 기록
            </h3>
            
            {ipLogs.length === 0 ? (
              <p className="text-gray-500 text-center py-8">기록이 없습니다</p>
            ) : (
              <div className="space-y-2">
                {ipLogs.map((log, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-sm font-bold text-gray-900">{log.ip_address}</span>
                      <span className="text-xs text-gray-500">{formatDateTime(log.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">{log.action || "접속"}</span>
                    </div>
                    {log.user_agent && (
                      <p className="text-xs text-gray-400 mt-1 truncate">{log.user_agent}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setShowIpLogs(false)}
              className="w-full mt-4 py-3 bg-gray-900 text-white rounded-xl font-bold"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* 메시지 보내기 모달 */}
      {showMessageModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 z-[110] flex items-center justify-center p-4" onClick={() => setShowMessageModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              ✉️ 쪽지 보내기
            </h3>
            
            <p className="text-sm text-gray-600 mb-4">
              <strong>{selectedUser.nickname}</strong>님에게 쪽지를 보냅니다.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
                <input
                  type="text"
                  value={messageTitle}
                  onChange={(e) => setMessageTitle(e.target.value)}
                  placeholder="제목을 입력하세요"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">내용</label>
                <textarea
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  placeholder="내용을 입력하세요"
                  rows={5}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => { setShowMessageModal(false); setMessageTitle(""); setMessageContent(""); }}
                className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold"
              >
                취소
              </button>
              <button
                onClick={handleSendMessage}
                disabled={sendingMessage}
                className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-bold disabled:opacity-50"
              >
                {sendingMessage ? "전송 중..." : "보내기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
