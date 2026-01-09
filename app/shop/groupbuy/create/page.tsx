"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function GroupBuyCreatePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [shop, setShop] = useState<any>(null);

  // 폼 데이터
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [minQuantity, setMinQuantity] = useState("10");
  const [maxQuantity, setMaxQuantity] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("18:00");
  const [pickupDate, setPickupDate] = useState("");
  const [pickupStartTime, setPickupStartTime] = useState("14:00");
  const [pickupEndTime, setPickupEndTime] = useState("18:00");
  const [pickupLocation, setPickupLocation] = useState("");

  // 이미지
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");

  useEffect(() => {
    checkShop();
  }, []);

  const checkShop = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert("로그인이 필요합니다");
      router.push("/login");
      return;
    }

    const { data: shopData } = await supabase
      .from("shops")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!shopData) {
      alert("등록된 상점이 없습니다");
      router.push("/shop/register");
      return;
    }

    if (shopData.approval_status !== "approved") {
      alert("상점 승인 후 공동구매를 등록할 수 있습니다");
      router.push("/shop/dashboard");
      return;
    }

    setShop(shopData);
    setPickupLocation(shopData.address || "");
    setLoading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const formatPrice = (value: string) => {
    const numbers = value.replace(/[^0-9]/g, '');
    return numbers ? parseInt(numbers).toLocaleString() : '';
  };

  const parsePrice = (formatted: string) => {
    return parseInt(formatted.replace(/,/g, '')) || 0;
  };

  const uploadImage = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `groupbuys/${fileName}`;

    const { error } = await supabase.storage
      .from("shops")
      .upload(filePath, file);

    if (error) throw error;

    const { data } = supabase.storage.from("shops").getPublicUrl(filePath);
    return data.publicUrl;
  };

  const validate = () => {
    if (!title.trim()) { alert("상품명을 입력해주세요"); return false; }
    if (!originalPrice) { alert("원가를 입력해주세요"); return false; }
    if (!salePrice) { alert("판매가를 입력해주세요"); return false; }
    if (parsePrice(salePrice) >= parsePrice(originalPrice)) {
      alert("판매가는 원가보다 낮아야 합니다");
      return false;
    }
    if (!minQuantity || parseInt(minQuantity) < 1) { alert("최소 수량을 입력해주세요"); return false; }
    if (!endDate) { alert("마감일을 선택해주세요"); return false; }
    if (!pickupDate) { alert("픽업일을 선택해주세요"); return false; }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setSubmitting(true);

    try {
      let imageUrl = "";
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      const endAt = new Date(`${endDate}T${endTime}`).toISOString();

      const { error } = await supabase.from("group_buys").insert({
        shop_id: shop.id,
        title,
        description,
        original_price: parsePrice(originalPrice),
        sale_price: parsePrice(salePrice),
        min_quantity: parseInt(minQuantity),
        max_quantity: maxQuantity ? parseInt(maxQuantity) : null,
        current_quantity: 0,
        end_at: endAt,
        pickup_date: pickupDate,
        pickup_start_time: pickupStartTime,
        pickup_end_time: pickupEndTime,
        pickup_location: pickupLocation || shop.address,
        image_url: imageUrl,
        status: "active",
      });

      if (error) throw error;

      alert("공동구매가 등록되었습니다!");
      router.push("/shop/dashboard");
    } catch (error: any) {
      alert("오류가 발생했습니다: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const discountPercent = originalPrice && salePrice
    ? Math.round((1 - parsePrice(salePrice) / parsePrice(originalPrice)) * 100)
    : 0;

  // 오늘 날짜 (최소 선택 가능 날짜)
  const today = new Date().toISOString().split('T')[0];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#19643D] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

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
          <span className="text-white font-bold text-lg">공동구매 등록</span>
          <div className="w-10" />
        </div>
      </header>

      <main className="pt-14 pb-32 max-w-[640px] mx-auto">
        <div className="px-5 py-6 space-y-6">
          {/* 상품 이미지 */}
          <div>
            <label className="block text-sm font-bold text-[#19643D] mb-2">상품 이미지</label>
            <div 
              onClick={() => document.getElementById("image-input")?.click()}
              className="relative aspect-[16/9] bg-white rounded-2xl overflow-hidden cursor-pointer border-2 border-dashed border-[#19643D]/30 hover:border-[#19643D] transition-colors"
            >
              {imagePreview ? (
                <img src={imagePreview} alt="상품 이미지" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-[#19643D]/40">
                  <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="font-medium">상품 사진 추가</p>
                  <p className="text-sm mt-1">클릭하여 업로드</p>
                </div>
              )}
            </div>
            <input
              id="image-input"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* 상품명 */}
          <div>
            <label className="block text-sm font-bold text-[#19643D] mb-2">
              상품명 <span className="text-[#DA451F]">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: [반값 특가] 후라이드치킨 + 콜라 1.25L"
              className="w-full px-4 py-3.5 bg-white border border-[#19643D]/20 rounded-xl text-[#19643D] placeholder-[#19643D]/40 focus:outline-none focus:ring-2 focus:ring-[#19643D]/30"
            />
          </div>

          {/* 상품 설명 */}
          <div>
            <label className="block text-sm font-bold text-[#19643D] mb-2">상품 설명</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="상품에 대한 상세 설명을 입력해주세요"
              rows={4}
              className="w-full px-4 py-3.5 bg-white border border-[#19643D]/20 rounded-xl text-[#19643D] placeholder-[#19643D]/40 focus:outline-none focus:ring-2 focus:ring-[#19643D]/30 resize-none"
            />
          </div>

          {/* 가격 */}
          <div className="bg-white rounded-2xl p-5 border border-[#19643D]/10">
            <h3 className="font-bold text-[#19643D] mb-4">💰 가격 설정</h3>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-[#19643D]/70 mb-2">
                  원가 <span className="text-[#DA451F]">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={originalPrice}
                    onChange={(e) => setOriginalPrice(formatPrice(e.target.value))}
                    placeholder="20,000"
                    className="w-full px-4 py-3 pr-10 bg-[#FDFBF7] border border-[#19643D]/20 rounded-xl text-[#19643D] placeholder-[#19643D]/40 focus:outline-none focus:ring-2 focus:ring-[#19643D]/30 text-right"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#19643D]/50">원</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#19643D]/70 mb-2">
                  판매가 <span className="text-[#DA451F]">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={salePrice}
                    onChange={(e) => setSalePrice(formatPrice(e.target.value))}
                    placeholder="15,000"
                    className="w-full px-4 py-3 pr-10 bg-[#FDFBF7] border border-[#19643D]/20 rounded-xl text-[#19643D] placeholder-[#19643D]/40 focus:outline-none focus:ring-2 focus:ring-[#19643D]/30 text-right"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#19643D]/50">원</span>
                </div>
              </div>
            </div>

            {discountPercent > 0 && (
              <div className="bg-[#DA451F]/10 rounded-xl p-3 flex items-center justify-between">
                <span className="text-sm text-[#DA451F]/70">할인율</span>
                <span className="text-xl font-black text-[#DA451F]">{discountPercent}% 할인</span>
              </div>
            )}
          </div>

          {/* 수량 */}
          <div className="bg-white rounded-2xl p-5 border border-[#19643D]/10">
            <h3 className="font-bold text-[#19643D] mb-4">👥 참여 인원</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#19643D]/70 mb-2">
                  최소 인원 <span className="text-[#DA451F]">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={minQuantity}
                    onChange={(e) => setMinQuantity(e.target.value)}
                    min="1"
                    className="w-full px-4 py-3 pr-10 bg-[#FDFBF7] border border-[#19643D]/20 rounded-xl text-[#19643D] focus:outline-none focus:ring-2 focus:ring-[#19643D]/30 text-right"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#19643D]/50">명</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#19643D]/70 mb-2">최대 인원</label>
                <div className="relative">
                  <input
                    type="number"
                    value={maxQuantity}
                    onChange={(e) => setMaxQuantity(e.target.value)}
                    placeholder="제한없음"
                    min="1"
                    className="w-full px-4 py-3 pr-10 bg-[#FDFBF7] border border-[#19643D]/20 rounded-xl text-[#19643D] placeholder-[#19643D]/40 focus:outline-none focus:ring-2 focus:ring-[#19643D]/30 text-right"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#19643D]/50">명</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-[#19643D]/50 mt-3">
              * 최소 인원이 모여야 공동구매가 확정됩니다
            </p>
          </div>

          {/* 마감일시 */}
          <div className="bg-white rounded-2xl p-5 border border-[#19643D]/10">
            <h3 className="font-bold text-[#19643D] mb-4">⏰ 모집 마감</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#19643D]/70 mb-2">
                  마감일 <span className="text-[#DA451F]">*</span>
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={today}
                  className="w-full px-4 py-3 bg-[#FDFBF7] border border-[#19643D]/20 rounded-xl text-[#19643D] focus:outline-none focus:ring-2 focus:ring-[#19643D]/30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#19643D]/70 mb-2">마감시간</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-4 py-3 bg-[#FDFBF7] border border-[#19643D]/20 rounded-xl text-[#19643D] focus:outline-none focus:ring-2 focus:ring-[#19643D]/30"
                />
              </div>
            </div>
          </div>

          {/* 픽업 정보 */}
          <div className="bg-white rounded-2xl p-5 border border-[#19643D]/10">
            <h3 className="font-bold text-[#19643D] mb-4">📍 픽업 정보</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#19643D]/70 mb-2">
                  픽업일 <span className="text-[#DA451F]">*</span>
                </label>
                <input
                  type="date"
                  value={pickupDate}
                  onChange={(e) => setPickupDate(e.target.value)}
                  min={endDate || today}
                  className="w-full px-4 py-3 bg-[#FDFBF7] border border-[#19643D]/20 rounded-xl text-[#19643D] focus:outline-none focus:ring-2 focus:ring-[#19643D]/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#19643D]/70 mb-2">시작 시간</label>
                  <input
                    type="time"
                    value={pickupStartTime}
                    onChange={(e) => setPickupStartTime(e.target.value)}
                    className="w-full px-4 py-3 bg-[#FDFBF7] border border-[#19643D]/20 rounded-xl text-[#19643D] focus:outline-none focus:ring-2 focus:ring-[#19643D]/30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#19643D]/70 mb-2">종료 시간</label>
                  <input
                    type="time"
                    value={pickupEndTime}
                    onChange={(e) => setPickupEndTime(e.target.value)}
                    className="w-full px-4 py-3 bg-[#FDFBF7] border border-[#19643D]/20 rounded-xl text-[#19643D] focus:outline-none focus:ring-2 focus:ring-[#19643D]/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#19643D]/70 mb-2">픽업 장소</label>
                <input
                  type="text"
                  value={pickupLocation}
                  onChange={(e) => setPickupLocation(e.target.value)}
                  placeholder="매장 주소와 다르면 입력"
                  className="w-full px-4 py-3 bg-[#FDFBF7] border border-[#19643D]/20 rounded-xl text-[#19643D] placeholder-[#19643D]/40 focus:outline-none focus:ring-2 focus:ring-[#19643D]/30"
                />
                <p className="text-xs text-[#19643D]/50 mt-2">
                  비워두면 상점 주소로 표시됩니다
                </p>
              </div>
            </div>
          </div>

          {/* 미리보기 */}
          {title && salePrice && (
            <div className="bg-[#19643D] rounded-2xl p-5 text-white">
              <p className="text-sm text-[#F2D38D]/80 mb-2">📱 미리보기</p>
              <h4 className="font-bold text-lg mb-2">{title}</h4>
              <div className="flex items-baseline gap-2">
                {originalPrice && (
                  <span className="text-sm text-white/50 line-through">
                    {originalPrice}원
                  </span>
                )}
                <span className="text-2xl font-black text-[#F2D38D]">{salePrice}원</span>
                {discountPercent > 0 && (
                  <span className="text-sm text-[#DA451F] font-bold bg-white/20 px-2 py-0.5 rounded">
                    {discountPercent}%
                  </span>
                )}
              </div>
              <p className="text-sm text-white/70 mt-2">
                최소 {minQuantity}명 • {endDate ? `${endDate} ${endTime} 마감` : "마감일 미정"}
              </p>
            </div>
          )}
        </div>
      </main>

      {/* 하단 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-[#19643D]/10">
        <div className="max-w-[640px] mx-auto px-5 py-4">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full h-14 bg-[#DA451F] hover:bg-[#c23d1b] disabled:bg-gray-300 text-white font-bold text-lg rounded-2xl transition-colors shadow-lg shadow-[#DA451F]/20"
          >
            {submitting ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>등록 중...</span>
              </div>
            ) : (
              "공동구매 등록하기"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
