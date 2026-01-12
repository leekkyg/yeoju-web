"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface GroupBuy {
  id: number;
  title: string;
  description: string;
  original_price: number;
  sale_price: number;
  min_quantity: number;
  max_quantity: number;
  current_quantity: number;
  end_at: string;
  pickup_date: string;
  pickup_start_time: string;
  pickup_end_time: string;
  pickup_location: string;
  image_url: string;
  status: string;
  options: any[];
  shop: {
    id: number;
    name: string;
    category: string;
    logo_url: string;
    address: string;
    phone: string;
    bank_name: string;
    bank_account: string;
    bank_holder: string;
    user_id: string | null;
  };
}

export default function GroupBuyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [groupBuy, setGroupBuy] = useState<GroupBuy | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, ms: 0 });
  const [user, setUser] = useState<any>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  
  const [showModal, setShowModal] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [phone, setPhone] = useState("");
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const value = e.target.value.replace(/[^0-9]/g, '');
  if (value.length <= 11) {
    const formatted = value.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
    setPhone(formatted);
  }
};
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchGroupBuy();
  }, [params.id]);
useEffect(() => {
  supabase.auth.getUser().then(({ data }) => {
    setUser(data.user);
  });
}, []);
  useEffect(() => {
    if (!groupBuy?.end_at) return;
    
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(groupBuy.end_at).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, ms: 0 });
        return;
      }

      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
        ms: Math.floor((diff % 1000) / 10),
      });
    }, 10);

    return () => clearInterval(timer);
  }, [groupBuy?.end_at]);

  useEffect(() => {
    if (showModal || showConfirm || showComplete) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showModal, showConfirm, showComplete]);

  const fetchGroupBuy = async () => {
    const { data, error } = await supabase
      .from("group_buys")
      .select(`
        *,
        shop:shops(id, name, category, logo_url, address, phone, bank_name, bank_account, bank_holder, user_id)
      `)
      .eq("id", params.id)
      .single();

    if (!error && data) {
      setGroupBuy(data);
    }
    setLoading(false);
  };

  const formatDate = (dateStr: string) => {
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

  // 연락처 자동 포맷팅
  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/[^0-9]/g, '');
    if (numbers.length <= 3) {
      return numbers;
    } else if (numbers.length <= 7) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    } else {
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
    }
  };

