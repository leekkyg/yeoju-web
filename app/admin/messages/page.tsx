"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/contexts/ThemeContext";
import {
  ArrowLeft,
  Send,
  History,
  Users,
  UserCheck,
  Shield,
  Search,
  X,
  Mail,
  Megaphone,
  User,
} from "lucide-react";

export default function AdminMessagesPage() {
  const router = useRouter();
  const { theme, isDark, mounted } = useTheme();
  
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
    const { data: broadcasts } = await supabase
      .from("broadcast_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    setHistory(broadcasts || []);
    
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
        const messages = selectedUsers.map(u => ({
          sender_id: user?.id,
          receiver_id: u.id,
          title,
          content,
          is_admin_message: true
        }));
        
        await supabase.from("messages").insert(messages);
        
        const notifications = selectedUsers.map(u => ({
          user_id: u.id,
          type: "message",
          message: `📬 새 쪽지: ${title}`,
          from_user_id: user?.id
        }));
        await supabase.from("notifications").insert(notifications);
        
        alert(`${selectedUsers.length}명에게 쪽지를 보냈습니다`);
        
      } else {
        const { error } = await supabase.from("broadcast_messages").insert({
          sender_id: user?.id,
          title,
          content,
          target_type: sendType,
          target_value: sendType === "role" ? targetRole : null,
          recipient_count: targetCount
        });
        
        if (error) throw error;
        
        let targetUsers;
        if (sendType === "all") {
          const { data } = await supabase.from("profiles").select("id");
          targetUsers = data || [];
        } else {
          const { data } = await supabase.from("profiles").select("id").eq("role", targetRole);
          targetUsers = data || [];
        }
        
        if (targetUsers.length > 0) {
          const notifications = targetUsers.map(u => ({
            user_id: u.id,
            type: "message",
            message: `📢 새 쪽지: ${title}`,
            from_user_id: user?.id
          }));
          
          for (let i = 0; i < notifications.length; i += 1000) {
            const batch = notifications.slice(i, i + 1000);
            await supabase.from("notifications").insert(batch);
          }
        }
        
        alert(`${targetCount}명에게 쪽지를 보냈습니다`);
      }
      
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

  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.bgMain }}>
        <div className="w-10 h-10 border-2 rounded-full animate-spin" style={{ borderColor: theme.border, borderTopColor: theme.accent }}></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen transition-colors duration-300" style={{ backgroundColor: theme.bgMain }}>
      {/* 헤더 */}
      <header className="sticky top-0 z-50" style={{ backgroundColor: theme.bgElevated, borderBottom: `1px solid ${theme.borderLight}` }}>
        <div className="max-w-[640px] mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/admin" className="p-1 -ml-1 rounded-lg" style={{ color: theme.textPrimary }}>
            <ArrowLeft className="w-6 h-6" strokeWidth={1.5} />
          </Link>
          <h1 className="text-lg font-bold" style={{ color: theme.textPrimary }}>📬 쪽지 관리</h1>
        </div>
      </header>

      <main className="max-w-[640px] mx-auto px-4 py-6">
        {/* 탭 */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("send")}
            className="flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
            style={{ 
              backgroundColor: activeTab === "send" ? theme.accent : theme.bgCard,
              color: activeTab === "send" ? (isDark ? '#121212' : '#FFF') : theme.textPrimary,
              border: `1px solid ${activeTab === "send" ? theme.accent : theme.borderLight}`
            }}
          >
            <Send className="w-4 h-4" strokeWidth={1.5} />
            쪽지 보내기
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className="flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
            style={{ 
              backgroundColor: activeTab === "history" ? theme.accent : theme.bgCard,
              color: activeTab === "history" ? (isDark ? '#121212' : '#FFF') : theme.textPrimary,
              border: `1px solid ${activeTab === "history" ? theme.accent : theme.borderLight}`
            }}
          >
            <History className="w-4 h-4" strokeWidth={1.5} />
            발송 이력
          </button>
        </div>

        {activeTab === "send" ? (
          <div className="space-y-4">
            {/* 회원 통계 */}
            <div className="rounded-2xl p-4" style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}>
              <h3 className="font-bold mb-3 flex items-center gap-2" style={{ color: theme.textPrimary }}>
                <Users className="w-4 h-4" style={{ color: theme.accent }} strokeWidth={1.5} />
                회원 현황
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl p-3 text-center" style={{ backgroundColor: theme.bgInput }}>
                  <p className="text-2xl font-bold" style={{ color: theme.textPrimary }}>{userStats.total}</p>
                  <p className="text-xs" style={{ color: theme.textMuted }}>전체</p>
                </div>
                <div className="rounded-xl p-3 text-center" style={{ backgroundColor: `${theme.accent}15` }}>
                  <p className="text-2xl font-bold" style={{ color: theme.accent }}>{userStats.users}</p>
                  <p className="text-xs" style={{ color: theme.textMuted }}>일반 회원</p>
                </div>
                <div className="rounded-xl p-3 text-center" style={{ backgroundColor: theme.successBg }}>
                  <p className="text-2xl font-bold" style={{ color: theme.success }}>{userStats.admins}</p>
                  <p className="text-xs" style={{ color: theme.textMuted }}>관리자</p>
                </div>
              </div>
            </div>

            {/* 발송 대상 선택 */}
            <div className="rounded-2xl p-4" style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}>
              <h3 className="font-bold mb-3 flex items-center gap-2" style={{ color: theme.textPrimary }}>
                <UserCheck className="w-4 h-4" style={{ color: theme.accent }} strokeWidth={1.5} />
                발송 대상
              </h3>
              
              <div className="flex gap-2 mb-4">
                {[
                  { key: "all", label: "전체 회원", icon: Users },
                  { key: "role", label: "역할별", icon: Shield },
                  { key: "individual", label: "개별 선택", icon: User },
                ].map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setSendType(opt.key as any)}
                    className="flex-1 py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-1.5 transition-colors"
                    style={{ 
                      backgroundColor: sendType === opt.key ? theme.accent : theme.bgInput,
                      color: sendType === opt.key ? (isDark ? '#121212' : '#FFF') : theme.textPrimary
                    }}
                  >
                    <opt.icon className="w-4 h-4" strokeWidth={1.5} />
                    {opt.label}
                  </button>
                ))}
              </div>

              {sendType === "role" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setTargetRole("user")}
                    className="flex-1 py-2 rounded-lg font-medium text-sm"
                    style={{ 
                      backgroundColor: targetRole === "user" ? theme.accent : theme.bgInput,
                      color: targetRole === "user" ? (isDark ? '#121212' : '#FFF') : theme.textPrimary
                    }}
                  >
                    일반 회원 ({userStats.users}명)
                  </button>
                  <button
                    onClick={() => setTargetRole("admin")}
                    className="flex-1 py-2 rounded-lg font-medium text-sm"
                    style={{ 
                      backgroundColor: targetRole === "admin" ? theme.accent : theme.bgInput,
                      color: targetRole === "admin" ? (isDark ? '#121212' : '#FFF') : theme.textPrimary
                    }}
                  >
                    관리자 ({userStats.admins}명)
                  </button>
                </div>
              )}

              {sendType === "individual" && (
                <div>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
                      <Search className="w-4 h-4" style={{ color: theme.textMuted }} strokeWidth={1.5} />
                    </div>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => { setSearchTerm(e.target.value); searchUsers(e.target.value); }}
                      placeholder="닉네임 또는 이메일로 검색"
                      className="w-full pl-10 pr-4 py-3 rounded-xl outline-none"
                      style={{ backgroundColor: theme.bgInput, border: `1px solid ${theme.border}`, color: theme.textPrimary }}
                    />
                    
                    {searchResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 rounded-xl shadow-lg z-10 max-h-48 overflow-y-auto" style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.border}` }}>
                        {searchResults.map(user => (
                          <button
                            key={user.id}
                            onClick={() => addUser(user)}
                            className="w-full px-4 py-3 text-left flex items-center justify-between transition-colors"
                            style={{ borderBottom: `1px solid ${theme.border}` }}
                          >
                            <div>
                              <p className="font-medium" style={{ color: theme.textPrimary }}>{user.nickname}</p>
                              <p className="text-sm" style={{ color: theme.textMuted }}>{user.email}</p>
                            </div>
                            <span style={{ color: theme.accent }}>+</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {selectedUsers.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {selectedUsers.map(user => (
                        <span
                          key={user.id}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm"
                          style={{ backgroundColor: `${theme.accent}20`, color: theme.accent }}
                        >
                          {user.nickname}
                          <button onClick={() => removeUser(user.id)}>
                            <X className="w-3 h-3" strokeWidth={2} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 대상 인원 표시 */}
              <div className="mt-4 p-3 rounded-xl" style={{ backgroundColor: `${theme.accent}15` }}>
                <p className="font-medium text-sm" style={{ color: theme.accent }}>
                  📨 발송 대상: {
                    sendType === "all" ? `전체 ${userStats.total}명`
                    : sendType === "role" ? `${targetRole === "user" ? "일반 회원" : "관리자"} ${targetRole === "user" ? userStats.users : userStats.admins}명`
                    : `선택된 ${selectedUsers.length}명`
                  }
                </p>
              </div>
            </div>

            {/* 메시지 작성 */}
            <div className="rounded-2xl p-4" style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}>
              <h3 className="font-bold mb-3 flex items-center gap-2" style={{ color: theme.textPrimary }}>
                <Mail className="w-4 h-4" style={{ color: theme.accent }} strokeWidth={1.5} />
                메시지 작성
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: theme.textPrimary }}>제목</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="제목을 입력하세요"
                    className="w-full px-4 py-3 rounded-xl outline-none"
                    style={{ backgroundColor: theme.bgInput, border: `1px solid ${theme.border}`, color: theme.textPrimary }}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: theme.textPrimary }}>내용</label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="내용을 입력하세요"
                    rows={6}
                    className="w-full px-4 py-3 rounded-xl resize-none outline-none"
                    style={{ backgroundColor: theme.bgInput, border: `1px solid ${theme.border}`, color: theme.textPrimary }}
                  />
                </div>
              </div>
            </div>

            {/* 발송 버튼 */}
            <button
              onClick={handleSend}
              disabled={sending || !title.trim() || !content.trim()}
              className="w-full py-4 rounded-2xl font-bold text-lg disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ backgroundColor: theme.accent, color: isDark ? '#121212' : '#FFF' }}
            >
              <Send className="w-5 h-5" strokeWidth={1.5} />
              {sending ? "발송 중..." : "쪽지 보내기"}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 전체/그룹 발송 이력 */}
            <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}>
              <div className="p-4" style={{ borderBottom: `1px solid ${theme.border}` }}>
                <h3 className="font-bold flex items-center gap-2" style={{ color: theme.textPrimary }}>
                  <Megaphone className="w-4 h-4" style={{ color: theme.accent }} strokeWidth={1.5} />
                  전체/그룹 발송 이력
                </h3>
              </div>
              
              {history.length === 0 ? (
                <div className="p-8 text-center" style={{ color: theme.textMuted }}>발송 이력이 없습니다</div>
              ) : (
                <div>
                  {history.map((item, index) => (
                    <div key={item.id} className="p-4" style={{ borderBottom: index !== history.length - 1 ? `1px solid ${theme.border}` : 'none' }}>
                      <div className="flex items-center justify-between mb-2">
                        <span 
                          className="text-[10px] px-2 py-1 rounded-full font-bold"
                          style={{ 
                            backgroundColor: item.target_type === "all" ? `${theme.accent}20` : theme.successBg,
                            color: item.target_type === "all" ? theme.accent : theme.success
                          }}
                        >
                          {getTargetLabel(item.target_type, item.target_value)}
                        </span>
                        <span className="text-xs" style={{ color: theme.textMuted }}>{formatDate(item.created_at)}</span>
                      </div>
                      <p className="font-bold" style={{ color: theme.textPrimary }}>{item.title}</p>
                      <p className="text-sm line-clamp-2 mt-1" style={{ color: theme.textSecondary }}>{item.content}</p>
                      <p className="text-xs mt-2" style={{ color: theme.textMuted }}>📨 {item.recipient_count}명에게 발송</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 개별 발송 이력 */}
            <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}>
              <div className="p-4" style={{ borderBottom: `1px solid ${theme.border}` }}>
                <h3 className="font-bold flex items-center gap-2" style={{ color: theme.textPrimary }}>
                  <User className="w-4 h-4" style={{ color: theme.accent }} strokeWidth={1.5} />
                  개별 발송 이력
                </h3>
              </div>
              
              {individualHistory.length === 0 ? (
                <div className="p-8 text-center" style={{ color: theme.textMuted }}>발송 이력이 없습니다</div>
              ) : (
                <div>
                  {individualHistory.map((item, index) => (
                    <div key={item.id} className="p-4" style={{ borderBottom: index !== individualHistory.length - 1 ? `1px solid ${theme.border}` : 'none' }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] px-2 py-1 rounded-full font-bold" style={{ backgroundColor: `${theme.accent}20`, color: theme.accent }}>개별</span>
                        <span className="text-xs" style={{ color: theme.textMuted }}>{formatDate(item.created_at)}</span>
                      </div>
                      <p className="font-bold" style={{ color: theme.textPrimary }}>{item.title}</p>
                      <p className="text-sm line-clamp-2 mt-1" style={{ color: theme.textSecondary }}>{item.content}</p>
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
