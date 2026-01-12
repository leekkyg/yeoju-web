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
  approval_status: string;
}

interface GroupBuy {
  id: number;
  title: string;
  status: string;
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
  quantity: number;
  status: string;
  is_paid: boolean;
  created_at: string;
  group_buy?: {
    title: string;
    sale_price: number;
    pickup_date: string;
  };
}

interface DailyStat {
  date: string;
  revenue: number;
  orders: number;
}

export default function ShopDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [shop, setShop] = useState<Shop | null>(null);
  const [groupBuys, setGroupBuys] = useState<GroupBuy[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [dateRange, setDateRange] = useState<"7days" | "30days" | "6months" | "1year" | "all">("30days");
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([]);

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  useEffect(() => {
    if (participants.length > 0) {
      calculateDailyStats();
    }
  }, [participants, dateRange]);

  const checkAuthAndLoadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      alert("로그인이 필요합니다");
      router.push("/login");
      return;
    }

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

    const { data: groupBuyData } = await supabase
      .from("group_buys")
      .select("*")
      .eq("shop_id", shopData.id)
      .order("created_at", { ascending: false });

    if (groupBuyData) {
      setGroupBuys(groupBuyData);
    }

    const groupBuyIds = groupBuyData?.map(g => g.id) || [];
    if (groupBuyIds.length > 0) {
      const { data: participantData } = await supabase
        .from("group_buy_participants")
        .select(`
          *,
          group_buy:group_buys(title, sale_price, pickup_date)
        `)
        .in("group_buy_id", groupBuyIds)
        .order("created_at", { ascending: false });

      if (participantData) {
        setParticipants(participantData);
      }
    }

    setLoading(false);
  };

  const calculateDailyStats = () => {
    const now = new Date();
    let startDate = new Date();
    
    switch (dateRange) {
      case "7days":
        startDate.setDate(now.getDate() - 7);
        break;
      case "30days":
        startDate.setDate(now.getDate() - 30);
        break;
      case "6months":
        startDate.setMonth(now.getMonth() - 6);
        break;
      case "1year":
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case "all":
        startDate = new Date(0);
        break;
    }

    const filteredParticipants = participants.filter(p => {
      const date = new Date(p.created_at);
      return date >= startDate && p.is_paid;
    });

    const statsMap: { [key: string]: DailyStat } = {};
    
    filteredParticipants.forEach(p => {
      const date = new Date(p.created_at).toISOString().split('T')[0];
      if (!statsMap[date]) {
        statsMap[date] = { date, revenue: 0, orders: 0 };
      }
      statsMap[date].revenue += (p.group_buy?.sale_price || 0) * p.quantity;
      statsMap[date].orders += 1;
    });

    const stats = Object.values(statsMap).sort((a, b) => a.date.localeCompare(b.date));
    setDailyStats(stats);
  };

  const getFilteredData = () => {
    const now = new Date();
    let startDate = new Date();
    
    switch (dateRange) {
      case "7days":
        startDate.setDate(now.getDate() - 7);
        break;
      case "30days":
        startDate.setDate(now.getDate() - 30);
        break;
      case "6months":
        startDate.setMonth(now.getMonth() - 6);
        break;
      case "1year":
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case "all":
        startDate = new Date(0);
        break;
    }

    return participants.filter(p => new Date(p.created_at) >= startDate);
  };

  const filteredParticipants = getFilteredData();

  // 통계 계산
  const totalRevenue = filteredParticipants
    .filter(p => p.is_paid)
    .reduce((sum, p) => sum + (p.group_buy?.sale_price || 0) * p.quantity, 0);

  const totalOrders = filteredParticipants.length;
  const paidOrders = filteredParticipants.filter(p => p.is_paid).length;
  const unpaidOrders = filteredParticipants.filter(p => p.status === "unpaid").length;
  const cancelledOrders = filteredParticipants.filter(p => p.status === "cancelled").length;
  
  const pickedUpOrders = filteredParticipants.filter(p => {
    if (!p.is_paid || !p.group_buy?.pickup_date) return false;
    return new Date(p.group_buy.pickup_date) < new Date();
  }).length;

  const activeGroupBuys = groupBuys.filter(g => g.status === "active").length;
  const completedGroupBuys = groupBuys.filter(g => g.status === "ended" || g.status === "completed").length;
  const totalGroupBuys = groupBuys.length;

  const avgOrderAmount = paidOrders > 0 ? Math.round(totalRevenue / paidOrders) : 0;
  const maxRevenue = Math.max(...dailyStats.map(s => s.revenue), 1);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const formatFullDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}월 ${date.getDate()}일`;
  };

  // 승인 상태 체크
  const isApproved = shop?.approval_status === "approved";
  const isPending = shop?.approval_status === "pending";
  const isRejected = shop?.approval_status === "rejected";

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
          <span className="text-white font-medium">상점 대시보드</span>
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

      <main className="pt-14 pb-32 max-w-[640px] mx-auto">
        {/* 승인 대기 배너 */}
        {isPending && (
          <div className="mx-5 mt-4 bg-[#F2D38D] rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-[#19643D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="font-bold text-[#19643D]">승인 대기 중</p>
                <p className="text-sm text-[#19643D]/70">관리자 승인 후 공동구매를 등록할 수 있습니다</p>
              </div>
            </div>
          </div>
        )}

        {/* 승인 거절 배너 */}
        {isRejected && (
          <div className="mx-5 mt-4 bg-[#DA451F]/10 border border-[#DA451F]/30 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#DA451F] rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div>
                <p className="font-bold text-[#DA451F]">승인 거절됨</p>
                <p className="text-sm text-[#DA451F]/70">관리자에게 문의해주세요</p>
              </div>
            </div>
          </div>
        )}

        {/* 상점 정보 - 클릭 가능 */}
        <Link href="/shop/info" className="block px-5 py-5 bg-white border-b border-[#19643D]/10 hover:bg-[#19643D]/5 transition-colors">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#19643D] flex items-center justify-center text-[#F2D38D] font-bold text-xl overflow-hidden">
              {shop?.logo_url ? (
                <img src={shop.logo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                shop?.name?.charAt(0)
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-[#19643D]">{shop?.name}</h1>
                {isApproved && (
                  <span className="px-2 py-0.5 bg-[#19643D] text-white text-xs font-medium rounded-full">승인됨</span>
                )}
                {isPending && (
                  <span className="px-2 py-0.5 bg-[#F2D38D] text-[#19643D] text-xs font-medium rounded-full">대기중</span>
                )}
                {isRejected && (
                  <span className="px-2 py-0.5 bg-[#DA451F] text-white text-xs font-medium rounded-full">거절됨</span>
                )}
              </div>
              <p className="text-sm text-[#19643D]/50">{shop?.category}</p>
            </div>
            <div className="flex items-center gap-1 text-[#19643D]/40">
              <span className="text-xs">상점 관리</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </Link>

        {/* 기간 선택 - 확장됨 */}
        <div className="px-5 py-3 bg-white border-b border-[#19643D]/10 sticky top-14 z-40">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {[
              { key: "7days", label: "7일" },
              { key: "30days", label: "30일" },
              { key: "6months", label: "6개월" },
              { key: "1year", label: "1년" },
              { key: "all", label: "전체" },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setDateRange(item.key as typeof dateRange)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                  dateRange === item.key 
                    ? "bg-[#19643D] text-white" 
                    : "bg-[#19643D]/5 text-[#19643D]"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* 핵심 지표 */}
        <div className="px-5 py-4">
          <div className="bg-gradient-to-br from-[#19643D] to-[#2a8a56] rounded-2xl p-5 text-white mb-4">
            <p className="text-[#F2D38D]/80 text-sm mb-1">총 매출</p>
            <p className="text-3xl font-black">{totalRevenue.toLocaleString()}원</p>
            <p className="text-[#F2D38D]/60 text-xs mt-2">
              평균 주문 금액: {avgOrderAmount.toLocaleString()}원
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl p-4 border border-[#19643D]/10">
              <p className="text-sm text-[#19643D]/50 mb-1">총 주문</p>
              <p className="text-2xl font-black text-[#19643D]">{totalOrders}건</p>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-[#19643D]/10">
              <p className="text-sm text-[#19643D]/50 mb-1">입금 완료</p>
              <p className="text-2xl font-black text-[#19643D]">{paidOrders}건</p>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-[#DA451F]/20">
              <p className="text-sm text-[#DA451F]/70 mb-1">입금 대기</p>
              <p className="text-2xl font-black text-[#DA451F]">{unpaidOrders}건</p>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-[#19643D]/10">
              <p className="text-sm text-[#19643D]/50 mb-1">픽업 완료</p>
              <p className="text-2xl font-black text-[#19643D]">{pickedUpOrders}건</p>
            </div>
          </div>
        </div>

        {/* 공동구매 현황 */}
        <div className="px-5 py-4">
          <h2 className="text-lg font-bold text-[#19643D] mb-3">📦 공동구매 현황</h2>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-2xl p-4 border border-[#19643D]/10 text-center">
              <p className="text-3xl font-black text-[#19643D]">{activeGroupBuys}</p>
              <p className="text-xs text-[#19643D]/50 mt-1">진행중</p>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-[#19643D]/10 text-center">
              <p className="text-3xl font-black text-[#19643D]">{completedGroupBuys}</p>
              <p className="text-xs text-[#19643D]/50 mt-1">완료</p>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-[#19643D]/10 text-center">
              <p className="text-3xl font-black text-[#19643D]">{totalGroupBuys}</p>
              <p className="text-xs text-[#19643D]/50 mt-1">전체</p>
            </div>
          </div>
        </div>

        {/* 매출 그래프 */}
        <div className="px-5 py-4">
          <h2 className="text-lg font-bold text-[#19643D] mb-3">📊 일별 매출 추이</h2>
          <div className="bg-white rounded-2xl p-5 border border-[#19643D]/10">
            {dailyStats.length === 0 ? (
              <p className="text-center text-[#19643D]/40 py-8">해당 기간에 매출 데이터가 없습니다</p>
            ) : (
              <>
                <div className="flex items-end gap-1 h-40 mb-3">
                  {dailyStats.slice(-14).map((stat, index) => (
                    <div key={stat.date} className="flex-1 flex flex-col items-center">
                      <div 
                        className="w-full bg-gradient-to-t from-[#19643D] to-[#2a8a56] rounded-t-sm transition-all duration-300 hover:from-[#DA451F] hover:to-[#e85a3a]"
                        style={{ 
                          height: `${Math.max((stat.revenue / maxRevenue) * 100, 5)}%`,
                          minHeight: '4px'
                        }}
                        title={`${formatFullDate(stat.date)}: ${stat.revenue.toLocaleString()}원 (${stat.orders}건)`}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex gap-1">
                  {dailyStats.slice(-14).map((stat) => (
                    <div key={stat.date} className="flex-1 text-center">
                      <p className="text-[10px] text-[#19643D]/40">{formatDate(stat.date)}</p>
                    </div>
                  ))}
                </div>
                
                <div className="mt-4 pt-4 border-t border-[#19643D]/10">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#19643D]/50">기간 내 최고 매출</span>
                    <span className="font-bold text-[#19643D]">{maxRevenue.toLocaleString()}원</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* 주문 상태 분석 */}
        <div className="px-5 py-4">
          <h2 className="text-lg font-bold text-[#19643D] mb-3">📈 주문 분석</h2>
          <div className="bg-white rounded-2xl p-5 border border-[#19643D]/10">
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-[#19643D]/60">주문 상태 비율</span>
                <span className="text-[#19643D]/60">총 {totalOrders}건</span>
              </div>
              <div className="h-4 bg-gray-100 rounded-full overflow-hidden flex">
                {totalOrders > 0 && (
                  <>
                    <div 
                      className="bg-[#19643D] transition-all"
                      style={{ width: `${(paidOrders / totalOrders) * 100}%` }}
                    />
                    <div 
                      className="bg-[#DA451F] transition-all"
                      style={{ width: `${(unpaidOrders / totalOrders) * 100}%` }}
                    />
                    <div 
                      className="bg-gray-300 transition-all"
                      style={{ width: `${(cancelledOrders / totalOrders) * 100}%` }}
                    />
                  </>
                )}
              </div>
              <div className="flex justify-between mt-2 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-[#19643D] rounded-full" />
                  <span className="text-[#19643D]/60">입금완료 {paidOrders}건</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-[#DA451F] rounded-full" />
                  <span className="text-[#19643D]/60">대기 {unpaidOrders}건</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-gray-300 rounded-full" />
                  <span className="text-[#19643D]/60">취소 {cancelledOrders}건</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#19643D]/10 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[#19643D]/60">입금 전환율</span>
                <span className="font-bold text-[#19643D]">
                  {totalOrders > 0 ? Math.round((paidOrders / totalOrders) * 100) : 0}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#19643D]/60">취소율</span>
                <span className="font-bold text-[#DA451F]">
                  {totalOrders > 0 ? Math.round((cancelledOrders / totalOrders) * 100) : 0}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 빠른 메뉴 - 주문관리, 알림발송 제거 */}
        <div className="px-5 py-4">
          <h2 className="text-lg font-bold text-[#19643D] mb-3">⚡ 빠른 메뉴</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link 
              href="/shop/groupbuys"
              className="bg-white rounded-2xl p-4 border border-[#DA451F]/20 flex items-center gap-3 hover:bg-[#DA451F]/5 transition-colors"
            >
              <div className="w-10 h-10 bg-[#DA451F]/10 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-[#DA451F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-[#19643D]">공동구매 관리</p>
                <p className="text-xs text-[#DA451F]">{activeGroupBuys}개 진행중</p>
              </div>
            </Link>
            
            <Link 
              href="/shop/info"
              className="bg-white rounded-2xl p-4 border border-[#19643D]/10 flex items-center gap-3 hover:bg-[#19643D]/5 transition-colors"
            >
              <div className="w-10 h-10 bg-[#19643D]/10 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-[#19643D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-[#19643D]">상점 정보</p>
                <p className="text-xs text-[#19643D]/50">수정하기</p>
              </div>
            </Link>
          </div>
        </div>

        {/* 인기 공동구매 */}
        <div className="px-5 py-4">
          <h2 className="text-lg font-bold text-[#19643D] mb-3">🏆 인기 공동구매</h2>
          <div className="bg-white rounded-2xl border border-[#19643D]/10 overflow-hidden">
            {groupBuys.length === 0 ? (
              <p className="text-center text-[#19643D]/40 py-8">등록된 공동구매가 없습니다</p>
            ) : (
              groupBuys
                .sort((a, b) => b.current_quantity - a.current_quantity)
                .slice(0, 5)
                .map((g, index) => (
                  <Link 
                    key={g.id} 
                    href={`/shop/groupbuy/${g.id}`}
                    className="flex items-center gap-3 p-4 border-b border-[#19643D]/5 last:border-0 hover:bg-[#19643D]/5 transition-colors"
                  >
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      index === 0 ? "bg-[#F2D38D] text-[#19643D]" :
                      index === 1 ? "bg-gray-200 text-gray-600" :
                      index === 2 ? "bg-orange-200 text-orange-700" :
                      "bg-gray-100 text-gray-500"
                    }`}>
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[#19643D] truncate">{g.title}</p>
                      <p className="text-xs text-[#19643D]/50">
                        {g.current_quantity}명 참여 · {g.sale_price.toLocaleString()}원
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      g.status === "active" 
                        ? "bg-[#19643D]/10 text-[#19643D]" 
                        : "bg-gray-100 text-gray-500"
                    }`}>
                      {g.status === "active" ? "진행중" : "종료"}
                    </span>
                  </Link>
                ))
            )}
          </div>
        </div>
      </main>

      {/* 하단 버튼 - 승인 상태에 따라 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#19643D]/10">
        <div className="max-w-[640px] mx-auto px-5 py-4">
          {isApproved ? (
            <Link
              href="/shop/groupbuy/create"
              className="block w-full py-4 bg-[#DA451F] text-white font-bold text-center rounded-2xl hover:bg-[#c23d1b] transition-colors"
            >
              + 새 공동구매 등록
            </Link>
          ) : (
            <button
              disabled
              className="block w-full py-4 bg-gray-300 text-gray-500 font-bold text-center rounded-2xl cursor-not-allowed"
            >
              {isPending ? "승인 대기 중..." : "승인 후 등록 가능"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
