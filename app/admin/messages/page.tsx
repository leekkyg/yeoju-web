"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function AdminMessagesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"send" | "history">("send");
  
  // 발송 관련
  const [sendType, setSendType] = useState<"all" | "role" | "individual">("all");
  const [targetRole, setTargetRole] = useState("user");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  
  // 통계
  const [userStats, setUserStats] = useState({ total: 0, users: 0, admins: 0 });
  
  // 발송 이력
  const [history, setHistory] = useState<any[]>([]);
  const [individualHistory, setIndividualHistory] = useState<any[]>([]);

  useEffect(() => {
    checkAdminAndFetch();
  }, []);

  const checkAdminAndFetch = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") { alert("관리자 권한이 없습니다"); router.push("/"); return; }

    await fetchStats();
    await fetchHistory();
    setLoading(false);
  };

  const fetchStats = async () => {
    const { count: total } = await supabase.from("profiles").select("*", { count: "exact", head: true });
    const { count: users } = await supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "user");
    const { count: admins } = await supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "admin");
    setUserStats({ total: total || 0, users: users || 0, admins: admins || 0 });
  };

  const fetchHistory = async () => {
    // 전체/그룹 발송 이력
    const { data: broadcasts } = await supabase
      .from("broadcast_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    setHistory(broadcasts || []);
    
    // 개별 발송 이력 (관리자가 보낸 것)
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: individual } = await supabase
        .from("messages")
        .select("*")
        .eq("sender_id", user.id)
        .eq("is_admin_message", true)
        .order("created_at", { ascending: false })
        .limit(50);
      setIndividualHistory(individual || []);
    }
  };

  const searchUsers = async (term: string) => {
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }
    
    const { data } = await supabase
      .from("profiles")
      .select("id, nickname, email")
      .or(`nickname.ilike.%${term}%,email.ilike.%${term}%`)
      .limit(10);
    
    setSearchResults(data || []);
  };

  const addUser = (user: any) => {
    if (!selectedUsers.find(u => u.id === user.id)) {
      setSelectedUsers([...selectedUsers, user]);
    }
    setSearchTerm("");
    setSearchResults([]);
  };

  const removeUser = (userId: string) => {
    setSelectedUsers(selectedUsers.filter(u => u.id !== userId));
  };

  const handleSend = async () => {
    if (!title.trim() || !content.trim()) {
      alert("제목과 내용을 입력해주세요");
      return;
    }
    
    if (sendType === "individual" && selectedUsers.length === 0) {
      alert("받는 사람을 선택해주세요");
      return;
    }
    
    const targetCount = sendType === "all" ? userStats.total 
      : sendType === "role" ? (targetRole === "user" ? userStats.users : userStats.admins)
      : selectedUsers.length;
    
    if (!confirm(`${targetCount}명에게 쪽지를 보내시겠습니까?`)) return;
    
    setSending(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    
    try {
      if (sendType === "individual") {
        // 개별 발송
        const messages = selectedUsers.map(u => ({
          sender_id: user?.id,
          receiver_id: u.id,
          title,
          content,
          is_admin_message: true
        }));
        
        await supabase.from("messages").insert(messages);
        
        // 알림 발송
        const notifications = selectedUsers.map(u => ({
          user_id: u.id,
          type: "message",
          message: `✉️ 새 쪽지: ${title}`,
          from_user_id: user?.id
        }));
        await supabase.from("notifications").insert(notifications);
        
        alert(`${selectedUsers.length}명에게 쪽지를 보냈습니다`);
        
      } else {
        // 전체/그룹 발송 - broadcast_messages에 저장
        const { error } = await supabase.from("broadcast_messages").insert({
          sender_id: user?.id,
          title,
          content,
          target_type: sendType,
          target_value: sendType === "role" ? targetRole : null,
          recipient_count: targetCount
        });
        
        if (error) throw error;
        
        // 대상 유저 조회 후 알림 발송
        let targetUsers;
        if (sendType === "all") {
          const { data } = await supabase.from("profiles").select("id");
          targetUsers = data || [];
        } else {
          const { data } = await supabase.from("profiles").select("id").eq("role", targetRole);
          targetUsers = data || [];
        }
        
        // 알림 발송 (배치 처리)
        if (targetUsers.length > 0) {
          const notifications = targetUsers.map(u => ({
            user_id: u.id,
            type: "message",
            message: `📢 새 쪽지: ${title}`,
            from_user_id: user?.id
          }));
          
          // 1000개씩 배치 처리
          for (let i = 0; i < notifications.length; i += 1000) {
            const batch = notifications.slice(i, i + 1000);
            await supabase.from("notifications").insert(batch);
          }
        }
        
        alert(`${targetCount}명에게 쪽지를 보냈습니다`);
      }
      
      // 초기화
      setTitle("");
      setContent("");
      setSelectedUsers([]);
      await fetchHistory();
      
    } catch (error) {
      console.error(error);
      alert("발송 실패");
    }
    
    setSending(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("ko-KR");
  };

  const getTargetLabel = (type: string, value: string | null) => {
    if (type === "all") return "전체 회원";
    if (type === "role") return value === "admin" ? "관리자" : "일반 회원";
    return "개별";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 헤더 */}
      <header className="bg-gray-900 text-white sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/admin" className="text-gray-400 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="font-bold text-lg">쪽지 관리</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* 탭 */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("send")}
            className={`px-6 py-3 rounded-xl font-bold transition-colors ${
              activeTab === "send" ? "bg-emerald-500 text-white" : "bg-white text-gray-700"
            }`}
          >
            ✉️ 쪽지 보내기
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-6 py-3 rounded-xl font-bold transition-colors ${
              activeTab === "history" ? "bg-emerald-500 text-white" : "bg-white text-gray-700"
            }`}
          >
            📋 발송 이력
          </button>
        </div>

        {activeTab === "send" ? (
          <div className="space-y-4">
            {/* 회원 통계 */}
            <div className="bg-white rounded-2xl p-4">
              <h3 className="font-bold text-gray-900 mb-3">👥 회원 현황</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-gray-900">{userStats.total}</p>
                  <p className="text-sm text-gray-500">전체</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-blue-600">{userStats.users}</p>
                  <p className="text-sm text-gray-500">일반 회원</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-amber-600">{userStats.admins}</p>
                  <p className="text-sm text-gray-500">관리자</p>
                </div>
              </div>
            </div>

            {/* 발송 대상 선택 */}
            <div className="bg-white rounded-2xl p-4">
              <h3 className="font-bold text-gray-900 mb-3">📬 발송 대상</h3>
              
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setSendType("all")}
                  className={`flex-1 py-3 rounded-xl font-bold transition-colors ${
                    sendType === "all" ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-700"
                  }`}
                >
                  전체 회원
                </button>
                <button
                  onClick={() => setSendType("role")}
                  className={`flex-1 py-3 rounded-xl font-bold transition-colors ${
                    sendType === "role" ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-700"
                  }`}
                >
                  역할별
                </button>
                <button
                  onClick={() => setSendType("individual")}
                  className={`flex-1 py-3 rounded-xl font-bold transition-colors ${
                    sendType === "individual" ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-700"
                  }`}
                >
                  개별 선택
                </button>
              </div>

              {sendType === "role" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setTargetRole("user")}
                    className={`flex-1 py-2 rounded-lg font-medium ${
                      targetRole === "user" ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    일반 회원 ({userStats.users}명)
                  </button>
                  <button
                    onClick={() => setTargetRole("admin")}
                    className={`flex-1 py-2 rounded-lg font-medium ${
                      targetRole === "admin" ? "bg-amber-500 text-white" : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    관리자 ({userStats.admins}명)
                  </button>
                </div>
              )}

              {sendType === "individual" && (
                <div>
                  {/* 회원 검색 */}
                  <div className="relative">
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => { setSearchTerm(e.target.value); searchUsers(e.target.value); }}
                      placeholder="닉네임 또는 이메일로 검색"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    
                    {searchResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl mt-1 shadow-lg z-10 max-h-48 overflow-y-auto">
                        {searchResults.map(user => (
                          <button
                            key={user.id}
                            onClick={() => addUser(user)}
                            className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between"
                          >
                            <div>
                              <p className="font-medium text-gray-900">{user.nickname}</p>
                              <p className="text-sm text-gray-500">{user.email}</p>
                            </div>
                            <span className="text-emerald-500">+</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* 선택된 회원 */}
                  {selectedUsers.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {selectedUsers.map(user => (
                        <span
                          key={user.id}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm"
                        >
                          {user.nickname}
                          <button onClick={() => removeUser(user.id)} className="hover:text-emerald-900">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 대상 인원 표시 */}
              <div className="mt-4 p-3 bg-emerald-50 rounded-xl">
                <p className="text-emerald-700 font-medium">
                  📤 발송 대상: {
                    sendType === "all" ? `전체 ${userStats.total}명`
                    : sendType === "role" ? `${targetRole === "user" ? "일반 회원" : "관리자"} ${targetRole === "user" ? userStats.users : userStats.admins}명`
                    : `선택한 ${selectedUsers.length}명`
                  }
                </p>
              </div>
            </div>

            {/* 메시지 작성 */}
            <div className="bg-white rounded-2xl p-4">
              <h3 className="font-bold text-gray-900 mb-3">📝 메시지 작성</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="제목을 입력하세요"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">내용</label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="내용을 입력하세요"
                    rows={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* 발송 버튼 */}
            <button
              onClick={handleSend}
              disabled={sending || !title.trim() || !content.trim()}
              className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-bold text-lg disabled:opacity-50"
            >
              {sending ? "발송 중..." : "✉️ 쪽지 보내기"}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 전체/그룹 발송 이력 */}
            <div className="bg-white rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-gray-100">
                <h3 className="font-bold text-gray-900">📢 전체/그룹 발송 이력</h3>
              </div>
              
              {history.length === 0 ? (
                <div className="p-8 text-center text-gray-500">발송 이력이 없습니다</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {history.map((item) => (
                    <div key={item.id} className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                          item.target_type === "all" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                        }`}>
                          {getTargetLabel(item.target_type, item.target_value)}
                        </span>
                        <span className="text-xs text-gray-400">{formatDate(item.created_at)}</span>
                      </div>
                      <p className="font-bold text-gray-900">{item.title}</p>
                      <p className="text-sm text-gray-500 line-clamp-2 mt-1">{item.content}</p>
                      <p className="text-xs text-gray-400 mt-2">👥 {item.recipient_count}명에게 발송</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 개별 발송 이력 */}
            <div className="bg-white rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-gray-100">
                <h3 className="font-bold text-gray-900">👤 개별 발송 이력</h3>
              </div>
              
              {individualHistory.length === 0 ? (
                <div className="p-8 text-center text-gray-500">발송 이력이 없습니다</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {individualHistory.map((item) => (
                    <div key={item.id} className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-bold">개별</span>
                        <span className="text-xs text-gray-400">{formatDate(item.created_at)}</span>
                      </div>
                      <p className="font-bold text-gray-900">{item.title}</p>
                      <p className="text-sm text-gray-500 line-clamp-2 mt-1">{item.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
