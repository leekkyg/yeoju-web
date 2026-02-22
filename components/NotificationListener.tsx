"use client";

import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import NotificationSound from "@/lib/notification-sound";

interface NotificationListenerProps {
  userId: string | null;
  soundEnabled?: boolean;
}

export default function NotificationListener({ userId, soundEnabled = true }: NotificationListenerProps) {
  const lastNotificationCount = useRef<number>(0);
  const lastMessageCount = useRef<number>(0);
  const isFirstLoad = useRef<boolean>(true);
  const reminderCount = useRef<number>(0); // 리마인더 횟수
  const hasUnread = useRef<boolean>(false); // 읽지 않은 알림 있는지

  useEffect(() => {
    if (!userId || !soundEnabled) return;

    // 초기 카운트 로드
    const initCounts = async () => {
      const { count: notifCount } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_read", false);
      
      const { count: msgCount } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("receiver_id", userId)
        .eq("is_read", false);
      
      lastNotificationCount.current = notifCount || 0;
      lastMessageCount.current = msgCount || 0;
      hasUnread.current = (notifCount || 0) > 0 || (msgCount || 0) > 0;
      isFirstLoad.current = false;
    };

    initCounts();

    // 5초마다 새 알림 체크
    const checkInterval = setInterval(async () => {
      if (isFirstLoad.current) return;

      // 알림 체크
      const { count: notifCount } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_read", false);
      
      const newNotifCount = notifCount || 0;
      
      // 새 알림 왔을 때
      if (newNotifCount > lastNotificationCount.current) {
        NotificationSound.playInApp();
        reminderCount.current = 0; // 리마인더 카운트 리셋
        hasUnread.current = true;
      }
      lastNotificationCount.current = newNotifCount;

      // 쪽지 체크
      const { count: msgCount } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("receiver_id", userId)
        .eq("is_read", false);
      
      const newMsgCount = msgCount || 0;
      
      // 새 쪽지 왔을 때
      if (newMsgCount > lastMessageCount.current) {
        NotificationSound.playMessage();
        reminderCount.current = 0; // 리마인더 카운트 리셋
        hasUnread.current = true;
      }
      lastMessageCount.current = newMsgCount;

      // 읽지 않은 거 없으면 리셋
      if (newNotifCount === 0 && newMsgCount === 0) {
        hasUnread.current = false;
        reminderCount.current = 0;
      }

    }, 5000); // 5초마다

    // 5분마다 리마인더 (최대 3번)
    const reminderInterval = setInterval(async () => {
      if (!hasUnread.current || reminderCount.current >= 3) return;

      // 아직 읽지 않은 알림/쪽지 있는지 확인
      const { count: notifCount } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_read", false);
      
      const { count: msgCount } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("receiver_id", userId)
        .eq("is_read", false);

      if ((notifCount || 0) > 0 || (msgCount || 0) > 0) {
        // 쪽지가 있으면 쪽지 소리, 아니면 알림 소리
        if ((msgCount || 0) > 0) {
          NotificationSound.playMessage();
        } else {
          NotificationSound.playInApp();
        }
        reminderCount.current += 1;
      } else {
        hasUnread.current = false;
        reminderCount.current = 0;
      }

    }, 5 * 60 * 1000); // 5분마다

    return () => {
      clearInterval(checkInterval);
      clearInterval(reminderInterval);
    };
  }, [userId, soundEnabled]);

  return null;
}
