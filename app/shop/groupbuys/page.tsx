"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface GroupBuy {
  id: number;
  title: string;
  image_url: string;
  original_price: number;
  sale_price: number;
  min_quantity: number;
  current_quantity: number;
  status: string;
  end_at: string;
  pickup_date: string;
  created_at: string;
  // 통계
  total_participants: number;
  paid_count: number;
  unpaid_count: number;
  picked_count: number;
  total_revenue: number;
}

type FilterType = "all" | "active" | "completed" | "cancelled" | "paused";

export default function ShopGroupBuysPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [groupBuys, setGroupBuys] = useState<GroupBuy[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const [shopId, setShopId] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    // 내 상점 조회
    const { data: shopData, error: shopError } = await supabase
      .from("shops")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (shopError || !shopData) {
      alert("등록된 상점이 없습니다");
      router.push("/shop/register");
      return;
    }

    setShopId(shopData.id);

    // 공동구매 목록 조회
    const { data: gbData, error: gbError } = await supabase
      .from("group_buys")
      .select("*")
      .eq("shop_id", shopData.id)
      .order("created_at", { ascending: false });

    if (gbError) {
      console.error("Error fetching group buys:", gbError);
      setLoading(false);
      return;
    }

    // 각 공구별 참여자 통계 조회
    const enrichedGroupBuys = await Promise.all(
      (gbData || []).map(async (gb) => {
        const { data: participants } = await supabase
          .from("group_buy_participants")
          .select("status, quantity")
          .eq("group_buy_id", gb.id);

        const stats = {
          total_participants: participants?.filter(p => p.status !== "cancelled").length || 0,
          paid_count: participants?.filter(p => p.status === "paid" || p.status === "picked").length || 0,
          unpaid_count: participants?.filter(p => p.status === "unpaid").length || 0,
          picked_count: participants?.filter(p => p.status === "picked").length || 0,
          total_revenue: participants
            ?.filter(p => p.status === "paid" || p.status === "picked")
            .reduce((sum, p) => sum + (p.quantity * gb.sale_price), 0) || 0,
        };

        return { ...gb, ...stats };
      })
    );

    setGroupBuys(enrichedGroupBuys);
    setLoading(false);
  };

  const getStatusBadge = (gb: GroupBuy) => {
    const now = new Date();
    const end = new Date(gb.end_at);

    if (gb.status === "cancelled") {
      return { label: "취소됨", color: "bg-red-100 text-red-700" };
    }
    if (gb.status === "paused") {
      return { label: "중단됨", color: "bg-yellow-100 text-yellow-700" };
    }
    if (gb.status === "completed") {
      return { label: "종료", color: "bg-blue-100 text-blue-700" };
    }
    if (end < now) {
      return { label: "마감", color: "bg-gray-100 text-gray-500" };
    }
    if (gb.current_quantity >= gb.min_quantity) {
      return { label: "확정", color: "bg-green-100 text-green-700" };
    }
    return { label: "진행중", color: "bg-orange-100 text-orange-700" };
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const formatFullDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
    return `${date.getMonth() + 1}월 ${date.getDate()}일 (${weekdays[date.getDay()]})`;
  };

  const getDaysLeft = (endAt: string) => {
    const now = new Date();
    const end = new Date(endAt);
    const diff = end.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
  };

  // 필터링
  const filteredGroupBuys = groupBuys.filter(gb => {
    if (filter === "all") return true;
    if (filter === "active") return gb.status === "active" && new Date(gb.end_at) >= new Date();
    if (filter === "completed") return gb.status === "completed" || (gb.status === "active" && new Date(gb.end_at) < new Date());
    if (filter === "cancelled") return gb.status === "cancelled";
    if (filter === "paused") return gb.status === "paused";
    return true;
  });

  // 통계
  const activeCount = groupBuys.filter(gb => gb.status === "active" && new Date(gb.end_at) >= new Date()).length;
  const completedCount = groupBuys.filter(gb => gb.status === "completed" || (gb.status === "active" && new Date(gb.end_at) < new Date())).length;
  const cancelledCount = groupBuys.filter(gb => gb.status === "cancelled").length;
  const pausedCount = groupBuys.filter(gb => gb.status === "paused").length;

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
            onClick={() => router.push("/shop/dashboard")} 
            className="w-10 h-10 flex items-center justify-center text-[#F2D38D] hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-white font-bold text-lg">공동구매 관리</span>
          <Link 
            href="/shop/groupbuy/create"
            className="w-10 h-10 flex items-center justify-center text-[#F2D38D] hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </Link>
        </div>
      </header>

      <main className="pt-14 pb-24 max-w-[640px] mx-auto">
        {/* 필터 탭 */}
        <div className="px-5 py-3 bg-white border-b border-[#19643D]/10 sticky top-14 z-40">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap border-2 ${
                filter === "all" 
                  ? "border-[#19643D] bg-[#19643D]/5 text-[#19643D]" 
                  : "border-gray-200 bg-white text-gray-400"
              }`}
            >
              전체 {groupBuys.length}
            </button>
            <button
              onClick={() => setFilter("active")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap border-2 ${
                filter === "active" 
                  ? "border-orange-500 bg-orange-50 text-orange-600" 
                  : "border-gray-200 bg-white text-gray-400"
              }`}
            >
              진행중 {activeCount}
            </button>
            <button
              onClick={() => setFilter("completed")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap border-2 ${
                filter === "completed" 
                  ? "border-blue-500 bg-blue-50 text-blue-600" 
                  : "border-gray-200 bg-white text-gray-400"
              }`}
            >
              종료/마감 {completedCount}
            </button>
            <button
              onClick={() => setFilter("cancelled")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap border-2 ${
                filter === "cancelled" 
                  ? "border-red-500 bg-red-50 text-red-600" 
                  : "border-gray-200 bg-white text-gray-400"
              }`}
            >
              취소 {cancelledCount}
            </button>
            {pausedCount > 0 && (
              <button
                onClick={() => setFilter("paused")}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap border-2 ${
                  filter === "paused" 
                    ? "border-yellow-500 bg-yellow-50 text-yellow-600" 
                    : "border-gray-200 bg-white text-gray-400"
                }`}
              >
                중단 {pausedCount}
              </button>
            )}
          </div>
        </div>

        {/* 공동구매 목록 */}
        <div className="px-5 py-4">
          {filteredGroupBuys.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-20 h-20 bg-[#F2D38D]/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">📦</span>
              </div>
              <p className="text-[#19643D] font-medium mb-2">
                {filter === "all" ? "등록된 공동구매가 없어요" : "해당 상태의 공동구매가 없습니다"}
              </p>
              <p className="text-[#19643D]/50 text-sm mb-4">
                새로운 공동구매를 등록해보세요!
              </p>
              <Link
                href="/shop/groupbuy/create"
                className="inline-block px-6 py-3 bg-[#DA451F] text-white font-bold rounded-xl hover:bg-[#c23d1b] transition-colors"
              >
                + 공동구매 등록
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredGroupBuys.map((gb) => {
                const statusBadge = getStatusBadge(gb);
                const daysLeft = getDaysLeft(gb.end_at);
                const isActive = gb.status === "active" && daysLeft > 0;
                
                return (
                  <Link
                    key={gb.id}
                    href={`/shop/groupbuy/${gb.id}`}
                    className="block bg-white rounded-2xl overflow-hidden border-2 border-[#19643D]/10 hover:border-[#19643D]/30 transition-all"
                  >
                    <div className="flex gap-4 p-4">
                      {/* 이미지 */}
                      <div className="w-24 h-24 rounded-xl bg-[#F2D38D]/30 flex-shrink-0 overflow-hidden">
                        {gb.image_url ? (
                          <img src={gb.image_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-3xl">🛒</div>
                        )}
                      </div>
                      
                      {/* 정보 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusBadge.color}`}>
                            {statusBadge.label}
                          </span>
                          {isActive && daysLeft <= 3 && (
                            <span className="px-2 py-0.5 bg-[#DA451F] text-white rounded-full text-xs font-bold">
                              D-{daysLeft}
                            </span>
                          )}
                        </div>
                        
                        <h3 className="font-bold text-[#19643D] line-clamp-1 mb-1">{gb.title}</h3>
                        
                        <p className="text-lg font-black text-[#DA451F]">
                          {gb.sale_price?.toLocaleString()}원
                        </p>
                        
                        <div className="flex items-center gap-3 mt-2 text-xs text-[#19643D]/50">
                          <span>마감 {formatDate(gb.end_at)}</span>
                          <span>·</span>
                          <span>픽업 {formatDate(gb.pickup_date)}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* 통계 바 */}
                    <div className="px-4 py-3 bg-[#19643D]/5 border-t border-[#19643D]/10">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <span className="text-[#19643D]/50">참여</span>
                            <span className="font-bold text-[#19643D]">{gb.total_participants}명</span>
                          </div>
                          {gb.unpaid_count > 0 && (
                            <div className="flex items-center gap-1">
                              <span className="text-red-400">미입금</span>
                              <span className="font-bold text-red-500">{gb.unpaid_count}</span>
                            </div>
                          )}
                          {gb.paid_count > 0 && (
                            <div className="flex items-center gap-1">
                              <span className="text-[#19643D]/50">입금</span>
                              <span className="font-bold text-[#19643D]">{gb.paid_count}</span>
                            </div>
                          )}
                        </div>
                        <div className="font-bold text-[#19643D]">
                          {gb.total_revenue.toLocaleString()}원
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* 하단 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#19643D]/10">
        <div className="max-w-[640px] mx-auto px-5 py-4">
          <Link
            href="/shop/groupbuy/create"
            className="block w-full py-4 bg-[#DA451F] text-white font-bold text-center rounded-2xl hover:bg-[#c23d1b] transition-colors"
          >
            + 새 공동구매 등록
          </Link>
        </div>
      </div>
    </div>
  );
}
