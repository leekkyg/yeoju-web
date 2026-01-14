"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/contexts/ThemeContext";
import BottomNav from "@/components/BottomNav";
import {
  Store,
  Plus,
  Package,
  ShoppingCart,
  Users,
  Clock,
  Bell,
  Settings,
  ChevronRight,
  ChevronLeft,
  Wallet,
  BarChart3,
  AlertCircle,
  Sun,
  Moon,
  Home,
  CheckCircle,
  XCircle,
  Calendar,
  CreditCard,
  TrendingUp,
  Eye,
} from "lucide-react";

type TabType = "all" | "active" | "completed" | "cancelled";

export default function ShopDashboardPage() {
  const router = useRouter();
  const { theme, isDark, mounted, toggleTheme } = useTheme();
  
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [shop, setShop] = useState<any>(null);
  const [groupBuys, setGroupBuys] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [stats, setStats] = useState({
    activeCount: 0,
    completedCount: 0,
    cancelledCount: 0,
    totalOrders: 0,
    totalRevenue: 0,
    pendingPayments: 0,
    todayOrders: 0,
    todayRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  
  // 스와이프용 ref
  const sliderRef = useRef<HTMLDivElement>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }
    setUser(user);

    const { data: profileData } = await supabase
      .from("profiles")
      .select("nickname, avatar_url")
      .eq("id", user.id)
      .single();
    setProfile(profileData);

    const { data: shopData } = await supabase
      .from("shops")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!shopData) {
      router.push("/shop/register");
      return;
    }
    setShop(shopData);

    // 공동구매 목록 (image_url 포함)
    const { data: gbData } = await supabase
      .from("group_buys")
      .select("*")
      .eq("shop_id", shopData.id)
      .order("created_at", { ascending: false });
    setGroupBuys(gbData || []);

    // 최근 주문 목록
    const gbIds = (gbData || []).map(g => g.id);
    if (gbIds.length > 0) {
      const { data: ordersData } = await supabase
        .from("group_buy_participants")
        .select("*, group_buy:group_buys(title, image_url)")
        .in("group_buy_id", gbIds)
        .order("created_at", { ascending: false })
        .limit(10);
      setRecentOrders(ordersData || []);
    }

    // 통계 계산
    const activeGbs = (gbData || []).filter(gb => gb.status === "active");
    const completedGbs = (gbData || []).filter(gb => gb.status === "completed");
    const cancelledGbs = (gbData || []).filter(gb => gb.status === "cancelled");

    const { data: allParticipants } = await supabase
      .from("group_buy_participants")
      .select("quantity, status, created_at, group_buy:group_buys(sale_price)")
      .in("group_buy_id", gbIds);

    const today = new Date().toDateString();
    const todayOrders = (allParticipants || []).filter(p => 
      new Date(p.created_at).toDateString() === today
    );

    const totalRevenue = (allParticipants || [])
      .filter(p => p.status === "paid" || p.status === "picked")
      .reduce((sum, p) => sum + (((p.group_buy as any)?.sale_price || 0) * (p.quantity || 1)), 0);

    const todayRevenue = todayOrders
      .filter(p => p.status === "paid" || p.status === "picked")
      .reduce((sum, p) => sum + (((p.group_buy as any)?.sale_price || 0) * (p.quantity || 1)), 0);

    const pendingPayments = (allParticipants || [])
      .filter(p => p.status === "unpaid").length;

    setStats({
      activeCount: activeGbs.length,
      completedCount: completedGbs.length,
      cancelledCount: cancelledGbs.length,
      totalOrders: allParticipants?.length || 0,
      totalRevenue,
      pendingPayments,
      todayOrders: todayOrders.length,
      todayRevenue,
    });

    setLoading(false);
  };

  // 필터된 공동구매 목록
  const filteredGroupBuys = groupBuys.filter(gb => {
    if (activeTab === "all") return true;
    return gb.status === activeTab;
  });

  // 스와이프 핸들러
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;
    
    if (isLeftSwipe && currentSlide < filteredGroupBuys.length - 1) {
      setCurrentSlide(prev => prev + 1);
    }
    if (isRightSwipe && currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
    
    setTouchStart(0);
    setTouchEnd(0);
  };

  const scrollToSlide = (index: number) => {
    setCurrentSlide(index);
    if (sliderRef.current) {
      const slideWidth = sliderRef.current.offsetWidth;
      sliderRef.current.scrollTo({
        left: slideWidth * index,
        behavior: 'smooth'
      });
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      scrollToSlide(currentSlide - 1);
    }
  };

  const nextSlide = () => {
    if (currentSlide < filteredGroupBuys.length - 1) {
      scrollToSlide(currentSlide + 1);
    }
  };

  const formatPrice = (price: number) => {
    if (price >= 10000000) {
      return (price / 10000000).toFixed(1) + "천만";
    }
    if (price >= 10000) {
      return (price / 10000).toFixed(price % 10000 === 0 ? 0 : 1) + "만원";
    }
    return price.toLocaleString() + "원";
  };

  const getStatusInfo = (status: string) => {
    const map: Record<string, { label: string; color: string; bg: string; icon: any }> = {
      active: { label: "진행중", color: theme.accent, bg: `${theme.accent}20`, icon: Clock },
      completed: { label: "완료", color: "#2563EB", bg: "#2563EB20", icon: CheckCircle },
      cancelled: { label: "취소", color: theme.red, bg: theme.redBg, icon: XCircle },
    };
    return map[status] || map.active;
  };

  const getOrderStatusInfo = (status: string) => {
    const map: Record<string, { label: string; color: string }> = {
      unpaid: { label: "입금대기", color: theme.red },
      paid: { label: "입금완료", color: "#D97706" },
      picked: { label: "픽업완료", color: "#2563EB" },
      cancelled: { label: "취소", color: theme.textMuted },
    };
    return map[status] || { label: "확인중", color: theme.textMuted };
  };

  const tabs: { key: TabType; label: string; count: number }[] = [
    { key: "all", label: "전체", count: groupBuys.length },
    { key: "active", label: "진행중", count: stats.activeCount },
    { key: "completed", label: "완료", count: stats.completedCount },
    { key: "cancelled", label: "취소", count: stats.cancelledCount },
  ];

  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.bgMain }}>
        <div className="w-10 h-10 border-2 rounded-full animate-spin" style={{ borderColor: theme.border, borderTopColor: theme.accent }}></div>
      </div>
    );
  }

  const isApproved = shop?.approval_status === "approved";

  return (
    <div className="min-h-screen pb-24 transition-colors duration-300" style={{ backgroundColor: theme.bgMain }}>
      <style jsx global>{`
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

      {/* 헤더 */}
      <header className="sticky top-0 z-50 border-b" style={{ backgroundColor: theme.bgCard, borderColor: theme.borderLight }}>
        <div className="max-w-[640px] mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden"
              style={{ backgroundColor: theme.bgInput, border: `1px solid ${theme.border}` }}
            >
              {shop?.logo_url ? (
                <img src={shop.logo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <Store className="w-5 h-5" style={{ color: theme.accent }} strokeWidth={1.5} />
              )}
            </div>
            <div>
              <h1 className="font-bold text-base" style={{ color: theme.textPrimary }}>{shop?.name}</h1>
              <p className="text-[11px]" style={{ color: theme.textMuted }}>상점 대시보드</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={toggleTheme} className="w-10 h-10 flex items-center justify-center">
              {isDark ? (
                <Sun className="w-5 h-5" style={{ color: theme.accent }} strokeWidth={1.5} />
              ) : (
                <Moon className="w-5 h-5" style={{ color: theme.accent }} strokeWidth={1.5} />
              )}
            </button>
            <Link href="/" className="w-10 h-10 flex items-center justify-center">
              <Home className="w-5 h-5" style={{ color: theme.textSecondary }} strokeWidth={1.5} />
            </Link>
            <Link href="/shop/info" className="w-10 h-10 flex items-center justify-center">
              <Settings className="w-5 h-5" style={{ color: theme.textSecondary }} strokeWidth={1.5} />
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-[640px] mx-auto">
        {/* 승인 대기 알림 */}
        {!isApproved && (
          <section className="px-4 pt-4">
            <div 
              className="rounded-2xl p-4 flex items-center gap-3"
              style={{ backgroundColor: theme.redBg, border: `1px solid ${theme.red}30` }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${theme.red}20` }}>
                <AlertCircle className="w-5 h-5" style={{ color: theme.red }} strokeWidth={1.5} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: theme.red }}>상점 승인 대기중</p>
                <p className="text-xs mt-0.5" style={{ color: `${theme.red}90` }}>승인 완료 후 공동구매를 등록할 수 있어요</p>
              </div>
            </div>
          </section>
        )}

        {/* 오늘의 현황 */}
        <section className="px-4 pt-4">
          <div 
            className="rounded-2xl p-4"
            style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-4 h-4" style={{ color: theme.accent }} />
              <span className="text-sm font-semibold" style={{ color: theme.textPrimary }}>오늘의 현황</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl p-4" style={{ backgroundColor: theme.bgInput }}>
                <div className="flex items-center gap-2 mb-2">
                  <ShoppingCart className="w-4 h-4" style={{ color: theme.accent }} />
                  <span className="text-xs" style={{ color: theme.textMuted }}>오늘 주문</span>
                </div>
                <p className="text-2xl font-bold" style={{ color: theme.textPrimary }}>{stats.todayOrders}<span className="text-sm font-normal ml-1">건</span></p>
              </div>
              <div className="rounded-xl p-4" style={{ backgroundColor: theme.bgInput }}>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4" style={{ color: theme.accent }} />
                  <span className="text-xs" style={{ color: theme.textMuted }}>오늘 매출</span>
                </div>
                <p className="text-2xl font-bold" style={{ color: theme.accent }}>{formatPrice(stats.todayRevenue)}</p>
              </div>
            </div>
          </div>
        </section>

        {/* 전체 통계 */}
        <section className="px-4 mt-4">
          <div 
            className="rounded-2xl p-4 grid grid-cols-4 gap-2"
            style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}
          >
            {[
              { icon: Package, label: "총 주문", value: stats.totalOrders, unit: "건", color: theme.accent },
              { icon: Wallet, label: "총 매출", value: formatPrice(stats.totalRevenue), unit: "", color: theme.accent },
              { icon: Clock, label: "미입금", value: stats.pendingPayments, unit: "건", color: stats.pendingPayments > 0 ? theme.red : theme.textMuted, alert: stats.pendingPayments > 0 },
              { icon: Eye, label: "진행중", value: stats.activeCount, unit: "개", color: theme.accent },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2"
                  style={{ backgroundColor: stat.alert ? theme.redBg : theme.bgInput }}
                >
                  <stat.icon className="w-5 h-5" style={{ color: stat.color }} strokeWidth={1.5} />
                </div>
                <p className="text-sm font-bold" style={{ color: stat.alert ? theme.red : theme.textPrimary }}>
                  {stat.value}{stat.unit}
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: theme.textMuted }}>{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 빠른 메뉴 */}
        <section className="px-3 mt-3">
          <div className="grid grid-cols-3 gap-2">
           {[
  { href: "/shop/groupbuy/create", icon: Plus, label: "공구등록", accent: true, disabled: !isApproved },
  { href: "/shop/groupbuys", icon: Package, label: "내 공구", accent: false, disabled: false },
  { href: "/shop/info", icon: Settings, label: "상점정보", accent: false, disabled: false },
].map((menu) => (
              <Link
                key={menu.href}
                href={menu.disabled ? "#" : menu.href}
                onClick={(e) => {
                  if (menu.disabled) {
                    e.preventDefault();
                    alert("상점 승인 후 이용 가능합니다");
                  }
                }}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all ${menu.disabled ? 'opacity-50' : ''}`}
                style={{ 
                  backgroundColor: menu.accent ? theme.accent : theme.bgCard,
                  border: `1px solid ${menu.accent ? theme.accent : theme.borderLight}`,
                }}
              >
                <menu.icon 
                  className="w-6 h-6" 
                  style={{ color: menu.accent ? (isDark ? '#121212' : '#FFFFFF') : theme.accent }} 
                  strokeWidth={1.5} 
                />
                <span 
                  className="text-xs font-medium"
                  style={{ color: menu.accent ? (isDark ? '#121212' : '#FFFFFF') : theme.textPrimary }}
                >
                  {menu.label}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* 내 공동구매 - 탭뷰 */}
        <section className="mt-6">
          <div className="px-4 flex items-center justify-between mb-3">
            <h3 className="text-base font-bold" style={{ color: theme.textPrimary }}>내 공동구매</h3>
            {isApproved && (
              <Link 
                href="/shop/groupbuy/create"
                className="flex items-center gap-1 text-sm font-semibold"
                style={{ color: theme.accent }}
              >
                <Plus className="w-4 h-4" strokeWidth={2} />
                새 공구
              </Link>
            )}
          </div>

          {/* 탭 버튼 */}
          <div className="px-4 mb-4">
            <div 
              className="flex rounded-xl p-1"
              style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}
            >
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => {
                    setActiveTab(tab.key);
                    setCurrentSlide(0);
                  }}
                  className="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all"
                  style={{ 
                    backgroundColor: activeTab === tab.key ? theme.accent : 'transparent',
                    color: activeTab === tab.key ? (isDark ? '#121212' : '#FFFFFF') : theme.textMuted,
                  }}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>
          </div>

          {/* 슬라이드 영역 */}
          {filteredGroupBuys.length === 0 ? (
            <div 
              className="mx-4 rounded-2xl p-10 text-center"
              style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}
            >
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: theme.bgInput }}
              >
                <ShoppingCart className="w-7 h-7" style={{ color: theme.textMuted }} strokeWidth={1.5} />
              </div>
              <p className="font-medium" style={{ color: theme.textMuted }}>
                {activeTab === "all" ? "등록된 공동구매가 없습니다" : `${tabs.find(t => t.key === activeTab)?.label} 공동구매가 없습니다`}
              </p>
              {isApproved && activeTab === "all" && (
                <Link
                  href="/shop/groupbuy/create"
                  className="inline-flex items-center gap-1.5 mt-4 px-5 py-2.5 rounded-xl text-sm font-semibold"
                  style={{ backgroundColor: theme.accent, color: isDark ? '#121212' : '#FFFFFF' }}
                >
                  <Plus className="w-4 h-4" strokeWidth={2} />
                  첫 공동구매 등록하기
                </Link>
              )}
            </div>
          ) : (
            <div className="relative">
              {/* 이전 버튼 */}
              {currentSlide > 0 && (
                <button
                  onClick={prevSlide}
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full flex items-center justify-center shadow-lg"
                  style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.border}` }}
                >
                  <ChevronLeft className="w-5 h-5" style={{ color: theme.textPrimary }} />
                </button>
              )}

              {/* 다음 버튼 */}
              {currentSlide < filteredGroupBuys.length - 1 && (
                <button
                  onClick={nextSlide}
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full flex items-center justify-center shadow-lg"
                  style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.border}` }}
                >
                  <ChevronRight className="w-5 h-5" style={{ color: theme.textPrimary }} />
                </button>
              )}

              {/* 슬라이드 컨테이너 */}
              <div 
                ref={sliderRef}
                className="overflow-x-auto hide-scrollbar snap-x snap-mandatory"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onScroll={(e) => {
                  const target = e.target as HTMLDivElement;
                  const slideWidth = target.offsetWidth;
                  const newSlide = Math.round(target.scrollLeft / slideWidth);
                  setCurrentSlide(newSlide);
                }}
              >
                <div className="flex">
                  {filteredGroupBuys.map((gb) => {
                    const statusInfo = getStatusInfo(gb.status);
                    const progress = gb.min_quantity ? Math.min(((gb.current_quantity || 0) / gb.min_quantity) * 100, 100) : 0;
                    const dday = gb.end_at ? Math.ceil((new Date(gb.end_at).getTime() - new Date().getTime()) / 86400000) : null;

                    return (
                      <div 
                        key={gb.id} 
                        className="w-full flex-shrink-0 snap-center px-4"
                      >
                        <Link
                          href={`/shop/groupbuy/${gb.id}`}
                          className="block rounded-2xl overflow-hidden transition-all"
                          style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}
                        >
                          {/* 썸네일 */}
                          <div className="aspect-video relative overflow-hidden" style={{ backgroundColor: theme.bgInput }}>
                            {gb.image_url ? (
                              <img src={gb.image_url} alt={gb.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ShoppingCart className="w-16 h-16 opacity-20" style={{ color: theme.textMuted }} />
                              </div>
                            )}
                            
                            {/* 상태 뱃지 */}
                            <div 
                              className="absolute top-3 left-3 px-3 py-1 text-xs font-bold rounded-full flex items-center gap-1"
                              style={{ backgroundColor: statusInfo.bg, color: statusInfo.color }}
                            >
                              <statusInfo.icon className="w-3 h-3" />
                              {statusInfo.label}
                            </div>

                            {/* D-day */}
                            {gb.status === "active" && dday !== null && dday >= 0 && (
                              <div 
                                className="absolute top-3 right-3 px-3 py-1 text-xs font-bold rounded-full"
                                style={{ backgroundColor: dday <= 2 ? theme.red : theme.accent, color: isDark ? '#121212' : '#FFFFFF' }}
                              >
                                D-{dday}
                              </div>
                            )}

                            {/* 진행률 바 */}
                            <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-black/70 to-transparent flex items-end px-3 pb-1">
                              <div className="flex-1 h-1.5 bg-white/30 rounded-full overflow-hidden mr-2">
                                <div 
                                  className="h-full rounded-full transition-all"
                                  style={{ width: `${progress}%`, backgroundColor: theme.accent }}
                                />
                              </div>
                              <span className="text-xs font-bold text-white">
                                {Math.round(progress)}%
                              </span>
                            </div>
                          </div>

                          {/* 정보 */}
                          <div className="p-4">
                            <h4 className="text-lg font-bold line-clamp-1 mb-2" style={{ color: theme.textPrimary }}>
                              {gb.title}
                            </h4>
                            <div className="flex items-center justify-between">
                              <p className="text-xl font-bold" style={{ color: theme.accent }}>
                                {gb.sale_price?.toLocaleString()}원
                              </p>
                              <div className="flex items-center gap-1 text-sm" style={{ color: theme.textMuted }}>
                                <Users className="w-4 h-4" strokeWidth={1.5} />
                                {gb.current_quantity || 0}/{gb.min_quantity || 0}명
                              </div>
                            </div>
                          </div>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 인디케이터 */}
              {filteredGroupBuys.length > 1 && (
                <div className="flex justify-center gap-1.5 mt-3">
                  {filteredGroupBuys.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => scrollToSlide(index)}
                      className="w-2 h-2 rounded-full transition-all"
                      style={{ 
                        backgroundColor: currentSlide === index ? theme.accent : theme.border,
                        width: currentSlide === index ? '16px' : '8px',
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* 최근 주문 */}
        <section className="px-4 mt-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-base font-bold" style={{ color: theme.textPrimary }}>최근 주문</h3>
              <p className="text-xs mt-0.5" style={{ color: theme.textMuted }}>
                미입금 {stats.pendingPayments}건
              </p>
            </div>

          </div>

          {recentOrders.length === 0 ? (
            <div
              className="rounded-2xl p-8 text-center"
              style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}
            >
              <Package className="w-10 h-10 mx-auto mb-3" style={{ color: theme.textMuted }} strokeWidth={1.5} />
              <p style={{ color: theme.textMuted }}>아직 주문이 없습니다</p>
            </div>
          ) : (
            <div 
              className="rounded-2xl overflow-hidden"
              style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}
            >
              {recentOrders.slice(0, 5).map((order, index) => {
                const orderStatus = getOrderStatusInfo(order.status);
                return (
                  <Link
                    key={order.id}
                    href="/shop/orders"
                    className="flex items-center gap-3 p-4 transition-colors"
                    style={{ borderBottom: index < Math.min(recentOrders.length, 5) - 1 ? `1px solid ${theme.border}` : 'none' }}
                  >
                    <div 
                      className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0"
                      style={{ backgroundColor: theme.bgInput }}
                    >
                      {order.group_buy?.image_url ? (
                        <img src={order.group_buy.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-5 h-5" style={{ color: theme.textMuted }} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: theme.textPrimary }}>
                        {order.name} ({order.quantity}개)
                      </p>
                      <p className="text-xs truncate" style={{ color: theme.textMuted }}>
                        {order.group_buy?.title}
                      </p>
                    </div>
                    <div className="text-right">
                      <span 
                        className="text-xs font-semibold px-2 py-1 rounded-full"
                        style={{ backgroundColor: `${orderStatus.color}20`, color: orderStatus.color }}
                      >
                        {orderStatus.label}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
