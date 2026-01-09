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
  phone: string;
  address: string;
  approval_status: string;
  bank_name: string;
  bank_account: string;
  bank_holder: string;
}

interface GroupBuy {
  id: number;
  title: string;
  sale_price: number;
  original_price: number;
  current_quantity: number;
  min_quantity: number;
  end_at: string;
  status: string;
  created_at: string;
}

interface Participant {
  id: number;
  name: string;
  phone: string;
  quantity: number;
  created_at: string;
  group_buy: {
    id: number;
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
  const [activeTab, setActiveTab] = useState<"groupbuys" | "orders">("groupbuys");
  const [stats, setStats] = useState({ totalOrders: 0, totalRevenue: 0, activeGroupBuys: 0 });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert("로그인이 필요합니다");
      router.push("/login");
      return;
    }

    // 상점 정보
    const { data: shopData } = await supabase
      .from("shops")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!shopData) {
      alert("등록된 상점이 없습니다");
      router.push("/shop/register");
      return;
    }

    setShop(shopData);

    // 공동구매 목록
    const { data: gbData } = await supabase
      .from("group_buys")
      .select("*")
      .eq("shop_id", shopData.id)
      .order("created_at", { ascending: false });

    setGroupBuys(gbData || []);

    // 참여자 목록
    const { data: participantsData } = await supabase
      .from("group_buy_participants")
      .select(`
        *,
        group_buy:group_buys(id, title, sale_price)
      `)
      .in("group_buy_id", (gbData || []).map(g => g.id))
      .order("created_at", { ascending: false });

    setParticipants(participantsData || []);

    // 통계 계산
    const activeGbs = (gbData || []).filter(g => g.status === "active").length;
    const totalOrders = (participantsData || []).length;
    const totalRevenue = (participantsData || []).reduce((sum, p) => {
      return sum + (p.quantity * (p.group_buy?.sale_price || 0));
    }, 0);

    setStats({ totalOrders, totalRevenue, activeGroupBuys: activeGbs });
    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold">승인 대기</span>;
      case "approved":
        return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">승인 완료</span>;
      case "rejected":
        return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">승인 거절</span>;
      default:
        return null;
    }
  };

  const getGroupBuyStatus = (gb: GroupBuy) => {
    const now = new Date();
    const end = new Date(gb.end_at);
    
    if (gb.status === "cancelled") {
      return <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded-full text-xs font-bold">취소됨</span>;
    }
    if (gb.status === "completed") {
      return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">완료</span>;
    }
    if (end < now) {
      return <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded-full text-xs font-bold">마감</span>;
    }
    if (gb.current_quantity >= gb.min_quantity) {
      return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">확정</span>;
    }
    return <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-bold">진행중</span>;
  };

  const getTimeLeft = (endAt: string) => {
    const now = new Date().getTime();
    const end = new Date(endAt).getTime();
    const diff = end - now;

    if (diff <= 0) return "마감";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days}일 ${hours}시간`;
    return `${hours}시간`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
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
            className="w-10 h-10 flex items-center justify-center text-[#F2D38D] hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-white font-bold text-lg">내 상점</span>
          <Link 
            href="/shop/settings" 
            className="w-10 h-10 flex items-center justify-center text-[#F2D38D] hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </Link>
        </div>
      </header>

      <main className="pt-14 pb-28 max-w-[640px] mx-auto">
        {/* 상점 정보 카드 */}
        <div className="px-5 py-6 bg-white border-b border-[#19643D]/10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#19643D] flex items-center justify-center text-[#F2D38D] text-2xl font-bold overflow-hidden flex-shrink-0">
              {shop?.logo_url ? (
                <img src={shop.logo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                shop?.name?.charAt(0)
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-bold text-[#19643D] truncate">{shop?.name}</h1>
                {getStatusBadge(shop?.approval_status || "")}
              </div>
              <p className="text-sm text-[#19643D]/50">{shop?.category}</p>
              <p className="text-sm text-[#19643D]/50 truncate">{shop?.address}</p>
            </div>
          </div>

          {/* 승인 대기 안내 */}
          {shop?.approval_status === "pending" && (
            <div className="mt-4 bg-yellow-50 rounded-xl p-4 border border-yellow-200">
              <p className="text-sm text-yellow-800">
                ⏳ 관리자 승인 대기 중입니다. 승인 완료 후 공동구매를 등록할 수 있습니다.
              </p>
            </div>
          )}

          {/* 승인 거절 안내 */}
          {shop?.approval_status === "rejected" && (
            <div className="mt-4 bg-red-50 rounded-xl p-4 border border-red-200">
              <p className="text-sm text-red-800">
                ❌ 승인이 거절되었습니다. 관리자에게 문의해주세요.
              </p>
            </div>
          )}
        </div>

        {/* 통계 */}
        <div className="px-5 py-4 bg-[#19643D]">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-black text-white">{stats.activeGroupBuys}</p>
              <p className="text-xs text-[#F2D38D]/80">진행중 공구</p>
            </div>
            <div>
              <p className="text-2xl font-black text-white">{stats.totalOrders}</p>
              <p className="text-xs text-[#F2D38D]/80">총 주문</p>
            </div>
            <div>
              <p className="text-2xl font-black text-white">{stats.totalRevenue.toLocaleString()}</p>
              <p className="text-xs text-[#F2D38D]/80">예상 매출</p>
            </div>
          </div>
        </div>

        {/* 탭 */}
        <div className="px-5 py-3 bg-white border-b border-[#19643D]/10 sticky top-14 z-40">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("groupbuys")}
              className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${
                activeTab === "groupbuys"
                  ? "bg-[#19643D] text-white"
                  : "bg-[#19643D]/5 text-[#19643D]/60"
              }`}
            >
              공동구매 관리
            </button>
            <button
              onClick={() => setActiveTab("orders")}
              className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${
                activeTab === "orders"
                  ? "bg-[#19643D] text-white"
                  : "bg-[#19643D]/5 text-[#19643D]/60"
              }`}
            >
              주문 내역 ({participants.length})
            </button>
          </div>
        </div>

        {/* 공동구매 목록 */}
        {activeTab === "groupbuys" && (
          <div className="px-5 py-4">
            {groupBuys.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-20 h-20 bg-[#F2D38D]/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-4xl">🛒</span>
                </div>
                <p className="text-[#19643D] font-medium mb-2">등록된 공동구매가 없어요</p>
                <p className="text-sm text-[#19643D]/50">첫 공동구매를 등록해보세요!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {groupBuys.map((gb) => (
                  <Link
                    key={gb.id}
                    href={`/shop/groupbuy/${gb.id}`}
                    className="block bg-white rounded-2xl p-4 border border-[#19643D]/10 hover:border-[#19643D]/30 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-bold text-[#19643D] line-clamp-1 flex-1 mr-2">{gb.title}</h3>
                      {getGroupBuyStatus(gb)}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3 text-[#19643D]/50">
                        <span>{gb.sale_price.toLocaleString()}원</span>
                        <span>•</span>
                        <span>{gb.current_quantity}/{gb.min_quantity}명</span>
                      </div>
                      <span className="text-[#DA451F] font-medium">
                        {getTimeLeft(gb.end_at)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 주문 내역 */}
        {activeTab === "orders" && (
          <div className="px-5 py-4">
            {participants.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-20 h-20 bg-[#F2D38D]/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-4xl">📋</span>
                </div>
                <p className="text-[#19643D] font-medium mb-2">주문 내역이 없어요</p>
                <p className="text-sm text-[#19643D]/50">공동구매에 참여자가 생기면 여기에 표시됩니다</p>
              </div>
            ) : (
              <div className="space-y-3">
                {participants.map((p) => (
                  <div
                    key={p.id}
                    className="bg-white rounded-2xl p-4 border border-[#19643D]/10"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-bold text-[#19643D]">{p.name}</p>
                        <p className="text-sm text-[#19643D]/50">{p.phone}</p>
                      </div>
                      <span className="text-xs text-[#19643D]/40">{formatDate(p.created_at)}</span>
                    </div>
                    <div className="bg-[#FDFBF7] rounded-xl p-3 mt-2">
                      <p className="text-sm text-[#19643D]/70 line-clamp-1 mb-1">{p.group_buy?.title}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[#19643D]/50">{p.quantity}개</span>
                        <span className="font-bold text-[#DA451F]">
                          {((p.group_buy?.sale_price || 0) * p.quantity).toLocaleString()}원
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* 하단 버튼 */}
      {shop?.approval_status === "approved" && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-[#19643D]/10">
          <div className="max-w-[640px] mx-auto px-5 py-4">
            <Link
              href="/shop/groupbuy/create"
              className="block w-full h-14 bg-[#DA451F] hover:bg-[#c23d1b] text-white font-bold text-lg rounded-2xl transition-colors shadow-lg shadow-[#DA451F]/20 flex items-center justify-center gap-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              공동구매 등록
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
