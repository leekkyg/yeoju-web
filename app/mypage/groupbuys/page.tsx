"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface MyGroupBuy {
  id: number;
  name: string;
  phone: string;
  quantity: number;
  is_paid: boolean;
  created_at: string;
  group_buy: {
    id: number;
    title: string;
    sale_price: number;
    original_price: number;
    end_at: string;
    pickup_date: string;
    pickup_start_time: string;
    pickup_end_time: string;
    pickup_location: string;
    status: string;
    status_reason: string;
    image_url: string;
    shop: {
      id: number;
      name: string;
      logo_url: string;
    };
  };
}

export default function MyGroupBuysPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [myGroupBuys, setMyGroupBuys] = useState<MyGroupBuy[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "active" | "completed">("all");

  useEffect(() => {
    fetchMyGroupBuys();
  }, []);

  const fetchMyGroupBuys = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert("로그인이 필요합니다");
      router.push("/login");
      return;
    }

    const { data } = await supabase
      .from("group_buy_participants")
      .select(`
        *,
        group_buy:group_buys(
          id, title, sale_price, original_price, end_at, 
          pickup_date, pickup_start_time, pickup_end_time, pickup_location,
          status, status_reason, image_url,
          shop:shops(id, name, logo_url)
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setMyGroupBuys(data || []);
    setLoading(false);
  };

  const getStatusInfo = (gb: MyGroupBuy["group_buy"]) => {
    const now = new Date();
    const end = new Date(gb.end_at);

    if (gb.status === "cancelled") {
      return { label: "취소됨", color: "bg-red-100 text-red-700", icon: "❌" };
    }
    if (gb.status === "paused") {
      return { label: "중단됨", color: "bg-yellow-100 text-yellow-700", icon: "⏸️" };
    }
    if (gb.status === "completed") {
      return { label: "완료", color: "bg-blue-100 text-blue-700", icon: "✅" };
    }
    if (end < now) {
      return { label: "마감", color: "bg-gray-100 text-gray-500", icon: "⏰" };
    }
    return { label: "진행중", color: "bg-green-100 text-green-700", icon: "🔥" };
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const formatPickupDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
    return `${date.getMonth() + 1}/${date.getDate()}(${weekdays[date.getDay()]})`;
  };

  const filteredGroupBuys = myGroupBuys.filter(item => {
    if (activeTab === "all") return true;
    const status = getStatusInfo(item.group_buy);
    if (activeTab === "active") return status.label === "진행중";
    if (activeTab === "completed") return ["완료", "취소됨", "중단됨", "마감"].includes(status.label);
    return true;
  });

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
            className="w-10 h-10 flex items-center justify-center text-[#F2D38D] hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-white font-bold text-lg">내 공동구매</span>
          <div className="w-10" />
        </div>
      </header>

      <main className="pt-14 pb-8 max-w-[640px] mx-auto">
        {/* 탭 */}
        <div className="px-5 py-3 bg-white border-b border-[#19643D]/10 sticky top-14 z-40">
          <div className="flex gap-2">
            {[
              { key: "all", label: "전체" },
              { key: "active", label: "진행중" },
              { key: "completed", label: "완료/취소" },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${
                  activeTab === tab.key
                    ? "bg-[#19643D] text-white"
                    : "bg-[#19643D]/5 text-[#19643D]/60"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 목록 */}
        <div className="px-5 py-4">
          {filteredGroupBuys.length === 0 ? (
            <div className="py-20 text-center">
              <div className="w-24 h-24 bg-[#F2D38D]/30 rounded-full flex items-center justify-center mx-auto mb-5">
                <span className="text-5xl">🛒</span>
              </div>
              <p className="text-[#19643D] font-medium text-lg mb-2">참여한 공동구매가 없어요</p>
              <p className="text-[#19643D]/50 text-sm mb-6">공동구매에 참여해보세요!</p>
              <Link
                href="/groupbuy"
                className="inline-block px-6 py-3 bg-[#19643D] text-white font-bold rounded-xl hover:bg-[#145231] transition-colors"
              >
                공동구매 둘러보기
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredGroupBuys.map((item) => {
                const statusInfo = getStatusInfo(item.group_buy);
                const totalPrice = item.quantity * item.group_buy.sale_price;

                return (
                  <Link
                    key={item.id}
                    href={`/groupbuy/${item.group_buy.id}`}
                    className="block bg-white rounded-2xl overflow-hidden border border-[#19643D]/10 hover:border-[#19643D]/30 transition-all"
                  >
                    {/* 상태 바 */}
                    <div className={`px-4 py-2 flex items-center justify-between ${
                      statusInfo.label === "진행중" ? "bg-green-50" :
                      statusInfo.label === "완료" ? "bg-blue-50" :
                      statusInfo.label === "취소됨" || statusInfo.label === "중단됨" ? "bg-red-50" :
                      "bg-gray-50"
                    }`}>
                      <div className="flex items-center gap-2">
                        <span>{statusInfo.icon}</span>
                        <span className={`text-sm font-bold ${
                          statusInfo.label === "진행중" ? "text-green-700" :
                          statusInfo.label === "완료" ? "text-blue-700" :
                          statusInfo.label === "취소됨" || statusInfo.label === "중단됨" ? "text-red-700" :
                          "text-gray-500"
                        }`}>
                          {statusInfo.label}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        신청일: {formatDate(item.created_at)}
                      </span>
                    </div>

                    {/* 상품 정보 */}
                    <div className="p-4">
                      <div className="flex gap-4">
                        <div className="w-20 h-20 rounded-xl bg-[#F2D38D]/30 flex-shrink-0 overflow-hidden">
                          {item.group_buy.image_url ? (
                            <img src={item.group_buy.image_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-3xl">🛒</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          {/* 상점명 */}
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-5 h-5 rounded-full bg-[#19643D] flex items-center justify-center text-[#F2D38D] text-xs font-bold overflow-hidden">
                              {item.group_buy.shop?.logo_url ? (
                                <img src={item.group_buy.shop.logo_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                item.group_buy.shop?.name?.charAt(0)
                              )}
                            </div>
                            <span className="text-xs text-[#19643D]/50">{item.group_buy.shop?.name}</span>
                          </div>
                          <h3 className="font-bold text-[#19643D] line-clamp-2 text-sm">{item.group_buy.title}</h3>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-lg font-black text-[#DA451F]">
                              {totalPrice.toLocaleString()}원
                            </span>
                            <span className="text-sm text-[#19643D]/40">
                              ({item.quantity}개)
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 입금/픽업 정보 */}
                      <div className="mt-4 pt-4 border-t border-[#19643D]/10 flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm">
                          <span className={`px-2 py-1 rounded-lg font-medium ${
                            item.is_paid 
                              ? "bg-[#19643D]/10 text-[#19643D]" 
                              : "bg-yellow-100 text-yellow-700"
                          }`}>
                            {item.is_paid ? "✓ 입금완료" : "입금대기"}
                          </span>
                        </div>
                        {item.group_buy.pickup_date && (
                          <span className="text-sm text-[#19643D]/50">
                            📍 {formatPickupDate(item.group_buy.pickup_date)} 픽업
                          </span>
                        )}
                      </div>

                      {/* 취소/중단 사유 */}
                      {(item.group_buy.status === "cancelled" || item.group_buy.status === "paused") && item.group_buy.status_reason && (
                        <div className={`mt-3 p-3 rounded-xl text-sm ${
                          item.group_buy.status === "cancelled" ? "bg-red-50 text-red-700" : "bg-yellow-50 text-yellow-700"
                        }`}>
                          <span className="font-bold">
                            {item.group_buy.status === "cancelled" ? "취소 사유: " : "중단 사유: "}
                          </span>
                          {item.group_buy.status_reason}
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
