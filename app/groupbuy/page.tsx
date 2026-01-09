"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface GroupBuy {
  id: number;
  title: string;
  description: string;
  original_price: number;
  sale_price: number;
  min_quantity: number;
  current_quantity: number;
  end_at: string;
  image_url: string;
  status: string;
  shop: {
    id: number;
    name: string;
    category: string;
    logo_url: string;
  };
}

const categories = [
  { id: "all", name: "전체", icon: "🛒" },
  { id: "chicken", name: "치킨/피자", icon: "🍗" },
  { id: "food", name: "음식점", icon: "🍽️" },
  { id: "cafe", name: "카페/베이커리", icon: "☕" },
  { id: "beauty", name: "뷰티/미용", icon: "💇" },
  { id: "life", name: "생활/편의", icon: "🏪" },
];

export default function GroupBuyListPage() {
  const router = useRouter();
  const [groupBuys, setGroupBuys] = useState<GroupBuy[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [sortBy, setSortBy] = useState<"latest" | "ending" | "discount">("latest");

  useEffect(() => {
    fetchGroupBuys();
  }, []);

  const fetchGroupBuys = async () => {
    const { data, error } = await supabase
      .from("group_buys")
      .select(`
        *,
        shop:shops(id, name, category, logo_url)
      `)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setGroupBuys(data);
    }
    setLoading(false);
  };

  const getTimeLeft = (endAt: string) => {
    const now = new Date().getTime();
    const end = new Date(endAt).getTime();
    const diff = end - now;

    if (diff <= 0) return "마감";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}일 ${hours}시간 남음`;
    if (hours > 0) return `${hours}시간 ${minutes}분 남음`;
    return `${minutes}분 남음`;
  };

  const getDiscountPercent = (original: number, sale: number) => {
    return Math.round((1 - sale / original) * 100);
  };

  const getProgress = (current: number, min: number) => {
    return Math.min((current / min) * 100, 100);
  };

  const filteredGroupBuys = groupBuys
    .filter(gb => selectedCategory === "전체" || gb.shop?.category === selectedCategory)
    .sort((a, b) => {
      if (sortBy === "ending") {
        return new Date(a.end_at).getTime() - new Date(b.end_at).getTime();
      }
      if (sortBy === "discount") {
        const discountA = (a.original_price - a.sale_price) / a.original_price;
        const discountB = (b.original_price - b.sale_price) / b.original_price;
        return discountB - discountA;
      }
      return 0;
    });

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
          <h1 className="text-white font-bold text-lg tracking-tight">공동구매</h1>
          <Link 
            href="/shop/dashboard" 
            className="text-[#F2D38D] text-sm font-medium hover:text-white transition-colors"
          >
            내 상점
          </Link>
        </div>
      </header>

      {/* 카테고리 */}
      <div className="fixed top-14 left-0 right-0 z-40 bg-[#19643D]/95 backdrop-blur-sm border-t border-[#F2D38D]/10">
        <div className="max-w-[640px] mx-auto px-4 py-3 overflow-x-auto scrollbar-hide">
          <div className="flex gap-2">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.name)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  selectedCategory === cat.name
                    ? "bg-[#F2D38D] text-[#19643D] shadow-lg"
                    : "bg-white/10 text-white/80 hover:bg-white/20"
                }`}
              >
                {cat.icon} {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="pt-[120px] pb-8 max-w-[640px] mx-auto px-4">
        {/* 정렬 + 개수 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            {[
              { key: "latest", label: "최신순" },
              { key: "ending", label: "마감임박" },
              { key: "discount", label: "할인율순" },
            ].map(s => (
              <button
                key={s.key}
                onClick={() => setSortBy(s.key as typeof sortBy)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  sortBy === s.key
                    ? "bg-[#19643D] text-white"
                    : "bg-white text-[#19643D]/60 border border-[#19643D]/20"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <span className="text-sm text-[#19643D]/50">
            {filteredGroupBuys.length}개
          </span>
        </div>

        {/* 로딩 */}
        {loading && (
          <div className="py-20 flex justify-center">
            <div className="w-8 h-8 border-2 border-[#19643D] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* 빈 상태 */}
        {!loading && filteredGroupBuys.length === 0 && (
          <div className="py-20 text-center">
            <div className="w-24 h-24 bg-[#F2D38D]/30 rounded-full flex items-center justify-center mx-auto mb-5">
              <span className="text-5xl">🛒</span>
            </div>
            <p className="text-[#19643D] font-medium text-lg mb-2">진행 중인 공동구매가 없어요</p>
            <p className="text-[#19643D]/50 text-sm">조금만 기다려주세요!</p>
          </div>
        )}

        {/* 상품 목록 */}
        <div className="space-y-4">
          {filteredGroupBuys.map(gb => {
            const discountPercent = getDiscountPercent(gb.original_price, gb.sale_price);
            const progress = getProgress(gb.current_quantity, gb.min_quantity);
            const timeLeft = getTimeLeft(gb.end_at);
            const isUrgent = timeLeft.includes("시간") || timeLeft.includes("분");
            
            return (
              <Link
                key={gb.id}
                href={`/groupbuy/${gb.id}`}
                className="block bg-white rounded-2xl overflow-hidden border border-[#19643D]/10 shadow-sm hover:shadow-lg hover:border-[#19643D]/20 transition-all group"
              >
                {/* 이미지 */}
                <div className="aspect-[2.2/1] bg-gradient-to-br from-[#F2D38D]/50 to-[#F2D38D]/30 relative overflow-hidden">
                  {gb.image_url ? (
                    <img 
                      src={gb.image_url} 
                      alt={gb.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-6xl opacity-40">🛒</span>
                    </div>
                  )}
                  
                  {/* 할인율 뱃지 */}
                  <div className="absolute top-3 left-3 bg-[#DA451F] text-white px-2.5 py-1 rounded-full text-xs font-bold shadow-lg">
                    {discountPercent}% 할인
                  </div>

                  {/* 마감 시간 */}
                  <div className={`absolute bottom-3 right-3 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg ${
                    isUrgent 
                      ? "bg-[#DA451F] text-white animate-pulse" 
                      : "bg-black/60 backdrop-blur-sm text-white"
                  }`}>
                    ⏰ {timeLeft}
                  </div>

                  {/* 공구 확정 뱃지 */}
                  {progress >= 100 && (
                    <div className="absolute top-3 right-3 bg-[#19643D] text-white px-2.5 py-1 rounded-full text-xs font-bold shadow-lg">
                      ✅ 확정
                    </div>
                  )}
                </div>

                {/* 정보 */}
                <div className="p-4">
                  {/* 상점 정보 */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-[#19643D] flex items-center justify-center text-[#F2D38D] text-xs font-bold overflow-hidden flex-shrink-0">
                      {gb.shop?.logo_url ? (
                        <img src={gb.shop.logo_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        gb.shop?.name?.charAt(0)
                      )}
                    </div>
                    <span className="text-sm text-[#19643D]/50 truncate">{gb.shop?.name}</span>
                    <span className="text-xs text-[#19643D]/30">•</span>
                    <span className="text-xs text-[#19643D]/40">{gb.shop?.category}</span>
                  </div>

                  {/* 상품명 */}
                  <h3 className="font-bold text-[#19643D] mb-3 line-clamp-2 group-hover:text-[#145231] transition-colors leading-snug">
                    {gb.title}
                  </h3>

                  {/* 가격 */}
                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-2xl font-black text-[#19643D]">
                      {gb.sale_price.toLocaleString()}
                    </span>
                    <span className="text-lg font-bold text-[#19643D]">원</span>
                    <span className="text-sm text-[#19643D]/30 line-through ml-1">
                      {gb.original_price.toLocaleString()}원
                    </span>
                  </div>

                  {/* 참여 현황 바 */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2.5 bg-[#19643D]/10 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${
                          progress >= 100 
                            ? "bg-[#19643D]" 
                            : "bg-gradient-to-r from-[#DA451F] to-[#e85a35]"
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-[#19643D]/70 whitespace-nowrap">
                      <span className={progress >= 100 ? "text-[#19643D]" : "text-[#DA451F]"}>
                        {gb.current_quantity}
                      </span>
                      <span className="text-[#19643D]/40">/{gb.min_quantity}명</span>
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* 사장님 유도 배너 */}
        {!loading && (
          <div className="mt-8 bg-gradient-to-r from-[#19643D] to-[#1e7a4a] rounded-2xl p-5 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-lg mb-1">사장님이세요? 🏪</p>
                <p className="text-white/70 text-sm">여주마켓에서 공동구매를 시작해보세요</p>
              </div>
              <Link
                href="/shop/register"
                className="bg-[#F2D38D] text-[#19643D] px-4 py-2 rounded-xl font-bold text-sm hover:bg-[#e8c97d] transition-colors whitespace-nowrap"
              >
                입점 신청
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
