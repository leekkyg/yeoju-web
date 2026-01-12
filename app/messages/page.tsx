"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";

export default function MessagesPage() {
  const router = useRouter();
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
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      router.push("/login");
      return;
    }
    
    setUser(user);
    
    // 프로필 조회 (역할 확인용)
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
    // 1. 개인 쪽지 조회
    const { data: personalMessages } = await supabase
      .from("messages")
      .select("*")
      .eq("receiver_id", userId)
      .order("created_at", { ascending: false });
    
    // 2. 전체/그룹 쪽지 조회
    const { data: broadcasts } = await supabase
      .from("broadcast_messages")
      .select("*")
      .order("created_at", { ascending: false });
    
    // 3. 읽은 브로드캐스트 목록 조회
    const { data: readBroadcasts } = await supabase
      .from("broadcast_reads")
      .select("broadcast_id")
      .eq("user_id", userId);
    
    const readBroadcastIds = new Set((readBroadcasts || []).map(r => r.broadcast_id));
    
    // 4. 내게 해당하는 브로드캐스트만 필터링
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
    
    // 5. 합치고 정렬
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
        // 브로드캐스트 읽음 처리
        await supabase.from("broadcast_reads").insert({
          broadcast_id: message.id,
          user_id: user.id
        });
      } else {
        // 개인 쪽지 읽음 처리
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
      // 브로드캐스트는 읽음 처리만 (삭제 불가)
      alert("전체 쪽지는 삭제할 수 없습니다");
      return;
    }
    
    await supabase.from("messages").delete().eq("id", message.id);
    setMessages(prev => prev.filter(m => !(m.id === message.id && !m.is_broadcast)));
    if (!message.is_read) setUnreadCount(prev => Math.max(0, prev - 1));
    setSelectedMessage(null);
  };

  const markAllAsRead = async () => {
    if (!user) return;
    
    // 개인 쪽지 읽음 처리
    await supabase.from("messages").update({ is_read: true }).eq("receiver_id", user.id).eq("is_read", false);
    
    // 브로드캐스트 읽음 처리
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
            <h1 className="text-gray-900 font-bold text-lg">쪽지함</h1>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 bg-emerald-500 text-white text-xs font-bold rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          
          {messages.length > 0 && unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-sm text-emerald-600 font-medium"
            >
              모두 읽음
            </button>
          )}
        </div>
      </header>

      <main className="max-w-[631px] mx-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">✉️</span>
            </div>
            <p className="text-gray-500 font-medium">받은 쪽지가 없습니다</p>
            <p className="text-gray-400 text-sm mt-1">새로운 쪽지가 오면 알려드릴게요</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message, index) => {
              const isUnread = !message.is_read;
              const uniqueKey = message.is_broadcast ? `b-${message.id}` : `m-${message.id}`;
              
              return (
                <div
                  key={uniqueKey}
                  onClick={() => openMessage(message)}
                  className={`relative rounded-2xl p-4 cursor-pointer transition-all ${
                    isUnread 
                      ? 'bg-emerald-50 border-2 border-emerald-400 shadow-md' 
                      : 'bg-white border border-gray-100 opacity-60'
                  }`}
                >
                  {/* 읽지 않음 표시 */}
                  {isUnread && (
                    <div className="absolute top-3 right-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500 text-white">
                        NEW
                      </span>
                    </div>
                  )}
                  
                  {/* 읽음 표시 */}
                  {!isUnread && (
                    <div className="absolute top-3 right-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-500">
                        읽음
                      </span>
                    </div>
                  )}
                  
                  <div className="flex gap-3">
                    {/* 아이콘 */}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isUnread
                        ? (message.is_broadcast ? 'bg-emerald-200' : message.is_admin_message ? 'bg-amber-200' : 'bg-blue-200')
                        : 'bg-gray-100'
                    }`}>
                      <span className={`text-xl ${!isUnread ? 'opacity-50' : ''}`}>
                        {message.is_broadcast ? '📢' : message.is_admin_message ? '👑' : '✉️'}
                      </span>
                    </div>
                    
                    {/* 내용 */}
                    <div className="flex-1 min-w-0 pr-12">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {message.is_broadcast ? (
                          <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${isUnread ? 'bg-emerald-200 text-emerald-700' : 'bg-gray-200 text-gray-500'}`}>전체공지</span>
                        ) : message.is_admin_message && (
                          <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${isUnread ? 'bg-amber-200 text-amber-700' : 'bg-gray-200 text-gray-500'}`}>관리자</span>
                        )}
                        <p className={`truncate ${isUnread ? 'text-gray-900 font-bold' : 'text-gray-500'}`}>
                          {message.title}
                        </p>
                      </div>
                      <p className={`text-sm line-clamp-1 ${isUnread ? 'text-gray-600' : 'text-gray-400'}`}>{message.content}</p>
                      <p className={`text-xs mt-1 ${isUnread ? 'text-emerald-600 font-medium' : 'text-gray-400'}`}>
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
        <div 
          className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4"
          onClick={() => setSelectedMessage(null)}
        >
          <div 
            className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedMessage.is_broadcast ? (
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">전체공지</span>
                  ) : selectedMessage.is_admin_message && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">관리자</span>
                  )}
                  <h3 className="text-lg font-bold text-gray-900">{selectedMessage.title}</h3>
                </div>
                <button 
                  onClick={() => setSelectedMessage(null)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-gray-400 text-sm mt-1">{formatFullDate(selectedMessage.created_at)}</p>
            </div>
            
            {/* 내용 */}
            <div className="p-4 overflow-y-auto max-h-[50vh]">
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                {selectedMessage.content}
              </p>
            </div>
            
            {/* 하단 버튼 */}
            {!selectedMessage.is_broadcast && (
              <div className="border-t border-gray-100 p-4">
                <button
                  onClick={() => deleteMessage(selectedMessage)}
                  className="w-full py-3 bg-red-50 text-red-500 rounded-xl font-bold"
                >
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
