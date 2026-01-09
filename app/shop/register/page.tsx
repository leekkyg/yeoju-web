"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const categories = [
  { id: "chicken", name: "치킨/피자", icon: "🍗" },
  { id: "food", name: "음식점", icon: "🍽️" },
  { id: "cafe", name: "카페/베이커리", icon: "☕" },
  { id: "beauty", name: "뷰티/미용", icon: "💇" },
  { id: "life", name: "생활/편의", icon: "🏪" },
  { id: "etc", name: "기타", icon: "📦" },
];

const banks = [
  "국민은행", "신한은행", "우리은행", "하나은행", "농협은행",
  "기업은행", "카카오뱅크", "토스뱅크", "새마을금고", "우체국",
];

export default function ShopRegisterPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1);

  // 폼 데이터
  const [shopName, setShopName] = useState("");
  const [category, setCategory] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [description, setDescription] = useState("");
  const [businessHours, setBusinessHours] = useState("");
  const [closedDays, setClosedDays] = useState("");
  
  // 계좌 정보
  const [bankName, setBankName] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankHolder, setBankHolder] = useState("");

  // 이미지
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [bizRegFile, setBizRegFile] = useState<File | null>(null);
  const [bizRegPreview, setBizRegPreview] = useState("");

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert("로그인이 필요합니다");
      router.push("/login");
      return;
    }
    setUser(user);

    // 이미 상점이 있는지 확인
    const { data: existingShop } = await supabase
      .from("shops")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (existingShop) {
      alert("이미 등록된 상점이 있습니다");
      router.push("/shop/dashboard");
      return;
    }

    setLoading(false);
  };

  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/[^0-9]/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhoneNumber(e.target.value));
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setFile: (f: File | null) => void,
    setPreview: (s: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      setFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (file: File, path: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${path}/${fileName}`;

    const { error } = await supabase.storage
      .from("shops")
      .upload(filePath, file);

    if (error) throw error;

    const { data } = supabase.storage.from("shops").getPublicUrl(filePath);
    return data.publicUrl;
  };

  const validateStep1 = () => {
    if (!shopName.trim()) { alert("상점명을 입력해주세요"); return false; }
    if (!category) { alert("카테고리를 선택해주세요"); return false; }
    if (!phone.trim()) { alert("연락처를 입력해주세요"); return false; }
    if (!address.trim()) { alert("주소를 입력해주세요"); return false; }
    return true;
  };

  const validateStep2 = () => {
    if (!bankName) { alert("은행을 선택해주세요"); return false; }
    if (!bankAccount.trim()) { alert("계좌번호를 입력해주세요"); return false; }
    if (!bankHolder.trim()) { alert("예금주를 입력해주세요"); return false; }
    if (!bizRegFile) { alert("사업자등록증을 첨부해주세요"); return false; }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateStep2()) return;

    setSubmitting(true);

    try {
      let logoUrl = "";
      let bizRegUrl = "";

      if (logoFile) {
        logoUrl = await uploadImage(logoFile, "logos");
      }
      if (bizRegFile) {
        bizRegUrl = await uploadImage(bizRegFile, "business-registrations");
      }

      const { error } = await supabase.from("shops").insert({
        user_id: user.id,
        name: shopName,
        category,
        phone,
        address: `${address} ${addressDetail}`.trim(),
        description,
        business_hours: businessHours,
        closed_days: closedDays,
        logo_url: logoUrl,
        business_license_url: bizRegUrl,
        bank_name: bankName,
        bank_account: bankAccount,
        bank_holder: bankHolder,
        approval_status: "pending",
      });

      if (error) throw error;

      alert("입점 신청이 완료되었습니다!\n관리자 승인 후 공동구매를 시작할 수 있습니다.");
      router.push("/shop/dashboard");
    } catch (error: any) {
      alert("오류가 발생했습니다: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

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
          <span className="text-white font-bold text-lg">입점 신청</span>
          <div className="w-10" />
        </div>
      </header>

      <main className="pt-14 pb-32 max-w-[640px] mx-auto">
        {/* 진행 상태 */}
        <div className="px-5 py-6 bg-white border-b border-[#19643D]/10">
          <div className="flex items-center justify-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
              step >= 1 ? "bg-[#19643D] text-white" : "bg-gray-200 text-gray-400"
            }`}>1</div>
            <div className={`w-16 h-1 rounded ${step >= 2 ? "bg-[#19643D]" : "bg-gray-200"}`} />
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
              step >= 2 ? "bg-[#19643D] text-white" : "bg-gray-200 text-gray-400"
            }`}>2</div>
          </div>
          <div className="flex justify-center gap-12 mt-2">
            <span className={`text-sm ${step === 1 ? "text-[#19643D] font-bold" : "text-gray-400"}`}>기본 정보</span>
            <span className={`text-sm ${step === 2 ? "text-[#19643D] font-bold" : "text-gray-400"}`}>정산 정보</span>
          </div>
        </div>

        {/* Step 1: 기본 정보 */}
        {step === 1 && (
          <div className="px-5 py-6 space-y-6">
            {/* 로고 */}
            <div className="flex justify-center">
              <div 
                onClick={() => document.getElementById("logo-input")?.click()}
                className="w-28 h-28 rounded-2xl bg-white border-2 border-dashed border-[#19643D]/30 flex flex-col items-center justify-center cursor-pointer hover:border-[#19643D] transition-colors overflow-hidden"
              >
                {logoPreview ? (
                  <img src={logoPreview} alt="로고" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <span className="text-3xl mb-1">🏪</span>
                    <span className="text-xs text-[#19643D]/50">로고 추가</span>
                  </>
                )}
              </div>
              <input
                id="logo-input"
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange(e, setLogoFile, setLogoPreview)}
                className="hidden"
              />
            </div>

            {/* 상점명 */}
            <div>
              <label className="block text-sm font-bold text-[#19643D] mb-2">
                상점명 <span className="text-[#DA451F]">*</span>
              </label>
              <input
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="예: 여주맛집 치킨"
                className="w-full px-4 py-3.5 bg-white border border-[#19643D]/20 rounded-xl text-[#19643D] placeholder-[#19643D]/40 focus:outline-none focus:ring-2 focus:ring-[#19643D]/30"
              />
            </div>

            {/* 카테고리 */}
            <div>
              <label className="block text-sm font-bold text-[#19643D] mb-2">
                카테고리 <span className="text-[#DA451F]">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.name)}
                    className={`px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                      category === cat.name
                        ? "bg-[#19643D] text-white"
                        : "bg-white border border-[#19643D]/20 text-[#19643D] hover:border-[#19643D]/50"
                    }`}
                  >
                    {cat.icon} {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* 연락처 */}
            <div>
              <label className="block text-sm font-bold text-[#19643D] mb-2">
                연락처 <span className="text-[#DA451F]">*</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={handlePhoneChange}
                placeholder="031-000-0000"
                maxLength={13}
                className="w-full px-4 py-3.5 bg-white border border-[#19643D]/20 rounded-xl text-[#19643D] placeholder-[#19643D]/40 focus:outline-none focus:ring-2 focus:ring-[#19643D]/30"
              />
            </div>

            {/* 주소 */}
            <div>
              <label className="block text-sm font-bold text-[#19643D] mb-2">
                주소 <span className="text-[#DA451F]">*</span>
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="여주시 여흥로 123"
                className="w-full px-4 py-3.5 bg-white border border-[#19643D]/20 rounded-xl text-[#19643D] placeholder-[#19643D]/40 focus:outline-none focus:ring-2 focus:ring-[#19643D]/30 mb-2"
              />
              <input
                type="text"
                value={addressDetail}
                onChange={(e) => setAddressDetail(e.target.value)}
                placeholder="상세주소 (선택)"
                className="w-full px-4 py-3.5 bg-white border border-[#19643D]/20 rounded-xl text-[#19643D] placeholder-[#19643D]/40 focus:outline-none focus:ring-2 focus:ring-[#19643D]/30"
              />
            </div>

            {/* 영업시간 */}
            <div>
              <label className="block text-sm font-bold text-[#19643D] mb-2">영업시간</label>
              <input
                type="text"
                value={businessHours}
                onChange={(e) => setBusinessHours(e.target.value)}
                placeholder="예: 11:00 ~ 22:00"
                className="w-full px-4 py-3.5 bg-white border border-[#19643D]/20 rounded-xl text-[#19643D] placeholder-[#19643D]/40 focus:outline-none focus:ring-2 focus:ring-[#19643D]/30"
              />
            </div>

            {/* 휴무일 */}
            <div>
              <label className="block text-sm font-bold text-[#19643D] mb-2">휴무일</label>
              <input
                type="text"
                value={closedDays}
                onChange={(e) => setClosedDays(e.target.value)}
                placeholder="예: 매주 월요일"
                className="w-full px-4 py-3.5 bg-white border border-[#19643D]/20 rounded-xl text-[#19643D] placeholder-[#19643D]/40 focus:outline-none focus:ring-2 focus:ring-[#19643D]/30"
              />
            </div>

            {/* 상점 소개 */}
            <div>
              <label className="block text-sm font-bold text-[#19643D] mb-2">상점 소개</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="우리 가게를 소개해주세요"
                rows={3}
                className="w-full px-4 py-3.5 bg-white border border-[#19643D]/20 rounded-xl text-[#19643D] placeholder-[#19643D]/40 focus:outline-none focus:ring-2 focus:ring-[#19643D]/30 resize-none"
              />
            </div>
          </div>
        )}

        {/* Step 2: 정산 정보 */}
        {step === 2 && (
          <div className="px-5 py-6 space-y-6">
            {/* 안내 문구 */}
            <div className="bg-[#F2D38D]/30 rounded-2xl p-4">
              <p className="text-sm text-[#19643D]/80 leading-relaxed">
                💰 공동구매 대금을 받으실 계좌 정보를 입력해주세요.<br/>
                고객이 직접 입금하는 방식으로, 계좌 정보가 주문서에 표시됩니다.
              </p>
            </div>

            {/* 은행 선택 */}
            <div>
              <label className="block text-sm font-bold text-[#19643D] mb-2">
                은행 <span className="text-[#DA451F]">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {banks.map((bank) => (
                  <button
                    key={bank}
                    type="button"
                    onClick={() => setBankName(bank)}
                    className={`px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                      bankName === bank
                        ? "bg-[#19643D] text-white"
                        : "bg-white border border-[#19643D]/20 text-[#19643D] hover:border-[#19643D]/50"
                    }`}
                  >
                    {bank}
                  </button>
                ))}
              </div>
            </div>

            {/* 계좌번호 */}
            <div>
              <label className="block text-sm font-bold text-[#19643D] mb-2">
                계좌번호 <span className="text-[#DA451F]">*</span>
              </label>
              <input
                type="text"
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value.replace(/[^0-9-]/g, ''))}
                placeholder="- 없이 숫자만 입력"
                className="w-full px-4 py-3.5 bg-white border border-[#19643D]/20 rounded-xl text-[#19643D] placeholder-[#19643D]/40 focus:outline-none focus:ring-2 focus:ring-[#19643D]/30 text-lg tracking-wide"
              />
            </div>

            {/* 예금주 */}
            <div>
              <label className="block text-sm font-bold text-[#19643D] mb-2">
                예금주 <span className="text-[#DA451F]">*</span>
              </label>
              <input
                type="text"
                value={bankHolder}
                onChange={(e) => setBankHolder(e.target.value)}
                placeholder="예금주명"
                className="w-full px-4 py-3.5 bg-white border border-[#19643D]/20 rounded-xl text-[#19643D] placeholder-[#19643D]/40 focus:outline-none focus:ring-2 focus:ring-[#19643D]/30"
              />
            </div>

            {/* 사업자등록증 */}
            <div>
              <label className="block text-sm font-bold text-[#19643D] mb-2">
                사업자등록증 <span className="text-[#DA451F]">*</span>
              </label>
              <div 
                onClick={() => document.getElementById("bizreg-input")?.click()}
                className="relative aspect-[4/3] bg-white rounded-xl overflow-hidden cursor-pointer border-2 border-dashed border-[#19643D]/30 hover:border-[#19643D] transition-colors"
              >
                {bizRegPreview ? (
                  <img src={bizRegPreview} alt="사업자등록증" className="w-full h-full object-contain" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-[#19643D]/40">
                    <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="font-medium">사업자등록증 사진 첨부</p>
                    <p className="text-sm mt-1">클릭하여 업로드</p>
                  </div>
                )}
              </div>
              <input
                id="bizreg-input"
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange(e, setBizRegFile, setBizRegPreview)}
                className="hidden"
              />
              <p className="text-xs text-[#19643D]/50 mt-2">
                * 사업자등록증이 확인되어야 승인됩니다
              </p>
            </div>

            {/* 경고 문구 */}
            <div className="bg-[#DA451F]/10 rounded-2xl p-4 border border-[#DA451F]/20">
              <p className="text-sm text-[#DA451F]/80 leading-relaxed">
                ⚠️ 입력하신 계좌 정보는 고객의 주문서에 표시됩니다.<br/>
                정확한 정보를 입력해주세요.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* 하단 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-[#19643D]/10">
        <div className="max-w-[640px] mx-auto px-5 py-4 flex gap-3">
          {step === 2 && (
            <button
              onClick={() => setStep(1)}
              className="w-24 h-14 bg-white border-2 border-[#19643D] text-[#19643D] font-bold rounded-2xl hover:bg-[#19643D]/5 transition-colors"
            >
              이전
            </button>
          )}
          
          {step === 1 ? (
            <button
              onClick={() => {
                if (validateStep1()) setStep(2);
              }}
              className="flex-1 h-14 bg-[#19643D] hover:bg-[#145231] text-white font-bold text-lg rounded-2xl transition-colors"
            >
              다음
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 h-14 bg-[#DA451F] hover:bg-[#c23d1b] disabled:bg-gray-300 text-white font-bold text-lg rounded-2xl transition-colors shadow-lg shadow-[#DA451F]/20"
            >
              {submitting ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>신청 중...</span>
                </div>
              ) : (
                "입점 신청하기"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
