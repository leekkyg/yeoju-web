"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";

export default function NotificationsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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
    await fetchNotifications(user.id);
    setLoading(false);
  };

  const fetchNotifications = async (userId: string) => {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    
    setNotifications(data || []);
    setUnreadCount((data || []).filter(n => !n.is_read).length);
  };

  const markAsRead = async (id: number) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const deleteNotification = async (id: number, isRead: boolean) => {
    await supabase.from("notifications").delete().eq("id", id);
    setNotifications(prev => prev.filter(n => n.id !== id));
    if (!isRead) setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const deleteAllNotifications = async () => {
    if (!user || !confirm("모든 알림을 삭제하시겠습니까?")) return;
    await supabase.from("notifications").delete().eq("user_id", user.id);
    setNotifications([]);
    setUnreadCount(0);
  };

  const handleClick = async (notification: any) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    
    // 타입별 이동
    if (notification.type === "message") {
      router.push("/messages");
    } else if (notification.type === "notice" && notification.notice_id) {
      router.push(`/notices/${notification.notice_id}`);
    } else if (notification.post_id) {
      router.push(`/community?post=${notification.post_id}`);
    } else if (notification.type === "follow") {
      router.push("/community");
    }
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

  const getIcon = (type: string, message: string) => {
    // 메시지에 특정 키워드가 있으면 아이콘 변경
    if (type === "notice") {
      if (message.includes("공지")) {
        return { emoji: "📢", bg: "bg-amber-100", color: "text-amber-600" };
      }
      return { emoji: "🔔", bg: "bg-orange-100", color: "text-orange-600" };
    }
    
    switch (type) {
      case "message": return { emoji: "✉️", bg: "bg-teal-100", color: "text-teal-600" };
      case "comment": return { emoji: "💬", bg: "bg-blue-100", color: "text-blue-600" };
      case "like": return { emoji: "❤️", bg: "bg-red-100", color: "text-red-600" };
      case "follow": return { emoji: "👤", bg: "bg-purple-100", color: "text-purple-600" };
      case "new_post": return { emoji: "📝", bg: "bg-emerald-100", color: "text-emerald-600" };
      case "groupbuy": return { emoji: "🛒", bg: "bg-teal-100", color: "text-teal-600" };
      default: return { emoji: "🔔", bg: "bg-gray-100", color: "text-gray-600" };
    }
  };

  // 메시지에서 앞의 이모지 제거
  const cleanMessage = (message: string) => {
    return message.replace(/^(📢|🔔|💬|❤️|👤|📝|🛒)\s*/, '');
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
            <h1 className="text-gray-900 font-bold text-lg">알림</h1>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          
          {notifications.length > 0 && (
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-emerald-600 font-medium"
                >
                  모두 읽음
                </button>
              )}
              <button
                onClick={deleteAllNotifications}
                className="text-sm text-gray-400"
              >
                전체 삭제
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-[631px] mx-auto px-4 py-4">
        {notifications.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">🔔</span>
            </div>
            <p className="text-gray-500 font-medium">알림이 없습니다</p>
            <p className="text-gray-400 text-sm mt-1">새로운 소식이 오면 알려드릴게요</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => {
              const icon = getIcon(notification.type, notification.message || '');
              const isUnread = !notification.is_read;
              
              return (
                <div
                  key={notification.id}
                  onClick={() => handleClick(notification)}
                  className={`relative bg-white rounded-2xl p-4 shadow-sm cursor-pointer transition-all hover:shadow-md ${
                    isUnread ? 'ring-2 ring-emerald-200' : ''
                  }`}
                >
                  {/* 읽지 않음 표시 */}
                  {isUnread && (
                    <div className="absolute top-4 right-4 w-2.5 h-2.5 bg-emerald-500 rounded-full"></div>
                  )}
                  
                  <div className="flex gap-3">
                    {/* 아이콘 */}
                    <div className={`w-12 h-12 ${icon.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                      <span className="text-xl">{icon.emoji}</span>
                    </div>
                    
                    {/* 내용 */}
                    <div className="flex-1 min-w-0 pr-6">
                      <p className={`text-gray-900 ${isUnread ? 'font-semibold' : ''}`}>
                        {cleanMessage(notification.message || '')}
                      </p>
                      <p className="text-gray-400 text-sm mt-1">
                        {formatDate(notification.created_at)}
                      </p>
                    </div>
                  </div>
                  
                  {/* 삭제 버튼 */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notification.id, notification.is_read);
                    }}
                    className="absolute top-4 right-10 p-1 text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
