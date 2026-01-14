"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/contexts/ThemeContext";
import {
  ArrowLeft,
  Store,
  Phone,
  MapPin,
  FileText,
  CreditCard,
  Building2,
  User,
  Upload,
  AlertTriangle,
  Info,
  ChevronRight,
} from "lucide-react";

const banks = [
  "국민은행", "신한은행", "우리은행", "하나은행", "농협은행",
  "기업은행", "카카오뱅크", "토스뱅크", "새마을금고", "우체국",
];

interface Category {
  id: number;
  name: string;
  icon: string;
}

declare global {
  interface Window {
    daum: any;
  }
}

export default function ShopRegisterPage() {
  const router = useRouter();
  const { theme, isDark, mounted } = useTheme();
  
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  const [categories, setCategories] = useState<Category[]>([]);

  // 폼 데이터
  const [shopName, setShopName] = useState("");
  const [category, setCategory] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [description, setDescription] = useState("");
  
  // 계좌 정보
  const [bankName, setBankName] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankHolder, setBankHolder] = useState("");

  // 이미지
  const [bizRegFile, setBizRegFile] = useState<File | null>(null);
  const [bizRegPreview, setBizRegPreview] = useState("");

  useEffect(() => {
    checkUser();
    fetchCategories();
    loadDaumPostcode();
  }, []);

  const loadDaumPostcode = () => {
    const script = document.createElement("script");
    script.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    script.async = true;
    document.head.appendChild(script);
  };

  const openAddressSearch = () => {
    if (!window.daum) {
      alert("주소 검색 기능을 불러오는 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    new window.daum.Postcode({
      oncomplete: function(data: any) {
        const fullAddress = data.roadAddress || data.jibunAddress;
        setAddress(fullAddress);
      }
    }).open();
  };

  const fetchCategories = async () => {
    const { data } = await supabase
      .from("shop_categories")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (data) {
      setCategories(data);
    }
  };

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert("로그인이 필요합니다");
      router.push("/login");
      return;
    }
    setUser(user);

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
    if (!shopName.trim()) { alert("상호명을 입력해주세요"); return false; }
    if (!category) { alert("카테고리를 선택해주세요"); return false; }
    if (!phone.trim()) { alert("연락처를 입력해주세요"); return false; }
    if (!address.trim()) { alert("주소를 검색해주세요"); return false; }
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
      let bizRegUrl = "";

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

  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.bgMain }}>
        <div className="w-10 h-10 border-2 rounded-full animate-spin" style={{ borderColor: theme.border, borderTopColor: theme.accent }}></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen transition-colors duration-300" style={{ backgroundColor: theme.bgMain }}>
      {/* 헤더 */}
      <header className="fixed top-0 left-0 right-0 z-50" style={{ backgroundColor: theme.bgElevated, borderBottom: `1px solid ${theme.borderLight}` }}>
        <div className="max-w-[640px] mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => router.back()} className="p-1 -ml-1 rounded-lg" style={{ color: theme.textPrimary }}>
            <ArrowLeft className="w-6 h-6" strokeWidth={1.5} />
          </button>
          <span className="font-bold text-lg" style={{ color: theme.textPrimary }}>입점 신청</span>
          <div className="w-8" />
        </div>
      </header>

      <main className="pt-14 pb-32 max-w-[640px] mx-auto">
        {/* 진행 상태 */}
        <div className="px-4 py-6" style={{ backgroundColor: theme.bgCard, borderBottom: `1px solid ${theme.borderLight}` }}>
          <div className="flex items-center justify-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center font-bold"
              style={{ backgroundColor: step >= 1 ? theme.accent : theme.bgInput, color: step >= 1 ? (isDark ? '#121212' : '#FFF') : theme.textMuted }}
            >1</div>
            <div className="w-16 h-1 rounded" style={{ backgroundColor: step >= 2 ? theme.accent : theme.bgInput }} />
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center font-bold"
              style={{ backgroundColor: step >= 2 ? theme.accent : theme.bgInput, color: step >= 2 ? (isDark ? '#121212' : '#FFF') : theme.textMuted }}
            >2</div>
          </div>
          <div className="flex justify-center gap-12 mt-2">
            <span className="text-sm font-medium" style={{ color: step === 1 ? theme.accent : theme.textMuted }}>기본 정보</span>
            <span className="text-sm font-medium" style={{ color: step === 2 ? theme.accent : theme.textMuted }}>정산 정보</span>
          </div>
        </div>

        {/* Step 1: 기본 정보 */}
        {step === 1 && (
          <div className="px-4 py-6 space-y-6">
            {/* 상점명 */}
            <div>
              <label className="flex items-center gap-1.5 text-sm font-semibold mb-2" style={{ color: theme.textPrimary }}>
                <Store className="w-4 h-4" style={{ color: theme.accent }} strokeWidth={1.5} />
                상호명 <span style={{ color: theme.red }}>*</span>
              </label>
              <input
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="상호명을 입력하세요"
                className="w-full px-4 py-3.5 rounded-xl text-[15px] outline-none"
                style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.border}`, color: theme.textPrimary }}
              />
            </div>

            {/* 카테고리 */}
            <div>
              <label className="flex items-center gap-1.5 text-sm font-semibold mb-2" style={{ color: theme.textPrimary }}>
                카테고리 <span style={{ color: theme.red }}>*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.name)}
                    className="px-3 py-3 rounded-xl text-sm font-medium transition-all"
                    style={{
                      backgroundColor: category === cat.name ? theme.accent : theme.bgCard,
                      color: category === cat.name ? (isDark ? '#121212' : '#FFF') : theme.textPrimary,
                      border: `1px solid ${category === cat.name ? theme.accent : theme.border}`,
                    }}
                  >
                    {cat.icon} {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* 연락처 */}
            <div>
              <label className="flex items-center gap-1.5 text-sm font-semibold mb-2" style={{ color: theme.textPrimary }}>
                <Phone className="w-4 h-4" style={{ color: theme.accent }} strokeWidth={1.5} />
                연락처 <span style={{ color: theme.red }}>*</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={handlePhoneChange}
                placeholder="010-0000-0000"
                maxLength={13}
                className="w-full px-4 py-3.5 rounded-xl text-[15px] outline-none"
                style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.border}`, color: theme.textPrimary }}
              />
              {/* 개인정보 보호 안내 */}
              <div className="mt-2 p-3 rounded-xl" style={{ backgroundColor: `${theme.accent}15`, border: `1px solid ${theme.accent}30` }}>
                <p className="text-xs font-medium mb-1 flex items-center gap-1" style={{ color: theme.accent }}>
                  <AlertTriangle className="w-3 h-3" strokeWidth={1.5} />
                  개인정보 보호 안내
                </p>
                <ul className="text-xs space-y-0.5" style={{ color: theme.textSecondary }}>
                  <li>• 개인 휴대폰 번호 대신 <strong>가게 대표전화</strong> 또는 <strong>안심번호</strong> 사용 권장</li>
                  <li>• 연락처 공개로 인한 피해에 대해 여주마켓은 책임지지 않습니다</li>
                </ul>
              </div>
            </div>

            {/* 주소 */}
            <div>
              <label className="flex items-center gap-1.5 text-sm font-semibold mb-2" style={{ color: theme.textPrimary }}>
                <MapPin className="w-4 h-4" style={{ color: theme.accent }} strokeWidth={1.5} />
                주소 <span style={{ color: theme.red }}>*</span>
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={address}
                  readOnly
                  placeholder="주소 검색을 클릭하세요"
                  onClick={openAddressSearch}
                  className="flex-1 px-4 py-3.5 rounded-xl text-[15px] outline-none cursor-pointer"
                  style={{ backgroundColor: theme.bgInput, border: `1px solid ${theme.border}`, color: theme.textPrimary }}
                />
                <button
                  type="button"
                  onClick={openAddressSearch}
                  className="px-4 py-3.5 rounded-xl font-medium whitespace-nowrap transition-colors"
                  style={{ backgroundColor: theme.accent, color: isDark ? '#121212' : '#FFF' }}
                >
                  주소 검색
                </button>
              </div>
              <input
                type="text"
                value={addressDetail}
                onChange={(e) => setAddressDetail(e.target.value)}
                placeholder="상세주소 입력 (선택)"
                className="w-full px-4 py-3.5 rounded-xl text-[15px] outline-none"
                style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.border}`, color: theme.textPrimary }}
              />
            </div>

            {/* 상점 소개 */}
            <div>
              <label className="flex items-center gap-1.5 text-sm font-semibold mb-2" style={{ color: theme.textPrimary }}>
                <FileText className="w-4 h-4" style={{ color: theme.accent }} strokeWidth={1.5} />
                상점 소개
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="우리 가게를 소개해주세요"
                rows={3}
                className="w-full px-4 py-3.5 rounded-xl text-[15px] outline-none resize-none"
                style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.border}`, color: theme.textPrimary }}
              />
            </div>
          </div>
        )}

        {/* Step 2: 정산 정보 */}
        {step === 2 && (
          <div className="px-4 py-6 space-y-6">
            {/* 안내 문구 */}
            <div className="rounded-2xl p-4" style={{ backgroundColor: `${theme.accent}15`, border: `1px solid ${theme.accent}30` }}>
              <p className="text-sm leading-relaxed flex items-start gap-2" style={{ color: theme.textSecondary }}>
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: theme.accent }} strokeWidth={1.5} />
                공동구매 대금을 받으실 계좌 정보를 입력해주세요. 고객이 직접 입금하는 방식으로, 계좌 정보가 주문서에 표시됩니다.
              </p>
            </div>

            {/* 은행 선택 */}
            <div>
              <label className="flex items-center gap-1.5 text-sm font-semibold mb-2" style={{ color: theme.textPrimary }}>
                <Building2 className="w-4 h-4" style={{ color: theme.accent }} strokeWidth={1.5} />
                은행 <span style={{ color: theme.red }}>*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {banks.map((bank) => (
                  <button
                    key={bank}
                    type="button"
                    onClick={() => setBankName(bank)}
                    className="px-3 py-3 rounded-xl text-sm font-medium transition-all"
                    style={{
                      backgroundColor: bankName === bank ? theme.accent : theme.bgCard,
                      color: bankName === bank ? (isDark ? '#121212' : '#FFF') : theme.textPrimary,
                      border: `1px solid ${bankName === bank ? theme.accent : theme.border}`,
                    }}
                  >
                    {bank}
                  </button>
                ))}
              </div>
            </div>

            {/* 계좌번호 */}
            <div>
              <label className="flex items-center gap-1.5 text-sm font-semibold mb-2" style={{ color: theme.textPrimary }}>
                <CreditCard className="w-4 h-4" style={{ color: theme.accent }} strokeWidth={1.5} />
                계좌번호 <span style={{ color: theme.red }}>*</span>
              </label>
              <input
                type="text"
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value.replace(/[^0-9-]/g, ''))}
                placeholder="- 없이 숫자만 입력"
                className="w-full px-4 py-3.5 rounded-xl text-[15px] outline-none tracking-wide"
                style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.border}`, color: theme.textPrimary }}
              />
            </div>

            {/* 예금주 */}
            <div>
              <label className="flex items-center gap-1.5 text-sm font-semibold mb-2" style={{ color: theme.textPrimary }}>
                <User className="w-4 h-4" style={{ color: theme.accent }} strokeWidth={1.5} />
                예금주 <span style={{ color: theme.red }}>*</span>
              </label>
              <input
                type="text"
                value={bankHolder}
                onChange={(e) => setBankHolder(e.target.value)}
                placeholder="예금주명"
                className="w-full px-4 py-3.5 rounded-xl text-[15px] outline-none"
                style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.border}`, color: theme.textPrimary }}
              />
            </div>

            {/* 사업자등록증 */}
            <div>
              <label className="flex items-center gap-1.5 text-sm font-semibold mb-2" style={{ color: theme.textPrimary }}>
                <FileText className="w-4 h-4" style={{ color: theme.accent }} strokeWidth={1.5} />
                사업자등록증 <span style={{ color: theme.red }}>*</span>
              </label>
              <div 
                onClick={() => document.getElementById("bizreg-input")?.click()}
                className="relative aspect-[4/3] rounded-2xl overflow-hidden cursor-pointer transition-colors"
                style={{ backgroundColor: theme.bgCard, border: `2px dashed ${theme.border}` }}
              >
                {bizRegPreview ? (
                  <img src={bizRegPreview} alt="사업자등록증" className="w-full h-full object-contain" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center" style={{ color: theme.textMuted }}>
                    <Upload className="w-12 h-12 mb-2" strokeWidth={1.5} />
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
              <p className="text-xs mt-2" style={{ color: theme.textMuted }}>
                * 사업자등록증이 확인되어야 승인됩니다
              </p>
            </div>

            {/* 경고 문구 */}
            <div className="rounded-2xl p-4" style={{ backgroundColor: theme.redBg, border: `1px solid ${theme.red}30` }}>
              <p className="text-sm leading-relaxed flex items-start gap-2" style={{ color: theme.textSecondary }}>
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: theme.red }} strokeWidth={1.5} />
                입력하신 계좌 정보는 고객의 주문서에 표시됩니다. 정확한 정보를 입력해주세요.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* 하단 버튼 */}
      <div className="fixed bottom-0 left-0 right-0" style={{ backgroundColor: theme.bgCard, borderTop: `1px solid ${theme.borderLight}` }}>
        <div className="max-w-[640px] mx-auto px-4 py-4 flex gap-3">
          {step === 2 && (
            <button
              onClick={() => setStep(1)}
              className="w-24 h-14 rounded-2xl font-bold transition-colors"
              style={{ backgroundColor: theme.bgInput, color: theme.textPrimary, border: `1px solid ${theme.border}` }}
            >
              이전
            </button>
          )}
          
          {step === 1 ? (
            <button
              onClick={() => { if (validateStep1()) setStep(2); }}
              className="flex-1 h-14 rounded-2xl font-bold text-lg transition-colors"
              style={{ backgroundColor: theme.accent, color: isDark ? '#121212' : '#FFF' }}
            >
              다음
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 h-14 rounded-2xl font-bold text-lg transition-colors disabled:opacity-50"
              style={{ backgroundColor: theme.accent, color: isDark ? '#121212' : '#FFF' }}
            >
              {submitting ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#FFF' }} />
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
