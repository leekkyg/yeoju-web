"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/contexts/ThemeContext";
import { ArrowLeft, Home, Package, MapPin, ChevronLeft, ChevronRight, Minus, Plus, Check, ChevronDown, ChevronUp, Store, Copy, Search } from "lucide-react";
import OptimizedImage from "@/components/common/OptimizedImage";

declare global {
  interface Window {
    daum: any;
  }
}

interface GroupBuy {
  id: number;
  title: string;
  description?: string;
  sale_price: number;
  original_price?: number;
  current_quantity: number;
  min_quantity: number;
  max_quantity?: number;
  image_url?: string;
  images?: string[];
  pickup_date?: string;
  pickup_start_time?: string;
  pickup_end_time?: string;
  pickup_location?: string;
  pickup_address?: string;
  pickup_address_detail?: string;
  end_date?: string;
  status?: string;
  payment_methods?: string[];
  delivery_methods?: string[];
  delivery_fee?: number;
  shop: {
    id: number;
    name: string;
    user_id: string;
    logo_url?: string;
    business_name?: string;
    business_number?: string;
    representative?: string;
    business_address?: string;
    contact?: string;
    bank_name?: string;
    bank_account?: string;
    bank_holder?: string;
  };
}

interface SavedAddress {
  id: string;
  address: string;
  address_detail: string;
  zonecode: string;
}

