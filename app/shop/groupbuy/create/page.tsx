"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/contexts/ThemeContext";
import {
  ArrowLeft,
  Camera,
  X,
  Calendar,
  Clock,
  MapPin,
  Package,
  Wallet,
  Users,
  Info,
  ChevronDown,
  Plus,
  Check,
  AlertCircle,
  ImagePlus,
  Building,
} from "lucide-react";

// 한국 시중은행 목록
const BANKS = [
  { code: "004", name: "KB국민은행" },
  { code: "088", name: "신한은행" },
  { code: "020", name: "우리은행" },
  { code: "081", name: "하나은행" },
  { code: "011", name: "NH농협은행" },
  { code: "003", name: "IBK기업은행" },
  { code: "023", name: "SC제일은행" },
  { code: "027", name: "한국씨티은행" },
  { code: "031", name: "대구은행" },
  { code: "032", name: "부산은행" },
  { code: "034", name: "광주은행" },
  { code: "035", name: "제주은행" },
  { code: "037", name: "전북은행" },
  { code: "039", name: "경남은행" },
  { code: "045", name: "새마을금고" },
  { code: "048", name: "신협" },
  { code: "050", name: "저축은행" },
  { code: "071", name: "우체국" },
  { code: "089", name: "케이뱅크" },
  { code: "090", name: "카카오뱅크" },
  { code: "092", name: "토스뱅크" },
];

