"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

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
      return order.status === "completed";
    }
    if (activeTab === "cancelled") {
      return order.status === "cancelled";
    }
    return true;
  });

  const getStatusText = (status: string) => {
    switch (status) {
      case "unpaid": return "입금 대기";
      case "paid": return "입금 완료";
      case "ready": return "픽업 준비완료";
      case "completed": return "픽업 완료";
      case "cancelled": return "취소됨";
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "unpaid": return "bg-yellow-100 text-yellow-700";
      case "paid": return "bg-blue-100 text-blue-700";
      case "ready": return "bg-green-100 text-green-700";
      case "completed": return "bg-gray-100 text-gray-600";
      case "cancelled": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-700";
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
      hour: "2-digit",
      minute: "2-digit"
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-24 md:pb-10">
      {/* 헤더 */}
      <header className="bg-gray-900 sticky top-0 z-50">
        <div className="max-w-[631px] mx-auto px-4 h-14 flex items-center">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-white mr-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-white font-bold text-lg">공동구매 참여내역</h1>
        </div>
      </header>

      {/* 탭 */}
      <div className="bg-white border-b border-gray-200 sticky top-14 z-40">
        <div className="max-w-[631px] mx-auto flex">
          {[
            { key: "all", label: "전체" },
            { key: "ongoing", label: "진행중" },
            { key: "completed", label: "완료" },
            { key: "cancelled", label: "취소" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "text-amber-600 border-amber-500"
                  : "text-gray-500 border-transparent hover:text-gray-700"
              }`}
            >
              {tab.label}
              {tab.key === "all" && orders.length > 0 && (
                <span className="ml-1 text-xs">({orders.length})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-[631px] mx-auto px-4 py-4">
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <p className="text-gray-500 mb-4">참여한 공동구매가 없습니다</p>
            <Link 
              href="/groupbuy" 
              className="inline-block bg-amber-500 text-white font-bold px-6 py-2 rounded-lg hover:bg-amber-600 transition-colors"
            >
              공동구매 둘러보기
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map((order) => (
              <button
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                className="w-full bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow text-left"
              >
                <div className="flex gap-3">
                  <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
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
                      <p className="font-bold text-gray-900 line-clamp-1">
                        {order.group_buy?.title || "상품명 없음"}
                      </p>
                      <span className={`flex-shrink-0 px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(order.status)}`}>
                        {getStatusText(order.status)}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-500 mt-1">
                      {order.group_buy?.shop?.name}
                    </p>
                    
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-amber-600 font-bold">
                        {((order.group_buy?.sale_price || 0) * order.quantity).toLocaleString()}원
                      </p>
                      <p className="text-xs text-gray-400">
                        {order.quantity}개 · {formatDateTime(order.created_at).split(" ").slice(0, 3).join(" ")}
                      </p>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      {/* 하단 네비게이션 */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 z-50">
        <div className="flex">
          <Link href="/" className="flex-1 py-3 flex flex-col items-center gap-1">
            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs text-gray-500">홈</span>
          </Link>
          <Link href="/community" className="flex-1 py-3 flex flex-col items-center gap-1">
            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-xs text-gray-500">커뮤니티</span>
          </Link>
          <Link href="/groupbuy" className="flex-1 py-3 flex flex-col items-center gap-1">
            <svg className="w-6 h-6 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/>
            </svg>
            <span className="text-xs text-gray-500">공동구매</span>
          </Link>
          <Link href="/videos" className="flex-1 py-3 flex flex-col items-center gap-1">
            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs text-gray-500">영상</span>
          </Link>
          <Link href="/mypage" className="flex-1 py-3 flex flex-col items-center gap-1">
            <svg className="w-6 h-6 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
            </svg>
            <span className="text-xs font-bold text-amber-500">MY</span>
          </Link>
        </div>
      </nav>

      {/* 주문 상세 모달 */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/70"
            onClick={() => setSelectedOrder(null)}
          />
          
          <div className="relative w-full max-w-[400px] bg-white rounded-3xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* 헤더 */}
            <div className="flex-shrink-0 px-6 py-5 bg-gray-900 text-white">
              <div className="flex items-center justify-between">
                <p className="text-lg font-bold">주문 상세</p>
                <button 
                  onClick={() => setSelectedOrder(null)}
                  className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* 내용 */}
            <div className="flex-1 overflow-y-auto">
              {/* 상품 정보 */}
              <div className="p-6 border-b border-gray-100">
                <div className="flex gap-4">
                  <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
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
                  <div>
                    <p className="font-bold text-gray-900">{selectedOrder.group_buy?.title}</p>
                    <p className="text-sm text-gray-500 mt-1">{selectedOrder.group_buy?.shop?.name}</p>
                  </div>
                </div>
              </div>

              {/* 주문 정보 */}
              <div className="p-6 space-y-4">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">상품명</span>
                  <span className="font-medium text-gray-900 text-right max-w-[200px]">{selectedOrder.group_buy?.title}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">주문 수량</span>
                  <span className="font-bold text-gray-900">{selectedOrder.quantity}개</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">신청자</span>
                  <span className="font-medium text-gray-900">{selectedOrder.name}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">결제 금액</span>
                  <span className="font-bold text-amber-600">
                    {((selectedOrder.group_buy?.sale_price || 0) * selectedOrder.quantity).toLocaleString()}원
                  </span>
                </div>
                <div className="flex justify-between py-2 items-center">
                  <span className="text-gray-500">주문 상태</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedOrder.status)}`}>
                    {getStatusText(selectedOrder.status)}
                  </span>
                </div>
              </div>

              {/* 픽업 정보 */}
              <div className="px-6 pb-6">
                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="font-bold text-gray-900 mb-3">📍 픽업 장소</h4>
                  
                  <p className="text-gray-900 font-medium">
                    {selectedOrder.group_buy?.pickup_location || selectedOrder.group_buy?.shop?.address || "매장 방문"}
                  </p>
                  
                  {selectedOrder.group_buy?.pickup_date && (
                    <p className="text-sm text-gray-500 mt-2">
                      {formatDate(selectedOrder.group_buy.pickup_date)}
                      {selectedOrder.group_buy.pickup_start_time && selectedOrder.group_buy.pickup_end_time && (
                        <> {formatTime(selectedOrder.group_buy.pickup_start_time)} ~ {formatTime(selectedOrder.group_buy.pickup_end_time)}</>
                      )}
                    </p>
                  )}
                  
                  {/* 네비게이션 버튼 - 1열 아이콘 */}
                  <div className="flex gap-2 mt-4">
                    <button 
                      onClick={() => copyAddress(selectedOrder.group_buy?.pickup_location || selectedOrder.group_buy?.shop?.address || "")}
                      className="w-11 h-11 bg-white border border-gray-200 rounded-xl flex items-center justify-center hover:bg-gray-50 transition-colors"
                      title="주소 복사"
                    >
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                    <button 
                      onClick={() => openNavigation("kakao", selectedOrder.group_buy?.pickup_location || selectedOrder.group_buy?.shop?.address || "", selectedOrder.group_buy?.shop?.name || "")}
                      className="w-11 h-11 bg-[#FEE500] rounded-xl flex items-center justify-center hover:bg-[#fdd800] transition-colors"
                      title="카카오맵"
                    >
                      <span className="text-xl">🗺️</span>
                    </button>
                    <button 
                      onClick={() => openNavigation("naver", selectedOrder.group_buy?.pickup_location || selectedOrder.group_buy?.shop?.address || "", selectedOrder.group_buy?.shop?.name || "")}
                      className="w-11 h-11 bg-[#03C75A] rounded-xl flex items-center justify-center hover:bg-[#02b350] transition-colors"
                      title="네이버지도"
                    >
                      <span className="text-lg font-bold text-white">N</span>
                    </button>
                    <button 
                      onClick={() => openNavigation("tmap", selectedOrder.group_buy?.pickup_location || selectedOrder.group_buy?.shop?.address || "", selectedOrder.group_buy?.shop?.name || "")}
                      className="w-11 h-11 bg-[#4285F4] rounded-xl flex items-center justify-center hover:bg-[#3b78db] transition-colors"
                      title="T맵"
                    >
                      <span className="text-lg font-bold text-white">T</span>
                    </button>
                  </div>
                </div>
                
                {/* 매장 연락처 */}
                {selectedOrder.group_buy?.shop?.phone && (
                  <a 
                    href={`tel:${selectedOrder.group_buy.shop.phone}`}
                    className="mt-3 flex items-center justify-center gap-2 w-full py-3 bg-gray-100 rounded-xl text-gray-700 font-medium hover:bg-gray-200 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    매장에 전화하기
                  </a>
                )}
              </div>
            </div>

            {/* 하단 버튼 */}
            <div className="flex-shrink-0 px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-full h-12 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
