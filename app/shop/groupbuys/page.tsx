"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/contexts/ThemeContext";
import { ChevronLeft, Plus, ShoppingCart, Users, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";

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
  total_participants: number;
  paid_count: number;
  unpaid_count: number;
  picked_count: number;
  total_revenue: number;
}

type FilterType = "all" | "active" | "completed" | "cancelled";

export default function ShopGroupBuysPage() {
  const router = useRouter();
  const { theme, isDark, mounted } = useTheme();
  const [loading, setLoading] = useState(true);
  const [groupBuys, setGroupBuys] = useState<GroupBuy[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const [shopId, setShopId] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) {
      router.push("/login");
      return;
    }

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

  const getStatusInfo = (gb: GroupBuy) => {
    const now = new Date();
    const end = new Date(gb.end_at);

    if (gb.status === "cancelled") {
      return { label: "취소", color: theme.red, bg: `${theme.red}20`, icon: XCircle };
    }
    if (gb.status === "completed") {
      return { label: "종료", color: "#2563EB", bg: "#2563EB20", icon: CheckCircle };
    }
    if (end < now) {
      return { label: "마감", color: theme.textMuted, bg: theme.bgInput, icon: Clock };
    }
    if (gb.current_quantity >= gb.min_quantity) {
      return { label: "확정", color: "#16a34a", bg: "#16a34a20", icon: CheckCircle };
    }
    return { label: "진행중", color: theme.accent, bg: `${theme.accent}20`, icon: Clock };
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const getDaysLeft = (endAt: string) => {
    const now = new Date();
    const end = new Date(endAt);
    const diff = end.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
  };

  const filteredGroupBuys = groupBuys.filter(gb => {
    if (filter === "all") return true;
    if (filter === "active") return gb.status === "active" && new Date(gb.end_at) >= new Date();
    if (filter === "completed") return gb.status === "completed" || (gb.status === "active" && new Date(gb.end_at) < new Date());
    if (filter === "cancelled") return gb.status === "cancelled";
    return true;
  });

  const activeCount = groupBuys.filter(gb => gb.status === "active" && new Date(gb.end_at) >= new Date()).length;
  const completedCount = groupBuys.filter(gb => gb.status === "completed" || (gb.status === "active" && new Date(gb.end_at) < new Date())).length;
  const cancelledCount = groupBuys.filter(gb => gb.status === "cancelled").length;

  const filters: { key: FilterType; label: string; count: number }[] = [
    { key: "all", label: "전체", count: groupBuys.length },
    { key: "active", label: "진행중", count: activeCount },
    { key: "completed", label: "종료", count: completedCount },
    { key: "cancelled", label: "취소", count: cancelledCount },
  ];

  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.bgMain }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: theme.accent }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: theme.bgMain }}>
      {/* 헤더 */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b" style={{ backgroundColor: theme.bgCard, borderColor: theme.border }}>
        <div className="max-w-[640px] mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => router.push("/shop/dashboard")} className="w-10 h-10 flex items-center justify-center">
            <ChevronLeft className="w-6 h-6" style={{ color: theme.textSecondary }} />
          </button>
          <span className="font-bold" style={{ color: theme.textPrimary }}>내 공구</span>
          <Link href="/shop/groupbuy/create" className="w-10 h-10 flex items-center justify-center">
            <Plus className="w-6 h-6" style={{ color: theme.accent }} />
          </Link>
        </div>
      </header>

      {/* 필터 탭 */}
      <div className="fixed top-14 left-0 right-0 z-40 border-b" style={{ backgroundColor: theme.bgCard, borderColor: theme.border }}>
        <div className="max-w-[640px] mx-auto px-4 py-3">
          <div className="flex gap-2 overflow-x-auto">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className="px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all"
                style={{
                  backgroundColor: filter === f.key ? theme.accent : theme.bgInput,
                  color: filter === f.key ? (isDark ? '#121212' : '#fff') : theme.textMuted,
                }}
              >
                {f.label} {f.count}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="pt-28 max-w-[640px] mx-auto px-4">
        {filteredGroupBuys.length === 0 ? (
          <div className="py-16 text-center">
            <div 
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: theme.bgInput }}
            >
              <ShoppingCart className="w-8 h-8" style={{ color: theme.textMuted }} />
            </div>
            <p className="font-medium mb-2" style={{ color: theme.textPrimary }}>
              {filter === "all" ? "등록된 공구가 없습니다" : "해당 상태의 공구가 없습니다"}
            </p>
            <p className="text-sm mb-6" style={{ color: theme.textMuted }}>
              새로운 공구를 등록해보세요!
            </p>
            <Link
              href="/shop/groupbuy/create"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold"
              style={{ backgroundColor: theme.accent, color: isDark ? '#121212' : '#fff' }}
            >
              <Plus className="w-5 h-5" />
              공구 등록하기
            </Link>
          </div>
        ) : (
          <div className="space-y-3 py-4">
            {filteredGroupBuys.map((gb) => {
              const statusInfo = getStatusInfo(gb);
              const daysLeft = getDaysLeft(gb.end_at);
              const isActive = gb.status === "active" && daysLeft > 0;

              return (
                <Link
                  key={gb.id}
                  href={`/shop/groupbuy/${gb.id}`}
                  className="block rounded-2xl overflow-hidden"
                  style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.border}` }}
                >
                  <div className="flex gap-4 p-4">
                    {/* 이미지 */}
                    <div 
                      className="w-20 h-20 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center"
                      style={{ backgroundColor: theme.bgInput }}
                    >
                      {gb.image_url ? (
                        <img src={gb.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <ShoppingCart className="w-8 h-8" style={{ color: theme.textMuted }} />
                      )}
                    </div>

                    {/* 정보 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span 
                          className="px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1"
                          style={{ backgroundColor: statusInfo.bg, color: statusInfo.color }}
                        >
                          <statusInfo.icon className="w-3 h-3" />
                          {statusInfo.label}
                        </span>
                        {isActive && daysLeft <= 3 && (
                          <span 
                            className="px-2 py-0.5 rounded-full text-xs font-bold"
                            style={{ backgroundColor: theme.red, color: '#fff' }}
                          >
                            D-{daysLeft}
                          </span>
                        )}
                      </div>

                      <h3 className="font-bold line-clamp-1 mb-1" style={{ color: theme.textPrimary }}>
                        {gb.title}
                      </h3>

                      <p className="text-lg font-black" style={{ color: theme.accent }}>
                        {gb.sale_price?.toLocaleString()}원
                      </p>

                      <div className="flex items-center gap-2 mt-1 text-xs" style={{ color: theme.textMuted }}>
                        <span>마감 {formatDate(gb.end_at)}</span>
                        <span>·</span>
                        <span>픽업 {formatDate(gb.pickup_date)}</span>
                      </div>
                    </div>
                  </div>

                  {/* 통계 바 */}
                  <div className="px-4 py-3 border-t" style={{ backgroundColor: theme.bgInput, borderColor: theme.border }}>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" style={{ color: theme.textMuted }} />
                          <span style={{ color: theme.textMuted }}>참여</span>
                          <span className="font-bold" style={{ color: theme.textPrimary }}>{gb.total_participants}명</span>
                        </div>
                        {gb.unpaid_count > 0 && (
                          <div className="flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" style={{ color: theme.red }} />
                            <span style={{ color: theme.red }}>미입금</span>
                            <span className="font-bold" style={{ color: theme.red }}>{gb.unpaid_count}</span>
                          </div>
                        )}
                      </div>
                      <div className="font-bold" style={{ color: theme.accent }}>
                        {gb.total_revenue.toLocaleString()}원
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      {/* 하단 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 border-t" style={{ backgroundColor: theme.bgCard, borderColor: theme.border }}>
        <div className="max-w-[640px] mx-auto px-4 py-4">
          <Link
            href="/shop/groupbuy/create"
            className="flex items-center justify-center gap-2 w-full h-14 font-bold text-lg rounded-2xl"
            style={{ backgroundColor: theme.accent, color: isDark ? '#121212' : '#fff' }}
          >
            <Plus className="w-5 h-5" />
            새 공구 등록
          </Link>
        </div>
      </div>
    </div>
  );
}