const handleFinalSubmit = async () => {
  if (!user) {
    alert("로그인이 필요합니다");
    router.push("/login");
    return;
  }
  setSubmitting(true);
    
    try {
      // 현재 로그인한 유저 확인
      const { data: { user } } = await supabase.auth.getUser();
      
      // 실제 DB에 저장
      const { error } = await supabase.from("group_buy_participants").insert({
        group_buy_id: groupBuy?.id,
        user_id: user?.id || null,
        name: name,
        phone: phone,
        quantity: quantity,
        status: "unpaid",
        is_paid: false,
      });

      if (error) throw error;

      // 공동구매 현재 수량 업데이트
      await supabase
        .from("group_buys")
        .update({ current_quantity: (groupBuy?.current_quantity || 0) + quantity })
        .eq("id", groupBuy?.id);

      // 🔔 셀러에게 새 주문 알림 발송
      if (groupBuy?.shop?.user_id) {
        await supabase.from("notifications").insert({
          user_id: groupBuy.shop.user_id,
          title: "새로운 주문이 들어왔습니다! 🛒",
          message: `${name}님이 [${groupBuy.title}] ${quantity}개를 주문했습니다. 입금 확인 후 처리해주세요.`,
          type: "general",
          group_buy_id: groupBuy.id,
          shop_id: groupBuy.shop.id,
          link: `/shop/groupbuy/${groupBuy.id}`,
        });
      }

      setSubmitting(false);
      setShowConfirm(false);
      setShowModal(false);
      setShowComplete(true);
      
// 데이터 새로고침
      fetchGroupBuy();
    } catch (error: any) {
      if (error.message.includes("duplicate")) {
        alert("이미 신청한 공구입니다");
      } else {
        alert("신청 중 오류가 발생했습니다: " + error.message);
      }
      setSubmitting(false);
    }
  };

  // 계좌번호 복사
  const copyAccount = () => {
    const accountInfo = `${groupBuy?.shop?.bank_name || "국민은행"} ${groupBuy?.shop?.bank_account || "123-456-789012"}`;
    navigator.clipboard.writeText(accountInfo);
    alert("계좌번호가 복사되었습니다");
  };

  const discountPercent = groupBuy 
    ? Math.round((1 - groupBuy.sale_price / groupBuy.original_price) * 100) 
    : 0;

  const progress = groupBuy 
    ? Math.min((groupBuy.current_quantity / groupBuy.min_quantity) * 100, 100) 
    : 0;

  const totalPrice = groupBuy ? groupBuy.sale_price * quantity : 0;

  // 테스트용 계좌정보
  const bankName = groupBuy?.shop?.bank_name || "국민은행";
  const bankAccount = groupBuy?.shop?.bank_account || "123-456-789012";
  const bankHolder = groupBuy?.shop?.bank_holder || groupBuy?.shop?.name || "여주맛집";

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#19643D] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!groupBuy) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center">
        <p className="text-[#19643D]">상품을 찾을 수 없습니다</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&display=swap');
        
        .timer-font {
          font-family: 'Orbitron', monospace;
        }
        
        .timer-glow {
          text-shadow: 
            0 0 10px rgba(218, 69, 31, 0.8),
            0 0 20px rgba(218, 69, 31, 0.6),
            0 0 30px rgba(218, 69, 31, 0.4),
            0 0 40px rgba(218, 69, 31, 0.2);
        }
        
        .timer-pulse {
          animation: pulse 1s ease-in-out infinite;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        
        .ms-flicker {
          animation: flicker 0.1s linear infinite;
        }
        
        @keyframes flicker {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }

        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        
        .modal-slide-up {
          animation: slideUp 0.3s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        
        .modal-fade-in {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>

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
          <span className="text-white font-medium tracking-tight">공동구매</span>
          <button 
            onClick={() => setIsFavorite(!isFavorite)}
            className="w-10 h-10 flex items-center justify-center"
          >
            <svg 
              className={`w-6 h-6 transition-colors ${isFavorite ? 'text-[#DA451F] fill-[#DA451F]' : 'text-[#F2D38D]'}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
        </div>
      </header>

      <main className="pt-14 pb-28 max-w-[640px] mx-auto">
        <div className="aspect-[4/3] bg-gradient-to-br from-[#F2D38D] to-[#e8c67a] relative overflow-hidden">
          {groupBuy.image_url ? (
            <img 
              src={groupBuy.image_url} 
              alt={groupBuy.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-7xl drop-shadow-lg">🛒</span>
            </div>
          )}
          <div className="absolute top-4 left-4 bg-[#DA451F] text-white px-3 py-1.5 rounded-full text-sm font-bold shadow-lg">
            {discountPercent}% 할인
          </div>
        </div>

        <div className="px-5 py-4 bg-white border-b border-[#19643D]/10">
          <Link href={`/shop/${groupBuy.shop?.id}`} className="flex items-center gap-3 group">
            <div className="w-12 h-12 rounded-full bg-[#19643D] flex items-center justify-center text-[#F2D38D] font-bold text-lg overflow-hidden flex-shrink-0 ring-2 ring-[#F2D38D]/50">
              {groupBuy.shop?.logo_url ? (
                <img src={groupBuy.shop.logo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                groupBuy.shop?.name?.charAt(0)
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[#19643D] group-hover:underline truncate text-lg">
                {groupBuy.shop?.name}
              </p>
              <p className="text-sm text-[#19643D]/50">{groupBuy.shop?.category}</p>
            </div>
            <svg className="w-5 h-5 text-[#19643D]/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        <div className="px-5 pt-6 pb-4 bg-white">
          <h1 className="text-xl font-bold text-[#19643D] leading-tight">
            {groupBuy.title}
          </h1>
        </div>

        <div className="mx-5 my-4 bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f0f23] rounded-3xl p-6 shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-full opacity-10">
            <div className="absolute top-4 left-4 w-20 h-20 bg-[#DA451F] rounded-full blur-3xl" />
            <div className="absolute bottom-4 right-4 w-32 h-32 bg-[#F2D38D] rounded-full blur-3xl" />
          </div>
          
          <p className="text-center text-[#F2D38D]/80 text-sm font-medium tracking-widest uppercase mb-4 relative z-10">
            ⏱ 마감까지
          </p>
          
          <div className="relative z-10 text-center">
            <div className="timer-font flex items-baseline justify-center gap-1 flex-wrap">
              {timeLeft.days > 0 && (
                <>
                  <span className="text-5xl md:text-6xl font-black text-white timer-glow">
                    {timeLeft.days}
                  </span>
                  <span className="text-xl text-[#F2D38D] mr-3">일</span>
                </>
              )}
              <span className="text-5xl md:text-6xl font-black text-white timer-glow">
                {String(timeLeft.hours).padStart(2, '0')}
              </span>
              <span className="text-3xl text-[#DA451F] timer-pulse mx-1">:</span>
              <span className="text-5xl md:text-6xl font-black text-white timer-glow">
                {String(timeLeft.minutes).padStart(2, '0')}
              </span>
              <span className="text-3xl text-[#DA451F] timer-pulse mx-1">:</span>
              <span className="text-5xl md:text-6xl font-black text-white timer-glow">
                {String(timeLeft.seconds).padStart(2, '0')}
              </span>
              <span className="text-3xl text-[#F2D38D] mx-1">.</span>
              <span className="text-4xl md:text-5xl font-black text-[#DA451F] ms-flicker">
                {String(timeLeft.ms).padStart(2, '0')}
              </span>
            </div>
            
            <div className="flex justify-center gap-6 mt-3 text-xs text-[#F2D38D]/60 tracking-wider">
              {timeLeft.days > 0 && <span className="w-12">DAYS</span>}
              <span className="w-12">HOURS</span>
              <span className="w-12">MIN</span>
              <span className="w-12">SEC</span>
              <span className="w-10">MS</span>
            </div>
          </div>
        </div>

        <div className="px-5 py-5 bg-white">
          <div className="flex items-end justify-between mb-3">
            <div>
              <p className="text-sm text-[#19643D]/40 line-through mb-1">
                {groupBuy.original_price.toLocaleString()}원
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-[#19643D]">
                  {groupBuy.sale_price.toLocaleString()}
                </span>
                <span className="text-xl font-bold text-[#19643D]">원</span>
              </div>
            </div>
            
            <div className="inline-flex items-center gap-1.5 bg-[#DA451F]/10 text-[#DA451F] px-4 py-2 rounded-full text-sm font-bold">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              {(groupBuy.original_price - groupBuy.sale_price).toLocaleString()}원 절약
            </div>
          </div>
        </div>

        <div className="mx-5 my-4 bg-white rounded-2xl p-5 border border-[#19643D]/10">
          <div className="flex justify-between items-center mb-3">
            <span className="text-[#19643D] font-semibold">참여 현황</span>
            <div className="text-right">
              <span className="text-2xl font-black text-[#DA451F]">{groupBuy.current_quantity}</span>
              <span className="text-[#19643D]/40 text-sm ml-1">/ {groupBuy.min_quantity}명</span>
            </div>
          </div>
          <div className="h-3 bg-[#19643D]/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[#19643D] via-[#2a8a56] to-[#19643D] rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-[#19643D]/50 mt-3 text-center">
            {progress >= 100 
              ? "✅ 공동구매 확정! 추가 참여 가능합니다" 
              : `${groupBuy.min_quantity - groupBuy.current_quantity}명만 더 모이면 확정돼요`
            }
          </p>
        </div>

        <div className="mx-5 mb-4 bg-white rounded-2xl overflow-hidden border border-[#19643D]/10">
          <div className="px-5 py-4 border-b border-[#19643D]/10">
            <h3 className="font-bold text-[#19643D]">📍 수령 안내</h3>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex">
              <span className="w-20 text-sm text-[#19643D]/50 flex-shrink-0">수령일</span>
              <span className="font-medium text-[#19643D]">
                {groupBuy.pickup_date ? formatDate(groupBuy.pickup_date) : "공구 성공 후 안내"}
              </span>
            </div>
            
            <div className="flex">
              <span className="w-20 text-sm text-[#19643D]/50 flex-shrink-0">수령시간</span>
              <span className="font-medium text-[#19643D]">
                {groupBuy.pickup_start_time && groupBuy.pickup_end_time 
                  ? `${formatTime(groupBuy.pickup_start_time)} ~ ${formatTime(groupBuy.pickup_end_time)}`
                  : "공구 성공 후 안내"
                }
              </span>
            </div>

            <div className="flex">
              <span className="w-20 text-sm text-[#19643D]/50 flex-shrink-0">픽업장소</span>
              <div className="flex-1">
                <p className="font-medium text-[#19643D] mb-3">
                  {groupBuy.pickup_location || groupBuy.shop?.address || "매장 방문"}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button className="px-3 py-1.5 bg-[#19643D]/5 border border-[#19643D]/20 rounded-lg text-xs text-[#19643D] hover:bg-[#19643D] hover:text-white transition-colors">
                    주소 복사
                  </button>
                  <button className="px-3 py-1.5 bg-[#FEE500] rounded-lg text-xs text-[#3C1E1E] font-medium">
                    카카오맵
                  </button>
                  <button className="px-3 py-1.5 bg-[#03C75A] rounded-lg text-xs text-white font-medium">
                    네이버
                  </button>
                  <button className="px-3 py-1.5 bg-[#4285F4] rounded-lg text-xs text-white font-medium">
                    T맵
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-5 mb-4 bg-white rounded-2xl overflow-hidden border border-[#19643D]/10">
          <div className="px-5 py-4 border-b border-[#19643D]/10">
            <h3 className="font-bold text-[#19643D]">📝 상품 설명</h3>
          </div>
          <div className="p-5">
            <p className="text-[#19643D]/70 leading-relaxed whitespace-pre-wrap">
              {groupBuy.description || "상세 설명이 없습니다."}
            </p>
          </div>
        </div>

        <div className="mx-5 mb-4 bg-[#DA451F]/5 rounded-2xl p-5">
          <h3 className="font-bold text-[#DA451F] mb-3">⚠️ 구매 전 확인</h3>
          <ul className="space-y-2 text-sm text-[#DA451F]/70">
            <li>• 최소 인원 미달 시 공동구매가 취소될 수 있어요</li>
            <li>• 픽업 시간 내 미방문 시 환불이 불가해요</li>
            <li>• 결제는 계좌이체로 진행됩니다</li>
          </ul>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-[#19643D]/10">
        <div className="max-w-[640px] mx-auto px-5 py-4 flex items-center gap-3">
          <a 
            href={`tel:${groupBuy.shop?.phone}`}
            className="w-14 h-14 bg-white border-2 border-[#19643D] rounded-2xl flex items-center justify-center text-[#19643D] hover:bg-[#19643D] hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </a>
          
          <button 
            onClick={() => setShowModal(true)}
            className="flex-1 h-14 bg-[#DA451F] hover:bg-[#c23d1b] text-white font-bold text-lg rounded-2xl transition-colors shadow-lg shadow-[#DA451F]/20 active:scale-[0.98]"
          >
            신청하기
          </button>
        </div>
      </div>

      {/* 주문서 모달 */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />
          
          <div className="relative w-full max-w-[640px] bg-white rounded-t-3xl max-h-[85vh] flex flex-col modal-slide-up">
            <div className="flex-shrink-0 px-6 py-5 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-[#19643D]">주문서 작성</h2>
                <button 
                  onClick={() => setShowModal(false)}
                  className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-[#19643D]/60 mt-1">{groupBuy.title}</p>
            </div>
            
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {/* 수량 선택 */}
              <div>
                <label className="block text-sm font-semibold text-[#19643D] mb-3">주문 수량</label>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-12 h-12 rounded-xl border-2 border-[#19643D]/20 flex items-center justify-center text-[#19643D] hover:bg-[#19643D] hover:text-white transition-colors text-xl font-bold"
                  >
                    −
                  </button>
                  <span className="text-2xl font-bold text-[#19643D] w-12 text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-12 h-12 rounded-xl border-2 border-[#19643D]/20 flex items-center justify-center text-[#19643D] hover:bg-[#19643D] hover:text-white transition-colors text-xl font-bold"
                  >
                    +
                  </button>
                  <span className="text-[#19643D]/50 text-sm ml-2">
                    ({groupBuy.sale_price.toLocaleString()}원 × {quantity}개)
                  </span>
                </div>
              </div>

              {/* 이름 입력 */}
              <div>
                <label className="block text-sm font-semibold text-[#19643D] mb-3">이름</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="입금자명과 동일하게 입력"
                  className="w-full px-4 py-3.5 bg-[#19643D]/5 rounded-xl text-[#19643D] placeholder-[#19643D]/40 focus:outline-none focus:ring-2 focus:ring-[#19643D]/30"
                />
              </div>

              {/* 연락처 입력 */}
              <div>
                <label className="block text-sm font-semibold text-[#19643D] mb-3">연락처</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder="숫자만 입력하세요"
                  maxLength={13}
                  className="w-full px-4 py-3.5 bg-[#19643D]/5 rounded-xl text-[#19643D] placeholder-[#19643D]/40 focus:outline-none focus:ring-2 focus:ring-[#19643D]/30 text-lg tracking-wide"
                />
                <p className="text-xs text-[#19643D]/50 mt-2">픽업 안내 문자가 발송됩니다</p>
              </div>

              {/* 입금 계좌 정보 */}
              <div className="bg-[#19643D] rounded-2xl p-5 text-white">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[#F2D38D] text-sm font-medium">입금 계좌</span>
                  <button 
                    onClick={copyAccount}
                    className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full transition-colors"
                  >
                    복사하기
                  </button>
                </div>
                <p className="text-2xl font-bold mb-1">{bankAccount}</p>
                <p className="text-[#F2D38D]/80">{bankName} | 예금주: {bankHolder}</p>
              </div>

              {/* 입금액 안내 */}
              <div className="bg-[#F2D38D]/30 rounded-2xl p-5">
                <div className="flex items-center justify-between">
                  <span className="text-[#19643D] font-medium">입금하실 금액</span>
                  <span className="text-3xl font-black text-[#DA451F]">
                    {totalPrice.toLocaleString()}원
                  </span>
                </div>
              </div>

              {/* 경고 문구 */}
              <div className="bg-[#DA451F]/10 rounded-2xl p-4 border border-[#DA451F]/20">
                <div className="flex gap-3">
                  <span className="text-xl">⚠️</span>
                  <div className="text-sm text-[#DA451F]/80 leading-relaxed">
                    <p className="font-bold text-[#DA451F] mb-2">반드시 확인해주세요!</p>
                    <ul className="space-y-1">
                      <li>• <strong>입금 후</strong> 신청완료 버튼을 눌러주세요</li>
                      <li>• 계좌번호와 입금액을 정확히 확인하세요</li>
                      <li>• 입금 실수에 따른 책임은 본인에게 있습니다</li>
                      <li>• 입금자명은 신청자 이름과 동일해야 합니다</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex-shrink-0 px-6 py-5 border-t border-gray-100 bg-white rounded-b-3xl">
              <button
                onClick={handleSubmitClick}
                className="w-full h-14 bg-[#DA451F] hover:bg-[#c23d1b] text-white font-bold text-lg rounded-2xl transition-colors shadow-lg shadow-[#DA451F]/20"
              >
                입금 후 신청완료
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 확인 모달 */}
      {showConfirm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-5">
          <div 
            className="absolute inset-0 bg-black/70"
            onClick={() => setShowConfirm(false)}
          />
          
          <div className="relative w-full max-w-[400px] bg-white rounded-3xl overflow-hidden modal-fade-in">
            <div className="px-6 py-5 bg-[#19643D] text-white text-center">
              <p className="text-lg font-bold">주문 정보 확인</p>
              <p className="text-sm text-[#F2D38D]/80 mt-1">입금 정보가 맞는지 확인해주세요</p>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="flex justify-between py-3 border-b border-gray-100">
                <span className="text-[#19643D]/60">상품명</span>
                <span className="font-medium text-[#19643D] text-right max-w-[200px] truncate">{groupBuy.title}</span>
              </div>
              <div className="flex justify-between py-3 border-b border-gray-100">
                <span className="text-[#19643D]/60">주문 수량</span>
                <span className="font-bold text-[#19643D]">{quantity}개</span>
              </div>
              <div className="flex justify-between py-3 border-b border-gray-100">
                <span className="text-[#19643D]/60">신청자</span>
                <span className="font-medium text-[#19643D]">{name}</span>
              </div>
              <div className="flex justify-between py-3 border-b border-gray-100">
                <span className="text-[#19643D]/60">연락처</span>
                <span className="font-medium text-[#19643D]">{phone}</span>
              </div>
              <div className="flex justify-between py-3 bg-[#F2D38D]/20 rounded-xl px-4 -mx-2">
                <span className="text-[#19643D] font-medium">입금액</span>
                <span className="text-xl font-black text-[#DA451F]">{totalPrice.toLocaleString()}원</span>
              </div>
            </div>

            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 h-12 bg-gray-100 text-gray-600 font-medium rounded-xl hover:bg-gray-200 transition-colors"
              >
                다시 확인
              </button>
              <button
                onClick={handleFinalSubmit}
                disabled={submitting}
                className="flex-1 h-12 bg-[#DA451F] text-white font-bold rounded-xl hover:bg-[#c23d1b] transition-colors disabled:bg-gray-300"
              >
                {submitting ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  "확인 완료"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 완료 모달 */}
      {showComplete && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-5">
          <div className="absolute inset-0 bg-black/70" />
          
          <div className="relative w-full max-w-[400px] bg-white rounded-3xl overflow-hidden modal-fade-in text-center">
            <div className="pt-10 pb-6 px-6">
              <div className="w-20 h-20 bg-[#19643D] rounded-full flex items-center justify-center mx-auto mb-5">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-[#19643D] mb-2">신청이 완료되었습니다!</h3>
              <p className="text-[#19643D]/60">입금 확인 후 픽업 안내 문자를 보내드립니다</p>
            </div>

            <div className="px-6 pb-6 space-y-3 text-left bg-[#FDFBF7]">
              <div className="bg-white rounded-xl p-4">
                <p className="text-sm text-[#19643D]/50 mb-1">주문 내역</p>
                <p className="font-medium text-[#19643D]">{groupBuy.title} × {quantity}개</p>
                <p className="text-lg font-bold text-[#DA451F] mt-1">{totalPrice.toLocaleString()}원</p>
              </div>
              
              <div className="bg-white rounded-xl p-4">
                <p className="text-sm text-[#19643D]/50 mb-1">픽업 장소</p>
                <p className="font-medium text-[#19643D]">{groupBuy.pickup_location || groupBuy.shop?.address || "매장 방문"}</p>
                {groupBuy.pickup_date && (
                  <p className="text-sm text-[#19643D]/70 mt-1">
                    {formatDate(groupBuy.pickup_date)} {groupBuy.pickup_start_time && `${formatTime(groupBuy.pickup_start_time)} ~`}
                  </p>
                )}
              </div>

              <div className="bg-[#F2D38D]/30 rounded-xl p-4">
                <p className="text-sm text-[#19643D]/70">
                  💡 입금 확인까지 최대 1영업일이 소요될 수 있습니다.<br/>
                  문의사항은 상점에 직접 연락해주세요.
                </p>
              </div>
            </div>

            <div className="px-6 pb-6 bg-[#FDFBF7]">
              <button
                onClick={() => {
                  setShowComplete(false);
                  setName("");
                  setPhone("");
                  setQuantity(1);
                }}
                className="w-full h-14 bg-[#19643D] text-white font-bold text-lg rounded-2xl hover:bg-[#145231] transition-colors"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
