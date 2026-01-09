"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface Shop {
  id: number;
  name: string;
  category: string;
  logo_url: string;
  description: string;
  phone: string;
  address: string;
  bank_name: string;
  bank_account: string;
  bank_holder: string;
}

interface GroupBuy {
  id: number;
  title: string;
  status: string;
  original_price: number;
  sale_price: number;
  min_quantity: number;
  current_quantity: number;
  end_at: string;
  pickup_date: string;
  created_at: string;
}

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
    title: string;
    sale_price: number;
  };
}

export default function ShopDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [shop, setShop] = useState<Shop | null>(null);
  const [groupBuys, setGroupBuys] = useState<GroupBuy[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "orders" | "groupbuys">("overview");
  const [filterStatus, setFilterStatus] = useState<"all" | "unpaid" | "paid">("all");

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      alert("로그인이 필요합니다");
      router.push("/login");
      return;
    }

    // 내 상점 조회
    const { data: shopData, error: shopError } = await supabase
      .from("shops")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (shopError || !shopData) {
      alert("등록된 상점이 없습니다");
      router.push("/shop/register");
      return;
    }

    setShop(shopData);

    // 내 공동구매 목록
    const { data: groupBuyData } = await supabase
      .from("group_buys")
      .select("*")
      .eq("shop_id", shopData.id)
      .order("created_at", { ascending: false });

    if (groupBuyData) {
      setGroupBuys(groupBuyData);
    }

    // 모든 참여자 목록
    const groupBuyIds = groupBuyData?.map(g => g.id) || [];
    if (groupBuyIds.length > 0) {
      const { data: participantData } = await supabase
        .from("group_buy_participants")
        .select(`
          *,
          group_buy:group_buys(title, sale_price)
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

    // 참여자에게 알림 발송
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

    // 목록 갱신
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

    // 수량 감소
    if (participant) {
      const groupBuy = groupBuys.find(g => g.id === participant.group_buy_id);
      if (groupBuy) {
        await supabase
          .from("group_buys")
          .update({ current_quantity: Math.max(0, groupBuy.current_quantity - participant.quantity) })
          .eq("id", groupBuy.id);
      }

      // 알림 발송
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

  // 통계 계산
  const totalRevenue = participants
    .filter(p => p.is_paid)
    .reduce((sum, p) => sum + (p.group_buy?.sale_price || 0) * p.quantity, 0);

  const pendingOrders = participants.filter(p => p.status === "unpaid").length;
  const completedOrders = participants.filter(p => p.is_paid).length;
  const activeGroupBuys = groupBuys.filter(g => g.status === "active").length;

  const filteredParticipants = participants.filter(p => {
    if (filterStatus === "all") return p.status !== "cancelled";
    if (filterStatus === "unpaid") return p.status === "unpaid";
    if (filterStatus === "paid") return p.is_paid;
    return true;
  });

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
      {/* 헤더 */}
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
          <span className="text-white font-medium">상점 관리</span>
          <Link 
            href="/shop/settings"
            className="w-10 h-10 flex items-center justify-center text-[#F2D38D]"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </Link>
        </div>
      </header>

      <main className="pt-14 pb-24 max-w-[640px] mx-auto">
        {/* 상점 정보 */}
        <div className="px-5 py-6 bg-white border-b border-[#19643D]/10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#19643D] flex items-center justify-center text-[#F2D38D] font-bold text-2xl overflow-hidden">
              {shop?.logo_url ? (
                <img src={shop.logo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                shop?.name?.charAt(0)
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-[#19643D]">{shop?.name}</h1>
              <p className="text-sm text-[#19643D]/50">{shop?.category}</p>
            </div>
          </div>
        </div>

        {/* 통계 카드 */}
        <div className="px-5 py-4 grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 border border-[#19643D]/10">
            <p className="text-sm text-[#19643D]/50 mb-1">총 매출</p>
            <p className="text-2xl font-black text-[#19643D]">{totalRevenue.toLocaleString()}원</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-[#19643D]/10">
            <p className="text-sm text-[#19643D]/50 mb-1">입금 대기</p>
            <p className="text-2xl font-black text-[#DA451F]">{pendingOrders}건</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-[#19643D]/10">
            <p className="text-sm text-[#19643D]/50 mb-1">완료 주문</p>
            <p className="text-2xl font-black text-[#19643D]">{completedOrders}건</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-[#19643D]/10">
            <p className="text-sm text-[#19643D]/50 mb-1">진행 중 공구</p>
            <p className="text-2xl font-black text-[#19643D]">{activeGroupBuys}개</p>
          </div>
        </div>

        {/* 탭 */}
        <div className="px-5 py-2 flex gap-2 border-b border-[#19643D]/10 bg-white sticky top-14 z-40">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeTab === "overview" 
                ? "bg-[#19643D] text-white" 
                : "bg-[#19643D]/5 text-[#19643D]"
            }`}
          >
            전체보기
          </button>
          <button
            onClick={() => setActiveTab("orders")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeTab === "orders" 
                ? "bg-[#19643D] text-white" 
                : "bg-[#19643D]/5 text-[#19643D]"
            }`}
          >
            주문 관리
            {pendingOrders > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-[#DA451F] text-white text-xs rounded-full">
                {pendingOrders}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("groupbuys")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeTab === "groupbuys" 
                ? "bg-[#19643D] text-white" 
                : "bg-[#19643D]/5 text-[#19643D]"
            }`}
          >
            공동구매
          </button>
        </div>

        {/* 전체보기 탭 */}
        {activeTab === "overview" && (
          <div className="px-5 py-4 space-y-4">
            {/* 입금 대기 주문 */}
            {pendingOrders > 0 && (
              <div className="bg-[#DA451F]/5 rounded-2xl p-4 border border-[#DA451F]/20">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-[#DA451F]">⏳ 입금 대기 중</h3>
                  <button 
                    onClick={() => { setActiveTab("orders"); setFilterStatus("unpaid"); }}
                    className="text-sm text-[#DA451F] underline"
                  >
                    전체보기
                  </button>
                </div>
                {participants
                  .filter(p => p.status === "unpaid")
                  .slice(0, 3)
                  .map(p => (
                    <div key={p.id} className="flex items-center justify-between py-2 border-b border-[#DA451F]/10 last:border-0">
                      <div>
                        <p className="font-medium text-[#19643D]">{p.name}</p>
                        <p className="text-xs text-[#19643D]/50">{p.group_buy?.title} × {p.quantity}</p>
                      </div>
                      <button
                        onClick={() => handlePaymentConfirm(p.id)}
                        className="px-3 py-1 bg-[#DA451F] text-white text-sm rounded-lg"
                      >
                        입금확인
                      </button>
                    </div>
                  ))}
              </div>
            )}

            {/* 진행 중 공동구매 */}
            <div className="bg-white rounded-2xl p-4 border border-[#19643D]/10">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-[#19643D]">🛒 진행 중 공동구매</h3>
                <button 
                  onClick={() => setActiveTab("groupbuys")}
                  className="text-sm text-[#19643D]/50 underline"
                >
                  전체보기
                </button>
              </div>
              {groupBuys.filter(g => g.status === "active").length === 0 ? (
                <p className="text-center text-[#19643D]/40 py-4">진행 중인 공동구매가 없습니다</p>
              ) : (
                groupBuys
                  .filter(g => g.status === "active")
                  .slice(0, 3)
                  .map(g => (
                    <Link 
                      key={g.id} 
                      href={`/shop/groupbuy/${g.id}`}
                      className="flex items-center justify-between py-3 border-b border-[#19643D]/10 last:border-0"
                    >
                      <div>
                        <p className="font-medium text-[#19643D]">{g.title}</p>
                        <p className="text-xs text-[#19643D]/50">
                          {g.current_quantity}/{g.min_quantity}명 참여
                        </p>
                      </div>
                      <svg className="w-5 h-5 text-[#19643D]/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  ))
              )}
            </div>
          </div>
        )}

        {/* 주문 관리 탭 */}
        {activeTab === "orders" && (
          <div className="px-5 py-4">
            {/* 필터 */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setFilterStatus("all")}
                className={`px-3 py-1.5 rounded-lg text-sm ${
                  filterStatus === "all" ? "bg-[#19643D] text-white" : "bg-[#19643D]/5 text-[#19643D]"
                }`}
              >
                전체
              </button>
              <button
                onClick={() => setFilterStatus("unpaid")}
                className={`px-3 py-1.5 rounded-lg text-sm ${
                  filterStatus === "unpaid" ? "bg-[#DA451F] text-white" : "bg-[#DA451F]/10 text-[#DA451F]"
                }`}
              >
                입금대기 ({pendingOrders})
              </button>
              <button
                onClick={() => setFilterStatus("paid")}
                className={`px-3 py-1.5 rounded-lg text-sm ${
                  filterStatus === "paid" ? "bg-[#19643D] text-white" : "bg-[#19643D]/5 text-[#19643D]"
                }`}
              >
                입금완료 ({completedOrders})
              </button>
            </div>

            {/* 주문 목록 */}
            <div className="space-y-3">
              {filteredParticipants.length === 0 ? (
                <div className="text-center py-10 text-[#19643D]/40">
                  주문이 없습니다
                </div>
              ) : (
                filteredParticipants.map(p => (
                  <div key={p.id} className="bg-white rounded-2xl p-4 border border-[#19643D]/10">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#19643D]">{p.name}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            p.is_paid 
                              ? "bg-[#19643D]/10 text-[#19643D]" 
                              : "bg-[#DA451F]/10 text-[#DA451F]"
                          }`}>
                            {p.is_paid ? "입금완료" : "입금대기"}
                          </span>
                        </div>
                        <p className="text-sm text-[#19643D]/50 mt-1">{p.phone}</p>
                      </div>
                      <span className="text-xs text-[#19643D]/40">{formatDate(p.created_at)}</span>
                    </div>
                    
                    <div className="bg-[#FDFBF7] rounded-xl p-3 mb-3">
                      <p className="text-sm text-[#19643D]">{p.group_buy?.title}</p>
                      <div className="flex justify-between mt-1">
                        <span className="text-sm text-[#19643D]/50">{p.quantity}개</span>
                        <span className="font-bold text-[#19643D]">
                          {((p.group_buy?.sale_price || 0) * p.quantity).toLocaleString()}원
                        </span>
                      </div>
                    </div>

                    {!p.is_paid && p.status !== "cancelled" && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handlePaymentConfirm(p.id)}
                          className="flex-1 py-2.5 bg-[#19643D] text-white font-medium rounded-xl"
                        >
                          입금 확인
                        </button>
                        <button
                          onClick={() => handleCancelOrder(p.id)}
                          className="px-4 py-2.5 bg-gray-100 text-gray-500 font-medium rounded-xl"
                        >
                          취소
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 공동구매 탭 */}
        {activeTab === "groupbuys" && (
          <div className="px-5 py-4 space-y-3">
            {groupBuys.length === 0 ? (
              <div className="text-center py-10 text-[#19643D]/40">
                등록된 공동구매가 없습니다
              </div>
            ) : (
              groupBuys.map(g => (
                <Link 
                  key={g.id} 
                  href={`/shop/groupbuy/${g.id}`}
                  className="block bg-white rounded-2xl p-4 border border-[#19643D]/10"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          g.status === "active" 
                            ? "bg-[#19643D]/10 text-[#19643D]" 
                            : "bg-gray-100 text-gray-500"
                        }`}>
                          {g.status === "active" ? "진행중" : g.status === "ended" ? "마감" : g.status}
                        </span>
                        <h3 className="font-bold text-[#19643D]">{g.title}</h3>
                      </div>
                      <p className="text-sm text-[#19643D]/50 mt-1">
                        {g.sale_price.toLocaleString()}원 · {g.current_quantity}/{g.min_quantity}명
                      </p>
                    </div>
                    <svg className="w-5 h-5 text-[#19643D]/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  
                  {/* 진행률 바 */}
                  <div className="h-2 bg-[#19643D]/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#19643D] rounded-full"
                      style={{ width: `${Math.min((g.current_quantity / g.min_quantity) * 100, 100)}%` }}
                    />
                  </div>
                </Link>
              ))
            )}
          </div>
        )}
      </main>

      {/* 하단 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#19643D]/10">
        <div className="max-w-[640px] mx-auto px-5 py-4">
          <Link
            href="/shop/groupbuy/new"
            className="block w-full py-4 bg-[#DA451F] text-white font-bold text-center rounded-2xl"
          >
            + 새 공동구매 등록
          </Link>
        </div>
      </div>
    </div>
  );
}
