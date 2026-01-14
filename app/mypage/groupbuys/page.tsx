"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/contexts/ThemeContext";
import {
  ArrowLeft,
  Package,
  Phone,
  MapPin,
  Clock,
  Copy,
  X,
  ShoppingBag,
  CheckCircle,
  AlertCircle,
  XCircle,
  Truck,
} from "lucide-react";

interface Order {
  id: number;
  group_buy_id: number;
  name: string;
  phone: string;
  quantity: number;
  status: string;
  is_paid: boolean;
  created_at: string;
  group_buy: {
    id: number;
    title: string;
    sale_price: number;
    image_url: string;
    pickup_date: string;
    pickup_start_time: string;
    pickup_end_time: string;
    pickup_location: string;
    status: string;
    shop: {
      id: number;
      name: string;
      address: string;
      phone: string;
    };
  };
}

export default function MyGroupBuysPage() {
  const router = useRouter();
  const { theme, isDark, mounted } = useTheme();
  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "ongoing" | "completed" | "cancelled">("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    setUser(user);
    fetchOrders(user.id);
  };

  const fetchOrders = async (userId: string) => {
    const { data, error } = await supabase
      .from("group_buy_participants")
      .select(`
        *,
        group_buy:group_buys(
          id,
          title,
          sale_price,
          image_url,
          pickup_date,
          pickup_start_time,
          pickup_end_time,
          pickup_location,
          status,
          shop:shops(id, name, address, phone)
        )
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setOrders(data);
    }
    setLoading(false);
  };

  const filteredOrders = orders.filter((order) => {
    if (activeTab === "all") return true;
    if (activeTab === "ongoing") {
      return ["unpaid", "paid", "ready"].includes(order.status);
    }
    if (activeTab === "completed") {
      return order.status === "picked" || order.status === "completed";
    }
    if (activeTab === "cancelled") {
      return order.status === "cancelled";
    }
    return true;
  });

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "unpaid":
        return { text: "입금 대기", color: theme.red, bg: theme.redBg, icon: AlertCircle };
      case "paid":
        return { text: "입금 완료", color: "#D97706", bg: "#FFFBEB", icon: CheckCircle };
      case "ready":
        return { text: "픽업 준비완료", color: theme.success, bg: theme.successBg, icon: Truck };
      case "picked":
      case "completed":
        return { text: "픽업 완료", color: "#2563EB", bg: "#EBF5FF", icon: Package };
      case "cancelled":
        return { text: "취소됨", color: theme.textMuted, bg: theme.bgInput, icon: XCircle };
      default:
        return { text: status, color: theme.textMuted, bg: theme.bgInput, icon: Package };
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
    const weekday = weekdays[date.getDay()];
    return `${month}월 ${day}일 (${weekday})`;
  };

  const formatTime = (time: string) => {
    if (!time) return "";
    return time.slice(0, 5);
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    alert("주소가 복사되었습니다");
  };

  const openNavigation = (app: string, address: string, name: string) => {
    const encodedAddress = encodeURIComponent(address);
    const encodedName = encodeURIComponent(name);

    let url = "";

    switch (app) {
      case "kakao":
        url = `https://map.kakao.com/link/search/${encodedAddress}`;
        break;
      case "naver":
        url = `https://map.naver.com/v5/search/${encodedAddress}`;
        break;
      case "tmap":
        url = `tmap://search?name=${encodedName}&address=${encodedAddress}`;
        setTimeout(() => {
          window.location.href = `https://tmap.life/search?address=${encodedAddress}`;
        }, 500);
        break;
    }

    if (url) {
      window.open(url, "_blank");
    }
  };

  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.bgMain }}>
        <div className="w-10 h-10 border-2 rounded-full animate-spin" style={{ borderColor: theme.border, borderTopColor: theme.accent }}></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 transition-colors duration-300" style={{ backgroundColor: theme.bgMain }}>
      {/* 헤더 */}
      <header
        className="sticky top-0 z-50 px-4 py-3 flex items-center gap-3"
        style={{ backgroundColor: theme.bgMain, borderBottom: `1px solid ${theme.borderLight}` }}
      >
        <button onClick={() => router.back()} className="p-2 -ml-2 rounded-xl" style={{ color: theme.textPrimary }}>
          <ArrowLeft className="w-6 h-6" strokeWidth={1.5} />
        </button>
        <h1 className="text-lg font-bold" style={{ color: theme.textPrimary }}>공동구매 참여내역</h1>
      </header>

      {/* 탭 */}
      <div
        className="sticky top-14 z-40"
        style={{ backgroundColor: theme.bgCard, borderBottom: `1px solid ${theme.border}` }}
      >
        <div className="max-w-[640px] mx-auto flex">
          {[
            { key: "all", label: "전체" },
            { key: "ongoing", label: "진행중" },
            { key: "completed", label: "완료" },
            { key: "cancelled", label: "취소" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className="flex-1 py-3 text-sm font-medium border-b-2 transition-colors"
              style={{
                color: activeTab === tab.key ? theme.accent : theme.textMuted,
                borderColor: activeTab === tab.key ? theme.accent : "transparent",
              }}
            >
              {tab.label}
              {tab.key === "all" && orders.length > 0 && (
                <span className="ml-1 text-xs">({orders.length})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-[640px] mx-auto px-4 py-4">
        {filteredOrders.length === 0 ? (
          <div
            className="rounded-2xl p-10 text-center"
            style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: theme.bgInput }}
            >
              <ShoppingBag className="w-8 h-8" style={{ color: theme.textMuted }} strokeWidth={1.5} />
            </div>
            <p className="mb-4" style={{ color: theme.textMuted }}>참여한 공동구매가 없습니다</p>
            <Link
              href="/groupbuy"
              className="inline-block font-bold px-6 py-3 rounded-xl transition-colors"
              style={{ backgroundColor: theme.accent, color: isDark ? '#121212' : '#fff' }}
            >
              공동구매 둘러보기
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map((order) => {
              const statusInfo = getStatusInfo(order.status);
              const StatusIcon = statusInfo.icon;

              return (
                <button
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  className="w-full rounded-2xl p-4 text-left transition-all"
                  style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}
                >
                  <div className="flex gap-3">
                    <div
                      className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0"
                      style={{ backgroundColor: theme.bgInput }}
                    >
                      {order.group_buy?.image_url ? (
                        <img
                          src={order.group_buy.image_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-3xl">🛒</span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-bold line-clamp-1" style={{ color: theme.textPrimary }}>
                          {order.group_buy?.title || "상품명 없음"}
                        </p>
                        <span
                          className="flex-shrink-0 px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1"
                          style={{ backgroundColor: statusInfo.bg, color: statusInfo.color }}
                        >
                          <StatusIcon className="w-3 h-3" strokeWidth={2} />
                          {statusInfo.text}
                        </span>
                      </div>

                      <p className="text-sm mt-1" style={{ color: theme.textMuted }}>
                        {order.group_buy?.shop?.name}
                      </p>

                      <div className="flex items-center justify-between mt-2">
                        <p className="font-bold" style={{ color: theme.accent }}>
                          {((order.group_buy?.sale_price || 0) * order.quantity).toLocaleString()}원
                        </p>
                        <p className="text-xs" style={{ color: theme.textMuted }}>
                          {order.quantity}개 · {formatDateTime(order.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>

      {/* 주문 상세 모달 */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setSelectedOrder(null)}
          />

          <div
            className="relative w-full max-w-[400px] rounded-2xl overflow-hidden max-h-[90vh] flex flex-col"
            style={{ backgroundColor: theme.bgCard }}
          >
            {/* 헤더 */}
            <div
              className="flex-shrink-0 px-5 py-4 flex items-center justify-between"
              style={{ backgroundColor: theme.accent }}
            >
              <p className="text-lg font-bold" style={{ color: isDark ? '#121212' : '#fff' }}>주문 상세</p>
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full"
                style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
              >
                <X className="w-5 h-5" style={{ color: isDark ? '#121212' : '#fff' }} strokeWidth={2} />
              </button>
            </div>

            {/* 내용 */}
            <div className="flex-1 overflow-y-auto">
              {/* 상품 정보 */}
              <div className="p-5" style={{ borderBottom: `1px solid ${theme.border}` }}>
                <div className="flex gap-4">
                  <div
                    className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0"
                    style={{ backgroundColor: theme.bgInput }}
                  >
                    {selectedOrder.group_buy?.image_url ? (
                      <img
                        src={selectedOrder.group_buy.image_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-3xl">🛒</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold" style={{ color: theme.textPrimary }}>{selectedOrder.group_buy?.title}</p>
                    <p className="text-sm mt-1" style={{ color: theme.textMuted }}>{selectedOrder.group_buy?.shop?.name}</p>
                    <div className="mt-2">
                      {(() => {
                        const statusInfo = getStatusInfo(selectedOrder.status);
                        const StatusIcon = statusInfo.icon;
                        return (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold"
                            style={{ backgroundColor: statusInfo.bg, color: statusInfo.color }}
                          >
                            <StatusIcon className="w-3 h-3" strokeWidth={2} />
                            {statusInfo.text}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              {/* 주문 정보 */}
              <div className="p-5 space-y-3">
                <h4 className="font-bold mb-3" style={{ color: theme.textPrimary }}>📋 주문 정보</h4>
                
                <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: theme.bgInput }}>
                  <div className="flex justify-between">
                    <span style={{ color: theme.textMuted }}>주문 수량</span>
                    <span className="font-semibold" style={{ color: theme.textPrimary }}>{selectedOrder.quantity}개</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: theme.textMuted }}>주문자</span>
                    <span className="font-semibold" style={{ color: theme.textPrimary }}>{selectedOrder.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: theme.textMuted }}>결제 금액</span>
                    <span className="font-bold" style={{ color: theme.accent }}>
                      {((selectedOrder.group_buy?.sale_price || 0) * selectedOrder.quantity).toLocaleString()}원
                    </span>
                  </div>
                </div>
              </div>

              {/* 픽업 정보 */}
              <div className="px-5 pb-5">
                <h4 className="font-bold mb-3" style={{ color: theme.textPrimary }}>📍 픽업 정보</h4>
                
                <div className="rounded-xl p-4" style={{ backgroundColor: theme.bgInput }}>
                  <div className="flex items-start gap-2 mb-2">
                    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: theme.accent }} strokeWidth={1.5} />
                    <p className="font-medium" style={{ color: theme.textPrimary }}>
                      {selectedOrder.group_buy?.pickup_location || selectedOrder.group_buy?.shop?.address || "매장 방문"}
                    </p>
                  </div>

                  {selectedOrder.group_buy?.pickup_date && (
                    <div className="flex items-center gap-2 mt-2">
                      <Clock className="w-4 h-4 flex-shrink-0" style={{ color: theme.accent }} strokeWidth={1.5} />
                      <p className="text-sm" style={{ color: theme.textMuted }}>
                        {formatDate(selectedOrder.group_buy.pickup_date)}
                        {selectedOrder.group_buy.pickup_start_time && selectedOrder.group_buy.pickup_end_time && (
                          <> {formatTime(selectedOrder.group_buy.pickup_start_time)} ~ {formatTime(selectedOrder.group_buy.pickup_end_time)}</>
                        )}
                      </p>
                    </div>
                  )}

                  {/* 네비게이션 버튼 */}
                  <div className="flex gap-2 mt-4 pt-4" style={{ borderTop: `1px solid ${theme.border}` }}>
                    <button
                      onClick={() => copyAddress(selectedOrder.group_buy?.pickup_location || selectedOrder.group_buy?.shop?.address || "")}
                      className="flex-1 h-10 rounded-xl flex items-center justify-center gap-1 text-sm font-medium transition-colors"
                      style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.border}`, color: theme.textPrimary }}
                    >
                      <Copy className="w-4 h-4" strokeWidth={1.5} />
                      복사
                    </button>
                    <button
                      onClick={() => openNavigation("kakao", selectedOrder.group_buy?.pickup_location || selectedOrder.group_buy?.shop?.address || "", selectedOrder.group_buy?.shop?.name || "")}
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: "#FEE500" }}
                      title="카카오맵"
                    >
                      <span className="text-lg">🗺️</span>
                    </button>
                    <button
                      onClick={() => openNavigation("naver", selectedOrder.group_buy?.pickup_location || selectedOrder.group_buy?.shop?.address || "", selectedOrder.group_buy?.shop?.name || "")}
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: "#03C75A" }}
                      title="네이버지도"
                    >
                      <span className="text-lg font-bold text-white">N</span>
                    </button>
                    <button
                      onClick={() => openNavigation("tmap", selectedOrder.group_buy?.pickup_location || selectedOrder.group_buy?.shop?.address || "", selectedOrder.group_buy?.shop?.name || "")}
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: "#4285F4" }}
                      title="티맵"
                    >
                      <span className="text-lg font-bold text-white">T</span>
                    </button>
                  </div>
                </div>

                {/* 매장 전화 */}
                {selectedOrder.group_buy?.shop?.phone && (
                  <a
                    href={`tel:${selectedOrder.group_buy.shop.phone}`}
                    className="mt-3 flex items-center justify-center gap-2 w-full py-3 rounded-xl font-medium transition-colors"
                    style={{ backgroundColor: theme.bgInput, color: theme.textPrimary }}
                  >
                    <Phone className="w-5 h-5" strokeWidth={1.5} />
                    매장에 전화하기
                  </a>
                )}
              </div>
            </div>

            {/* 하단 버튼 */}
            <div
              className="flex-shrink-0 px-5 py-4"
              style={{ borderTop: `1px solid ${theme.border}` }}
            >
              <Link
                href={`/groupbuy/${selectedOrder.group_buy_id}`}
                className="block w-full py-3 text-center font-bold rounded-xl transition-colors"
                style={{ backgroundColor: theme.accent, color: isDark ? '#121212' : '#fff' }}
              >
                공구 상세 보기
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