export default function GroupBuyCreatePage() {
  const router = useRouter();
  const { theme, isDark, mounted } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [shop, setShop] = useState<any>(null);
  const [step, setStep] = useState(1);

  // 폼 데이터
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
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
  
  // 계좌 정보 (분리)
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  // 수령/결제 방식
  const [deliveryMethods, setDeliveryMethods] = useState<string[]>(["pickup"]);
  const [paymentMethods, setPaymentMethods] = useState<string[]>(["cash"]);
  const [deliveryFee, setDeliveryFee] = useState("");
  // 이미지
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);

  const categories = [
    { value: "food", label: "식품", emoji: "🍱" },
    { value: "fruit", label: "과일/채소", emoji: "🍎" },
    { value: "meat", label: "정육/수산", emoji: "🥩" },
    { value: "bakery", label: "베이커리", emoji: "🥐" },
    { value: "daily", label: "생활용품", emoji: "🧴" },
    { value: "etc", label: "기타", emoji: "📦" },
  ];

  useEffect(() => {
    checkShop();
  }, []);

  // 마감일 변경 시 픽업일도 같이 설정
  useEffect(() => {
    if (endDate && !pickupDate) {
      setPickupDate(endDate);
    }
  }, [endDate]);

  const checkShop = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
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
    
    // 기존 계좌 정보 불러오기
    if (shopData.bank_name) {
      const bank = BANKS.find(b => b.name === shopData.bank_name);
      if (bank) setBankCode(bank.code);
    }
    if (shopData.bank_account) setAccountNumber(shopData.bank_account);
    if (shopData.bank_holder) setAccountHolder(shopData.bank_holder);
    
    setLoading(false);
  };

  const handleImageAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (images.length + files.length > 5) {
      alert("이미지는 최대 5장까지 등록 가능합니다");
      return;
    }

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages((prev) => [...prev, { file, preview: reader.result as string }]);
      };
      reader.readAsDataURL(file);
    });
    
    e.target.value = "";
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const formatPrice = (value: string) => {
    const numbers = value.replace(/[^0-9]/g, "");
    return numbers ? Number(numbers).toLocaleString() : "";
  };

  const parsePrice = (formatted: string) => {
    return formatted.replace(/[^0-9]/g, "");
  };

  const formatAccountNumber = (value: string) => {
    const numbers = value.replace(/[^0-9]/g, "");
    if (numbers.length <= 4) return numbers;
    if (numbers.length <= 8) return `${numbers.slice(0, 4)}-${numbers.slice(4)}`;
    if (numbers.length <= 12) return `${numbers.slice(0, 4)}-${numbers.slice(4, 8)}-${numbers.slice(8)}`;
    return `${numbers.slice(0, 4)}-${numbers.slice(4, 8)}-${numbers.slice(8, 12)}-${numbers.slice(12, 14)}`;
  };

  const handleAccountNumberChange = (value: string) => {
    const numbers = value.replace(/[^0-9]/g, "");
    if (numbers.length <= 14) {
      setAccountNumber(formatAccountNumber(numbers));
    }
  };

  const getDiscount = () => {
    const original = Number(parsePrice(originalPrice));
    const sale = Number(parsePrice(salePrice));
    if (!original || !sale || sale >= original) return 0;
    return Math.round(((original - sale) / original) * 100);
  };

  const validateStep = (currentStep: number) => {
    if (currentStep === 1) {
      if (!title.trim()) return "상품명을 입력해주세요";
      if (!category) return "카테고리를 선택해주세요";
      if (!description.trim()) return "상품 설명을 입력해주세요";
      if (images.length === 0) return "상품 이미지를 1장 이상 등록해주세요";
    }
    if (currentStep === 2) {
      if (!salePrice) return "판매가를 입력해주세요";
      if (!minQuantity) return "최소 인원을 입력해주세요";
      if (deliveryMethods.length === 0) return "수령 방식을 1개 이상 선택해주세요";
      if (paymentMethods.length === 0) return "결제 방식을 1개 이상 선택해주세요";
      if (paymentMethods.includes("cash")) {
        if (!bankCode) return "입금 은행을 선택해주세요";
        if (!accountNumber) return "계좌번호를 입력해주세요";
        if (!accountHolder) return "예금주를 입력해주세요";
      }
    }
    if (currentStep === 3) {
      if (!endDate) return "마감일을 선택해주세요";
      if (!pickupDate) return "픽업일을 선택해주세요";
      if (!pickupLocation.trim()) return "픽업 장소를 입력해주세요";
    }
    return null;
  };

  const nextStep = () => {
    const error = validateStep(step);
    if (error) {
      alert(error);
      return;
    }
    setStep((s) => Math.min(s + 1, 3));
  };

  const prevStep = () => {
    setStep((s) => Math.max(s - 1, 1));
  };

  const handleSubmit = async () => {
    const error = validateStep(3);
    if (error) {
      alert(error);
      return;
    }

    setSubmitting(true);

    try {
     // 이미지 업로드 (R2)
      let thumbnailUrl = "";
      const imageUrls: string[] = [];

      for (let i = 0; i < images.length; i++) {
        const file = images[i].file;
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', `groupbuy/${shop.id}`);

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const uploadData = await uploadRes.json();

        if (uploadData.success) {
          if (i === 0) thumbnailUrl = uploadData.url;
          imageUrls.push(uploadData.url);
        }
      }

      // 은행 정보 조합
      const selectedBank = BANKS.find(b => b.code === bankCode);
      const bankInfo = selectedBank 
        ? `${selectedBank.name} ${accountNumber} ${accountHolder}`
        : "";

      // DB 컬럼명에 정확히 맞춤
      const insertData: any = {
        shop_id: shop.id,
        title: title,
        description: description,
        category: category,
        
        // 가격 - DB 컬럼: original_price, sale_price, price
        original_price: originalPrice ? Number(parsePrice(originalPrice)) : null,
        sale_price: Number(parsePrice(salePrice)),
        price: Number(parsePrice(salePrice)), // price도 같이 저장
        
        // 인원 - DB 컬럼: min_quantity, max_quantity, goal_quantity, current_quantity
        min_quantity: Number(minQuantity),
        max_quantity: maxQuantity ? Number(maxQuantity) : null,
        goal_quantity: Number(minQuantity), // 목표 인원 = 최소 인원
        current_quantity: 0,
        
        // 날짜/시간 - DB 컬럼: end_at, end_date, pickup_date, pickup_time_start, pickup_time_end
        end_at: `${endDate}T${endTime}:00+09:00`,
        end_date: `${endDate}T${endTime}:00+09:00`,
        pickup_date: pickupDate,
        pickup_time_start: pickupStartTime,
        pickup_time_end: pickupEndTime,
        pickup_start_time: pickupStartTime,
        pickup_end_time: pickupEndTime,
        pickup_location: pickupLocation,
        
        // 이미지 - DB 컬럼: thumbnail_url, images, image_url, image_urls
        image_url: imageUrls[0] || "",
        images: imageUrls,
        image_urls: imageUrls,
        
        // 계좌 정보
        bank_info: bankInfo,
        
        // 상태
        status: "active",
        
        // 수령/결제 방식
        delivery_methods: deliveryMethods,
        payment_methods: paymentMethods,
        delivery_fee: deliveryFee ? Number(parsePrice(deliveryFee)) : 0,
        
        // 기타 기본값
        use_goal: true,
        use_min_quantity: true,
        use_timer: true,
        use_discount: getDiscount() > 0,
      };

      console.log("Insert data:", insertData);

      const { data, error: insertError } = await supabase
        .from("group_buys")
        .insert(insertData)
        .select()
        .single();

      if (insertError) {
        console.error("Insert error:", insertError);
        throw insertError;
      }

      alert("공동구매가 등록되었습니다!");
      router.push(`/shop/groupbuy/${data.id}`);
    } catch (error: any) {
      console.error("Error:", error);
      alert(`등록 중 오류가 발생했습니다: ${error.message || "알 수 없는 오류"}`);
    } finally {
      setSubmitting(false);
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
    <div className="min-h-screen pb-28 transition-colors duration-300" style={{ backgroundColor: theme.bgMain }}>
      {/* 헤더 */}
      <header 
        className="sticky top-0 z-50 px-4 py-3 flex items-center gap-3"
        style={{ backgroundColor: theme.bgMain, borderBottom: `1px solid ${theme.borderLight}` }}
      >
        <button onClick={() => router.back()} className="p-2 -ml-2 rounded-xl transition-colors" style={{ color: theme.textPrimary }}>
          <ArrowLeft className="w-6 h-6" strokeWidth={1.5} />
        </button>
        <h1 className="text-lg font-bold" style={{ color: theme.textPrimary }}>공동구매 등록</h1>
      </header>

      {/* 스텝 인디케이터 */}
      <div className="max-w-[640px] mx-auto px-4 py-4">
        <div className="flex items-center justify-center gap-2 mb-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all"
                style={{
                  backgroundColor: step >= s ? theme.accent : theme.bgInput,
                  color: step >= s ? (isDark ? '#121212' : '#FFFFFF') : theme.textMuted,
                }}
              >
                {step > s ? <Check className="w-4 h-4" strokeWidth={2.5} /> : s}
              </div>
              {s < 3 && (
                <div 
                  className="w-12 sm:w-16 h-1 mx-1 rounded-full transition-all"
                  style={{ backgroundColor: step > s ? theme.accent : theme.bgInput }}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-center gap-8 text-[11px]" style={{ color: theme.textMuted }}>
          <span className={step >= 1 ? "font-semibold" : ""} style={{ color: step >= 1 ? theme.accent : theme.textMuted }}>기본정보</span>
          <span className={step >= 2 ? "font-semibold" : ""} style={{ color: step >= 2 ? theme.accent : theme.textMuted }}>가격/수량</span>
          <span className={step >= 3 ? "font-semibold" : ""} style={{ color: step >= 3 ? theme.accent : theme.textMuted }}>일정설정</span>
        </div>
      </div>

      <main className="max-w-[640px] mx-auto px-4">
        {/* Step 1: 기본정보 */}
        {step === 1 && (
          <div className="space-y-5">
            {/* 이미지 업로드 */}
            <div 
              className="rounded-2xl p-5"
              style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Camera className="w-5 h-5" style={{ color: theme.accent }} strokeWidth={1.5} />
                <span className="font-semibold" style={{ color: theme.textPrimary }}>상품 이미지</span>
                <span className="text-xs ml-auto" style={{ color: theme.textMuted }}>{images.length}/5</span>
              </div>

              <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-24 h-24 rounded-xl flex flex-col items-center justify-center gap-1 flex-shrink-0 transition-colors"
                  style={{ backgroundColor: theme.bgInput, border: `2px dashed ${theme.border}` }}
                >
                  <ImagePlus className="w-6 h-6" style={{ color: theme.accent }} strokeWidth={1.5} />
                  <span className="text-[11px]" style={{ color: theme.textMuted }}>사진 추가</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageAdd}
                  className="hidden"
                />

                {images.map((img, index) => (
                  <div key={index} className="relative w-24 h-24 flex-shrink-0 group">
                    <img
                      src={img.preview}
                      alt=""
                      className="w-full h-full object-cover rounded-xl"
                    />
                    {index === 0 && (
                      <span 
                        className="absolute bottom-1 left-1 text-[10px] font-bold px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: theme.accent, color: isDark ? '#121212' : '#FFFFFF' }}
                      >
                        대표
                      </span>
                    )}
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center shadow-lg"
                      style={{ backgroundColor: theme.red, color: '#FFFFFF' }}
                    >
                      <X className="w-4 h-4" strokeWidth={2.5} />
                    </button>
                  </div>
                ))}
              </div>

              {images.length === 0 && (
                <p className="text-xs text-center mt-3" style={{ color: theme.red }}>
                  <AlertCircle className="w-3 h-3 inline mr-1" />
                  상품 이미지를 1장 이상 등록해주세요
                </p>
              )}
            </div>

            {/* 상품명 */}
            <div 
              className="rounded-2xl p-5"
              style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}
            >
              <label className="block font-semibold mb-3" style={{ color: theme.textPrimary }}>
                상품명 <span style={{ color: theme.red }}>*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 국내산 한돈 삼겹살 1kg"
                maxLength={50}
                className="w-full px-4 py-3 rounded-xl text-[15px] outline-none transition-all"
                style={{ 
                  backgroundColor: theme.bgInput, 
                  border: `1px solid ${theme.border}`,
                  color: theme.textPrimary,
                }}
              />
              <p className="text-right text-xs mt-2" style={{ color: theme.textMuted }}>
                {title.length}/50
              </p>
            </div>

            {/* 카테고리 */}
            <div 
              className="rounded-2xl p-5"
              style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}
            >
              <label className="block font-semibold mb-3" style={{ color: theme.textPrimary }}>
                카테고리 <span style={{ color: theme.red }}>*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => setCategory(cat.value)}
                    className="py-3 rounded-xl text-sm font-medium transition-all"
                    style={{
                      backgroundColor: category === cat.value ? theme.accent : theme.bgInput,
                      color: category === cat.value ? (isDark ? '#121212' : '#FFFFFF') : theme.textSecondary,
                      border: `1px solid ${category === cat.value ? theme.accent : theme.border}`,
                    }}
                  >
                    <span className="mr-1">{cat.emoji}</span>
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 상품 설명 */}
            <div 
              className="rounded-2xl p-5"
              style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}
            >
              <label className="block font-semibold mb-3" style={{ color: theme.textPrimary }}>
                상품 설명 <span style={{ color: theme.red }}>*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="상품의 특징, 원산지, 보관방법 등을 자세히 적어주세요"
                rows={5}
                className="w-full px-4 py-3 rounded-xl text-[15px] outline-none resize-none transition-all"
                style={{ 
                  backgroundColor: theme.bgInput, 
                  border: `1px solid ${theme.border}`,
                  color: theme.textPrimary,
                }}
              />
            </div>
          </div>
        )}

        {/* Step 2: 가격/수량 */}
        {step === 2 && (
          <div className="space-y-5">
            {/* 가격 설정 */}
            <div 
              className="rounded-2xl p-5"
              style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Wallet className="w-5 h-5" style={{ color: theme.accent }} strokeWidth={1.5} />
                <span className="font-semibold" style={{ color: theme.textPrimary }}>가격 설정</span>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm mb-2" style={{ color: theme.textSecondary }}>
                    정가 (선택)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={originalPrice}
                      onChange={(e) => setOriginalPrice(formatPrice(e.target.value))}
                      placeholder="0"
                      className="w-full px-4 py-3 pr-12 rounded-xl text-[15px] outline-none transition-all"
                      style={{ 
                        backgroundColor: theme.bgInput, 
                        border: `1px solid ${theme.border}`,
                        color: theme.textPrimary,
                      }}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm" style={{ color: theme.textMuted }}>원</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm mb-2" style={{ color: theme.textSecondary }}>
                    판매가 <span style={{ color: theme.red }}>*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={salePrice}
                      onChange={(e) => setSalePrice(formatPrice(e.target.value))}
                      placeholder="0"
                      className="w-full px-4 py-3 pr-12 rounded-xl text-[15px] outline-none transition-all"
                      style={{ 
                        backgroundColor: theme.bgInput, 
                        border: `1px solid ${theme.border}`,
                        color: theme.textPrimary,
                      }}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm" style={{ color: theme.textMuted }}>원</span>
                  </div>
                </div>

                {getDiscount() > 0 && (
                  <div 
                    className="flex items-center justify-between p-3 rounded-xl"
                    style={{ backgroundColor: theme.redBg }}
                  >
                    <span className="text-sm" style={{ color: theme.textSecondary }}>할인율</span>
                    <span className="text-lg font-bold" style={{ color: theme.red }}>{getDiscount()}% OFF</span>
                  </div>
                )}
              </div>
            </div>

            {/* 인원 설정 */}
            <div 
              className="rounded-2xl p-5"
              style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5" style={{ color: theme.accent }} strokeWidth={1.5} />
                <span className="font-semibold" style={{ color: theme.textPrimary }}>참여 인원</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2" style={{ color: theme.textSecondary }}>
                    최소 인원 <span style={{ color: theme.red }}>*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={minQuantity}
                      onChange={(e) => setMinQuantity(e.target.value)}
                      placeholder="10"
                      min="1"
                      className="w-full px-4 py-3 pr-12 rounded-xl text-[15px] outline-none transition-all"
                      style={{ 
                        backgroundColor: theme.bgInput, 
                        border: `1px solid ${theme.border}`,
                        color: theme.textPrimary,
                      }}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm" style={{ color: theme.textMuted }}>명</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm mb-2" style={{ color: theme.textSecondary }}>
                    최대 인원 (선택)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={maxQuantity}
                      onChange={(e) => setMaxQuantity(e.target.value)}
                      placeholder="무제한"
                      min="1"
                      className="w-full px-4 py-3 pr-12 rounded-xl text-[15px] outline-none transition-all"
                      style={{ 
                        backgroundColor: theme.bgInput, 
                        border: `1px solid ${theme.border}`,
                        color: theme.textPrimary,
                      }}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm" style={{ color: theme.textMuted }}>명</span>
                  </div>
                </div>
              </div>

              <p className="text-xs mt-3" style={{ color: theme.textMuted }}>
                <Info className="w-3 h-3 inline mr-1" />
                최소 인원 미달 시 공동구매가 자동 취소됩니다
              </p>
            </div>

{/* 수령 방식 */}
            <div 
              className="rounded-2xl p-5"
              style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Package className="w-5 h-5" style={{ color: theme.accent }} strokeWidth={1.5} />
                <span className="font-semibold" style={{ color: theme.textPrimary }}>수령 방식</span>
              </div>

              <div className="space-y-3">
                <label 
                  className="flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all"
                  style={{ 
                    backgroundColor: deliveryMethods.includes("pickup") ? `${theme.accent}20` : theme.bgInput,
                    border: `2px solid ${deliveryMethods.includes("pickup") ? theme.accent : theme.border}`
                  }}
                >
                  <input
                    type="checkbox"
                    checked={deliveryMethods.includes("pickup")}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setDeliveryMethods([...deliveryMethods, "pickup"]);
                      } else {
                        setDeliveryMethods(deliveryMethods.filter(m => m !== "pickup"));
                      }
                    }}
                    className="hidden"
                  />
                  <div 
                    className="w-6 h-6 rounded-md flex items-center justify-center"
                    style={{ 
                      backgroundColor: deliveryMethods.includes("pickup") ? theme.accent : theme.bgInput,
                      border: `2px solid ${deliveryMethods.includes("pickup") ? theme.accent : theme.border}`
                    }}
                  >
                    {deliveryMethods.includes("pickup") && <Check className="w-4 h-4" style={{ color: isDark ? '#121212' : '#fff' }} />}
                  </div>
                  <div>
                    <p className="font-medium" style={{ color: theme.textPrimary }}>매장 픽업</p>
                    <p className="text-xs" style={{ color: theme.textMuted }}>고객이 직접 매장에서 수령</p>
                  </div>
                </label>

                <label 
                  className="flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all"
                  style={{ 
                    backgroundColor: deliveryMethods.includes("delivery") ? `${theme.accent}20` : theme.bgInput,
                    border: `2px solid ${deliveryMethods.includes("delivery") ? theme.accent : theme.border}`
                  }}
                >
                  <input
                    type="checkbox"
                    checked={deliveryMethods.includes("delivery")}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setDeliveryMethods([...deliveryMethods, "delivery"]);
                      } else {
                        setDeliveryMethods(deliveryMethods.filter(m => m !== "delivery"));
                      }
                    }}
                    className="hidden"
                  />
                  <div 
                    className="w-6 h-6 rounded-md flex items-center justify-center"
                    style={{ 
                      backgroundColor: deliveryMethods.includes("delivery") ? theme.accent : theme.bgInput,
                      border: `2px solid ${deliveryMethods.includes("delivery") ? theme.accent : theme.border}`
                    }}
                  >
                    {deliveryMethods.includes("delivery") && <Check className="w-4 h-4" style={{ color: isDark ? '#121212' : '#fff' }} />}
                  </div>
                  <div>
                    <p className="font-medium" style={{ color: theme.textPrimary }}>배달</p>
                    <p className="text-xs" style={{ color: theme.textMuted }}>고객 주소로 직접 배달</p>
                  </div>
                </label>

                {deliveryMethods.includes("delivery") && (
                  <div className="mt-3">
                    <label className="block text-sm mb-2" style={{ color: theme.textSecondary }}>
                      배달비
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={deliveryFee}
                        onChange={(e) => setDeliveryFee(formatPrice(e.target.value))}
                        placeholder="0 (무료배달)"
                        className="w-full px-4 py-3 pr-12 rounded-xl text-[15px] outline-none transition-all"
                        style={{ 
                          backgroundColor: theme.bgInput, 
                          border: `1px solid ${theme.border}`,
                          color: theme.textPrimary,
                        }}
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm" style={{ color: theme.textMuted }}>원</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 결제 방식 */}
            <div 
              className="rounded-2xl p-5"
              style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Wallet className="w-5 h-5" style={{ color: theme.accent }} strokeWidth={1.5} />
                <span className="font-semibold" style={{ color: theme.textPrimary }}>결제 방식</span>
              </div>

              <div className="space-y-3">
                <label 
                  className="flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all"
                  style={{ 
                    backgroundColor: paymentMethods.includes("cash") ? `${theme.accent}20` : theme.bgInput,
                    border: `2px solid ${paymentMethods.includes("cash") ? theme.accent : theme.border}`
                  }}
                >
                  <input
                    type="checkbox"
                    checked={paymentMethods.includes("cash")}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setPaymentMethods([...paymentMethods, "cash"]);
                      } else {
                        setPaymentMethods(paymentMethods.filter(m => m !== "cash"));
                      }
                    }}
                    className="hidden"
                  />
                  <div 
                    className="w-6 h-6 rounded-md flex items-center justify-center"
                    style={{ 
                      backgroundColor: paymentMethods.includes("cash") ? theme.accent : theme.bgInput,
                      border: `2px solid ${paymentMethods.includes("cash") ? theme.accent : theme.border}`
                    }}
                  >
                    {paymentMethods.includes("cash") && <Check className="w-4 h-4" style={{ color: isDark ? '#121212' : '#fff' }} />}
                  </div>
                  <div>
                    <p className="font-medium" style={{ color: theme.textPrimary }}>계좌이체 (현금)</p>
                    <p className="text-xs" style={{ color: theme.textMuted }}>고객이 직접 계좌로 입금</p>
                  </div>
                </label>

                {/* 프리미엄 등급만 카드 결제 가능 */}
                {shop?.tier !== 'basic' && (
                <label 
                  className="flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all"
                  style={{ 
                    backgroundColor: paymentMethods.includes("card") ? `${theme.accent}20` : theme.bgInput,
                    border: `2px solid ${paymentMethods.includes("card") ? theme.accent : theme.border}`
                  }}
                >
                  <input
                    type="checkbox"
                    checked={paymentMethods.includes("card")}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setPaymentMethods([...paymentMethods, "card"]);
                      } else {
                        setPaymentMethods(paymentMethods.filter(m => m !== "card"));
                      }
                    }}
                    className="hidden"
                  />
                  <div 
                    className="w-6 h-6 rounded-md flex items-center justify-center"
                    style={{ 
                      backgroundColor: paymentMethods.includes("card") ? theme.accent : theme.bgInput,
                      border: `2px solid ${paymentMethods.includes("card") ? theme.accent : theme.border}`
                    }}
                  >
                    {paymentMethods.includes("card") && <Check className="w-4 h-4" style={{ color: isDark ? '#121212' : '#fff' }} />}
                  </div>
                  <div>
                    <p className="font-medium" style={{ color: theme.textPrimary }}>카드 결제</p>
                    <p className="text-xs" style={{ color: theme.textMuted }}>카드/카카오페이/네이버페이</p>
                  </div>
                </label>
                )}
              </div>

              {paymentMethods.length === 0 && (
                <p className="text-xs mt-3" style={{ color: theme.red }}>
                  <AlertCircle className="w-3 h-3 inline mr-1" />
                  최소 1개 이상의 결제 방식을 선택해주세요
                </p>
              )}
            </div>

            {/* 입금 계좌 */}
            <div 
              className="rounded-2xl p-5"
              style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Building className="w-5 h-5" style={{ color: theme.accent }} strokeWidth={1.5} />
                <span className="font-semibold" style={{ color: theme.textPrimary }}>입금 계좌</span>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm mb-2" style={{ color: theme.textSecondary }}>
                    은행 <span style={{ color: theme.red }}>*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={bankCode}
                      onChange={(e) => setBankCode(e.target.value)}
                      className="w-full px-4 py-3 pr-10 rounded-xl text-[15px] outline-none transition-all appearance-none"
                      style={{ 
                        backgroundColor: theme.bgInput, 
                        border: `1px solid ${theme.border}`,
                        color: bankCode ? theme.textPrimary : theme.textMuted,
                      }}
                    >
                      <option value="">은행을 선택하세요</option>
                      {BANKS.map((bank) => (
                        <option key={bank.code} value={bank.code}>
                          {bank.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown 
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none" 
                      style={{ color: theme.textMuted }} 
                      strokeWidth={1.5}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm mb-2" style={{ color: theme.textSecondary }}>
                    계좌번호 <span style={{ color: theme.red }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => handleAccountNumberChange(e.target.value)}
                    placeholder="숫자만 입력 (자동으로 - 표시)"
                    className="w-full px-4 py-3 rounded-xl text-[15px] outline-none transition-all"
                    style={{ 
                      backgroundColor: theme.bgInput, 
                      border: `1px solid ${theme.border}`,
                      color: theme.textPrimary,
                    }}
                  />
                </div>

                <div>
                  <label className="block text-sm mb-2" style={{ color: theme.textSecondary }}>
                    예금주 <span style={{ color: theme.red }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={accountHolder}
                    onChange={(e) => setAccountHolder(e.target.value)}
                    placeholder="예금주 이름"
                    className="w-full px-4 py-3 rounded-xl text-[15px] outline-none transition-all"
                    style={{ 
                      backgroundColor: theme.bgInput, 
                      border: `1px solid ${theme.border}`,
                      color: theme.textPrimary,
                    }}
                  />
                </div>

                {bankCode && accountNumber && accountHolder && (
                  <div 
                    className="p-3 rounded-xl"
                    style={{ backgroundColor: theme.successBg }}
                  >
                    <p className="text-sm" style={{ color: theme.success }}>
                      ✓ {BANKS.find(b => b.code === bankCode)?.name} {accountNumber} {accountHolder}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: 일정 */}
        {step === 3 && (
          <div className="space-y-5">
            {/* 마감일 */}
            <div 
              className="rounded-2xl p-5"
              style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5" style={{ color: theme.accent }} strokeWidth={1.5} />
                <span className="font-semibold" style={{ color: theme.textPrimary }}>주문 마감</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2" style={{ color: theme.textSecondary }}>
                    마감일 <span style={{ color: theme.red }}>*</span>
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      if (!pickupDate || pickupDate < e.target.value) {
                        setPickupDate(e.target.value);
                      }
                    }}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full px-4 py-3 rounded-xl text-[15px] outline-none transition-all"
                    style={{ 
                      backgroundColor: theme.bgInput, 
                      border: `1px solid ${theme.border}`,
                      color: theme.textPrimary,
                    }}
                  />
                </div>

                <div>
                  <label className="block text-sm mb-2" style={{ color: theme.textSecondary }}>
                    마감시간
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl text-[15px] outline-none transition-all"
                    style={{ 
                      backgroundColor: theme.bgInput, 
                      border: `1px solid ${theme.border}`,
                      color: theme.textPrimary,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 픽업 일정 */}
            <div 
              className="rounded-2xl p-5"
              style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Package className="w-5 h-5" style={{ color: theme.accent }} strokeWidth={1.5} />
                <span className="font-semibold" style={{ color: theme.textPrimary }}>픽업 일정</span>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm mb-2" style={{ color: theme.textSecondary }}>
                    픽업일 <span style={{ color: theme.red }}>*</span>
                  </label>
                  <input
                    type="date"
                    value={pickupDate}
                    onChange={(e) => setPickupDate(e.target.value)}
                    min={endDate || new Date().toISOString().split("T")[0]}
                    className="w-full px-4 py-3 rounded-xl text-[15px] outline-none transition-all"
                    style={{ 
                      backgroundColor: theme.bgInput, 
                      border: `1px solid ${theme.border}`,
                      color: theme.textPrimary,
                    }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm mb-2" style={{ color: theme.textSecondary }}>
                      시작시간
                    </label>
                    <input
                      type="time"
                      value={pickupStartTime}
                      onChange={(e) => setPickupStartTime(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl text-[15px] outline-none transition-all"
                      style={{ 
                        backgroundColor: theme.bgInput, 
                        border: `1px solid ${theme.border}`,
                        color: theme.textPrimary,
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2" style={{ color: theme.textSecondary }}>
                      종료시간
                    </label>
                    <input
                      type="time"
                      value={pickupEndTime}
                      onChange={(e) => setPickupEndTime(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl text-[15px] outline-none transition-all"
                      style={{ 
                        backgroundColor: theme.bgInput, 
                        border: `1px solid ${theme.border}`,
                        color: theme.textPrimary,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 픽업 장소 */}
            <div 
              className="rounded-2xl p-5"
              style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}
            >
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5" style={{ color: theme.accent }} strokeWidth={1.5} />
                <span className="font-semibold" style={{ color: theme.textPrimary }}>픽업 장소</span>
              </div>

              <input
                type="text"
                value={pickupLocation}
                onChange={(e) => setPickupLocation(e.target.value)}
                placeholder="픽업 장소를 입력하세요"
                className="w-full px-4 py-3 rounded-xl text-[15px] outline-none transition-all"
                style={{ 
                  backgroundColor: theme.bgInput, 
                  border: `1px solid ${theme.border}`,
                  color: theme.textPrimary,
                }}
              />
            </div>

            {/* 등록 전 확인 */}
            <div 
              className="rounded-2xl p-5"
              style={{ backgroundColor: `${theme.accent}15`, border: `1px solid ${theme.accent}30` }}
            >
              <h4 className="font-semibold mb-3" style={{ color: theme.accent }}>📋 등록 전 확인</h4>
              <ul className="space-y-2 text-sm" style={{ color: theme.textSecondary }}>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: theme.accent }} />
                  상품명: {title}
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: theme.accent }} />
                  판매가: {salePrice}원 {getDiscount() > 0 && `(${getDiscount()}% 할인)`}
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: theme.accent }} />
                  최소 인원: {minQuantity}명
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: theme.accent }} />
                  마감: {endDate} {endTime}
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: theme.accent }} />
                  계좌: {BANKS.find(b => b.code === bankCode)?.name} {accountNumber} {accountHolder}
                </li>
              </ul>
            </div>
          </div>
        )}
      </main>

      {/* 하단 버튼 */}
      <div 
        className="fixed bottom-0 left-0 right-0 px-4 py-4"
        style={{ backgroundColor: theme.bgMain, borderTop: `1px solid ${theme.borderLight}` }}
      >
        <div className="max-w-[640px] mx-auto flex gap-3">
          {step > 1 && (
            <button
              onClick={prevStep}
              className="flex-1 py-4 rounded-2xl font-semibold text-[15px] transition-colors"
              style={{ backgroundColor: theme.bgInput, color: theme.textPrimary, border: `1px solid ${theme.border}` }}
            >
              이전
            </button>
          )}
          
          {step < 3 ? (
            <button
              onClick={nextStep}
              className="flex-1 py-4 rounded-2xl font-bold text-[15px] transition-colors"
              style={{ backgroundColor: theme.accent, color: isDark ? '#121212' : '#FFFFFF' }}
            >
              다음
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 py-4 rounded-2xl font-bold text-[15px] transition-colors disabled:opacity-50"
              style={{ backgroundColor: theme.accent, color: isDark ? '#121212' : '#FFFFFF' }}
            >
              {submitting ? "등록중..." : "공동구매 등록하기"}
            </button>
          )}
        </div>
      </div>

      <style jsx global>{`
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        input[type="date"], input[type="time"], select {
          color-scheme: ${isDark ? 'dark' : 'light'};
        }
      `}</style>
    </div>
  );
}
