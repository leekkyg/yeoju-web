"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/contexts/ThemeContext";
import BottomNav from "@/components/BottomNav";
import {
  ArrowLeft,
  Bell,
  Mail,
  MessageCircle,
  Heart,
  User,
  FileText,
  ShoppingCart,
  Megaphone,
  X,
  CheckCheck,
  Trash2,
} from "lucide-react";

export default function NotificationsPage() {
  const router = useRouter();
  const { theme, isDark, mounted } = useTheme();
  
  const [user, setUser] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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

  const getIcon = (type: string) => {
    switch (type) {
      case "message": return Mail;
      case "comment": return MessageCircle;
      case "like": return Heart;
      case "follow": return User;
      case "new_post": return FileText;
      case "groupbuy": return ShoppingCart;
      case "notice": return Megaphone;
      default: return Bell;
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case "message": return theme.accent;
      case "comment": return theme.accent;
      case "like": return theme.red;
      case "follow": return theme.accent;
      case "new_post": return theme.accent;
      case "groupbuy": return theme.accent;
      case "notice": return theme.accent;
      default: return theme.textMuted;
    }
  };

  const cleanMessage = (message: string) => {
    return message.replace(/^(📢|🔔|💬|❤️|👤|📝|🛒|✉️)\s*/, '');
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
            <h1 className="text-lg font-bold" style={{ color: theme.textPrimary }}>알림</h1>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-bold rounded-full" style={{ backgroundColor: theme.red, color: '#FFF' }}>
                {unreadCount}
              </span>
            )}
          </div>
          
          {notifications.length > 0 && (
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button onClick={markAllAsRead} className="flex items-center gap-1 text-sm font-medium" style={{ color: theme.accent }}>
                  <CheckCheck className="w-4 h-4" strokeWidth={1.5} />
                  모두 읽음
                </button>
              )}
              <button onClick={deleteAllNotifications} className="text-sm" style={{ color: theme.textMuted }}>
                전체 삭제
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-[640px] mx-auto px-4 py-4">
        {notifications.length === 0 ? (
          <div className="rounded-2xl py-16 text-center" style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}>
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: theme.bgInput }}>
              <Bell className="w-8 h-8" style={{ color: theme.textMuted }} strokeWidth={1.5} />
            </div>
            <p className="font-medium" style={{ color: theme.textPrimary }}>알림이 없습니다</p>
            <p className="text-sm mt-1" style={{ color: theme.textMuted }}>새로운 소식이 오면 알려드릴게요</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => {
              const IconComponent = getIcon(notification.type);
              const iconColor = getIconColor(notification.type);
              const isUnread = !notification.is_read;
              
              return (
                <div
                  key={notification.id}
                  onClick={() => handleClick(notification)}
                  className="relative rounded-2xl p-4 cursor-pointer transition-all"
                  style={{ 
                    backgroundColor: theme.bgCard, 
                    border: `1px solid ${isUnread ? theme.accent : theme.borderLight}`,
                    boxShadow: isUnread ? `0 0 0 1px ${theme.accent}30` : 'none',
                  }}
                >
                  {/* 읽지 않음 표시 */}
                  {isUnread && (
                    <div className="absolute top-4 right-4 w-2.5 h-2.5 rounded-full" style={{ backgroundColor: theme.accent }}></div>
                  )}
                  
                  <div className="flex gap-3">
                    {/* 아이콘 */}
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${iconColor}15` }}>
                      <IconComponent className="w-5 h-5" style={{ color: iconColor }} strokeWidth={1.5} />
                    </div>
                    
                    {/* 내용 */}
                    <div className="flex-1 min-w-0 pr-6">
                      <p className={isUnread ? 'font-semibold' : ''} style={{ color: theme.textPrimary }}>
                        {cleanMessage(notification.message || '')}
                      </p>
                      <p className="text-sm mt-1" style={{ color: theme.textMuted }}>
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
                    className="absolute top-4 right-10 p-1 rounded transition-colors"
                    style={{ color: theme.textMuted }}
                  >
                    <X className="w-4 h-4" strokeWidth={1.5} />
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
