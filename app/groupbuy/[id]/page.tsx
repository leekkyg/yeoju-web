"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/contexts/ThemeContext";
import { Sun, Moon, Home, Share2, X, ChevronDown, CreditCard, Banknote } from "lucide-react";

declare global {
  interface Window {
    TossPayments?: any;
  }
}

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
  image_url: any;
  images: any;
  status: string;
  options: any[];
  use_timer?: boolean;
  use_discount?: boolean;
  use_min_quantity?: boolean;
  force_proceed?: boolean;
  payment_methods?: string[];
  delivery_methods?: string[];
  delivery_fee?: number;
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
  const { theme, isDark, mounted, toggleTheme } = useTheme();
  const [groupBuy, setGroupBuy] = useState<GroupBuy | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, ms: 0 });
  const [user, setUser] = useState<any>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [alreadyJoined, setAlreadyJoined] = useState(false);
  const [myParticipation, setMyParticipation] = useState<any>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  
  // 결제 관련 상태
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card">("cash");
  const [tossLoaded, setTossLoaded] = useState(false);

  // 토스 SDK 로드
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://js.tosspayments.com/v1/payment";
    script.async = true;
    script.onload = () => setTossLoaded(true);
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    if (value.length <= 11) {
      let formatted = value;
      if (value.length > 3 && value.length <= 7) {
        formatted = value.replace(/(\d{3})(\d{1,4})/, '$1-$2');
      } else if (value.length > 7) {
        formatted = value.replace(/(\d{3})(\d{4})(\d{1,4})/, '$1-$2-$3');
      }
      setPhone(formatted);
    }
  };

  const handleSubmitClick = () => {
    if (!name.trim()) {
      alert("이름을 입력해주세요");
      return;
    }
    if (!phone.trim()) {
      alert("연락처를 입력해주세요");
      return;
    }
    setShowConfirm(true);
  };

  // 공유 기능
  const handleSocialShare = (platform: string) => {
    const url = window.location.href;
    const title = groupBuy?.title || "공동구매";
    
    let shareUrl = "";
    
    switch (platform) {
      case "kakao":
        if (typeof window !== "undefined" && (window as any).Kakao?.Share) {
          (window as any).Kakao.Share.sendDefault({
            objectType: "feed",
            content: {
              title: title,
              description: groupBuy?.description || "",
              imageUrl: Array.isArray(groupBuy?.images) ? groupBuy.images[0] : groupBuy?.image_url || "",
              link: { mobileWebUrl: url, webUrl: url },
            },
          });
        } else {
          navigator.clipboard.writeText(url);
          alert("카카오톡 공유가 불가하여 링크가 복사되었습니다!");
        }
        setShowShareModal(false);
        return;
      case "facebook":
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        break;
      case "band":
        shareUrl = `https://band.us/plugin/share?body=${encodeURIComponent(title)}&route=${encodeURIComponent(url)}`;
        break;
      case "copy":
        navigator.clipboard.writeText(url);
        alert("링크가 복사되었습니다!");
        setShowShareModal(false);
        return;
    }
    
    if (shareUrl) {
      window.open(shareUrl, "_blank", "width=600,height=400");
    }
    setShowShareModal(false);
  };

  useEffect(() => { 
    fetchGroupBuy(); 
  }, [params.id]);

  useEffect(() => { 
    supabase.auth.getUser().then(({ data }) => { 
      setUser(data.user); 
      if (data.user) {
        checkAlreadyJoined(data.user.id);
      }
    }); 
  }, [params.id]);

  // 판매자 본인 확인
  useEffect(() => {
    if (user && groupBuy?.shop?.user_id) {
      setIsOwner(user.id === groupBuy.shop.user_id);
    }
  }, [user, groupBuy]);

  const checkAlreadyJoined = async (userId: string) => {
    const { data } = await supabase
      .from("group_buy_participants")
      .select("*")
      .eq("group_buy_id", params.id)
      .eq("user_id", userId)
      .single();
    if (data) {
      setAlreadyJoined(true);
      setMyParticipation(data);
    }
  };

  useEffect(() => {
    if (!groupBuy?.end_at) return;
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(groupBuy.end_at).getTime();
      const diff = end - now;
      if (diff <= 0) { setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, ms: 0 }); return; }
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
    if (showModal || showConfirm || showComplete || showShareModal) { document.body.style.overflow = 'hidden'; } else { document.body.style.overflow = 'unset'; }
    return () => { document.body.style.overflow = 'unset'; };
  }, [showModal, showConfirm, showComplete, showShareModal]);

  const fetchGroupBuy = async () => {
    const { data, error } = await supabase.from("group_buys").select(`*, shop:shops(id, name, category, logo_url, address, phone, bank_name, bank_account, bank_holder, user_id)`).eq("id", params.id).single();
    if (!error && data) { setGroupBuy(data); }
    setLoading(false);
  };

  const formatDate = (dateStr: string) => { 
    const date = new Date(dateStr); 
    const month = date.getMonth() + 1; 
    const day = date.getDate(); 
    const weekdays = ["일", "월", "화", "수", "목", "금", "토"]; 
    return `${month}월 ${day}일 (${weekdays[date.getDay()]})`; 
  };

  const formatTime = (time: string) => { if (!time) return ""; return time.slice(0, 5); };

  // 카드 결제 처리
  const handleCardPayment = async (participantId: number) => {
    if (!tossLoaded || !window.TossPayments) {
      alert("결제 모듈을 불러오는 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    const tossPayments = window.TossPayments(process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY);
    const orderId = `ORDER_${participantId}_${Date.now()}`;

    try {
      await tossPayments.requestPayment("카드", {
        amount: totalPrice,
        orderId: orderId,
        orderName: groupBuy?.title || "공동구매 상품",
        customerName: name,
        successUrl: `${window.location.origin}/payment/success?participantId=${participantId}`,
        failUrl: `${window.location.origin}/payment/fail?participantId=${participantId}`,
      });
    } catch (error: any) {
      if (error.code === "USER_CANCEL") {
        alert("결제가 취소되었습니다.");
      } else {
        alert("결제 중 오류가 발생했습니다: " + error.message);
      }
    }
  };

  const handleFinalSubmit = async () => {
    if (!user) { alert("로그인이 필요합니다"); router.push("/login"); return; }
    setSubmitting(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // 주문 정보 저장
      const { data: participant, error } = await supabase
        .from("group_buy_participants")
        .insert({ 
          group_buy_id: groupBuy?.id, 
          user_id: user?.id || null, 
          name: name, 
          phone: phone, 
          quantity: quantity, 
          status: paymentMethod === "card" ? "pending" : "unpaid",
          is_paid: false,
          payment_method: paymentMethod,
          total_price: totalPrice,
        })
        .select()
        .single();
      
      if (error) throw error;

      // 수량 업데이트
      await supabase.from("group_buys").update({ 
        current_quantity: (groupBuy?.current_quantity || 0) + quantity 
      }).eq("id", groupBuy?.id);

      // 알림 발송
      if (groupBuy?.shop?.user_id) { 
        await supabase.from("notifications").insert({ 
          user_id: groupBuy.shop.user_id, 
          title: "새 주문이 들어왔습니다!", 
          message: `${name}님이 [${groupBuy.title}] ${quantity}개 주문했습니다.`, 
          type: "general", 
          group_buy_id: groupBuy.id, 
          shop_id: groupBuy.shop.id, 
          link: `/shop/groupbuy/${groupBuy.id}` 
        }); 
      }

      // 카드 결제인 경우 토스 결제창 호출
      if (paymentMethod === "card") {
        setSubmitting(false);
        setShowConfirm(false);
        setShowModal(false);
        await handleCardPayment(participant.id);
      } else {
        // 현금 결제인 경우 완료 처리
        setSubmitting(false); 
        setShowConfirm(false); 
        setShowModal(false); 
        setShowComplete(true); 
        setAlreadyJoined(true); 
        fetchGroupBuy();
      }
    } catch (error: any) { 
      if (error.message.includes("duplicate")) { 
        alert("이미 참여한 공구입니다"); 
        setAlreadyJoined(true); 
      } else { 
        alert("신청 중 오류가 발생했습니다: " + error.message); 
      } 
      setSubmitting(false); 
    }
  };

  const copyAccount = () => { 
    navigator.clipboard.writeText(`${groupBuy?.shop?.bank_name || "은행명"} ${groupBuy?.shop?.bank_account || "123-456-789012"}`); 
    alert("계좌번호가 복사되었습니다"); 
  };
  
  const useTimer = groupBuy?.use_timer ?? true;
  const useDiscount = groupBuy?.use_discount ?? true;
  const useMinQuantity = groupBuy?.use_min_quantity ?? true;
  const forceProceed = groupBuy?.force_proceed ?? false;

  // 결제 방식 확인
  const availablePaymentMethods = groupBuy?.payment_methods || ["cash"];
  const canPayByCash = availablePaymentMethods.includes("cash");
  const canPayByCard = availablePaymentMethods.includes("card");

  // 이미지 배열 파싱
  const images: string[] = (() => {
    if (groupBuy?.images && Array.isArray(groupBuy.images) && groupBuy.images.length > 0) {
      return groupBuy.images;
    }
    if (!groupBuy?.image_url) return [];
    if (Array.isArray(groupBuy.image_url)) {
      return groupBuy.image_url;
    }
    if (typeof groupBuy.image_url === 'string') {
      const trimmed = groupBuy.image_url.trim();
      if (trimmed.startsWith('[')) {
        try {
          const parsed = JSON.parse(trimmed);
          return Array.isArray(parsed) ? parsed : [groupBuy.image_url];
        } catch {
          return [groupBuy.image_url];
        }
      }
      return [groupBuy.image_url];
    }
    return [];
  })();

  const discountPercent = useDiscount && groupBuy ? Math.round((1 - groupBuy.sale_price / groupBuy.original_price) * 100) : 0;
  const savingAmount = useDiscount && groupBuy ? groupBuy.original_price - groupBuy.sale_price : 0;
  const progress = groupBuy ? Math.min((groupBuy.current_quantity / groupBuy.min_quantity) * 100, 100) : 0;
  const totalPrice = groupBuy ? groupBuy.sale_price * quantity : 0;
  const bankName = groupBuy?.shop?.bank_name || "은행명";
  const bankAccount = groupBuy?.shop?.bank_account || "123-456-789012";
  const bankHolder = groupBuy?.shop?.bank_holder || groupBuy?.shop?.name || "예금주";

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const minSwipeDistance = 50;
    
    if (distance > minSwipeDistance) {
      setCurrentImageIndex(prev => prev < images.length - 1 ? prev + 1 : 0);
    } else if (distance < -minSwipeDistance) {
      setCurrentImageIndex(prev => prev > 0 ? prev - 1 : images.length - 1);
    }
    
    setTouchStart(0);
    setTouchEnd(0);
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "unpaid": return "입금 대기";
      case "pending": return "결제 대기";
      case "paid": return "결제 완료";
      case "picked": return "픽업 완료";
      case "cancelled": return "취소됨";
      default: return "대기중";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "unpaid": return theme.red;
      case "pending": return "#F59E0B";
      case "paid": return "#10B981";
      case "picked": return "#2563EB";
      case "cancelled": return theme.textMuted;
      default: return theme.textMuted;
    }
  };

  const descriptionPreview = groupBuy?.description 
    ? groupBuy.description.length > 60 
      ? groupBuy.description.slice(0, 60) + "..." 
      : groupBuy.description
    : "";
  const hasLongDescription = (groupBuy?.description?.length || 0) > 60;

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (loading) { 
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.bgMain }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: theme.accent }} />
      </div>
    ); 
  }
  
  if (!groupBuy) { 
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.bgMain }}>
        <p style={{ color: theme.textPrimary }}>공동구매를 찾을 수 없습니다</p>
      </div>
    ); 
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.bgMain }}>
      {/* 헤더 */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b" style={{ backgroundColor: theme.bgCard, borderColor: theme.border }}>
        <div className="max-w-[640px] mx-auto px-5 h-14 flex items-center justify-between">
          <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center" style={{ color: theme.textSecondary }}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="font-medium" style={{ color: theme.textPrimary }}>공동구매</span>
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
            <button onClick={() => setShowShareModal(true)} className="w-10 h-10 flex items-center justify-center">
              <Share2 className="w-5 h-5" style={{ color: theme.textSecondary }} strokeWidth={1.5} />
            </button>
            <button onClick={() => setIsFavorite(!isFavorite)} className="w-10 h-10 flex items-center justify-center">
              <svg 
                className="w-6 h-6" 
                fill={isFavorite ? theme.red : "none"} 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                style={{ color: isFavorite ? theme.red : theme.textSecondary }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="pt-14 pb-28 max-w-[640px] mx-auto">
        <div className="mx-4 mt-4 rounded-3xl overflow-hidden shadow-lg" style={{ backgroundColor: theme.bgCard }}>
         
          {/* 상품 이미지 슬라이드 */}
          <div className="aspect-[16/9] relative overflow-hidden">
            {images.length > 0 ? (
              <>
                <div 
                  className="flex h-full transition-transform duration-300 ease-out"
                  style={{ transform: `translateX(-${currentImageIndex * 100}%)` }}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                >
                  {images.map((url, idx) => (
                    <img 
                      key={idx}
                      src={url} 
                      alt={`${groupBuy.title} ${idx + 1}`} 
                      className="w-full h-full object-cover flex-shrink-0"
                      style={{ minWidth: '100%' }}
                    />
                  ))}
                </div>
                
                {images.length > 1 && (
                  <>
                    <button
                      onClick={() => setCurrentImageIndex(prev => prev > 0 ? prev - 1 : images.length - 1)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/30 flex items-center justify-center text-white backdrop-blur-sm"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setCurrentImageIndex(prev => prev < images.length - 1 ? prev + 1 : 0)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/30 flex items-center justify-center text-white backdrop-blur-sm"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </>
                )}
                
                {images.length > 1 && (
                  <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-sm">
                    <span className="text-white text-xs font-medium">{currentImageIndex + 1} / {images.length}</span>
                  </div>
                )}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: theme.bgInput }}>
                <span className="text-7xl">🛒</span>
              </div>
            )}
            {useDiscount && discountPercent > 0 && (
              <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full text-sm font-bold text-white" style={{ backgroundColor: '#b91c1c' }}>
                {discountPercent}% 할인
              </div>
            )}
          </div>

          {/* 상점 정보 */}
          <div className="px-5 py-4 border-b" style={{ borderColor: theme.border }}>
            <Link href={`/shop/${groupBuy.shop?.id}`} className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg overflow-hidden" style={{ backgroundColor: theme.accent, color: isDark ? '#121212' : '#fff' }}>
                {groupBuy.shop?.logo_url ? (
                  <img src={groupBuy.shop.logo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  groupBuy.shop?.name?.charAt(0)
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs" style={{ color: theme.textMuted }}>{groupBuy.shop?.category}</p>
                <p className="font-semibold truncate text-base" style={{ color: theme.textPrimary }}>{groupBuy.shop?.name}</p>
              </div>
            </Link>
          </div>

          {/* 제품명 + 가격 + 간단 설명 */}
          <div className="px-5 py-5">
            {useDiscount && discountPercent > 0 ? (
              <div className="flex items-start justify-between">
                <h1 className="text-2xl font-black pt-6" style={{ color: theme.textPrimary }}>{groupBuy.title}</h1>
                <div className="text-right">
                  <div className="flex items-center gap-2 justify-end mb-1">
                    <span className="text-lg line-through" style={{ color: theme.textMuted }}>
                      {groupBuy.original_price.toLocaleString()}원
                    </span>
                    <span className="text-base font-bold" style={{ color: '#b91c1c' }}>{discountPercent}%</span>
                  </div>
                  <div>
                    <span className="text-3xl font-black" style={{ color: theme.textPrimary }}>
                      {groupBuy.sale_price.toLocaleString()}
                    </span>
                    <span className="text-xl font-bold" style={{ color: theme.textPrimary }}>원</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-black" style={{ color: theme.textPrimary }}>{groupBuy.title}</h1>
                <div>
                  <span className="text-3xl font-black" style={{ color: theme.textPrimary }}>{groupBuy.sale_price.toLocaleString()}</span>
                  <span className="text-xl font-bold" style={{ color: theme.textPrimary }}>원</span>
                </div>
              </div>
            )}
            
            {groupBuy.description && (
              <div className="mt-3">
                <p className="text-sm leading-relaxed" style={{ color: theme.textSecondary }}>
                  {showFullDescription ? groupBuy.description : descriptionPreview}
                </p>
                {hasLongDescription && (
                  <button 
                    onClick={() => setShowFullDescription(!showFullDescription)}
                    className="mt-2 text-sm font-medium flex items-center gap-1"
                    style={{ color: theme.accent }}
                  >
                    {showFullDescription ? "접기" : "상세내용 보기"}
                    <ChevronDown 
                      className={`w-4 h-4 transition-transform ${showFullDescription ? "rotate-180" : ""}`} 
                    />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 이미 참여한 경우 */}
        {alreadyJoined && myParticipation && (
          <div className="mx-4 mt-4 rounded-2xl overflow-hidden border-2" style={{ backgroundColor: theme.bgCard, borderColor: theme.accent }}>
            <div className="px-5 py-3" style={{ backgroundColor: `${theme.accent}20` }}>
              <p className="font-bold" style={{ color: theme.accent }}>이미 참여한 공구입니다</p>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div className="flex justify-between">
                <span style={{ color: theme.textMuted }}>주문 수량</span>
                <span className="font-semibold" style={{ color: theme.textPrimary }}>{myParticipation.quantity}개</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: theme.textMuted }}>결제 금액</span>
                <span className="font-semibold" style={{ color: theme.textPrimary }}>{(myParticipation.quantity * groupBuy.sale_price).toLocaleString()}원</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: theme.textMuted }}>결제 방식</span>
                <span className="font-semibold" style={{ color: theme.textPrimary }}>
                  {myParticipation.payment_method === "card" ? "카드 결제" : "계좌이체"}
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: theme.textMuted }}>주문 상태</span>
                <span className="font-bold" style={{ color: getStatusColor(myParticipation.status) }}>
                  {getStatusText(myParticipation.status)}
                </span>
              </div>
              <Link 
                href="/mypage/groupbuys" 
                className="block text-center py-3 rounded-xl mt-2 font-semibold"
                style={{ backgroundColor: theme.bgInput, color: theme.textPrimary }}
              >
                마이페이지에서 주문 확인
              </Link>
            </div>
          </div>
        )}

        {/* 마감까지 남은 시간 */}
        {useTimer && (
          <div 
            className="mx-5 my-4 rounded-2xl p-4 shadow-2xl border"
            style={{ 
              background: alreadyJoined 
                ? theme.bgCard 
                : 'linear-gradient(to bottom right, #0a0a0a, #1a0505, #0a0a0a)',
              borderColor: alreadyJoined ? theme.border : 'rgba(127, 29, 29, 0.3)'
            }}
          >
            <p 
              className="text-center text-[10px] font-medium tracking-widest uppercase mb-2"
              style={{ color: alreadyJoined ? theme.textMuted : '#f87171' }}
            >
              마감까지
            </p>
            <div className="flex items-baseline justify-center">
              {timeLeft.days > 0 && (
                <>
                  <span className="text-4xl font-black" style={{ color: alreadyJoined ? theme.textMuted : 'white', textShadow: alreadyJoined ? 'none' : '0 0 8px rgba(255,255,255,0.5)' }}>{timeLeft.days}</span>
                  <span className="text-base font-bold ml-1 mr-3" style={{ color: alreadyJoined ? theme.textMuted : 'white' }}>일</span>
                </>
              )}
              <span className="text-4xl font-black" style={{ color: alreadyJoined ? theme.textMuted : '#facc15', textShadow: alreadyJoined ? 'none' : '0 0 8px rgba(250,204,21,0.5)' }}>{String(timeLeft.hours).padStart(2,'0')}</span>
              <span className="text-base font-bold ml-1 mr-2" style={{ color: alreadyJoined ? theme.textMuted : '#facc15' }}>시간</span>
              <span className="text-4xl font-black" style={{ color: alreadyJoined ? theme.textMuted : '#facc15', textShadow: alreadyJoined ? 'none' : '0 0 8px rgba(250,204,21,0.5)' }}>{String(timeLeft.minutes).padStart(2,'0')}</span>
              <span className="text-base font-bold ml-1 mr-2" style={{ color: alreadyJoined ? theme.textMuted : '#eab308' }}>분</span>
              <span className="text-2xl font-black" style={{ color: alreadyJoined ? theme.textMuted : '#ef4444', textShadow: alreadyJoined ? 'none' : '0 0 8px rgba(239,68,68,0.5)' }}>{String(timeLeft.seconds).padStart(2,'0')}</span>
              <span className="text-sm font-bold ml-1 mr-1" style={{ color: alreadyJoined ? theme.textMuted : '#f87171' }}>초</span>
              <span className="text-2xl font-black" style={{ color: alreadyJoined ? theme.textMuted : '#ef4444', textShadow: alreadyJoined ? 'none' : '0 0 10px #ef4444, 0 0 20px #ef4444, 0 0 30px #ef4444' }}>.{String(timeLeft.ms).padStart(2,'0')}</span>
            </div>
          </div>
        )}

        {/* 참여 현황 */}
        {useMinQuantity && (
          <div className="mx-5 my-4 rounded-2xl p-5 border" style={{ backgroundColor: theme.bgCard, borderColor: theme.border }}>
            <div className="flex justify-between items-center mb-3">
              <span className="font-semibold" style={{ color: theme.textPrimary }}>참여 현황</span>
              <div>
                <span className="text-2xl font-black" style={{ color: theme.red }}>{groupBuy.current_quantity}</span>
                <span className="text-sm ml-1" style={{ color: theme.textMuted }}>/ {groupBuy.min_quantity}개</span>
              </div>
            </div>
            <div className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: theme.bgInput }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: theme.accent }} />
            </div>
            <p className="text-sm mt-3 text-center" style={{ color: theme.textMuted }}>
              {progress >= 100 ? "🎉 목표 수량 달성!" : `${groupBuy.current_quantity}개 참여중`}
            </p>
          </div>
        )}

        {/* 픽업 정보 */}
        <div className="mx-5 mb-4 rounded-2xl overflow-hidden border" style={{ backgroundColor: theme.bgCard, borderColor: theme.border }}>
          <div className="px-5 py-4 border-b" style={{ borderColor: theme.border }}>
            <h3 className="font-bold" style={{ color: theme.textPrimary }}>📍 픽업 안내</h3>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex">
              <span className="w-20 text-sm" style={{ color: theme.textMuted }}>픽업일</span>
              <span className="font-medium" style={{ color: theme.textPrimary }}>{groupBuy.pickup_date ? formatDate(groupBuy.pickup_date) : "공구 종료 후 안내"}</span>
            </div>
            <div className="flex">
              <span className="w-20 text-sm" style={{ color: theme.textMuted }}>픽업시간</span>
              <span className="font-medium" style={{ color: theme.textPrimary }}>
                {groupBuy.pickup_start_time && groupBuy.pickup_end_time ? `${formatTime(groupBuy.pickup_start_time)} ~ ${formatTime(groupBuy.pickup_end_time)}` : "공구 종료 후 안내"}
              </span>
            </div>
            <div className="flex">
              <span className="w-20 text-sm" style={{ color: theme.textMuted }}>픽업장소</span>
              <span className="font-medium" style={{ color: theme.textPrimary }}>{groupBuy.pickup_location || groupBuy.shop?.address || "상점 방문"}</span>
            </div>
          </div>
        </div>

        {/* 주의사항 */}
        <div className="mx-5 mb-4 rounded-2xl p-5" style={{ backgroundColor: alreadyJoined ? theme.bgInput : `${theme.red}10` }}>
          <h3 className="font-bold mb-3" style={{ color: alreadyJoined ? theme.textMuted : theme.red }}>⚠️ 주의 사항</h3>
          <ul className="space-y-2 text-sm" style={{ color: alreadyJoined ? theme.textMuted : `${theme.red}cc` }}>
            <li>• 결제 후 취소 시 환불이 어려울 수 있습니다</li>
            <li>• 픽업일에 수령하지 않으면 폐기될 수 있습니다</li>
            <li>• 문의사항은 상점에 직접 연락해주세요</li>
          </ul>
        </div>
      </main>

      {/* 하단 고정 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 backdrop-blur-sm border-t" style={{ backgroundColor: `${theme.bgCard}ee`, borderColor: theme.border }}>
        <div className="max-w-[640px] mx-auto px-5 py-4 flex items-center gap-3">
          <a href={`tel:${groupBuy.shop?.phone}`} className="w-14 h-14 border-2 rounded-2xl flex items-center justify-center" style={{ backgroundColor: theme.bgCard, borderColor: theme.border, color: theme.textPrimary }}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </a>
          
          {isOwner ? (
            <Link href={`/shop/groupbuy/${groupBuy.id}`} className="flex-1 h-14 font-bold text-lg rounded-2xl flex items-center justify-center gap-2" style={{ backgroundColor: theme.accent, color: isDark ? '#121212' : '#fff' }}>
              주문 관리하기
            </Link>
          ) : alreadyJoined ? (
            <button disabled className="flex-1 h-14 font-bold text-lg rounded-2xl" style={{ backgroundColor: theme.bgInput, color: theme.textMuted }}>
              이미 참여한 공구입니다
            </button>
          ) : (
            <button onClick={() => setShowModal(true)} className="flex-1 h-14 font-bold text-lg rounded-2xl" style={{ backgroundColor: theme.accent, color: isDark ? '#121212' : '#fff' }}>
              참여하기
            </button>
          )}
        </div>
      </div>

      {/* 주문신청 모달 */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-[640px] rounded-t-3xl max-h-[85vh] flex flex-col" style={{ backgroundColor: theme.bgCard }}>
            <div className="px-6 py-5 border-b" style={{ borderColor: theme.border }}>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold" style={{ color: theme.textPrimary }}>주문 신청</h2>
                <button onClick={() => setShowModal(false)} className="w-10 h-10 flex items-center justify-center" style={{ color: theme.textMuted }}>
                  <X className="w-6 h-6" />
                </button>
              </div>
              <p className="text-sm mt-1" style={{ color: theme.textMuted }}>{groupBuy.title}</p>
            </div>
            
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              <div>
                <label className="block text-sm font-semibold mb-3" style={{ color: theme.textPrimary }}>주문 수량</label>
                <div className="flex items-center gap-4">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-12 h-12 rounded-xl border-2 flex items-center justify-center text-xl font-bold" style={{ borderColor: theme.border, color: theme.textPrimary }}>−</button>
                  <span className="text-2xl font-bold w-12 text-center" style={{ color: theme.textPrimary }}>{quantity}</span>
                  <button onClick={() => setQuantity(quantity + 1)} className="w-12 h-12 rounded-xl border-2 flex items-center justify-center text-xl font-bold" style={{ borderColor: theme.border, color: theme.textPrimary }}>+</button>
                  <span className="text-sm ml-2" style={{ color: theme.textMuted }}>({groupBuy.sale_price.toLocaleString()}원 × {quantity}개)</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-3" style={{ color: theme.textPrimary }}>이름</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="픽업 시 확인용 이름" className="w-full px-4 py-3.5 rounded-xl focus:outline-none" style={{ backgroundColor: theme.bgInput, color: theme.textPrimary }} />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-3" style={{ color: theme.textPrimary }}>연락처</label>
                <input type="tel" value={phone} onChange={handlePhoneChange} placeholder="010-0000-0000" maxLength={13} className="w-full px-4 py-3.5 rounded-xl focus:outline-none text-lg" style={{ backgroundColor: theme.bgInput, color: theme.textPrimary }} />
                <p className="text-xs mt-2" style={{ color: theme.textMuted }}>픽업 안내 알림을 받을 번호</p>
              </div>

              {/* 결제 방식 선택 */}
              <div>
                <label className="block text-sm font-semibold mb-3" style={{ color: theme.textPrimary }}>결제 방식</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setPaymentMethod("cash")}
                    className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${paymentMethod === "cash" ? "border-current" : ""}`}
                    style={{ 
                      borderColor: paymentMethod === "cash" ? theme.accent : theme.border,
                      backgroundColor: paymentMethod === "cash" ? `${theme.accent}20` : theme.bgInput 
                    }}
                  >
                    <Banknote className="w-6 h-6" style={{ color: paymentMethod === "cash" ? theme.accent : theme.textMuted }} />
                    <span className="font-medium" style={{ color: paymentMethod === "cash" ? theme.accent : theme.textPrimary }}>계좌이체</span>
                  </button>
                  <button
                    onClick={() => setPaymentMethod("card")}
                    className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${paymentMethod === "card" ? "border-current" : ""}`}
                    style={{ 
                      borderColor: paymentMethod === "card" ? theme.accent : theme.border,
                      backgroundColor: paymentMethod === "card" ? `${theme.accent}20` : theme.bgInput 
                    }}
                  >
                    <CreditCard className="w-6 h-6" style={{ color: paymentMethod === "card" ? theme.accent : theme.textMuted }} />
                    <span className="font-medium" style={{ color: paymentMethod === "card" ? theme.accent : theme.textPrimary }}>카드 결제</span>
                  </button>
                </div>
              </div>

              {/* 계좌이체 선택 시 계좌 정보 표시 */}
              {paymentMethod === "cash" && (
                <div className="rounded-2xl p-5" style={{ backgroundColor: theme.accent }}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium" style={{ color: isDark ? '#121212' : '#fff' }}>입금 계좌</span>
                    <button onClick={copyAccount} className="text-xs px-3 py-1 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: isDark ? '#121212' : '#fff' }}>복사하기</button>
                  </div>
                  <p className="text-2xl font-bold mb-1" style={{ color: isDark ? '#121212' : '#fff' }}>{bankAccount}</p>
                  <p style={{ color: isDark ? '#121212cc' : '#ffffffcc' }}>{bankName} | 예금주 {bankHolder}</p>
                </div>
              )}

              {/* 카드 결제 선택 시 안내 */}
              {paymentMethod === "card" && (
                <div className="rounded-2xl p-5" style={{ backgroundColor: `${theme.accent}20` }}>
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-8 h-8" style={{ color: theme.accent }} />
                    <div>
                      <p className="font-semibold" style={{ color: theme.textPrimary }}>카드 결제</p>
                      <p className="text-sm" style={{ color: theme.textMuted }}>주문 확정 후 토스페이먼츠 결제창으로 이동합니다</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="rounded-2xl p-5" style={{ backgroundColor: `${theme.accent}30` }}>
                <div className="flex items-center justify-between">
                  <span className="font-medium" style={{ color: theme.textPrimary }}>총 결제 금액</span>
                  <span className="text-3xl font-black" style={{ color: '#facc15' }}>{totalPrice.toLocaleString()}원</span>
                </div>
              </div>

              <div className="rounded-2xl p-4 border" style={{ backgroundColor: `${theme.red}10`, borderColor: `${theme.red}30` }}>
                <div className="flex gap-3">
                  <span className="text-xl">⚠️</span>
                  <div className="text-sm" style={{ color: `${theme.red}cc` }}>
                    <p className="font-bold mb-2" style={{ color: theme.red }}>
                      {paymentMethod === "cash" ? "입금 전 확인하세요!" : "결제 전 확인하세요!"}
                    </p>
                    <ul className="space-y-1">
                      {paymentMethod === "cash" ? (
                        <>
                          <li>• 입금자명은 신청자명과 동일해야 합니다</li>
                          <li>• 입금 확인까지 최대 1영업일 소요됩니다</li>
                          <li>• 입금 후 취소/환불이 어려울 수 있습니다</li>
                        </>
                      ) : (
                        <>
                          <li>• 결제 완료 후 취소/환불이 어려울 수 있습니다</li>
                          <li>• 결제 정보는 안전하게 처리됩니다</li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-5 border-t" style={{ borderColor: theme.border, backgroundColor: theme.bgCard }}>
              <button onClick={handleSubmitClick} className="w-full h-14 font-bold text-lg rounded-2xl" style={{ backgroundColor: theme.accent, color: isDark ? '#121212' : '#fff' }}>
                주문 신청하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 확인 모달 */}
      {showConfirm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-5">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowConfirm(false)} />
          <div className="relative w-full max-w-[400px] rounded-3xl overflow-hidden" style={{ backgroundColor: theme.bgCard }}>
            <div className="px-6 py-5 text-center" style={{ backgroundColor: theme.accent }}>
              <p className="text-lg font-bold" style={{ color: isDark ? '#121212' : '#fff' }}>주문 내용 확인</p>
              <p className="text-sm mt-1" style={{ color: isDark ? '#121212cc' : '#ffffffcc' }}>아래 내용이 맞는지 확인해주세요</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between py-3 border-b" style={{ borderColor: theme.border }}>
                <span style={{ color: theme.textMuted }}>상품명</span>
                <span className="font-medium text-right max-w-[200px] truncate" style={{ color: theme.textPrimary }}>{groupBuy.title}</span>
              </div>
              <div className="flex justify-between py-3 border-b" style={{ borderColor: theme.border }}>
                <span style={{ color: theme.textMuted }}>주문 수량</span>
                <span className="font-bold" style={{ color: theme.textPrimary }}>{quantity}개</span>
              </div>
              <div className="flex justify-between py-3 border-b" style={{ borderColor: theme.border }}>
                <span style={{ color: theme.textMuted }}>신청자</span>
                <span className="font-medium" style={{ color: theme.textPrimary }}>{name}</span>
              </div>
              <div className="flex justify-between py-3 border-b" style={{ borderColor: theme.border }}>
                <span style={{ color: theme.textMuted }}>연락처</span>
                <span className="font-medium" style={{ color: theme.textPrimary }}>{phone}</span>
              </div>
              <div className="flex justify-between py-3 border-b" style={{ borderColor: theme.border }}>
                <span style={{ color: theme.textMuted }}>결제 방식</span>
                <span className="font-medium" style={{ color: theme.textPrimary }}>
                  {paymentMethod === "card" ? "카드 결제" : "계좌이체"}
                </span>
              </div>
              <div className="flex justify-between py-3 rounded-xl px-4 -mx-2" style={{ backgroundColor: `${theme.accent}30` }}>
                <span className="font-medium" style={{ color: theme.textPrimary }}>결제금액</span>
                <span className="text-xl font-black" style={{ color: theme.red }}>{totalPrice.toLocaleString()}원</span>
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setShowConfirm(false)} className="flex-1 h-12 font-medium rounded-xl" style={{ backgroundColor: theme.bgInput, color: theme.textSecondary }}>다시 수정</button>
              <button onClick={handleFinalSubmit} disabled={submitting} className="flex-1 h-12 font-bold rounded-xl disabled:opacity-50" style={{ backgroundColor: theme.accent, color: isDark ? '#121212' : '#fff' }}>
                {submitting ? "처리중..." : paymentMethod === "card" ? "결제하기" : "주문 확정"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 완료 모달 */}
      {showComplete && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-5">
          <div className="absolute inset-0 bg-black/95" />
          <div className="relative w-full max-w-[400px] rounded-3xl overflow-hidden text-center" style={{ backgroundColor: theme.bgCard }}>
            <div className="pt-10 pb-6 px-6">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5" style={{ backgroundColor: theme.accent }}>
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: isDark ? '#121212' : '#fff' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-2" style={{ color: theme.textPrimary }}>신청이 완료되었습니다!</h3>
              <p className="text-base font-medium" style={{ color: theme.accent }}>입금 확인 후 픽업 1시간 전 안내 알림을 보내드립니다</p>
              <p className="mt-2 text-sm" style={{ color: theme.textMuted }}>별도의 문의사항은 매장으로 직접 연락주세요.</p>
            </div>
            <div className="px-6 pb-6 space-y-3 text-left" style={{ backgroundColor: theme.bgMain }}>
              <div className="rounded-xl p-4" style={{ backgroundColor: theme.bgCard }}>
                <p className="text-sm mb-1" style={{ color: theme.textMuted }}>주문 내역</p>
                <p className="font-medium" style={{ color: theme.textPrimary }}>{groupBuy.title} × {quantity}개</p>
                <p className="text-lg font-bold mt-1" style={{ color: theme.red }}>{totalPrice.toLocaleString()}원</p>
              </div>
              <div className="rounded-xl p-4" style={{ backgroundColor: theme.bgCard }}>
                <p className="text-sm mb-1" style={{ color: theme.textMuted }}>픽업 장소</p>
                <p className="font-medium" style={{ color: theme.textPrimary }}>{groupBuy.pickup_location || groupBuy.shop?.address || "상점 방문"}</p>
              </div>
            </div>
            <div className="px-6 pb-6" style={{ backgroundColor: theme.bgMain }}>
              <button onClick={() => { setShowComplete(false); setName(""); setPhone(""); setQuantity(1); }} className="w-full h-14 font-bold text-lg rounded-2xl" style={{ backgroundColor: theme.accent, color: isDark ? '#121212' : '#fff' }}>확인</button>
            </div>
          </div>
        </div>
      )}

      {/* 공유 모달 */}
      {showShareModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-5">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowShareModal(false)} />
          <div className="relative w-full max-w-[320px] rounded-2xl overflow-hidden" style={{ backgroundColor: theme.bgCard }}>
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: theme.border }}>
              <h3 className="font-bold" style={{ color: theme.textPrimary }}>공유하기</h3>
              <button onClick={() => setShowShareModal(false)}>
                <X className="w-5 h-5" style={{ color: theme.textMuted }} />
              </button>
            </div>
            <div className="p-5 grid grid-cols-4 gap-4">
              <button onClick={() => handleSocialShare("kakao")} className="flex flex-col items-center gap-2">
                <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: "#FEE500" }}>
                  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="#000000">
                    <path d="M12 3C6.48 3 2 6.48 2 10.5c0 2.55 1.58 4.79 3.99 6.14l-1.02 3.79c-.09.33.25.6.55.43l4.26-2.55c.73.11 1.48.17 2.22.17 5.52 0 10-3.48 10-7.98S17.52 3 12 3z"/>
                  </svg>
                </div>
                <span className="text-xs" style={{ color: theme.textSecondary }}>카카오톡</span>
              </button>
              
              <button onClick={() => handleSocialShare("facebook")} className="flex flex-col items-center gap-2">
                <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: "#1877F2" }}>
                  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="#FFFFFF">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </div>
                <span className="text-xs" style={{ color: theme.textSecondary }}>페이스북</span>
              </button>
              
              <button onClick={() => handleSocialShare("band")} className="flex flex-col items-center gap-2">
                <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: "#06C755" }}>
                  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="#FFFFFF">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-6h2v6zm4 0h-2v-6h2v6zm0-8H9V7h6v2z"/>
                  </svg>
                </div>
                <span className="text-xs" style={{ color: theme.textSecondary }}>밴드</span>
              </button>
              
              <button onClick={() => handleSocialShare("copy")} className="flex flex-col items-center gap-2">
                <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.bgInput }}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: theme.textPrimary }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="text-xs" style={{ color: theme.textSecondary }}>링크 복사</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
