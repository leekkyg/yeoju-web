// app/api/notifications/auto/route.ts
// 자동 알림 발송 API (GitHub Actions에서 매시간 호출)
// @ts-nocheck

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// 서버사이드 Supabase 클라이언트 (service role key 사용)
const supabase = createClient(
  "https://izcgdugcpjidrupgkran.supabase.co",
  "sb_secret_lsUXXvXu_gUIfYMwvgK-fg_WloZgD0W"
);

// API 보안을 위한 시크릿 키 검증
const API_SECRET = "yeoju-auto-notify-2026";

export async function POST(request: NextRequest) {
  try {
    // 보안 검증
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${API_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 모든 알림 체크 실행
    const results = await Promise.all([
      sendPickupReminders(),      // 픽업 1시간 전
      sendPaymentReminders(),     // 마감 2시간 전
      sendEndingSoonToSeller(),   // 마감 1시간 전 (셀러)
    ]);

    return NextResponse.json({ 
      success: true, 
      results: {
        pickupReminder: results[0],
        paymentReminder: results[1],
        endingSoon: results[2],
      }
    });
  } catch (error: any) {
    console.error("Auto notification error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ==========================================
// 1. 픽업 1시간 전 리마인더
// 입금완료자에게 픽업 장소/시간 안내
// ==========================================
async function sendPickupReminders() {
  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
  
  // 오늘 날짜
  const todayStr = now.toISOString().split("T")[0];
  
  // 현재 시간 + 1시간 = 픽업 시작 시간인 공구 찾기
  const currentHour = oneHourLater.getHours();
  const currentMinute = oneHourLater.getMinutes();
  const targetTime = `${String(currentHour).padStart(2, "0")}:${String(currentMinute).padStart(2, "0")}`;
  
  // 픽업 시작 시간이 1시간 후인 공구 (±30분 범위)
  const { data: groupBuys, error: gbError } = await supabase
    .from("group_buys")
    .select(`
      id, title, pickup_date, pickup_location, pickup_start_time, pickup_end_time,
      shop:shops(name)
    `)
    .eq("pickup_date", todayStr)
    .in("status", ["active", "confirmed"]);

  if (gbError || !groupBuys?.length) {
    return { sent: 0, message: "No pickups in 1 hour" };
  }

  let totalSent = 0;

  for (const gb of groupBuys) {
    // 픽업 시작 시간 체크 (1시간 전 ± 30분 범위)
    if (!gb.pickup_start_time) continue;
    
    const pickupHour = parseInt(gb.pickup_start_time.split(":")[0]);
    const pickupMinute = parseInt(gb.pickup_start_time.split(":")[1] || "0");
    
    // 현재 시간과 픽업 시간 차이 계산 (분 단위)
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const pickupMinutes = pickupHour * 60 + pickupMinute;
    const diffMinutes = pickupMinutes - nowMinutes;
    
    // 45분 ~ 75분 사이 (약 1시간 전)
    if (diffMinutes < 45 || diffMinutes > 75) continue;

    // 이미 발송했는지 체크 (중복 방지)
    const { data: existingNotif } = await supabase
      .from("notifications")
      .select("id")
      .eq("group_buy_id", gb.id)
      .eq("type", "pickup")
      .gte("created_at", todayStr + "T00:00:00")
      .limit(1);

    if (existingNotif?.length) continue; // 이미 발송됨

    // 입금완료 상태인 참여자
    const { data: participants } = await supabase
      .from("group_buy_participants")
      .select("user_id, name")
      .eq("group_buy_id", gb.id)
      .eq("status", "paid")
      .not("user_id", "is", null);

    if (!participants?.length) continue;

    const pickupTime = `${gb.pickup_start_time?.slice(0,5)} ~ ${gb.pickup_end_time?.slice(0,5)}`;

    // 알림 생성
    const notifications = participants.map((p) => ({
      user_id: p.user_id,
      title: "픽업 시간이 다가왔어요! 📦",
      message: `[${gb.title}] 곧 픽업 시간입니다!\n📍 ${gb.pickup_location}\n🕐 ${pickupTime}`,
      type: "pickup",
      group_buy_id: gb.id,
      link: `/groupbuy/${gb.id}`,
    }));

    const { error } = await supabase.from("notifications").insert(notifications);
    if (!error) {
      totalSent += notifications.length;
    }
  }

  return { sent: totalSent, type: "pickup-1hour" };
}

// ==========================================
// 2. 마감 2시간 전 - 부드러운 입금 확인 요청
// 미입금자에게 친절한 리마인더
// ==========================================
async function sendPaymentReminders() {
  const now = new Date();
  const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  
  // 2시간 후가 마감인 공구 찾기
  const twoHoursLaterStr = twoHoursLater.toISOString();
  const nowStr = now.toISOString();

  const { data: groupBuys, error: gbError } = await supabase
    .from("group_buys")
    .select(`
      id, title, end_at, sale_price,
      shop:shops(name, bank_name, bank_account, bank_holder)
    `)
    .gte("end_at", nowStr)
    .lte("end_at", twoHoursLaterStr)
    .eq("status", "active");

  if (gbError || !groupBuys?.length) {
    return { sent: 0, message: "No groups ending in 2 hours" };
  }

  let totalSent = 0;

  for (const gb of groupBuys) {
    // 마감까지 남은 시간 체크 (1시간 30분 ~ 2시간 30분)
    const endTime = new Date(gb.end_at);
    const diffMinutes = (endTime.getTime() - now.getTime()) / (1000 * 60);
    
    if (diffMinutes < 90 || diffMinutes > 150) continue;

    // 이미 발송했는지 체크
    const todayStr = now.toISOString().split("T")[0];
    const { data: existingNotif } = await supabase
      .from("notifications")
      .select("id")
      .eq("group_buy_id", gb.id)
      .eq("type", "reminder")
      .ilike("title", "%입금%")
      .gte("created_at", todayStr + "T00:00:00")
      .limit(1);

    if (existingNotif?.length) continue;

    // 미입금 상태인 참여자
    const { data: participants } = await supabase
      .from("group_buy_participants")
      .select("user_id, name, quantity")
      .eq("group_buy_id", gb.id)
      .eq("status", "unpaid")
      .not("user_id", "is", null);

    if (!participants?.length) continue;

    // 알림 생성 (부드러운 톤)
    const notifications = participants.map((p) => ({
      user_id: p.user_id,
      title: "입금 확인 부탁드려요 🙏",
      message: `[${gb.title}] 공구 마감이 2시간 남았어요.\n혹시 입금하셨다면 확인이 늦어지고 있을 수 있으니 조금만 기다려주세요!`,
      type: "reminder",
      group_buy_id: gb.id,
      link: `/groupbuy/${gb.id}`,
    }));

    const { error } = await supabase.from("notifications").insert(notifications);
    if (!error) {
      totalSent += notifications.length;
    }
  }

  return { sent: totalSent, type: "payment-2hours" };
}

// ==========================================
// 3. 마감 1시간 전 - 셀러에게 알림
// ==========================================
async function sendEndingSoonToSeller() {
  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
  
  const oneHourLaterStr = oneHourLater.toISOString();
  const nowStr = now.toISOString();

  const { data: groupBuys, error: gbError } = await supabase
    .from("group_buys")
    .select(`
      id, title, end_at, min_quantity, current_quantity,
      shop:shops(id, name, owner_id)
    `)
    .gte("end_at", nowStr)
    .lte("end_at", oneHourLaterStr)
    .eq("status", "active");

  if (gbError || !groupBuys?.length) {
    return { sent: 0, message: "No groups ending in 1 hour" };
  }

  let totalSent = 0;

  for (const gb of groupBuys) {
    // 마감까지 남은 시간 체크 (45분 ~ 75분)
    const endTime = new Date(gb.end_at);
    const diffMinutes = (endTime.getTime() - now.getTime()) / (1000 * 60);
    
    if (diffMinutes < 45 || diffMinutes > 75) continue;

    const shop = gb.shop as any;
    if (!shop?.owner_id) continue;

    // 이미 발송했는지 체크
    const todayStr = now.toISOString().split("T")[0];
    const { data: existingNotif } = await supabase
      .from("notifications")
      .select("id")
      .eq("group_buy_id", gb.id)
      .eq("user_id", shop.owner_id)
      .ilike("title", "%마감%")
      .gte("created_at", todayStr + "T00:00:00")
      .limit(1);

    if (existingNotif?.length) continue;

    const progress = Math.round((gb.current_quantity / gb.min_quantity) * 100);
    const isAchieved = gb.current_quantity >= gb.min_quantity;

    // 셀러에게 알림
    const notification = {
      user_id: shop.owner_id,
      title: "공구가 곧 마감됩니다! ⏰",
      message: isAchieved 
        ? `[${gb.title}] 1시간 후 마감! 목표 달성 완료 🎉 (${gb.current_quantity}/${gb.min_quantity}개)`
        : `[${gb.title}] 1시간 후 마감! 현재 ${gb.current_quantity}/${gb.min_quantity}개 (${progress}%)`,
      type: "reminder",
      group_buy_id: gb.id,
      shop_id: shop.id,
      link: `/shop/groupbuy/${gb.id}`,
    };

    const { error } = await supabase.from("notifications").insert(notification);
    if (!error) {
      totalSent += 1;
    }
  }

  return { sent: totalSent, type: "ending-1hour-seller" };
}
