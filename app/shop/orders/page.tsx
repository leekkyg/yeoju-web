"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface Participant {
  id: number;
  group_buy_id: number;
  user_id: string;
  name: string;
  phone: string;
  quantity: number;
  status: string;
  is_paid: boolean;
  created_at: string;
  group_buy?: {
    id: number;
    title: string;
    sale_price: number;
    pickup_date: string;
  };
}

export default function ShopOrdersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [shopId, setShopId] = useState<number | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [filterStatus, setFilterStatus] = useState<"all" | "unpaid" | "paid" | "cancelled">("all");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      alert("로그인이 필요합니다");
      router.push("/login");
      return;
    }

    const { data: shopData } = await supabase
      .from("shops")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!shopData) {
      alert("등록된 상점이 없습니다");
      router.push("/shop/register");
      return;
    }

    setShopId(shopData.id);

    const { data: groupBuyData } = await supabase
      .from("group_buys")
      .select("id")
      .eq("shop_id", shopData.id);

    const groupBuyIds = groupBuyData?.map(g => g.id) || [];
    
    if (groupBuyIds.length > 0) {
      const { data: participantData } = await supabase
        .from("group_buy_participants")
        .select(`
          *,
          group_buy:group_buys(id, title, sale_price, pickup_date)
        `)
        .in("group_buy_id", groupBuyIds)
        .order("created_at", { ascending: false });

      if (participantData) {
        setParticipants(participantData);
      }
    }

    setLoading(false);
  };

  const handlePaymentConfirm = async (participantId: number) => {
    const { error } = await supabase
      .from("group_buy_participants")
      .update({ status: "paid", is_paid: true })
      .eq("id", participantId);

    if (error) {
      alert("상태 변경 실패: " + error.message);
      return;
    }

    const participant = participants.find(p => p.id === participantId);
    if (participant) {
      await supabase.from("notifications").insert({
        user_id: participant.user_id,
        title: "입금이 확인되었습니다 ✅",
        message: `[${participant.group_buy?.title}] 입금이 확인되었습니다. 픽업 일정을 확인해주세요!`,
        type: "general",
        group_buy_id: participant.group_buy_id,
      });
    }

    setParticipants(prev => 
      prev.map(p => p.id === participantId ? { ...p, status: "paid", is_paid: true } : p)
    );
    
    alert("입금 확인 완료!");
  };

  const handleCancelOrder = async (participantId: number) => {
    if (!confirm("정말 이 주문을 취소하시겠습니까?")) return;

    const participant = participants.find(p => p.id === participantId);
    
    const { error } = await supabase
      .from("group_buy_participants")
      .update({ status: "cancelled" })
      .eq("id", participantId);

    if (error) {
      alert("취소 실패: " + error.message);
      return;
    }

    if (participant) {
      await supabase.from("notifications").insert({
        user_id: participant.user_id,
        title: "주문이 취소되었습니다",
        message: `[${participant.group_buy?.title}] 주문이 취소되었습니다.`,
        type: "general",
        group_buy_id: participant.group_buy_id,
      });
    }

    setParticipants(prev => 
      prev.map(p => p.id === participantId ? { ...p, status: "cancelled" } : p)
    );
    
    alert("주문이 취소되었습니다");
  };

  // 선택된 미입금자에게 알림 발송
  const handleSendReminder = async () => {
    if (selectedIds.length === 0) {
      alert("알림을 보낼 주문을 선택해주세요");
      return;
    }

    if (!confirm(`선택한 ${selectedIds.length}명에게 입금 요청 알림을 보내시겠습니까?`)) return;

    setSending(true);

    const selectedParticipants = participants.filter(p => selectedIds.includes(p.id));
    
    for (const p of selectedParticipants) {
      await supabase.from("notifications").insert({
        user_id: p.user_id,
        title: "입금 확인 요청 💳",
        message: `[${p.group_buy?.title}] 아직 입금이 확인되지 않았습니다. ${(p.group_buy?.sale_price || 0) * p.quantity}원을 입금해주세요!`,
        type: "general",
        group_buy_id: p.group_buy_id,
      });
    }

    setSending(false);
    setSelectedIds([]);
    alert(`${selectedParticipants.length}명에게 알림을 발송했습니다`);
  };

  // 전체 미입금자에게 알림 발송
  const handleSendAllReminder = async () => {
    const unpaidParticipants = participants.filter(p => p.status === "unpaid");
    
    if (unpaidParticipants.length === 0) {
      alert("입금 대기 중인 주문이 없습니다");
      return;
    }

    if (!confirm(`미입금자 ${unpaidParticipants.length}명 전체에게 입금 요청 알림을 보내시겠습니까?`)) return;

    setSending(true);

    for (const p of unpaidParticipants) {
      await supabase.from("notifications").insert({
        user_id: p.user_id,
        title: "입금 확인 요청 💳",
        message: `[${p.group_buy?.title}] 아직 입금이 확인되지 않았습니다. ${(p.group_buy?.sale_price || 0) * p.quantity}원을 입금해주세요!`,
        type: "general",
        group_buy_id: p.group_buy_id,
      });
    }

    setSending(false);
    alert(`${unpaidParticipants.length}명에게 알림을 발송했습니다`);
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const unpaidIds = filteredParticipants.filter(p => p.status === "unpaid").map(p => p.id);
    if (selectedIds.length === unpaidIds.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(unpaidIds);
    }
  };

  const filteredParticipants = participants.filter(p => {
    if (filterStatus === "all") return true;
    if (filterStatus === "unpaid") return p.status === "unpaid";
    if (filterStatus === "paid") return p.is_paid;
    if (filterStatus === "cancelled") return p.status === "cancelled";
    return true;
  });

  const unpaidCount = participants.filter(p => p.status === "unpaid").length;
  const paidCount = participants.filter(p => p.is_paid).length;
  const cancelledCount = participants.filter(p => p.status === "cancelled").length;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#19643D] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#19643D]">
        <div className="max-w-[640px] mx-auto px-5 h-14 flex items-center justify-between">
          <button 
            onClick={() => router.back()} 
            className="w-10 h-10 flex items-center justify-center text-[#F2D38D]"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-white font-medium">주문 관리</span>
          <div className="w-10" />
        </div>
      </header>

      <main className="pt-14 pb-6 max-w-[640px] mx-auto">
        {/* 필터 + 알림 버튼 */}
        <div className="px-5 py-4 bg-white border-b border-[#19643D]/10 sticky top-14 z-40">
          <div className="flex gap-2 mb-3 overflow-x-auto">
            <button
              onClick={() => setFilterStatus("all")}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filterStatus === "all" 
                  ? "bg-[#19643D] text-white" 
                  : "bg-[#19643D]/5 text-[#19643D]"
              }`}
            >
              전체 ({participants.length})
            </button>
            <button
              onClick={() => setFilterStatus("unpaid")}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filterStatus === "unpaid" 
                  ? "bg-[#DA451F] text-white" 
                  : "bg-[#DA451F]/10 text-[#DA451F]"
              }`}
            >
              입금대기 ({unpaidCount})
            </button>
            <button
              onClick={() => setFilterStatus("paid")}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filterStatus === "paid" 
                  ? "bg-[#19643D] text-white" 
                  : "bg-[#19643D]/5 text-[#19643D]"
              }`}
            >
              입금완료 ({paidCount})
            </button>
            <button
              onClick={() => setFilterStatus("cancelled")}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filterStatus === "cancelled" 
                  ? "bg-gray-500 text-white" 
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              취소 ({cancelledCount})
            </button>
          </div>

          {/* 미입금자 알림 버튼 */}
          {filterStatus === "unpaid" && unpaidCount > 0 && (
            <div className="flex gap-2">
              <button
                onClick={toggleSelectAll}
                className="px-3 py-2 bg-[#19643D]/5 text-[#19643D] text-sm rounded-lg"
              >
                {selectedIds.length === filteredParticipants.filter(p => p.status === "unpaid").length 
                  ? "선택 해제" 
                  : "전체 선택"}
              </button>
              <button
                onClick={handleSendReminder}
                disabled={sending || selectedIds.length === 0}
                className="flex-1 px-3 py-2 bg-[#DA451F] text-white text-sm font-medium rounded-lg disabled:bg-gray-300 flex items-center justify-center gap-2"
              >
                {sending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    선택한 {selectedIds.length}명에게 알림 발송
                  </>
                )}
              </button>
            </div>
          )}

          {filterStatus === "all" && unpaidCount > 0 && (
            <button
              onClick={handleSendAllReminder}
              disabled={sending}
              className="w-full px-3 py-2.5 bg-[#DA451F] text-white text-sm font-medium rounded-lg disabled:bg-gray-300 flex items-center justify-center gap-2"
            >
              {sending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  미입금자 {unpaidCount}명 전체에게 알림 발송
                </>
              )}
            </button>
          )}
        </div>

        {/* 주문 목록 */}
        <div className="px-5 py-4 space-y-3">
          {filteredParticipants.length === 0 ? (
            <div className="text-center py-16 text-[#19643D]/40">
              <svg className="w-16 h-16 mx-auto mb-4 text-[#19643D]/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p>주문이 없습니다</p>
            </div>
          ) : (
            filteredParticipants.map(p => (
              <div 
                key={p.id} 
                className={`bg-white rounded-2xl p-4 border transition-colors ${
                  selectedIds.includes(p.id) 
                    ? "border-[#DA451F] bg-[#DA451F]/5" 
                    : "border-[#19643D]/10"
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* 체크박스 (미입금만) */}
                  {p.status === "unpaid" && filterStatus === "unpaid" && (
                    <button
                      onClick={() => toggleSelect(p.id)}
                      className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 mt-1 transition-colors ${
                        selectedIds.includes(p.id)
                          ? "bg-[#DA451F] border-[#DA451F] text-white"
                          : "border-[#19643D]/30"
                      }`}
                    >
                      {selectedIds.includes(p.id) && (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  )}

                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#19643D]">{p.name}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            p.status === "cancelled" 
                              ? "bg-gray-100 text-gray-500"
                              : p.is_paid 
                                ? "bg-[#19643D]/10 text-[#19643D]" 
                                : "bg-[#DA451F]/10 text-[#DA451F]"
                          }`}>
                            {p.status === "cancelled" ? "취소됨" : p.is_paid ? "입금완료" : "입금대기"}
                          </span>
                        </div>
                        <p className="text-sm text-[#19643D]/50 mt-1">{p.phone}</p>
                      </div>
                      <span className="text-xs text-[#19643D]/40">{formatDate(p.created_at)}</span>
                    </div>
                    
                    <div className="bg-[#FDFBF7] rounded-xl p-3 mb-3">
                      <p className="text-sm text-[#19643D] font-medium">{p.group_buy?.title}</p>
                      <div className="flex justify-between mt-1">
                        <span className="text-sm text-[#19643D]/50">{p.quantity}개</span>
                        <span className="font-bold text-[#19643D]">
                          {((p.group_buy?.sale_price || 0) * p.quantity).toLocaleString()}원
                        </span>
                      </div>
                    </div>

                    {p.status === "unpaid" && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handlePaymentConfirm(p.id)}
                          className="flex-1 py-2.5 bg-[#19643D] text-white font-medium rounded-xl text-sm"
                        >
                          입금 확인
                        </button>
                        <button
                          onClick={() => handleCancelOrder(p.id)}
                          className="px-4 py-2.5 bg-gray-100 text-gray-500 font-medium rounded-xl text-sm"
                        >
                          취소
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
