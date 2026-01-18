"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/contexts/ThemeContext";
import { ArrowLeft, Home, Users, MapPin, Clock, ChevronLeft, ChevronRight, Minus, Plus, Check } from "lucide-react";

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
  shop: {
    id: number;
    name: string;
    user_id: string;
    logo_url?: string;
  };
}

// 이미지 슬라이더 컴포넌트
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
    <div className="relative w-full aspect-square overflow-hidden bg-gray-100">
      <div className="w-full h-full" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
        <img src={images[currentIndex]} alt="" className="w-full h-full object-cover" />
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

  // 참여 신청 폼
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    fetchGroupBuy();
  }, [params.id, user]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const fetchGroupBuy = async () => {
    const { data, error } = await supabase
      .from("group_buys")
      .select("*, shop:shops(id, name, user_id, logo_url)")
      .eq("id", params.id)
      .single();

    if (error || !data) {
      alert("공구를 찾을 수 없습니다");
      router.back();
      return;
    }

    setGroupBuy(data);

    // 셀러 본인인지 확인
    if (user && data.shop?.user_id === user.id) {
      setIsOwner(true);
    }

    // 이미 참여했는지 확인
    if (user) {
      const { data: participation } = await supabase
        .from("group_buy_participants")
        .select("*")
        .eq("group_buy_id", params.id)
        .eq("user_id", user.id)
        .neq("status", "cancelled")
        .single();

      if (participation) {
        setAlreadyJoined(true);
        setMyParticipation(participation);
      }
    }

    setLoading(false);
  };

  const getTimeLeft = (endDate: string) => {
    const now = new Date().getTime();
    const end = new Date(endDate).getTime();
    const diff = end - now;

    if (diff <= 0) return "마감됨";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}일 ${hours}시간 남음`;
    if (hours > 0) return `${hours}시간 ${minutes}분 남음`;
    return `${minutes}분 남음`;
  };

  const getProgress = (current: number, min: number) => {
    return Math.min((current / min) * 100, 100);
  };

  const getDiscountPercent = (original: number, sale: number) => {
    return Math.round((1 - sale / original) * 100);
  };

  const formatPickupTime = () => {
    if (!groupBuy?.pickup_date) return null;
    const date = new Date(groupBuy.pickup_date);
    const dateStr = `${date.getMonth() + 1}월 ${date.getDate()}일`;
    const startTime = groupBuy.pickup_start_time?.slice(0, 5) || "";
    const endTime = groupBuy.pickup_end_time?.slice(0, 5) || "";
    return `${dateStr} ${startTime}~${endTime}`;
  };

  const handleJoinClick = () => {
    if (!user) {
      router.push("/login");
      return;
    }
    setShowJoinModal(true);
  };

  const handleSubmitJoin = async () => {
    if (!name.trim() || !phone.trim()) {
      alert("이름과 연락처를 입력해주세요");
      return;
    }

    setSubmitting(true);

    const { error } = await supabase.from("group_buy_participants").insert({
      group_buy_id: groupBuy?.id,
      user_id: user.id,
      name: name.trim(),
      phone: phone.trim(),
      quantity,
      status: "pending",
    });

    if (error) {
      alert("참여 신청에 실패했습니다");
      setSubmitting(false);
      return;
    }

    // current_quantity 증가
    await supabase
      .from("group_buys")
      .update({ current_quantity: (groupBuy?.current_quantity || 0) + quantity })
      .eq("id", groupBuy?.id);

    alert("참여 신청이 완료되었습니다!");
    setShowJoinModal(false);
    setAlreadyJoined(true);
    fetchGroupBuy();
    setSubmitting(false);
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending": return "입금 대기";
      case "paid": return "결제 완료";
      case "picked": return "수령 완료";
      case "cancelled": return "취소됨";
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "#F59E0B";
      case "paid": return theme.accent;
      case "picked": return "#10B981";
      case "cancelled": return "#EF4444";
      default: return theme.textMuted;
    }
  };

  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.bgMain }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: theme.accent }} />
      </div>
    );
  }

  if (!groupBuy) return null;

  const images = groupBuy.images || (groupBuy.image_url ? [groupBuy.image_url] : []);
  const progress = getProgress(groupBuy.current_quantity, groupBuy.min_quantity);
  const discountPercent = groupBuy.original_price ? getDiscountPercent(groupBuy.original_price, groupBuy.sale_price) : 0;

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: theme.bgMain }}>
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

      <main className="pt-14 max-w-[640px] mx-auto">
        {/* 이미지 슬라이더 */}
        {images.length > 0 ? (
          <ImageSlider images={images} />
        ) : (
          <div className="w-full aspect-square flex items-center justify-center" style={{ backgroundColor: theme.bgInput }}>
            <span className="text-6xl opacity-30">🛒</span>
          </div>
        )}

        {/* 상품 정보 */}
        <div className="p-4" style={{ backgroundColor: theme.bgCard }}>
          {/* 상점 정보 */}
          <div className="flex items-center gap-2 mb-3">
            {groupBuy.shop?.logo_url ? (
              <img src={groupBuy.shop.logo_url} alt="" className="w-6 h-6 rounded-full object-cover" />
            ) : (
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs" style={{ backgroundColor: theme.bgInput }}>🏪</div>
            )}
            <span className="text-sm" style={{ color: theme.textSecondary }}>{groupBuy.shop?.name}</span>
          </div>

          {/* 제목 */}
          <h2 className="text-xl font-bold mb-2" style={{ color: theme.textPrimary }}>{groupBuy.title}</h2>

          {/* 가격 */}
          <div className="flex items-baseline gap-2 mb-4">
            {discountPercent > 0 && (
              <span className="text-lg font-bold" style={{ color: theme.red }}>{discountPercent}%</span>
            )}
            <span className="text-2xl font-bold" style={{ color: theme.textPrimary }}>
              {groupBuy.sale_price.toLocaleString()}원
            </span>
            {groupBuy.original_price && (
              <span className="text-sm line-through" style={{ color: theme.textMuted }}>
                {groupBuy.original_price.toLocaleString()}원
              </span>
            )}
          </div>

          {/* 참여 현황 */}
          <div className="p-3 rounded-xl mb-4" style={{ backgroundColor: theme.bgInput }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4" style={{ color: theme.accent }} />
                <span className="text-sm font-medium" style={{ color: theme.textPrimary }}>참여 현황</span>
              </div>
              <span className="text-sm font-bold" style={{ color: progress >= 100 ? theme.accent : theme.textPrimary }}>
                {groupBuy.current_quantity} / {groupBuy.min_quantity}명
                {progress >= 100 && " 달성!"}
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: theme.border }}>
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${progress}%`, backgroundColor: progress >= 100 ? theme.accent : theme.red }}
              />
            </div>
          </div>

          {/* 마감 시간 */}
          {groupBuy.end_date && (
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4" style={{ color: theme.textMuted }} />
              <span className="text-sm" style={{ color: theme.textSecondary }}>{getTimeLeft(groupBuy.end_date)}</span>
            </div>
          )}

          {/* 픽업 정보 */}
          {(groupBuy.pickup_address || groupBuy.pickup_location) && (
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 mt-0.5" style={{ color: theme.textMuted }} />
              <div>
                <p className="text-sm" style={{ color: theme.textSecondary }}>
                  {formatPickupTime()}
                </p>
                <p className="text-sm" style={{ color: theme.textSecondary }}>
                  {groupBuy.pickup_address || groupBuy.pickup_location}
                  {groupBuy.pickup_address_detail && ` ${groupBuy.pickup_address_detail}`}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 상품 설명 */}
        {groupBuy.description && (
          <div className="mt-2 p-4" style={{ backgroundColor: theme.bgCard }}>
            <h3 className="font-bold mb-2" style={{ color: theme.textPrimary }}>상품 설명</h3>
            <p className="text-sm whitespace-pre-wrap" style={{ color: theme.textSecondary }}>{groupBuy.description}</p>
          </div>
        )}

        {/* 내 참여 현황 (이미 참여한 경우) */}
        {alreadyJoined && myParticipation && (
          <div className="mt-2 p-4" style={{ backgroundColor: theme.bgCard }}>
            <div className="flex items-center gap-2 mb-3">
              <Check className="w-5 h-5" style={{ color: theme.accent }} />
              <h3 className="font-bold" style={{ color: theme.textPrimary }}>참여 완료</h3>
            </div>
            <div className="p-3 rounded-xl" style={{ backgroundColor: theme.bgInput }}>
              <div className="flex justify-between mb-2">
                <span className="text-sm" style={{ color: theme.textMuted }}>수량</span>
                <span className="text-sm font-medium" style={{ color: theme.textPrimary }}>{myParticipation.quantity}개</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-sm" style={{ color: theme.textMuted }}>금액</span>
                <span className="text-sm font-medium" style={{ color: theme.textPrimary }}>
                  {(groupBuy.sale_price * myParticipation.quantity).toLocaleString()}원
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm" style={{ color: theme.textMuted }}>상태</span>
                <span className="text-sm font-bold" style={{ color: getStatusColor(myParticipation.status) }}>
                  {getStatusText(myParticipation.status)}
                </span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 하단 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 p-4 border-t" style={{ backgroundColor: theme.bgCard, borderColor: theme.border }}>
        <div className="max-w-[640px] mx-auto">
          {isOwner ? (
            // 셀러인 경우: 참여현황 관리 버튼
            <Link
              href={`/shop/groupbuy/${groupBuy.id}`}
              className="block w-full py-4 rounded-xl text-center font-bold"
              style={{ backgroundColor: theme.accent, color: isDark ? '#121212' : '#fff' }}
            >
              참여현황 관리 ({groupBuy.current_quantity}명)
            </Link>
          ) : alreadyJoined ? (
            // 이미 참여한 경우
            <button
              disabled
              className="w-full py-4 rounded-xl font-bold"
              style={{ backgroundColor: theme.bgInput, color: theme.textMuted }}
            >
              이미 참여한 공구입니다
            </button>
          ) : (
            // 일반 유저: 참여하기 버튼
            <button
              onClick={handleJoinClick}
              className="w-full py-4 rounded-xl font-bold"
              style={{ backgroundColor: theme.accent, color: isDark ? '#121212' : '#fff' }}
            >
              참여하기
            </button>
          )}
        </div>
      </div>

      {/* 참여 신청 모달 */}
      {showJoinModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowJoinModal(false)} />
          <div className="relative w-full max-w-[640px] rounded-t-2xl p-5 pb-8" style={{ backgroundColor: theme.bgCard }}>
            <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ backgroundColor: theme.border }} />
            <h3 className="text-lg font-bold mb-4" style={{ color: theme.textPrimary }}>참여 신청</h3>

            {/* 수량 선택 */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{ color: theme.textSecondary }}>수량</label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: theme.bgInput }}
                >
                  <Minus className="w-5 h-5" style={{ color: theme.textPrimary }} />
                </button>
                <span className="text-xl font-bold w-12 text-center" style={{ color: theme.textPrimary }}>{quantity}</span>
                <button
                  onClick={() => setQuantity(q => q + 1)}
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: theme.bgInput }}
                >
                  <Plus className="w-5 h-5" style={{ color: theme.textPrimary }} />
                </button>
                <span className="ml-auto text-lg font-bold" style={{ color: theme.textPrimary }}>
                  {(groupBuy.sale_price * quantity).toLocaleString()}원
                </span>
              </div>
            </div>

            {/* 이름 */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{ color: theme.textSecondary }}>이름</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="이름을 입력하세요"
                className="w-full px-4 py-3 rounded-xl"
                style={{ backgroundColor: theme.bgInput, color: theme.textPrimary, border: `1px solid ${theme.border}` }}
              />
            </div>

            {/* 연락처 */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2" style={{ color: theme.textSecondary }}>연락처</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="010-0000-0000"
                className="w-full px-4 py-3 rounded-xl"
                style={{ backgroundColor: theme.bgInput, color: theme.textPrimary, border: `1px solid ${theme.border}` }}
              />
            </div>

            {/* 신청 버튼 */}
            <button
              onClick={handleSubmitJoin}
              disabled={submitting}
              className="w-full py-4 rounded-xl font-bold"
              style={{ backgroundColor: submitting ? theme.textMuted : theme.accent, color: isDark ? '#121212' : '#fff' }}
            >
              {submitting ? "신청 중..." : "신청하기"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
