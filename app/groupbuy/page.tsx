"use client";

import { useState, useEffect, useRef } from "react";
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
  
  // 카테고리 스크롤 관련
  const categoryRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  useEffect(() => {
    fetchGroupBuys();
  }, []);

  // 스크롤 상태 체크
  const checkScrollButtons = () => {
    if (categoryRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = categoryRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScrollButtons();
    window.addEventListener('resize', checkScrollButtons);
    return () => window.removeEventListener('resize', checkScrollButtons);
  }, []);

  // 화살표 클릭으로 스크롤
  const scrollCategory = (direction: 'left' | 'right') => {
    if (categoryRef.current) {
      const scrollAmount = 150;
      categoryRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
      setTimeout(checkScrollButtons, 300);
    }
  };

  // 마우스 드래그 스크롤
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!categoryRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - categoryRef.current.offsetLeft);
    setScrollLeft(categoryRef.current.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !categoryRef.current) return;
    e.preventDefault();
    const x = e.pageX - categoryRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    categoryRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    checkScrollButtons();
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

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

    if (days > 0) return `${days}일`;
    if (hours > 0) return `${hours}시간`;
    return `${minutes}분`;
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
      {/* 스크롤바 숨기기 스타일 */}
      <style jsx global>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .drag-scroll {
          cursor: grab;
        }
        .drag-scroll:active {
          cursor: grabbing;
        }
      `}</style>

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

      {/* 카테고리 - 화살표 + 드래그 스크롤 */}
      <div className="fixed top-14 left-0 right-0 z-40 bg-[#19643D]/95 backdrop-blur-sm border-t border-[#F2D38D]/10">
        <div className="max-w-[640px] mx-auto relative">
          {/* 왼쪽 화살표 */}
          {canScrollLeft && (
            <button
              onClick={() => scrollCategory('left')}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-[#19643D] flex items-center justify-center text-white shadow-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* 카테고리 목록 */}
          <div 
            ref={categoryRef}
            className="px-4 py-3 overflow-x-auto scrollbar-hide drag-scroll"
            onScroll={checkScrollButtons}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
          >
            <div className="flex gap-2 px-4">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => !isDragging && setSelectedCategory(cat.name)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all select-none ${
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

          {/* 오른쪽 화살표 */}
          {canScrollRight && (
            <button
              onClick={() => scrollCategory('right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-[#19643D] flex items-center justify-center text-white shadow-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <main className="pt-[120px] pb-8 max-w-[640px] mx-auto px-3">
        {/* 정렬 + 개수 */}
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
            {[
              { key: "latest", label: "최신순" },
              { key: "ending", label: "마감임박" },
              { key: "discount", label: "할인율순" },
            ].map(s => (
              <button
                key={s.key}
                onClick={() => setSortBy(s.key as typeof sortBy)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                  sortBy === s.key
                    ? "bg-[#19643D] text-white"
                    : "bg-white text-[#19643D]/60 border border-[#19643D]/20"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <span className="text-xs text-[#19643D]/50 whitespace-nowrap ml-2">
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

        {/* 상품 목록 - 3열 그리드 */}
        <div className="grid grid-cols-3 gap-2">
          {filteredGroupBuys.map(gb => {
            const discountPercent = getDiscountPercent(gb.original_price, gb.sale_price);
            const progress = getProgress(gb.current_quantity, gb.min_quantity);
            const timeLeft = getTimeLeft(gb.end_at);
            const isUrgent = timeLeft.includes("시간") || timeLeft.includes("분");
            
            return (
              <Link
                key={gb.id}
                href={`/groupbuy/${gb.id}`}
                className="block bg-white rounded-xl overflow-hidden border border-[#19643D]/10 shadow-sm hover:shadow-md transition-all group"
              >
                {/* 이미지 */}
                <div className="aspect-square bg-gradient-to-br from-[#F2D38D]/50 to-[#F2D38D]/30 relative overflow-hidden">
                  {gb.image_url ? (
                    <img 
                      src={gb.image_url} 
                      alt={gb.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-3xl opacity-40">🛒</span>
                    </div>
                  )}
                  
                  {/* 할인율 뱃지 */}
                  <div className="absolute top-1.5 left-1.5 bg-[#DA451F] text-white px-1.5 py-0.5 rounded text-[10px] font-bold">
                    {discountPercent}%
                  </div>

                  {/* 마감 시간 */}
                  <div className={`absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    isUrgent 
                      ? "bg-[#DA451F] text-white" 
                      : "bg-black/50 text-white"
                  }`}>
                    {timeLeft}
                  </div>

                  {/* 공구 확정 뱃지 */}
                  {progress >= 100 && (
                    <div className="absolute top-1.5 right-1.5 bg-[#19643D] text-white px-1.5 py-0.5 rounded text-[10px] font-bold">
                      확정
                    </div>
                  )}
                </div>

                {/* 정보 */}
                <div className="p-2">
                  {/* 상점명 */}
                  <p className="text-[10px] text-[#19643D]/50 truncate mb-0.5">
                    {gb.shop?.name}
                  </p>

                  {/* 상품명 */}
                  <h3 className="text-xs font-medium text-[#19643D] line-clamp-2 leading-tight mb-1.5 min-h-[32px]">
                    {gb.title}
                  </h3>

                  {/* 가격 */}
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm font-bold text-[#19643D]">
                      {gb.sale_price.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-[#19643D]">원</span>
                  </div>

                  {/* 참여 현황 바 */}
                  <div className="mt-1.5">
                    <div className="h-1.5 bg-[#19643D]/10 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${
                          progress >= 100 
                            ? "bg-[#19643D]" 
                            : "bg-gradient-to-r from-[#DA451F] to-[#e85a35]"
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-[#19643D]/50 mt-0.5 text-right">
                      {gb.current_quantity}/{gb.min_quantity}명
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* 사장님 유도 배너 */}
        {!loading && (
          <div className="mt-6 bg-gradient-to-r from-[#19643D] to-[#1e7a4a] rounded-xl p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-sm mb-0.5">사장님이세요? 🏪</p>
                <p className="text-white/70 text-xs">공동구매를 시작해보세요</p>
              </div>
              <Link
                href="/shop/register"
                className="bg-[#F2D38D] text-[#19643D] px-3 py-1.5 rounded-lg font-bold text-xs hover:bg-[#e8c97d] transition-colors whitespace-nowrap"
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
