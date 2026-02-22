"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/contexts/ThemeContext";
import BottomNav from "@/components/BottomNav";
import {
  ArrowLeft,
  Mail,
  Megaphone,
  Shield,
  MessageSquare,
  X,
  Trash2,
  CheckCheck,
} from "lucide-react";

export default function MessagesPage() {
  const router = useRouter();
  const { theme, isDark, mounted } = useTheme();
  
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    checkUserAndFetch();
  }, []);

  const checkUserAndFetch = async () => {
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
    setProfile(profileData);
    
    await fetchMessages(user.id, profileData?.role);
    setLoading(false);
  };

  const fetchMessages = async (userId: string, role: string) => {
    // 개인 쪽지
    const { data: personalMessages } = await supabase
      .from("messages")
      .select("*")
      .eq("receiver_id", userId)
      .order("created_at", { ascending: false });
    
    // 전체/역할별 공지
    const { data: broadcasts } = await supabase
      .from("broadcast_messages")
      .select("*")
      .order("created_at", { ascending: false });
    
    // 읽은 공지 목록
    const { data: readBroadcasts } = await supabase
      .from("broadcast_reads")
      .select("broadcast_id")
      .eq("user_id", userId);
    
    const readBroadcastIds = new Set((readBroadcasts || []).map(r => r.broadcast_id));
    
    // 내게 해당하는 공지만 필터링
    const myBroadcasts = (broadcasts || []).filter(b => {
      if (b.target_type === "all") return true;
      if (b.target_type === "role" && b.target_value === role) return true;
      return false;
    }).map(b => ({
      ...b,
      is_broadcast: true,
      is_read: readBroadcastIds.has(b.id),
      is_admin_message: true
    }));
    
    // 병합 및 정렬
    const allMessages = [
      ...(personalMessages || []).map(m => ({ ...m, is_broadcast: false })),
      ...myBroadcasts
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    setMessages(allMessages);
    setUnreadCount(allMessages.filter(m => !m.is_read).length);
  };

  const openMessage = async (message: any) => {
    setSelectedMessage(message);
    
    if (!message.is_read) {
      if (message.is_broadcast) {
        await supabase.from("broadcast_reads").insert({
          broadcast_id: message.id,
          user_id: user.id
        });
      } else {
        await supabase.from("messages").update({ is_read: true }).eq("id", message.id);
      }
      setMessages(prev => prev.map(m => 
        (m.id === message.id && m.is_broadcast === message.is_broadcast) 
          ? { ...m, is_read: true } 
          : m
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const deleteMessage = async (message: any) => {
    if (!confirm("이 쪽지를 삭제하시겠습니까?")) return;
    
    if (message.is_broadcast) {
      alert("전체 공지는 삭제할 수 없습니다");
      return;
    }
    
    await supabase.from("messages").delete().eq("id", message.id);
    setMessages(prev => prev.filter(m => !(m.id === message.id && !m.is_broadcast)));
    if (!message.is_read) setUnreadCount(prev => Math.max(0, prev - 1));
    setSelectedMessage(null);
  };

  const markAllAsRead = async () => {
    if (!user) return;
    
    await supabase.from("messages").update({ is_read: true }).eq("receiver_id", user.id).eq("is_read", false);
    
    const unreadBroadcasts = messages.filter(m => m.is_broadcast && !m.is_read);
    if (unreadBroadcasts.length > 0) {
      const inserts = unreadBroadcasts.map(b => ({
        broadcast_id: b.id,
        user_id: user.id
      }));
      await supabase.from("broadcast_reads").upsert(inserts, { onConflict: "broadcast_id,user_id" });
    }
    
    setMessages(prev => prev.map(m => ({ ...m, is_read: true })));
    setUnreadCount(0);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return "방금 전";
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;
    return date.toLocaleDateString("ko-KR");
  };

  const formatFullDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getIcon = (message: any) => {
    if (message.is_broadcast) return Megaphone;
    if (message.is_admin_message) return Shield;
    return MessageSquare;
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
      <header className="sticky top-0 z-50" style={{ backgroundColor: theme.bgMain, borderBottom: `1px solid ${theme.borderLight}` }}>
        <div className="max-w-[640px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-1 -ml-1 rounded-lg" style={{ color: theme.textPrimary }}>
              <ArrowLeft className="w-6 h-6" strokeWidth={1.5} />
            </button>
            <h1 className="text-lg font-bold" style={{ color: theme.textPrimary }}>쪽지함</h1>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-bold rounded-full" style={{ backgroundColor: theme.accent, color: isDark ? '#121212' : '#FFF' }}>
                {unreadCount}
              </span>
            )}
          </div>
          
          {messages.length > 0 && unreadCount > 0 && (
            <button onClick={markAllAsRead} className="flex items-center gap-1 text-sm font-medium" style={{ color: theme.accent }}>
              <CheckCheck className="w-4 h-4" strokeWidth={1.5} />
              모두 읽음
            </button>
          )}
        </div>
      </header>

      <main className="max-w-[640px] mx-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="rounded-2xl py-16 text-center" style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}>
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: theme.bgInput }}>
              <Mail className="w-8 h-8" style={{ color: theme.textMuted }} strokeWidth={1.5} />
            </div>
            <p className="font-medium" style={{ color: theme.textPrimary }}>받은 쪽지가 없습니다</p>
            <p className="text-sm mt-1" style={{ color: theme.textMuted }}>관리자에게서 쪽지가 오면 여기에 표시됩니다</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message) => {
              const isUnread = !message.is_read;
              const uniqueKey = message.is_broadcast ? `b-${message.id}` : `m-${message.id}`;
              const IconComponent = getIcon(message);
              
              return (
                <div
                  key={uniqueKey}
                  onClick={() => openMessage(message)}
                  className="relative rounded-2xl p-4 cursor-pointer transition-all"
                  style={{ 
                    backgroundColor: theme.bgCard, 
                    border: `1px solid ${isUnread ? theme.accent : theme.borderLight}`,
                    opacity: isUnread ? 1 : 0.7,
                    boxShadow: isUnread ? `0 0 0 1px ${theme.accent}30` : 'none',
                  }}
                >
                  {/* 읽지 않음 표시 */}
                  {isUnread && (
                    <div className="absolute top-3 right-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ backgroundColor: theme.accent, color: isDark ? '#121212' : '#FFF' }}>
                        NEW
                      </span>
                    </div>
                  )}
                  
                  {/* 읽음 표시 */}
                  {!isUnread && (
                    <div className="absolute top-3 right-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ backgroundColor: theme.bgInput, color: theme.textMuted }}>
                        읽음
                      </span>
                    </div>
                  )}
                  
                  <div className="flex gap-3">
                    {/* 아이콘 */}
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: isUnread ? `${theme.accent}20` : theme.bgInput }}
                    >
                      <IconComponent className="w-5 h-5" style={{ color: isUnread ? theme.accent : theme.textMuted }} strokeWidth={1.5} />
                    </div>
                    
                    {/* 내용 */}
                    <div className="flex-1 min-w-0 pr-12">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {message.is_broadcast ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ backgroundColor: `${theme.accent}20`, color: theme.accent }}>전체공지</span>
                        ) : message.is_admin_message && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ backgroundColor: `${theme.accent}20`, color: theme.accent }}>관리자</span>
                        )}
                        <p className={`truncate ${isUnread ? 'font-bold' : ''}`} style={{ color: isUnread ? theme.textPrimary : theme.textMuted }}>
                          {message.title}
                        </p>
                      </div>
                      <p className="text-sm line-clamp-1" style={{ color: isUnread ? theme.textSecondary : theme.textMuted }}>{message.content}</p>
                      <p className="text-xs mt-1 font-medium" style={{ color: isUnread ? theme.accent : theme.textMuted }}>
                        {formatDate(message.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 쪽지 상세 모달 */}
      {selectedMessage && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={() => setSelectedMessage(null)}>
          <div className="rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden" style={{ backgroundColor: theme.bgCard }} onClick={(e) => e.stopPropagation()}>
            {/* 헤더 */}
            <div className="sticky top-0 px-4 py-4" style={{ backgroundColor: theme.bgCard, borderBottom: `1px solid ${theme.border}` }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap flex-1 mr-4">
                  {selectedMessage.is_broadcast ? (
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: `${theme.accent}20`, color: theme.accent }}>전체공지</span>
                  ) : selectedMessage.is_admin_message && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: `${theme.accent}20`, color: theme.accent }}>관리자</span>
                  )}
                  <h3 className="text-lg font-bold truncate" style={{ color: theme.textPrimary }}>{selectedMessage.title}</h3>
                </div>
                <button onClick={() => setSelectedMessage(null)} className="p-1 rounded-lg" style={{ color: theme.textMuted }}>
                  <X className="w-6 h-6" strokeWidth={1.5} />
                </button>
              </div>
              <p className="text-sm mt-1" style={{ color: theme.textMuted }}>{formatFullDate(selectedMessage.created_at)}</p>
            </div>
            
            {/* 내용 */}
            <div className="p-4 overflow-y-auto max-h-[50vh]">
              <p className="whitespace-pre-wrap leading-relaxed" style={{ color: theme.textSecondary }}>
                {selectedMessage.content}
              </p>
            </div>
            
            {/* 삭제 버튼 */}
            {!selectedMessage.is_broadcast && (
              <div className="p-4" style={{ borderTop: `1px solid ${theme.border}` }}>
                <button
                  onClick={() => deleteMessage(selectedMessage)}
                  className="w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
                  style={{ backgroundColor: theme.redBg, color: theme.red }}
                >
                  <Trash2 className="w-5 h-5" strokeWidth={1.5} />
                  삭제
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