// 이미지 슬라이더
function ImageSlider({ images }: { images: string[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.touches[0].clientX);
  const handleTouchMove = (e: React.TouchEvent) => setTouchEnd(e.touches[0].clientX);
  const handleTouchEnd = () => {
    if (touchStart - touchEnd > 50) setCurrentIndex(prev => (prev + 1) % images.length);
    if (touchEnd - touchStart > 50) setCurrentIndex(prev => (prev - 1 + images.length) % images.length);
  };

  if (images.length === 0) return null;

  return (
    <div className="relative w-full aspect-[3/2] overflow-hidden rounded-2xl bg-gray-100">
      <div className="w-full h-full relative" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
        <OptimizedImage src={images[currentIndex]} alt="" fill className="object-cover" />
      </div>
      {images.length > 1 && (
        <>
          <button onClick={() => setCurrentIndex(prev => (prev - 1 + images.length) % images.length)} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center bg-black/40">
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <button onClick={() => setCurrentIndex(prev => (prev + 1) % images.length)} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center bg-black/40">
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, idx) => (
              <div key={idx} className={`w-2 h-2 rounded-full transition-all ${idx === currentIndex ? 'bg-white w-4' : 'bg-white/50'}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// 타임어택 카운터
function CountdownTimer({ endDate }: { endDate: string }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, ms: 0, expired: false });

  useEffect(() => {
    const calc = () => {
      const diff = new Date(endDate).getTime() - new Date().getTime();
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, ms: 0, expired: true });
        return;
      }
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
        ms: Math.floor((diff % 1000) / 10),
        expired: false,
      });
    };
    calc();
    const timer = setInterval(calc, 10);
    return () => clearInterval(timer);
  }, [endDate]);

  if (timeLeft.expired) {
    return (
      <div className="text-center py-4 rounded-2xl" style={{ backgroundColor: "#1a1a1a" }}>
        <span className="text-xl font-bold" style={{ color: "#EF4444" }}>마감되었습니다</span>
      </div>
    );
  }

  return (
    <div className="py-4 px-3 rounded-2xl" style={{ backgroundColor: "#1a1a1a" }}>
      <p className="text-center text-xs mb-3" style={{ color: "#ffffff80" }}>마감까지 남은 시간</p>
      <div className="flex items-center justify-center gap-1 flex-wrap">
        {timeLeft.days > 0 && (
          <>
            <span className="text-2xl font-black text-white">{timeLeft.days}</span>
            <span className="text-2xl font-medium text-white/60 mr-2">일</span>
          </>
        )}
        <span className="text-2xl font-bold" style={{ color: "#FBBF24" }}>{String(timeLeft.hours).padStart(2, '0')}</span>
        <span className="text-2xl font-medium" style={{ color: "#FBBF24" }}>시</span>
        <span className="text-2xl font-bold" style={{ color: "#FBBF24" }}>{String(timeLeft.minutes).padStart(2, '0')}</span>
        <span className="text-2xl font-medium" style={{ color: "#FBBF24" }}>분</span>
        <span className="text-2xl font-bold" style={{ color: "#EF4444" }}>{String(timeLeft.seconds).padStart(2, '0')}</span>
        <span className="text-2xl font-medium" style={{ color: "#EF4444" }}>초</span>
      </div>
    </div>
  );
}

export default function GroupBuyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { theme, isDark, mounted } = useTheme();

  const [groupBuy, setGroupBuy] = useState<GroupBuy | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [alreadyJoined, setAlreadyJoined] = useState(false);
  const [myParticipation, setMyParticipation] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const [showSellerInfo, setShowSellerInfo] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<"pickup" | "delivery">("pickup");
  
  // 주소 관련 state
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryAddressDetail, setDeliveryAddressDetail] = useState("");
  const [deliveryZonecode, setDeliveryZonecode] = useState("");
  const [saveAddress, setSaveAddress] = useState(true);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [showSavedAddresses, setShowSavedAddresses] = useState(false);
  
  const [submitting, setSubmitting] = useState(false);
  const [daumLoaded, setDaumLoaded] = useState(false);

// 다음 우편번호 스크립트 동적 로드
useEffect(() => {
  const script = document.createElement('script');
  script.src = '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
  script.async = true;
  script.onload = () => setDaumLoaded(true);
  document.head.appendChild(script);
}, []);

  useEffect(() => { checkAuth(); }, []);
  useEffect(() => { fetchGroupBuy(); }, [params.id, user]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    
    if (user) {
      // 프로필에서 저장된 주소 가져오기
      const { data: profile } = await supabase
        .from("profiles")
        .select("saved_addresses, default_name, default_phone")
        .eq("id", user.id)
        .single();
      
      if (profile) {
        if (profile.default_name) setName(profile.default_name);
        if (profile.default_phone) setPhone(profile.default_phone);
        if (profile.saved_addresses && Array.isArray(profile.saved_addresses)) {
          setSavedAddresses(profile.saved_addresses);
          // 저장된 주소가 있으면 첫 번째 주소 자동 선택
          if (profile.saved_addresses.length > 0) {
            const firstAddr = profile.saved_addresses[0];
            setDeliveryAddress(firstAddr.address);
            setDeliveryAddressDetail(firstAddr.address_detail || "");
            setDeliveryZonecode(firstAddr.zonecode || "");
          }
        }
      }
      
      // 이전 공구 참여 기록에서 이름/연락처 가져오기 (프로필에 없을 경우)
      if (!profile?.default_name || !profile?.default_phone) {
        const { data: lastParticipation } = await supabase
          .from("group_buy_participants")
          .select("name, phone")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        
        if (lastParticipation) {
          if (!name && lastParticipation.name) setName(lastParticipation.name);
          if (!phone && lastParticipation.phone) setPhone(lastParticipation.phone);
        }
      }
    }
  };

  const fetchGroupBuy = async () => {
    const { data, error } = await supabase
      .from("group_buys")
      .select("*, shop:shops(id, name, user_id, logo_url, business_name, business_number, representative, business_address, contact, bank_name, bank_account, bank_holder)")
      .eq("id", params.id)
      .single();

    if (error || !data) {
      alert("공구를 찾을 수 없습니다");
      router.push("/groupbuy");
      return;
    }

    setGroupBuy(data);
    if (user && data.shop?.user_id === user.id) setIsOwner(true);

    if (user) {
      const { data: p } = await supabase
        .from("group_buy_participants")
        .select("*")
        .eq("group_buy_id", params.id)
        .eq("user_id", user.id)
        .neq("status", "cancelled")
        .single();
      if (p) {
        setAlreadyJoined(true);
        setMyParticipation(p);
      }
    }
    setLoading(false);
  };

  // 다음 주소 검색 열기
  const openAddressSearch = () => {
    if (!daumLoaded || !window.daum) {
      alert("주소 검색을 불러오는 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    new window.daum.Postcode({
      oncomplete: function(data: any) {
        // 도로명 주소 우선, 없으면 지번 주소
        const address = data.roadAddress || data.jibunAddress;
        setDeliveryAddress(address);
        setDeliveryZonecode(data.zonecode);
        setDeliveryAddressDetail(""); // 상세주소 초기화
        setShowSavedAddresses(false);
      }
    }).open();
  };

  // 저장된 주소 선택
  const selectSavedAddress = (addr: SavedAddress) => {
    setDeliveryAddress(addr.address);
    setDeliveryAddressDetail(addr.address_detail || "");
    setDeliveryZonecode(addr.zonecode || "");
    setShowSavedAddresses(false);
  };

  // 주소 저장
  const saveAddressToProfile = async () => {
    if (!user || !deliveryAddress) return;

    const newAddress: SavedAddress = {
      id: Date.now().toString(),
      address: deliveryAddress,
      address_detail: deliveryAddressDetail,
      zonecode: deliveryZonecode,
    };

    // 중복 체크
    const isDuplicate = savedAddresses.some(
      addr => addr.address === newAddress.address && addr.address_detail === newAddress.address_detail
    );

    if (!isDuplicate) {
      const updatedAddresses = [newAddress, ...savedAddresses].slice(0, 5); // 최대 5개

      await supabase
        .from("profiles")
        .update({ 
          saved_addresses: updatedAddresses,
          default_name: name,
          default_phone: phone,
        })
        .eq("id", user.id);

      setSavedAddresses(updatedAddresses);
    }
  };

  const getDiscountPercent = (original: number, sale: number) => Math.round((1 - sale / original) * 100);

  const formatPickupDateTime = () => {
    if (!groupBuy?.pickup_date) return null;
    const d = new Date(groupBuy.pickup_date);
    const weekday = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
    return {
      date: `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${weekday})`,
      time: `${groupBuy.pickup_start_time?.slice(0, 5) || ""} ~ ${groupBuy.pickup_end_time?.slice(0, 5) || ""}`
    };
  };

  const getFullAddress = () => {
    if (!groupBuy) return "";
    return `${groupBuy.pickup_address || groupBuy.pickup_location || ""}${groupBuy.pickup_address_detail ? ` ${groupBuy.pickup_address_detail}` : ""}`;
  };

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(getFullAddress());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { alert("주소 복사 실패"); }
  };

  const openKakaoMap = () => window.open(`https://map.kakao.com/link/search/${encodeURIComponent(getFullAddress())}`, '_blank');
  const openNaverMap = () => window.open(`https://map.naver.com/v5/search/${encodeURIComponent(getFullAddress())}`, '_blank');
  const openTMap = () => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (!isMobile) { alert("T맵은 모바일에서만 사용할 수 있습니다"); return; }
    window.location.href = `tmap://search?name=${encodeURIComponent(getFullAddress())}`;
  };

  const handleJoinClick = () => {
    if (!user) { router.push("/login"); return; }
    setShowJoinModal(true);
  };

  const handleSubmitJoin = async () => {
    if (!name.trim() || !phone.trim()) { alert("이름과 연락처를 입력해주세요"); return; }
    if (deliveryMethod === "delivery" && !deliveryAddress.trim()) { alert("배달 주소를 입력해주세요"); return; }
    setSubmitting(true);

    // 주소 저장 체크되어 있으면 저장
    if (deliveryMethod === "delivery" && saveAddress && deliveryAddress) {
      await saveAddressToProfile();
    }

    const fullDeliveryAddress = deliveryMethod === "delivery" 
      ? `${deliveryAddress}${deliveryAddressDetail ? ` ${deliveryAddressDetail}` : ""}`
      : null;
    
    // 참여 신청
    const { error } = await supabase.from("group_buy_participants").insert({
      group_buy_id: groupBuy?.id, 
      user_id: user.id, 
      name: name.trim(), 
      phone: phone.trim(), 
      quantity, 
      status: "unpaid",
      delivery_method: deliveryMethod,
      delivery_address: fullDeliveryAddress,
      delivery_zonecode: deliveryMethod === "delivery" ? deliveryZonecode : null,
    });
    if (error) { alert("참여 신청 실패"); setSubmitting(false); return; }
    
    await supabase.from("group_buys").update({ current_quantity: (groupBuy?.current_quantity || 0) + quantity }).eq("id", groupBuy?.id);
    alert("참여 신청 완료!\n입금 확인 후 픽업 1시간 전 안내 알림을 보내드립니다.");
    setShowJoinModal(false);
    setAlreadyJoined(true);
    fetchGroupBuy();
    setSubmitting(false);
  };

  const getStatusText = (s: string) => ({ unpaid: "미입금", pending: "입금 대기", paid: "입금 확인", picked: "수령 완료", cancelled: "취소됨" }[s] || s);
  const getStatusColor = (s: string) => ({ unpaid: "#EF4444", pending: "#F59E0B", paid: theme.accent, picked: "#10B981", cancelled: "#6B7280" }[s] || theme.textMuted);
  const getRemainingStock = () => groupBuy ? Math.max(0, (groupBuy.max_quantity || groupBuy.min_quantity) - groupBuy.current_quantity) : 0;

  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.bgMain }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: theme.accent }} />
      </div>
    );
  }

  if (!groupBuy) return null;

  const images = groupBuy.images || (groupBuy.image_url ? [groupBuy.image_url] : []);
  const discountPercent = groupBuy.original_price ? getDiscountPercent(groupBuy.original_price, groupBuy.sale_price) : 0;
  const remainingStock = getRemainingStock();
  const pickupInfo = formatPickupDateTime();

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: theme.bgMain }}>
      {/* 다음 우편번호 스크립트 */}
      <Script 
        src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"
        onLoad={() => setDaumLoaded(true)}
      />

      {/* 헤더 */}
      <header className="fixed top-0 left-0 right-0 z-50" style={{ backgroundColor: theme.bgCard }}>
        <div className="max-w-[640px] mx-auto px-4 h-14 flex items-center justify-between border-b" style={{ borderColor: theme.border }}>
          <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center">
            <ArrowLeft className="w-6 h-6" style={{ color: theme.textPrimary }} />
          </button>
          <h1 className="font-bold" style={{ color: theme.textPrimary }}>공동구매</h1>
          <Link href="/" className="w-10 h-10 flex items-center justify-center">
            <Home className="w-5 h-5" style={{ color: theme.textSecondary }} />
          </Link>
        </div>
      </header>

      <main className="pt-14 max-w-[640px] mx-auto px-4">
        {/* 이미지 */}
        <div className="mt-4">
          {images.length > 0 ? <ImageSlider images={images} /> : (
            <div className="w-full aspect-[3/2] flex items-center justify-center rounded-2xl" style={{ backgroundColor: theme.bgInput }}>
              <span className="text-6xl opacity-30">🛒</span>
            </div>
          )}
        </div>

        {/* 상품 정보 카드 */}
        <div className="mt-4 p-4 rounded-2xl" style={{ backgroundColor: theme.bgCard }}>
          {/* 제목 + 가격 한 줄 */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <h2 className="text-lg font-bold flex-1" style={{ color: theme.textPrimary }}>{groupBuy.title}</h2>
            <div className="text-right shrink-0">
              {discountPercent > 0 && (
                <span className="text-sm font-bold mr-1" style={{ color: theme.red }}>{discountPercent}%</span>
              )}
              <span className="text-lg font-bold" style={{ color: theme.textPrimary }}>{groupBuy.sale_price.toLocaleString()}원</span>
              {groupBuy.original_price && (
                <p className="text-xs line-through" style={{ color: theme.textMuted }}>{groupBuy.original_price.toLocaleString()}원</p>
              )}
            </div>
          </div>

          {/* 남은 수량 */}
          <div className="flex items-center gap-2 p-3 rounded-xl mb-4" style={{ backgroundColor: theme.bgInput }}>
            <Package className="w-5 h-5" style={{ color: theme.accent }} />
            <span className="text-sm font-medium" style={{ color: theme.textPrimary }}>남은 수량</span>
            <span className="ml-auto text-lg font-bold" style={{ color: remainingStock > 0 ? theme.accent : theme.red }}>
              {remainingStock > 0 ? `${remainingStock}개` : "품절"}
            </span>
          </div>

          {/* 타임어택 */}
          {groupBuy.end_date && <CountdownTimer endDate={groupBuy.end_date} />}
        </div>

        {/* 상품 설명 */}
        {groupBuy.description && (
          <div className="mt-4 rounded-2xl overflow-hidden" style={{ backgroundColor: theme.bgCard }}>
            <button onClick={() => setShowDescription(!showDescription)} className="w-full p-4 flex items-center justify-between">
              <span className="font-bold" style={{ color: theme.textPrimary }}>상품 설명</span>
              {showDescription ? <ChevronUp className="w-5 h-5" style={{ color: theme.textMuted }} /> : <ChevronDown className="w-5 h-5" style={{ color: theme.textMuted }} />}
            </button>
            {showDescription && (
              <div className="px-4 pb-4">
                <p className="text-sm whitespace-pre-wrap" style={{ color: theme.textSecondary }}>{groupBuy.description}</p>
              </div>
            )}
          </div>
        )}

        {/* 픽업 정보 */}
        {(groupBuy.pickup_address || groupBuy.pickup_location) && (
          <div className="mt-4 p-4 rounded-2xl" style={{ backgroundColor: theme.bgCard }}>
            <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: theme.textPrimary }}>
              <MapPin className="w-5 h-5" style={{ color: theme.accent }} />
              픽업 안내
            </h3>
            
            {pickupInfo && (
              <div className="mb-4 p-4 rounded-xl text-center" style={{ backgroundColor: theme.bgInput }}>
                <p className="text-lg font-bold mb-1" style={{ color: theme.textPrimary }}>{pickupInfo.date}</p>
                <p className="text-2xl font-black" style={{ color: theme.accent }}>{pickupInfo.time}</p>
              </div>
            )}

            {/* 주소 + 작은 아이콘들 */}
            <div className="p-4 rounded-xl" style={{ backgroundColor: theme.bgInput }}>
              <p className="text-xs mb-1" style={{ color: theme.textMuted }}>픽업 장소</p>
              <p className="text-lg font-bold mb-3" style={{ color: theme.textPrimary }}>{getFullAddress()}</p>
              
              {/* 아이콘 버튼들 - 한 줄에 작게 */}
              <div className="flex items-center gap-2">
                <button onClick={handleCopyAddress} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ backgroundColor: theme.bgCard, color: theme.textPrimary }}>
                  <Copy className="w-3.5 h-3.5" />
                  {copied ? "완료" : "복사"}
                </button>
                <button onClick={openKakaoMap} className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ backgroundColor: "#FEE500", color: "#3C1E1E" }}>
                  카카오
                </button>
                <button onClick={openNaverMap} className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ backgroundColor: "#03C75A", color: "#fff" }}>
                  네이버
                </button>
                <button onClick={openTMap} className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ backgroundColor: "#3B82F6", color: "#fff" }}>
                  T맵
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 내 참여 현황 */}
        {alreadyJoined && myParticipation && (
          <div className="mt-4 p-4 rounded-2xl" style={{ backgroundColor: theme.bgCard }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5" style={{ color: theme.accent }} />
                <h3 className="font-bold" style={{ color: theme.textPrimary }}>참여 완료</h3>
              </div>
              <Link 
                href="/mypage/groupbuys" 
                className="text-sm font-medium px-3 py-1.5 rounded-lg"
                style={{ backgroundColor: theme.bgInput, color: theme.accent }}
              >
                주문현황
              </Link>
            </div>
            <div className="p-3 rounded-xl space-y-2" style={{ backgroundColor: theme.bgInput }}>
              <div className="flex justify-between">
                <span className="text-sm" style={{ color: theme.textMuted }}>신청자</span>
                <span className="text-sm font-medium" style={{ color: theme.textPrimary }}>{myParticipation.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm" style={{ color: theme.textMuted }}>수량</span>
                <span className="text-sm font-medium" style={{ color: theme.textPrimary }}>{myParticipation.quantity}개</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm" style={{ color: theme.textMuted }}>금액</span>
                <span className="text-sm font-medium" style={{ color: theme.textPrimary }}>{(groupBuy.sale_price * myParticipation.quantity).toLocaleString()}원</span>
              </div>
              <div className="flex justify-between pt-2 border-t" style={{ borderColor: theme.border }}>
                <span className="text-sm" style={{ color: theme.textMuted }}>상태</span>
                <span className="text-sm font-bold" style={{ color: getStatusColor(myParticipation.status) }}>{getStatusText(myParticipation.status)}</span>
              </div>
            </div>
            <p className="text-xs mt-3 text-center" style={{ color: theme.accent }}>
              입금 확인 후 픽업 1시간 전 안내 알림을 보내드립니다
            </p>
          </div>
        )}

        {/* 판매자 정보 */}
        <div className="mt-4 rounded-2xl overflow-hidden" style={{ backgroundColor: theme.bgCard }}>
          <button onClick={() => setShowSellerInfo(!showSellerInfo)} className="w-full p-4 flex items-center justify-between">
            <span className="font-bold flex items-center gap-2" style={{ color: theme.textPrimary }}>
              <Store className="w-5 h-5" style={{ color: theme.accent }} />
              판매자 정보
            </span>
            {showSellerInfo ? <ChevronUp className="w-5 h-5" style={{ color: theme.textMuted }} /> : <ChevronDown className="w-5 h-5" style={{ color: theme.textMuted }} />}
          </button>
          {showSellerInfo && (
            <div className="px-4 pb-4">
              <div className="p-3 rounded-xl space-y-2" style={{ backgroundColor: theme.bgInput }}>
                <div className="flex gap-3"><span className="text-sm w-20 shrink-0" style={{ color: theme.textMuted }}>상호명</span><span className="text-sm" style={{ color: theme.textPrimary }}>{groupBuy.shop?.business_name || groupBuy.shop?.name || "-"}</span></div>
                <div className="flex gap-3"><span className="text-sm w-20 shrink-0" style={{ color: theme.textMuted }}>대표자</span><span className="text-sm" style={{ color: theme.textPrimary }}>{groupBuy.shop?.representative || "-"}</span></div>
                <div className="flex gap-3"><span className="text-sm w-20 shrink-0" style={{ color: theme.textMuted }}>사업자번호</span><span className="text-sm" style={{ color: theme.textPrimary }}>{groupBuy.shop?.business_number || "-"}</span></div>
                <div className="flex gap-3"><span className="text-sm w-20 shrink-0" style={{ color: theme.textMuted }}>소재지</span><span className="text-sm" style={{ color: theme.textPrimary }}>{groupBuy.shop?.business_address || "-"}</span></div>
                <div className="flex gap-3"><span className="text-sm w-20 shrink-0" style={{ color: theme.textMuted }}>연락처</span><span className="text-sm" style={{ color: theme.textPrimary }}>{groupBuy.shop?.contact || "-"}</span></div>
              </div>
              <p className="text-xs mt-3 text-center" style={{ color: theme.textMuted }}>
                별도의 문의사항은 매장으로 직접 연락주세요.
              </p>
            </div>
          )}
        </div>

        <div className="h-4" />
      </main>

      {/* 하단 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 p-4 border-t" style={{ backgroundColor: theme.bgCard, borderColor: theme.border }}>
        <div className="max-w-[640px] mx-auto">
          {isOwner ? (
            <Link href={`/shop/groupbuy/${groupBuy.id}`} className="block w-full py-4 rounded-xl text-center font-bold" style={{ backgroundColor: theme.accent, color: isDark ? '#121212' : '#fff' }}>
              참여현황 관리
            </Link>
          ) : alreadyJoined ? (
  <div className="flex gap-2">
    <button disabled className="flex-1 py-4 rounded-xl font-bold text-sm" style={{ backgroundColor: theme.bgInput, color: theme.textMuted }}>
      이미 참여한 공구예요
    </button>
    <Link 
      href="/mypage/groupbuys" 
      className="px-4 py-4 rounded-xl font-bold text-sm whitespace-nowrap"
      style={{ backgroundColor: theme.accent, color: isDark ? '#121212' : '#fff' }}
    >
      주문현황
    </Link>
  </div>
          ) : remainingStock <= 0 ? (
            <button disabled className="w-full py-4 rounded-xl font-bold" style={{ backgroundColor: theme.bgInput, color: theme.textMuted }}>품절되었습니다</button>
          ) : (
            <button onClick={handleJoinClick} className="w-full py-4 rounded-xl font-bold" style={{ backgroundColor: theme.accent, color: isDark ? '#121212' : '#fff' }}>참여하기</button>
          )}
        </div>
      </div>

      {/* 참여 신청 모달 */}
      {showJoinModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowJoinModal(false)} />
          <div className="relative w-full max-w-[640px] rounded-t-2xl p-5 pb-8 max-h-[90vh] overflow-y-auto" style={{ backgroundColor: theme.bgCard }}>
            <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ backgroundColor: theme.border }} />
            <h3 className="text-lg font-bold mb-4" style={{ color: theme.textPrimary }}>참여 신청</h3>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{ color: theme.textSecondary }}>수량</label>
              <div className="flex items-center gap-3">
                <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.bgInput }}>
                  <Minus className="w-5 h-5" style={{ color: theme.textPrimary }} />
                </button>
                <span className="text-xl font-bold w-12 text-center" style={{ color: theme.textPrimary }}>{quantity}</span>
                <button onClick={() => setQuantity(q => Math.min(remainingStock, q + 1))} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.bgInput }}>
                  <Plus className="w-5 h-5" style={{ color: theme.textPrimary }} />
                </button>
              </div>
            </div>

            {/* 결제 금액 */}
            <div className="mb-4 p-4 rounded-xl" style={{ backgroundColor: theme.bgInput }}>
              <div className="flex justify-between items-center">
                <span style={{ color: theme.textSecondary }}>결제 금액</span>
                <span className="text-2xl font-bold" style={{ color: theme.accent }}>{(groupBuy.sale_price * quantity).toLocaleString()}원</span>
              </div>
            </div>

            {/* 입금 계좌 정보 */}
            {groupBuy.shop?.bank_name && (
              <div className="mb-4 p-4 rounded-xl" style={{ backgroundColor: '#78350F', border: '1px solid #92400E' }}>
                <p className="text-sm font-medium mb-2" style={{ color: '#FDE68A' }}>💳 입금 계좌</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-lg" style={{ color: '#FEF3C7' }}>{groupBuy.shop.bank_name} {groupBuy.shop.bank_account}</p>
                    <p className="text-sm" style={{ color: '#FDE68A' }}>예금주: {groupBuy.shop.bank_holder}</p>
                  </div>
                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText(`${groupBuy.shop.bank_name} ${groupBuy.shop.bank_account} ${groupBuy.shop.bank_holder}`);
                      alert('계좌 정보가 복사되었습니다');
                    }}
                    className="px-3 py-2 rounded-lg text-sm font-medium"
                    style={{ backgroundColor: '#FDE68A', color: '#78350F' }}
                  >
                    복사
                  </button>
                </div>
              </div>
            )}

            {/* 수령 방식 선택 */}
            {groupBuy.delivery_methods && groupBuy.delivery_methods.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2" style={{ color: theme.textSecondary }}>수령 방식</label>
                <div className="flex gap-2">
                  {groupBuy.delivery_methods.includes("pickup") && (
                    <button
                      onClick={() => setDeliveryMethod("pickup")}
                      className="flex-1 py-3 rounded-xl font-medium"
                      style={{
                        backgroundColor: deliveryMethod === "pickup" ? theme.accent : theme.bgInput,
                        color: deliveryMethod === "pickup" ? (isDark ? '#121212' : '#fff') : theme.textPrimary,
                        border: `2px solid ${deliveryMethod === "pickup" ? theme.accent : theme.border}`
                      }}
                    >
                      🏪 직접 픽업
                    </button>
                  )}
                  {groupBuy.delivery_methods.includes("delivery") && (
                    <button
                      onClick={() => setDeliveryMethod("delivery")}
                      className="flex-1 py-3 rounded-xl font-medium"
                      style={{
                        backgroundColor: deliveryMethod === "delivery" ? theme.accent : theme.bgInput,
                        color: deliveryMethod === "delivery" ? (isDark ? '#121212' : '#fff') : theme.textPrimary,
                        border: `2px solid ${deliveryMethod === "delivery" ? theme.accent : theme.border}`
                      }}
                    >
                      🚚 배달
                    </button>
                  )}
                </div>
                {deliveryMethod === "delivery" && (groupBuy.delivery_fee ?? 0) > 0 && (
                  <p className="text-xs mt-2" style={{ color: theme.textMuted }}>
                    배달비: {(groupBuy.delivery_fee ?? 0).toLocaleString()}원 (별도)
                  </p>
                )}
              </div>
            )}

            {/* 배달 주소 (배달 선택 시) */}
            {deliveryMethod === "delivery" && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2" style={{ color: theme.textSecondary }}>배달 주소</label>
                
                {/* 저장된 주소 선택 */}
                {savedAddresses.length > 0 && (
                  <div className="mb-2">
                    <button
                      onClick={() => setShowSavedAddresses(!showSavedAddresses)}
                      className="w-full px-4 py-3 rounded-xl text-left flex items-center justify-between"
                      style={{ backgroundColor: theme.bgInput, border: `1px solid ${theme.border}` }}
                    >
                      <span className="text-sm" style={{ color: theme.textSecondary }}>저장된 주소에서 선택</span>
                      {showSavedAddresses ? <ChevronUp className="w-4 h-4" style={{ color: theme.textMuted }} /> : <ChevronDown className="w-4 h-4" style={{ color: theme.textMuted }} />}
                    </button>
                    {showSavedAddresses && (
                      <div className="mt-2 rounded-xl overflow-hidden" style={{ border: `1px solid ${theme.border}` }}>
                        {savedAddresses.map((addr, idx) => (
                          <button
                            key={addr.id}
                            onClick={() => selectSavedAddress(addr)}
                            className="w-full px-4 py-3 text-left"
                            style={{ 
                              backgroundColor: theme.bgInput,
                              borderBottom: idx < savedAddresses.length - 1 ? `1px solid ${theme.border}` : 'none'
                            }}
                          >
                            <p className="text-sm font-medium" style={{ color: theme.textPrimary }}>{addr.address}</p>
                            {addr.address_detail && (
                              <p className="text-xs" style={{ color: theme.textMuted }}>{addr.address_detail}</p>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 주소 검색 */}
                <div className="flex gap-2 mb-2">
                  <input 
                    type="text" 
                    value={deliveryAddress} 
                    readOnly
                    placeholder="주소를 검색하세요" 
                    className="flex-1 px-4 py-3 rounded-xl" 
                    style={{ backgroundColor: theme.bgInput, color: theme.textPrimary, border: `1px solid ${theme.border}` }} 
                  />
                  <button
                    onClick={openAddressSearch}
                    className="px-4 py-3 rounded-xl font-medium flex items-center gap-1"
                    style={{ backgroundColor: theme.accent, color: isDark ? '#121212' : '#fff' }}
                  >
                    <Search className="w-4 h-4" />
                    검색
                  </button>
                </div>

                {/* 상세 주소 */}
                {deliveryAddress && (
                  <input 
                    type="text" 
                    value={deliveryAddressDetail} 
                    onChange={(e) => setDeliveryAddressDetail(e.target.value)} 
                    placeholder="상세주소 (동/호수)" 
                    className="w-full px-4 py-3 rounded-xl mb-2" 
                    style={{ backgroundColor: theme.bgInput, color: theme.textPrimary, border: `1px solid ${theme.border}` }} 
                  />
                )}

                {/* 주소 저장 체크박스 */}
                {deliveryAddress && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={saveAddress}
                      onChange={(e) => setSaveAddress(e.target.checked)}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm" style={{ color: theme.textSecondary }}>이 주소 저장하기</span>
                  </label>
                )}
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{ color: theme.textSecondary }}>이름</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="이름을 입력하세요" className="w-full px-4 py-3 rounded-xl" style={{ backgroundColor: theme.bgInput, color: theme.textPrimary, border: `1px solid ${theme.border}` }} />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2" style={{ color: theme.textSecondary }}>연락처</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="010-0000-0000" className="w-full px-4 py-3 rounded-xl" style={{ backgroundColor: theme.bgInput, color: theme.textPrimary, border: `1px solid ${theme.border}` }} />
            </div>

            <button onClick={handleSubmitJoin} disabled={submitting} className="w-full py-4 rounded-xl font-bold" style={{ backgroundColor: submitting ? theme.textMuted : theme.accent, color: isDark ? '#121212' : '#fff' }}>
              {submitting ? "신청 중..." : "신청하기"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
