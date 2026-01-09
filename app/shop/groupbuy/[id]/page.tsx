"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface GroupBuy {
  id: number;
  title: string;
  description: string;
  original_price: number;
  sale_price: number;
  min_quantity: number;
  max_quantity: number;
  current_quantity: number;
  end_at: string;
  pickup_date: string;
  pickup_start_time: string;
  pickup_end_time: string;
  pickup_location: string;
  image_url: string;
  status: string;
  status_reason: string;
  created_at: string;
}

interface Participant {
  id: number;
  name: string;
  phone: string;
  quantity: number;
  status: "unpaid" | "paid" | "picked" | "cancelled";
  paid_at: string;
  picked_at: string;
  cancelled_at: string;
  cancel_reason: string;
  created_at: string;
  user_id: string;
  total_orders?: number;
}

type FilterType = "all" | "unpaid" | "paid" | "picked" | "cancelled";

export default function ShopGroupBuyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [groupBuy, setGroupBuy] = useState<GroupBuy | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [activeTab, setActiveTab] = useState<"info" | "participants">("participants");
  
  // 필터
  const [filter, setFilter] = useState<FilterType>("all");
  
  // 타이머
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  
  // 모달 상태
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusAction, setStatusAction] = useState<"cancel" | "pause" | "complete" | null>(null);
  const [selectedReason, setSelectedReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [processing, setProcessing] = useState(false);

  // 참여자 상세 모달
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  
  // 참여자 취소 모달
  const [showCancelParticipantModal, setShowCancelParticipantModal] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Participant | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  // 알림 발송 모달
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notificationType, setNotificationType] = useState<"unpaid" | "paid" | "custom">("unpaid");
  const [customNotifTitle, setCustomNotifTitle] = useState("");
  const [customNotifMessage, setCustomNotifMessage] = useState("");
  const [sendingNotification, setSendingNotification] = useState(false);

  const cancelReasons = [
    "최소 인원 미달",
    "재료 소진",
    "업체 사정",
    "기타 (직접 입력)",
  ];

  const pauseReasons = [
    "일시적 재료 부족",
    "업체 휴무",
    "기타 (직접 입력)",
  ];

  const participantCancelReasons = [
    "고객 요청",
    "연락 두절",
    "입금 기한 초과",
    "기타 (직접 입력)",
  ];

  useEffect(() => {
    fetchData();
  }, [params.id]);

  // 타이머 업데이트
  useEffect(() => {
    if (!groupBuy?.end_at) return;
    
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(groupBuy.end_at).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [groupBuy?.end_at]);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const { data: gbData, error } = await supabase
      .from("group_buys")
      .select("*")
      .eq("id", params.id)
      .single();

    if (error || !gbData) {
      alert("공동구매를 찾을 수 없습니다");
      router.push("/shop/dashboard");
      return;
    }

    setGroupBuy(gbData);

    const { data: participantsData } = await supabase
      .from("group_buy_participants")
      .select("*")
      .eq("group_buy_id", params.id)
      .order("created_at", { ascending: true });

    if (participantsData && participantsData.length > 0) {
      const enrichedParticipants = await Promise.all(
        participantsData.map(async (p) => {
          let totalOrders = 1;
          if (p.user_id) {
            const { count } = await supabase
              .from("group_buy_participants")
              .select("*", { count: "exact", head: true })
              .eq("user_id", p.user_id);
            totalOrders = count || 1;
          }
          
          let status: Participant["status"] = "unpaid";
          if (p.status && ["unpaid", "paid", "picked", "cancelled"].includes(p.status)) {
            status = p.status as Participant["status"];
          } else if (p.is_paid) {
            status = "paid";
          }
          
          return { ...p, total_orders: totalOrders, status };
        })
      );
      setParticipants(enrichedParticipants);
    } else {
      setParticipants(participantsData || []);
    }

    setLoading(false);
  };

  const getStatusBadge = () => {
    if (!groupBuy) return null;
    const now = new Date();
    const end = new Date(groupBuy.end_at);

    if (groupBuy.status === "cancelled") {
      return <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-bold">취소됨</span>;
    }
    if (groupBuy.status === "paused") {
      return <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-bold">중단됨</span>;
    }
    if (groupBuy.status === "completed") {
      return <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-bold">종료</span>;
    }
    if (end < now) {
      return <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-sm font-bold">마감</span>;
    }
    if (groupBuy.current_quantity >= groupBuy.min_quantity) {
      return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-bold">확정</span>;
    }
    return <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-bold">진행중</span>;
  };

  const getParticipantStatusBadge = (status: Participant["status"]) => {
    switch (status) {
      case "unpaid":
        return { label: "미입금", color: "bg-red-500 text-white", icon: "⚠" };
      case "paid":
        return { label: "입금확인", color: "bg-[#19643D] text-white", icon: "✓" };
      case "picked":
        return { label: "픽업완료", color: "bg-blue-500 text-white", icon: "📦" };
      case "cancelled":
        return { label: "취소", color: "bg-gray-400 text-white", icon: "✕" };
      default:
        return { label: "미입금", color: "bg-red-500 text-white", icon: "⚠" };
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const formatPickupDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
    return `${date.getMonth() + 1}월 ${date.getDate()}일 (${weekdays[date.getDay()]})`;
  };

  const openStatusModal = (action: "cancel" | "pause" | "complete") => {
    setStatusAction(action);
    setSelectedReason("");
    setCustomReason("");
    setShowStatusModal(true);
  };

  const canComplete = () => {
    const activeParticipants = participants.filter(p => p.status !== "cancelled");
    return activeParticipants.every(p => p.status === "picked");
  };

  const getIncompleteStatus = () => {
    const unpaid = participants.filter(p => p.status === "unpaid").length;
    const paid = participants.filter(p => p.status === "paid").length;
    return { unpaid, waitingPickup: paid };
  };

  const handleStatusChange = async () => {
    if (statusAction === "complete") {
      if (!canComplete()) {
        alert("모든 참여자의 처리가 완료되지 않았습니다.\n픽업완료 또는 취소 처리 후 종료해주세요.");
        return;
      }
    } else if (statusAction === "cancel" && !selectedReason) {
      alert("사유를 선택해주세요");
      return;
    }

    const reason = selectedReason === "기타 (직접 입력)" ? customReason : selectedReason;
    
    if (selectedReason === "기타 (직접 입력)" && !customReason.trim()) {
      alert("사유를 입력해주세요");
      return;
    }

    setProcessing(true);

    const statusMap = {
      cancel: "cancelled",
      pause: "paused",
      complete: "completed",
    };

    const pickedCount = participants.filter(p => p.status === "picked").length;
    const totalPicked = participants.filter(p => p.status === "picked").reduce((sum, p) => sum + (p.quantity * (groupBuy?.sale_price || 0)), 0);

    await supabase
      .from("group_buys")
      .update({ 
        status: statusMap[statusAction!],
        status_reason: statusAction === "complete" 
          ? `총 ${pickedCount}건 픽업완료, ${totalPicked.toLocaleString()}원 정산 - 공동구매가 정상 종료되었습니다.`
          : reason
      })
      .eq("id", params.id);

    // 🔔 참여자 전체에게 알림 발송
    const activeParticipants = participants.filter(p => p.status !== "cancelled" && p.user_id);
    
    if (statusAction === "cancel" && activeParticipants.length > 0) {
      // 공구 취소 알림
      const notifications = activeParticipants.map(p => ({
        user_id: p.user_id,
        title: "공동구매가 취소되었습니다 😢",
        message: `[${groupBuy?.title}] 공동구매가 취소되었습니다. 사유: ${reason}. 입금하신 분은 환불 처리됩니다.`,
        type: "cancelled",
        group_buy_id: groupBuy?.id,
        link: `/groupbuy/${params.id}`,
      }));
      await supabase.from("notifications").insert(notifications);
    } else if (statusAction === "complete" && activeParticipants.length > 0) {
      // 공구 완료 알림 (픽업 완료된 사람들에게)
      const pickedParticipants = participants.filter(p => p.status === "picked" && p.user_id);
      if (pickedParticipants.length > 0) {
        const notifications = pickedParticipants.map(p => ({
          user_id: p.user_id,
          title: "공동구매가 완료되었습니다! 🎉",
          message: `[${groupBuy?.title}] 공동구매가 성공적으로 완료되었습니다. 이용해 주셔서 감사합니다!`,
          type: "confirmed",
          group_buy_id: groupBuy?.id,
          link: `/groupbuy/${params.id}`,
        }));
        await supabase.from("notifications").insert(notifications);
      }
    }

    setProcessing(false);
    setShowStatusModal(false);
    
    const messages = {
      cancel: "공동구매가 취소되었습니다",
      pause: "공동구매가 중단되었습니다",
      complete: "공동구매가 종료되었습니다",
    };
    alert(messages[statusAction!]);
    fetchData();
  };

  // 참여자 상태 변경
  const handleChangeParticipantStatus = async (participant: Participant) => {
    if (participant.status === "cancelled") return;
    
    let newStatus: Participant["status"];
    let updateData: any = {};
    let successMessage = "";
    
    if (participant.status === "unpaid") {
      newStatus = "paid";
      updateData = { status: "paid", is_paid: true, paid_at: new Date().toISOString() };
      successMessage = `${participant.name}님 입금확인 완료!`;
    } else if (participant.status === "paid") {
      newStatus = "picked";
      updateData = { status: "picked", picked_at: new Date().toISOString() };
      successMessage = `${participant.name}님 픽업완료 처리!`;
    } else {
      return;
    }
    
    const { error } = await supabase
      .from("group_buy_participants")
      .update(updateData)
      .eq("id", participant.id);

    if (error) {
      alert("상태 변경 중 오류가 발생했습니다: " + error.message);
      return;
    }

    // 알림 발송 (user_id가 있는 경우에만)
    if (participant.user_id) {
      const notifData = {
        user_id: participant.user_id,
        title: newStatus === "paid" ? "입금이 확인되었습니다! 💰" : "픽업이 완료되었습니다! 📦",
        message: newStatus === "paid" 
          ? `${groupBuy?.title} 공동구매 입금이 확인되었습니다. 픽업일에 방문해주세요!`
          : `${groupBuy?.title} 상품 픽업이 완료되었습니다. 이용해 주셔서 감사합니다!`,
        type: newStatus === "paid" ? "payment" : "pickup",
        group_buy_id: groupBuy?.id,
        participant_id: participant.id,
        link: `/groupbuy/${params.id}`,
      };
      
      await supabase.from("notifications").insert(notifData);
    }

    setParticipants(prev => prev.map(p => 
      p.id === participant.id 
        ? { ...p, ...updateData, status: newStatus }
        : p
    ));
    
    alert(successMessage);
  };

  // 이전 단계로 되돌리기
  const handleRevertParticipantStatus = async (participant: Participant) => {
    let newStatus: Participant["status"];
    let updateData: any = {};
    let successMessage = "";
    
    if (participant.status === "paid") {
      newStatus = "unpaid";
      updateData = { status: "unpaid", is_paid: false, paid_at: null };
      successMessage = `${participant.name}님을 미입금 상태로 되돌렸습니다.`;
    } else if (participant.status === "picked") {
      newStatus = "paid";
      updateData = { status: "paid", picked_at: null };
      successMessage = `${participant.name}님을 입금확인 상태로 되돌렸습니다.`;
    } else {
      return;
    }
    
    const { error } = await supabase
      .from("group_buy_participants")
      .update(updateData)
      .eq("id", participant.id);

    if (error) {
      alert("상태 변경 중 오류가 발생했습니다: " + error.message);
      return;
    }

    setParticipants(prev => prev.map(p => 
      p.id === participant.id 
        ? { ...p, ...updateData, status: newStatus }
        : p
    ));
    
    setSelectedParticipant(null);
    alert(successMessage);
  };

  // 취소된 주문 복구
  const handleRestoreParticipant = async (participant: Participant) => {
    const updateData = { 
      status: "unpaid", 
      is_paid: false, 
      paid_at: null, 
      picked_at: null,
      cancelled_at: null, 
      cancel_reason: null 
    };
    
    const { error } = await supabase
      .from("group_buy_participants")
      .update(updateData)
      .eq("id", participant.id);

    if (error) {
      alert("복구 중 오류가 발생했습니다: " + error.message);
      return;
    }

    setParticipants(prev => prev.map(p => 
      p.id === participant.id 
        ? { ...p, ...updateData, status: "unpaid" as const }
        : p
    ));
    
    setSelectedParticipant(null);
    alert(`${participant.name}님의 주문이 복구되었습니다.`);
  };

  // 참여자 취소 처리
  const openCancelParticipantModal = (participant: Participant) => {
    setCancelTarget(participant);
    setCancelReason("");
    setShowCancelParticipantModal(true);
  };

  const handleCancelParticipant = async () => {
    if (!cancelTarget) return;
    
    const reason = cancelReason === "기타 (직접 입력)" ? customReason : cancelReason;
    if (!reason) {
      alert("취소 사유를 선택해주세요");
      return;
    }

    await supabase
      .from("group_buy_participants")
      .update({ 
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancel_reason: reason
      })
      .eq("id", cancelTarget.id);

    // 🔔 이용자에게 주문 취소 알림 발송
    if (cancelTarget.user_id) {
      await supabase.from("notifications").insert({
        user_id: cancelTarget.user_id,
        title: "주문이 취소되었습니다 😢",
        message: `[${groupBuy?.title}] 주문이 취소되었습니다. 사유: ${reason}`,
        type: "cancelled",
        group_buy_id: groupBuy?.id,
        participant_id: cancelTarget.id,
        link: `/groupbuy/${params.id}`,
      });
    }

    setParticipants(prev => prev.map(p => 
      p.id === cancelTarget.id 
        ? { ...p, status: "cancelled" as const, cancelled_at: new Date().toISOString(), cancel_reason: reason }
        : p
    ));

    setShowCancelParticipantModal(false);
    setCancelTarget(null);
    alert("주문이 취소되었습니다");
  };

  // 엑셀(CSV) 다운로드
  const handleDownloadExcel = () => {
    if (participants.length === 0) {
      alert("다운로드할 참여자가 없습니다");
      return;
    }

    // CSV 헤더
    const headers = ["번호", "이름", "연락처", "수량", "금액", "상태", "신청일", "입금확인일", "픽업완료일", "취소사유"];
    
    // 상태 한글 변환
    const statusKorean: Record<string, string> = {
      unpaid: "미입금",
      paid: "입금확인",
      picked: "픽업완료",
      cancelled: "취소"
    };

    // CSV 데이터 생성
    const csvData = participants.map((p, idx) => [
      idx + 1,
      p.name,
      p.phone,
      p.quantity,
      (p.quantity * (groupBuy?.sale_price || 0)).toLocaleString() + "원",
      statusKorean[p.status] || p.status,
      formatDate(p.created_at),
      p.paid_at ? formatDate(p.paid_at) : "-",
      p.picked_at ? formatDate(p.picked_at) : "-",
      p.cancel_reason || "-"
    ]);

    // CSV 문자열 생성 (BOM 추가로 한글 깨짐 방지)
    const BOM = "\uFEFF";
    const csvContent = BOM + [
      headers.join(","),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    // 다운로드
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${groupBuy?.title || "공동구매"}_참여자목록_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 알림 발송
  const handleSendNotification = async () => {
    setSendingNotification(true);
    
    let targetParticipants: Participant[] = [];
    let title = "";
    let message = "";
    let notifType = "general";
    
    if (notificationType === "unpaid") {
      // 미입금자에게 독촉
      targetParticipants = participants.filter(p => p.status === "unpaid" && p.user_id);
      title = "입금 확인 요청 💳";
      message = `${groupBuy?.title} 공동구매 입금이 아직 확인되지 않았습니다. 빠른 입금 부탁드립니다!`;
      notifType = "reminder";
    } else if (notificationType === "paid") {
      // 입금완료자에게 픽업 안내
      targetParticipants = participants.filter(p => p.status === "paid" && p.user_id);
      title = "픽업 안내 📦";
      const pickupInfo = groupBuy?.pickup_date 
        ? `픽업일: ${formatDate(groupBuy.pickup_date)}`
        : "";
      message = `${groupBuy?.title} 상품이 준비되었습니다! ${pickupInfo} 장소: ${groupBuy?.pickup_location || "매장"}`;
      notifType = "pickup";
    } else {
      // 커스텀 메시지 (전체 참여자)
      targetParticipants = participants.filter(p => p.status !== "cancelled" && p.user_id);
      title = customNotifTitle;
      message = customNotifMessage;
      
      if (!title || !message) {
        alert("제목과 내용을 입력해주세요");
        setSendingNotification(false);
        return;
      }
    }
    
    if (targetParticipants.length === 0) {
      alert("알림을 보낼 대상이 없습니다");
      setSendingNotification(false);
      return;
    }

    try {
      // 대량 알림 발송
      const notifications = targetParticipants.map(p => ({
        user_id: p.user_id,
        title,
        message,
        type: notifType,
        group_buy_id: groupBuy?.id,
        link: `/groupbuy/${params.id}`,
      }));

      const { error } = await supabase.from("notifications").insert(notifications);
      
      if (error) throw error;

      alert(`${targetParticipants.length}명에게 알림을 발송했습니다!`);
      setShowNotificationModal(false);
      setCustomNotifTitle("");
      setCustomNotifMessage("");
    } catch (error: any) {
      alert("알림 발송 실패: " + error.message);
    }
    
    setSendingNotification(false);
  };

  // 통계 계산
  const unpaidCount = participants.filter(p => p.status === "unpaid").length;
  const paidCount = participants.filter(p => p.status === "paid").length;
  const pickedCount = participants.filter(p => p.status === "picked").length;
  const cancelledCount = participants.filter(p => p.status === "cancelled").length;
  const activeParticipants = participants.filter(p => p.status !== "cancelled");
  
  const totalQuantity = activeParticipants.reduce((sum, p) => sum + p.quantity, 0);
  const totalPaidAmount = participants
    .filter(p => p.status === "paid" || p.status === "picked")
    .reduce((sum, p) => sum + (p.quantity * (groupBuy?.sale_price || 0)), 0);

  // 필터링된 참여자
  const filteredParticipants = participants.filter(p => {
    if (filter === "all") return true;
    if (filter === "unpaid") return p.status === "unpaid";
    if (filter === "paid") return p.status === "paid";
    if (filter === "picked") return p.status === "picked";
    if (filter === "cancelled") return p.status === "cancelled";
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#19643D] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!groupBuy) return null;

  const isEnded = new Date(groupBuy.end_at) < new Date();
  const incompleteStatus = getIncompleteStatus();

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      {/* 헤더 */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#19643D]">
        <div className="max-w-[640px] mx-auto px-5 h-14 flex items-center justify-between">
          <button 
            onClick={() => router.back()} 
            className="w-10 h-10 flex items-center justify-center text-[#F2D38D] hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-white font-bold text-lg">공동구매 관리</span>
          <Link 
            href={`/groupbuy/${groupBuy.id}`}
            className="text-[#F2D38D] text-sm font-medium hover:text-white transition-colors"
          >
            미리보기
          </Link>
        </div>
      </header>

      <main className="pt-14 pb-44 max-w-[640px] mx-auto">
        {/* 상품 정보 헤더 */}
        <div className="bg-white px-5 py-5 border-b border-[#19643D]/10">
          <div className="flex gap-4">
            <div className="w-20 h-20 rounded-xl bg-[#F2D38D]/30 flex-shrink-0 overflow-hidden">
              {groupBuy.image_url ? (
                <img src={groupBuy.image_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl">🛒</div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {getStatusBadge()}
              </div>
              <h1 className="font-bold text-[#19643D] line-clamp-2">{groupBuy.title}</h1>
              <p className="text-lg font-black text-[#DA451F] mt-1">
                {groupBuy.sale_price?.toLocaleString()}원
                <span className="text-sm font-normal text-[#19643D]/40 line-through ml-2">
                  {groupBuy.original_price?.toLocaleString()}원
                </span>
              </p>
            </div>
          </div>

          {groupBuy.status_reason && (groupBuy.status === "cancelled" || groupBuy.status === "paused" || groupBuy.status === "completed") && (
            <div className={`mt-4 p-3 rounded-xl text-sm ${
              groupBuy.status === "cancelled" ? "bg-red-50 text-red-700" :
              groupBuy.status === "paused" ? "bg-yellow-50 text-yellow-700" :
              "bg-blue-50 text-blue-700"
            }`}>
              <span className="font-bold">
                {groupBuy.status === "cancelled" ? "취소 사유: " : 
                 groupBuy.status === "paused" ? "중단 사유: " : "📋 "}
              </span>
              {groupBuy.status_reason}
            </div>
          )}
        </div>

        {/* 마감까지 남은 시간 - 심플 버전 */}
        <div className="px-5 py-4 bg-white border-b border-[#19643D]/10">
          <p className="text-center text-[#19643D]/60 text-sm mb-2">
            {isEnded ? "⏰ 마감됨" : "⏰ 마감까지 남은 시간"}
          </p>
          {!isEnded ? (
            <div className="flex justify-center items-baseline gap-1">
              <span className="text-3xl font-black text-[#19643D]">{timeLeft.days}</span>
              <span className="text-sm text-[#19643D]/50 mr-2">일</span>
              <span className="text-3xl font-black text-[#19643D]">{String(timeLeft.hours).padStart(2, '0')}</span>
              <span className="text-sm text-[#19643D]/50 mr-2">시간</span>
              <span className="text-3xl font-black text-[#19643D]">{String(timeLeft.minutes).padStart(2, '0')}</span>
              <span className="text-sm text-[#19643D]/50 mr-2">분</span>
              <span className="text-3xl font-black text-[#DA451F]">{String(timeLeft.seconds).padStart(2, '0')}</span>
              <span className="text-sm text-[#DA451F]/50">초</span>
            </div>
          ) : (
            <p className="text-center text-gray-400 text-lg">마감되었습니다</p>
          )}
          <p className="text-center text-[#19643D]/40 text-xs mt-2">
            마감일: {formatDate(groupBuy.end_at)}
          </p>
        </div>

        {/* 탭 */}
        <div className="px-5 py-3 bg-white border-b border-[#19643D]/10 sticky top-14 z-40">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("participants")}
              className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${
                activeTab === "participants"
                  ? "bg-[#19643D] text-white"
                  : "bg-[#19643D]/5 text-[#19643D]/60"
              }`}
            >
              참여자 목록 ({activeParticipants.length}명)
            </button>
            <button
              onClick={() => setActiveTab("info")}
              className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${
                activeTab === "info"
                  ? "bg-[#19643D] text-white"
                  : "bg-[#19643D]/5 text-[#19643D]/60"
              }`}
            >
              상세 정보
            </button>
          </div>
        </div>

        {/* 참여자 목록 탭 */}
        {activeTab === "participants" && (
          <div className="px-5 py-4">
            {/* 필터 박스 - 클릭 가능 */}
            <div className="grid grid-cols-5 gap-1.5 mb-4">
              <button
                onClick={() => setFilter("all")}
                className={`rounded-xl p-2 text-center transition-all ${
                  filter === "all" 
                    ? "bg-[#19643D] ring-2 ring-[#19643D] ring-offset-2" 
                    : "bg-white border border-[#19643D]/10 hover:border-[#19643D]/30"
                }`}
              >
                <p className={`text-lg font-black ${filter === "all" ? "text-white" : "text-[#19643D]"}`}>
                  {participants.length}
                </p>
                <p className={`text-[10px] ${filter === "all" ? "text-white/80" : "text-[#19643D]/50"}`}>전체</p>
              </button>
              <button
                onClick={() => setFilter("unpaid")}
                className={`rounded-xl p-2 text-center transition-all ${
                  filter === "unpaid" 
                    ? "bg-red-500 ring-2 ring-red-500 ring-offset-2" 
                    : "bg-white border border-red-200 hover:border-red-300"
                }`}
              >
                <p className={`text-lg font-black ${filter === "unpaid" ? "text-white" : "text-red-500"}`}>
                  {unpaidCount}
                </p>
                <p className={`text-[10px] ${filter === "unpaid" ? "text-white/80" : "text-red-400"}`}>미입금</p>
              </button>
              <button
                onClick={() => setFilter("paid")}
                className={`rounded-xl p-2 text-center transition-all ${
                  filter === "paid" 
                    ? "bg-[#19643D] ring-2 ring-[#19643D] ring-offset-2" 
                    : "bg-white border border-[#19643D]/20 hover:border-[#19643D]/40"
                }`}
              >
                <p className={`text-lg font-black ${filter === "paid" ? "text-white" : "text-[#19643D]"}`}>
                  {paidCount}
                </p>
                <p className={`text-[10px] ${filter === "paid" ? "text-white/80" : "text-[#19643D]/50"}`}>입금확인</p>
              </button>
              <button
                onClick={() => setFilter("picked")}
                className={`rounded-xl p-2 text-center transition-all ${
                  filter === "picked" 
                    ? "bg-blue-500 ring-2 ring-blue-500 ring-offset-2" 
                    : "bg-white border border-blue-200 hover:border-blue-300"
                }`}
              >
                <p className={`text-lg font-black ${filter === "picked" ? "text-white" : "text-blue-500"}`}>
                  {pickedCount}
                </p>
                <p className={`text-[10px] ${filter === "picked" ? "text-white/80" : "text-blue-400"}`}>픽업완료</p>
              </button>
              <button
                onClick={() => setFilter("cancelled")}
                className={`rounded-xl p-2 text-center transition-all ${
                  filter === "cancelled" 
                    ? "bg-gray-500 ring-2 ring-gray-500 ring-offset-2" 
                    : "bg-white border border-gray-200 hover:border-gray-300"
                }`}
              >
                <p className={`text-lg font-black ${filter === "cancelled" ? "text-white" : "text-gray-500"}`}>
                  {cancelledCount}
                </p>
                <p className={`text-[10px] ${filter === "cancelled" ? "text-white/80" : "text-gray-400"}`}>취소</p>
              </button>
            </div>

            {/* 엑셀 다운로드 & 알림 발송 버튼 */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={handleDownloadExcel}
                className="flex-1 h-11 bg-white border-2 border-[#19643D] text-[#19643D] font-bold rounded-xl hover:bg-[#19643D]/5 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                엑셀
              </button>
              <button
                onClick={() => setShowNotificationModal(true)}
                className="flex-1 h-11 bg-[#19643D] text-white font-bold rounded-xl hover:bg-[#145231] transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                알림 발송
              </button>
            </div>

            {/* 현재 필터 표시 */}
            {filter !== "all" && (
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm text-[#19643D]/70">
                  🔍 <strong>{
                    filter === "unpaid" ? "미입금" :
                    filter === "paid" ? "입금확인" :
                    filter === "picked" ? "픽업완료" : "취소"
                  }</strong> 목록만 보기 ({filteredParticipants.length}명)
                </span>
                <button
                  onClick={() => setFilter("all")}
                  className="text-xs text-[#19643D] underline"
                >
                  전체보기
                </button>
              </div>
            )}

            {/* 처리 현황 바 */}
            <div className="bg-[#19643D] rounded-2xl p-4 mb-4">
              <div className="flex items-center justify-between text-white mb-2">
                <span className="font-medium">처리 현황</span>
                <span className="font-bold">{pickedCount + cancelledCount} / {participants.length}건 완료</span>
              </div>
              <div className="h-3 bg-white/20 rounded-full overflow-hidden flex">
                <div 
                  className="h-full bg-blue-400 transition-all"
                  style={{ width: participants.length > 0 ? `${(pickedCount / participants.length) * 100}%` : '0%' }}
                />
                <div 
                  className="h-full bg-gray-400 transition-all"
                  style={{ width: participants.length > 0 ? `${(cancelledCount / participants.length) * 100}%` : '0%' }}
                />
              </div>
            </div>

            {filteredParticipants.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-20 h-20 bg-[#F2D38D]/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-4xl">{filter === "all" ? "👥" : "🔍"}</span>
                </div>
                <p className="text-[#19643D] font-medium mb-2">
                  {filter === "all" ? "아직 참여자가 없어요" : "해당 상태의 참여자가 없습니다"}
                </p>
                {filter !== "all" && (
                  <button
                    onClick={() => setFilter("all")}
                    className="text-sm text-[#19643D] underline"
                  >
                    전체보기
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredParticipants.map((p, idx) => {
                  const statusInfo = getParticipantStatusBadge(p.status);
                  const isCancelled = p.status === "cancelled";
                  const originalIndex = participants.findIndex(op => op.id === p.id);
                  
                  return (
                    <div
                      key={p.id}
                      className={`bg-white rounded-2xl overflow-hidden border-2 transition-all ${
                        isCancelled ? "border-gray-200 opacity-60" :
                        p.status === "picked" ? "border-blue-300" :
                        p.status === "paid" ? "border-[#19643D]" :
                        "border-red-300"
                      }`}
                    >
                      <div className={`px-4 py-3 flex items-center justify-between ${
                        isCancelled ? "bg-gray-50" :
                        p.status === "picked" ? "bg-blue-50" :
                        p.status === "paid" ? "bg-[#19643D]/5" :
                        "bg-red-50"
                      }`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                            isCancelled ? "bg-gray-300 text-white" :
                            p.status === "picked" ? "bg-blue-500 text-white" :
                            p.status === "paid" ? "bg-[#19643D] text-white" :
                            "bg-red-400 text-white"
                          }`}>
                            {originalIndex + 1}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`font-bold text-lg ${isCancelled ? "text-gray-400 line-through" : "text-[#19643D]"}`}>
                              {p.name}
                            </span>
                            <span className={`font-medium ${isCancelled ? "text-gray-400" : "text-[#19643D]"}`}>
                              {p.phone}
                            </span>
                            {p.total_orders && p.total_orders > 1 && !isCancelled && (
                              <span className="px-1.5 py-0.5 bg-[#F2D38D] text-[#19643D] text-[10px] rounded font-bold">
                                단골 {p.total_orders}회
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => setSelectedParticipant(p)}
                          className="text-[#19643D]/40 hover:text-[#19643D] p-1"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                      </div>
                      
                      <div className="px-4 py-3 border-t border-[#19643D]/10">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-sm text-[#19643D]/50">수량 </span>
                            <span className={`font-bold ${isCancelled ? "text-gray-400" : "text-[#19643D]"}`}>{p.quantity}개</span>
                            <span className="mx-2 text-[#19643D]/20">|</span>
                            <span className={`font-black ${isCancelled ? "text-gray-400 line-through" : "text-[#DA451F]"}`}>
                              {(p.quantity * (groupBuy?.sale_price || 0)).toLocaleString()}원
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {/* 되돌리기 버튼 - 입금확인/픽업완료 상태일 때만 표시 */}
                            {(p.status === "paid" || p.status === "picked") && (
                              <button
                                onClick={() => {
                                  const prevStatus = p.status === "picked" ? "입금확인" : "미입금";
                                  if (confirm(`${p.name}님을 "${prevStatus}" 상태로 되돌리시겠습니까?`)) {
                                    handleRevertParticipantStatus(p);
                                  }
                                }}
                                className="px-2 py-1.5 rounded-lg text-xs font-medium bg-orange-100 text-orange-600 hover:bg-orange-200 transition-all"
                              >
                                ↩️ 되돌리기
                              </button>
                            )}
                            {!isCancelled && p.status !== "picked" && (
                              <button
                                onClick={() => openCancelParticipantModal(p)}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-500 hover:bg-gray-200 transition-all"
                              >
                                취소
                              </button>
                            )}
                            <button
                              onClick={() => {
                                if (p.status === "unpaid") {
                                  if (confirm(`${p.name}님의 입금이 확인되었습니까?\n\n금액: ${(p.quantity * (groupBuy?.sale_price || 0)).toLocaleString()}원`)) {
                                    handleChangeParticipantStatus(p);
                                  }
                                } else if (p.status === "paid") {
                                  if (confirm(`${p.name}님이 물건을 픽업하셨습니까?\n\n수량: ${p.quantity}개`)) {
                                    handleChangeParticipantStatus(p);
                                  }
                                }
                              }}
                              disabled={isCancelled || p.status === "picked"}
                              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${statusInfo.color} ${
                                (isCancelled || p.status === "picked") ? "opacity-80 cursor-default" : "hover:opacity-90"
                              }`}
                            >
                              {statusInfo.icon} {statusInfo.label}
                            </button>
                          </div>
                        </div>
                        
                        {p.status === "unpaid" && (
                          <div className="mt-2 flex items-center gap-2 text-xs text-red-500">
                            <span className="text-yellow-500">⚠️</span>
                            <span>미입금자입니다. 입금이 확인되면 버튼을 눌러 <strong>'입금확인'</strong>으로 구분해주세요.</span>
                          </div>
                        )}
                        {p.status === "paid" && (
                          <div className="mt-2 flex items-center gap-2 text-xs text-[#19643D]">
                            <span>💡</span>
                            <span>픽업이 완료되면 <strong>'입금확인'</strong> 버튼을 눌러주세요. 잘못 처리했다면 <strong>'되돌리기'</strong> 버튼을 누르세요.</span>
                          </div>
                        )}
                        {p.status === "cancelled" && p.cancel_reason && (
                          <div className="mt-2 text-xs text-gray-500">
                            취소 사유: {p.cancel_reason}
                          </div>
                        )}
                        {p.status === "picked" && (
                          <div className="mt-2 flex items-center gap-2 text-xs text-blue-500">
                            <span>✅</span>
                            <span>픽업이 완료되었습니다. 잘못 처리했다면 <strong>'되돌리기'</strong> 버튼을 누르세요.</span>
                          </div>
                        )}
                      </div>
                      
                      {(p.paid_at || p.picked_at || p.cancelled_at) && (
                        <div className="px-4 py-2 bg-gray-50 text-xs text-gray-400 flex gap-4">
                          {p.paid_at && <span>입금: {formatDate(p.paid_at)}</span>}
                          {p.picked_at && <span>픽업: {formatDate(p.picked_at)}</span>}
                          {p.cancelled_at && <span>취소: {formatDate(p.cancelled_at)}</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 상세 정보 탭 */}
        {activeTab === "info" && (
          <div className="px-5 py-4 space-y-4">
            <div className="bg-white rounded-2xl p-5 border border-[#19643D]/10">
              <h3 className="font-bold text-[#19643D] mb-4">📍 픽업 정보</h3>
              <div className="space-y-3 text-sm">
                <div className="flex">
                  <span className="w-20 text-[#19643D]/50">픽업일</span>
                  <span className="font-medium text-[#19643D]">{formatPickupDate(groupBuy.pickup_date)}</span>
                </div>
                <div className="flex">
                  <span className="w-20 text-[#19643D]/50">픽업시간</span>
                  <span className="font-medium text-[#19643D]">
                    {groupBuy.pickup_start_time?.slice(0, 5)} ~ {groupBuy.pickup_end_time?.slice(0, 5)}
                  </span>
                </div>
                <div className="flex">
                  <span className="w-20 text-[#19643D]/50">픽업장소</span>
                  <span className="font-medium text-[#19643D]">{groupBuy.pickup_location || "-"}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-[#19643D]/10">
              <h3 className="font-bold text-[#19643D] mb-3">📝 상품 설명</h3>
              <p className="text-sm text-[#19643D]/70 whitespace-pre-wrap">
                {groupBuy.description || "설명 없음"}
              </p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-[#19643D]/10">
              <h3 className="font-bold text-[#19643D] mb-3">📅 등록 정보</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#19643D]/50">등록일</span>
                  <span className="text-[#19643D]">{formatDate(groupBuy.created_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#19643D]/50">마감일</span>
                  <span className="text-[#19643D]">{formatDate(groupBuy.end_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#19643D]/50">최소인원</span>
                  <span className="text-[#19643D]">{groupBuy.min_quantity}명</span>
                </div>
                {groupBuy.max_quantity && (
                  <div className="flex justify-between">
                    <span className="text-[#19643D]/50">최대인원</span>
                    <span className="text-[#19643D]">{groupBuy.max_quantity}명</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 하단 고정 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-[#19643D]/20 shadow-lg">
        <div className="max-w-[640px] mx-auto">
          <div className="px-5 py-4 bg-[#19643D] flex items-center justify-between">
            <div className="text-white">
              <span className="text-sm opacity-80">총 입금액</span>
              <span className="text-xs opacity-60 ml-2">(입금확인 {paidCount + pickedCount}건)</span>
            </div>
            <span className="text-3xl font-black text-[#F2D38D]">{totalPaidAmount.toLocaleString()}원</span>
          </div>
          
          {groupBuy.status === "active" && (
            <div className="px-5 py-3 flex gap-2 bg-white">
              <button
                onClick={() => openStatusModal("cancel")}
                className="flex-1 h-12 bg-white border-2 border-red-400 text-red-500 font-bold rounded-xl hover:bg-red-50 transition-colors text-sm"
              >
                취소
              </button>
              <button
                onClick={() => openStatusModal("pause")}
                className="flex-1 h-12 bg-white border-2 border-yellow-400 text-yellow-600 font-bold rounded-xl hover:bg-yellow-50 transition-colors text-sm"
              >
                중단
              </button>
              <button
                onClick={() => openStatusModal("complete")}
                className={`flex-1 h-12 font-bold rounded-xl transition-colors text-sm ${
                  canComplete() 
                    ? "bg-[#19643D] hover:bg-[#145231] text-white" 
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                공구종료
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 상태 변경 모달 */}
      {showStatusModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-5">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowStatusModal(false)} />
          
          <div className="relative w-full max-w-[400px] bg-white rounded-3xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className={`px-6 py-5 text-white text-center ${
              statusAction === "cancel" ? "bg-red-500" :
              statusAction === "pause" ? "bg-yellow-500" :
              "bg-[#19643D]"
            }`}>
              <p className="text-lg font-bold">
                {statusAction === "cancel" ? "🚫 공동구매 취소" :
                 statusAction === "pause" ? "⏸️ 공동구매 중단" :
                 "✅ 공동구매 종료"}
              </p>
            </div>
            
            <div className="p-6">
              {statusAction === "complete" ? (
                <div className="py-2">
                  <div className="w-16 h-16 bg-[#19643D]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">🏁</span>
                  </div>
                  
                  {!canComplete() ? (
                    <div>
                      <p className="text-center text-red-500 font-bold text-lg mb-4">⚠️ 아직 종료할 수 없습니다</p>
                      <div className="bg-red-50 rounded-xl p-4 mb-4">
                        <p className="text-sm text-red-700 mb-2">다음 항목을 먼저 처리해주세요:</p>
                        <ul className="text-sm text-red-600 space-y-1">
                          {incompleteStatus.unpaid > 0 && (
                            <li>• 미입금자 {incompleteStatus.unpaid}명 → 입금확인 또는 취소 처리</li>
                          )}
                          {incompleteStatus.waitingPickup > 0 && (
                            <li>• 픽업 대기 {incompleteStatus.waitingPickup}명 → 픽업완료 또는 취소 처리</li>
                          )}
                        </ul>
                      </div>
                      <p className="text-xs text-center text-gray-500">
                        모든 참여자가 <strong>픽업완료</strong> 또는 <strong>취소</strong> 상태여야<br/>
                        공동구매를 종료할 수 있습니다.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-center text-[#19643D] font-bold text-lg mb-4">공동구매를 종료하시겠습니까?</p>
                      
                      <div className="bg-gray-50 rounded-xl p-4 mb-4">
                        <p className="text-sm font-bold text-[#19643D] mb-3">📊 최종 정산 현황</p>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-[#19643D]/60">총 주문</span>
                            <span className="font-bold text-[#19643D]">{participants.length}건</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#19643D]/60">픽업 완료</span>
                            <span className="font-bold text-blue-500">{pickedCount}건</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#19643D]/60">취소</span>
                            <span className="font-bold text-gray-400">{cancelledCount}건</span>
                          </div>
                          <div className="flex justify-between pt-2 border-t border-gray-200">
                            <span className="text-[#19643D]/60">최종 정산액</span>
                            <span className="font-black text-[#DA451F] text-lg">{totalPaidAmount.toLocaleString()}원</span>
                          </div>
                        </div>
                      </div>
                      
                      <p className="text-sm text-center text-[#19643D]/60 leading-relaxed mb-3">
                        모든 고객의 픽업이 완료되었습니다.<br/>
                        해당 공동구매는 <strong className="text-[#19643D]">종료 처리</strong>됩니다.
                      </p>
                      <div className="p-3 bg-yellow-50 rounded-xl">
                        <p className="text-xs text-yellow-700 text-center">
                          ⚠️ 종료 후에는 상태를 변경할 수 없습니다.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-600 mb-4">
                    {statusAction === "cancel" ? "취소" : "중단"} 사유를 선택해주세요
                  </p>
                  
                  <div className="space-y-2">
                    {(statusAction === "cancel" ? cancelReasons : pauseReasons).map((reason) => (
                      <button
                        key={reason}
                        onClick={() => setSelectedReason(reason)}
                        className={`w-full px-4 py-3 rounded-xl text-left text-sm font-medium transition-all ${
                          selectedReason === reason
                            ? statusAction === "cancel" ? "bg-red-500 text-white" : "bg-yellow-500 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {reason}
                      </button>
                    ))}
                  </div>

                  {selectedReason === "기타 (직접 입력)" && (
                    <textarea
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                      placeholder="사유를 입력해주세요"
                      rows={3}
                      className="w-full mt-4 px-4 py-3 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#19643D]/30 resize-none"
                    />
                  )}
                </>
              )}
            </div>

            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => setShowStatusModal(false)}
                className="flex-1 h-12 bg-gray-100 text-gray-600 font-medium rounded-xl hover:bg-gray-200 transition-colors"
              >
                {statusAction === "complete" && !canComplete() ? "확인" : "취소"}
              </button>
              {(statusAction !== "complete" || canComplete()) && (
                <button
                  onClick={handleStatusChange}
                  disabled={processing || (statusAction === "complete" && !canComplete())}
                  className={`flex-1 h-12 text-white font-bold rounded-xl transition-colors ${
                    statusAction === "cancel" ? "bg-red-500 hover:bg-red-600" :
                    statusAction === "pause" ? "bg-yellow-500 hover:bg-yellow-600" :
                    "bg-[#19643D] hover:bg-[#145231]"
                  }`}
                >
                  {processing ? "처리 중..." : statusAction === "complete" ? "종료하기" : "확인"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 참여자 취소 모달 */}
      {showCancelParticipantModal && cancelTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-5">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowCancelParticipantModal(false)} />
          
          <div className="relative w-full max-w-[400px] bg-white rounded-3xl overflow-hidden">
            <div className="px-6 py-5 bg-gray-600 text-white text-center">
              <p className="text-lg font-bold">주문 취소</p>
            </div>
            
            <div className="p-6">
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <p className="font-bold text-gray-800">{cancelTarget.name}</p>
                <p className="text-sm text-gray-500">{cancelTarget.phone}</p>
                <p className="text-sm text-gray-500">주문: {cancelTarget.quantity}개 / {(cancelTarget.quantity * (groupBuy?.sale_price || 0)).toLocaleString()}원</p>
              </div>
              
              <p className="text-sm text-gray-600 mb-4">취소 사유를 선택해주세요</p>
              
              <div className="space-y-2">
                {participantCancelReasons.map((reason) => (
                  <button
                    key={reason}
                    onClick={() => setCancelReason(reason)}
                    className={`w-full px-4 py-3 rounded-xl text-left text-sm font-medium transition-all ${
                      cancelReason === reason
                        ? "bg-gray-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>

              {cancelReason === "기타 (직접 입력)" && (
                <textarea
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="취소 사유를 입력해주세요"
                  rows={2}
                  className="w-full mt-4 px-4 py-3 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 resize-none"
                />
              )}
            </div>

            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => setShowCancelParticipantModal(false)}
                className="flex-1 h-12 bg-gray-100 text-gray-600 font-medium rounded-xl hover:bg-gray-200 transition-colors"
              >
                닫기
              </button>
              <button
                onClick={handleCancelParticipant}
                className="flex-1 h-12 bg-gray-600 text-white font-bold rounded-xl hover:bg-gray-700 transition-colors"
              >
                주문 취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 참여자 상세 모달 */}
      {selectedParticipant && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-5">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSelectedParticipant(null)} />
          
          <div className="relative w-full max-w-[400px] bg-white rounded-3xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-5 bg-[#19643D] text-white">
              <p className="text-lg font-bold">👤 참여자 상세 정보</p>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold ${
                  selectedParticipant.status === "cancelled" ? "bg-gray-300 text-white" :
                  selectedParticipant.status === "picked" ? "bg-blue-500 text-white" :
                  selectedParticipant.status === "paid" ? "bg-[#19643D] text-[#F2D38D]" :
                  "bg-red-400 text-white"
                }`}>
                  {selectedParticipant.name?.charAt(0)}
                </div>
                <div>
                  <p className="text-xl font-bold text-[#19643D]">{selectedParticipant.name}</p>
                  {selectedParticipant.total_orders && selectedParticipant.total_orders > 1 && (
                    <span className="px-2 py-0.5 bg-[#F2D38D] text-[#19643D] text-xs rounded font-bold">
                      🏆 단골 고객 (총 {selectedParticipant.total_orders}회 이용)
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-[#19643D]/50">📞 연락처</span>
                  <span className="font-bold text-[#19643D] text-lg">{selectedParticipant.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#19643D]/50">📦 주문 수량</span>
                  <span className="font-medium text-[#19643D]">{selectedParticipant.quantity}개</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#19643D]/50">💰 결제 금액</span>
                  <span className={`font-bold ${selectedParticipant.status === "cancelled" ? "text-gray-400 line-through" : "text-[#DA451F]"}`}>
                    {(selectedParticipant.quantity * (groupBuy?.sale_price || 0)).toLocaleString()}원
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#19643D]/50">📅 신청일</span>
                  <span className="font-medium text-[#19643D]">{formatDate(selectedParticipant.created_at)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                  <span className="text-[#19643D]/50">📋 상태</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-bold ${getParticipantStatusBadge(selectedParticipant.status).color}`}>
                    {getParticipantStatusBadge(selectedParticipant.status).icon} {getParticipantStatusBadge(selectedParticipant.status).label}
                  </span>
                </div>
                {selectedParticipant.paid_at && (
                  <div className="flex justify-between">
                    <span className="text-[#19643D]/50">💳 입금확인</span>
                    <span className="font-medium text-[#19643D]">{formatDate(selectedParticipant.paid_at)}</span>
                  </div>
                )}
                {selectedParticipant.picked_at && (
                  <div className="flex justify-between">
                    <span className="text-[#19643D]/50">📦 픽업완료</span>
                    <span className="font-medium text-[#19643D]">{formatDate(selectedParticipant.picked_at)}</span>
                  </div>
                )}
                {selectedParticipant.cancelled_at && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-[#19643D]/50">❌ 취소일</span>
                      <span className="font-medium text-gray-500">{formatDate(selectedParticipant.cancelled_at)}</span>
                    </div>
                    {selectedParticipant.cancel_reason && (
                      <div className="pt-2 border-t border-gray-200">
                        <span className="text-[#19643D]/50 text-sm">취소 사유:</span>
                        <p className="text-gray-600 text-sm mt-1">{selectedParticipant.cancel_reason}</p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* 상태 되돌리기 버튼 */}
              {selectedParticipant.status !== "unpaid" && selectedParticipant.status !== "cancelled" && (
                <div className="bg-orange-50 rounded-xl p-4">
                  <p className="text-sm text-orange-700 mb-3">
                    ⚠️ 잘못 처리하셨나요? 이전 단계로 되돌릴 수 있습니다.
                  </p>
                  <button
                    onClick={() => {
                      const prevStatus = selectedParticipant.status === "picked" ? "입금확인" : "미입금";
                      if (confirm(`${selectedParticipant.name}님을 "${prevStatus}" 상태로 되돌리시겠습니까?`)) {
                        handleRevertParticipantStatus(selectedParticipant);
                      }
                    }}
                    className="w-full py-2.5 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 transition-colors text-sm"
                  >
                    ↩️ 이전 단계로 되돌리기 ({selectedParticipant.status === "picked" ? "픽업완료 → 입금확인" : "입금확인 → 미입금"})
                  </button>
                </div>
              )}

              {/* 취소된 주문 복구 */}
              {selectedParticipant.status === "cancelled" && (
                <div className="bg-gray-100 rounded-xl p-4">
                  <p className="text-sm text-gray-600 mb-3">
                    취소된 주문을 복구하시겠습니까?
                  </p>
                  <button
                    onClick={() => {
                      if (confirm(`${selectedParticipant.name}님의 주문을 복구하시겠습니까?\n미입금 상태로 복구됩니다.`)) {
                        handleRestoreParticipant(selectedParticipant);
                      }
                    }}
                    className="w-full py-2.5 bg-gray-500 text-white font-bold rounded-xl hover:bg-gray-600 transition-colors text-sm"
                  >
                    🔄 주문 복구하기
                  </button>
                </div>
              )}
            </div>

            <div className="px-6 pb-6">
              <button
                onClick={() => setSelectedParticipant(null)}
                className="w-full h-12 bg-[#19643D] text-white font-bold rounded-xl hover:bg-[#145231] transition-colors"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 알림 발송 모달 */}
      {showNotificationModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-5">
          <div 
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowNotificationModal(false)}
          />
          
          <div className="relative w-full max-w-[400px] bg-white rounded-3xl overflow-hidden">
            <div className="px-6 py-5 bg-[#19643D] text-white">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">🔔 알림 발송</h3>
                <button 
                  onClick={() => setShowNotificationModal(false)}
                  className="w-8 h-8 flex items-center justify-center text-white/60 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <p className="text-sm text-white/70 mt-1">참여자들에게 알림을 보냅니다</p>
            </div>

            <div className="p-6 space-y-4">
              {/* 알림 타입 선택 */}
              <div className="space-y-2">
                <button
                  onClick={() => setNotificationType("unpaid")}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                    notificationType === "unpaid"
                      ? "border-red-500 bg-red-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">💳</span>
                    <div>
                      <p className={`font-bold ${notificationType === "unpaid" ? "text-red-600" : "text-gray-700"}`}>
                        미입금자 독촉
                      </p>
                      <p className="text-xs text-gray-500">
                        미입금 상태인 {participants.filter(p => p.status === "unpaid").length}명에게 발송
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setNotificationType("paid")}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                    notificationType === "paid"
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📦</span>
                    <div>
                      <p className={`font-bold ${notificationType === "paid" ? "text-blue-600" : "text-gray-700"}`}>
                        픽업 안내
                      </p>
                      <p className="text-xs text-gray-500">
                        입금완료 상태인 {participants.filter(p => p.status === "paid").length}명에게 발송
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setNotificationType("custom")}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                    notificationType === "custom"
                      ? "border-[#19643D] bg-[#19643D]/5"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">✏️</span>
                    <div>
                      <p className={`font-bold ${notificationType === "custom" ? "text-[#19643D]" : "text-gray-700"}`}>
                        직접 작성
                      </p>
                      <p className="text-xs text-gray-500">
                        전체 참여자 {participants.filter(p => p.status !== "cancelled").length}명에게 발송
                      </p>
                    </div>
                  </div>
                </button>
              </div>

              {/* 커스텀 메시지 입력 */}
              {notificationType === "custom" && (
                <div className="space-y-3 pt-2">
                  <input
                    type="text"
                    value={customNotifTitle}
                    onChange={(e) => setCustomNotifTitle(e.target.value)}
                    placeholder="알림 제목"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#19643D]"
                  />
                  <textarea
                    value={customNotifMessage}
                    onChange={(e) => setCustomNotifMessage(e.target.value)}
                    placeholder="알림 내용을 입력하세요"
                    rows={3}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#19643D] resize-none"
                  />
                </div>
              )}

              {/* 미리보기 */}
              {notificationType !== "custom" && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-2">📱 미리보기</p>
                  <p className="font-bold text-[#19643D] text-sm">
                    {notificationType === "unpaid" ? "입금 확인 요청 💳" : "픽업 안내 📦"}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {notificationType === "unpaid" 
                      ? `${groupBuy?.title} 공동구매 입금이 아직 확인되지 않았습니다. 빠른 입금 부탁드립니다!`
                      : `${groupBuy?.title} 상품이 준비되었습니다! 장소: ${groupBuy?.pickup_location || "매장"}`
                    }
                  </p>
                </div>
              )}
            </div>

            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => setShowNotificationModal(false)}
                className="flex-1 h-12 bg-gray-100 text-gray-600 font-medium rounded-xl hover:bg-gray-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSendNotification}
                disabled={sendingNotification}
                className="flex-1 h-12 bg-[#19643D] text-white font-bold rounded-xl hover:bg-[#145231] transition-colors disabled:bg-gray-300 flex items-center justify-center gap-2"
              >
                {sendingNotification ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>발송하기</span>
                    <span className="text-sm opacity-70">
                      ({notificationType === "unpaid" 
                        ? participants.filter(p => p.status === "unpaid").length
                        : notificationType === "paid"
                        ? participants.filter(p => p.status === "paid").length
                        : participants.filter(p => p.status !== "cancelled").length}명)
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
