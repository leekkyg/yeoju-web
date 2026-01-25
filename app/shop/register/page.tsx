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
  CreditCard,
  Upload,
  Check,
  Crown,
  Calendar,
  Banknote,
  Plus,
  AlertCircle,
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

interface Plan {
  id: string;
  name: string;
  price: number;
  duration_days: number;
  description: string;
}

interface UserCard {
  id: number;
  card_company: string;
  card_number: string;
  card_type: string;
  is_default: boolean;
  billing_key: string;
}

declare global {
  interface Window {
    daum: any;
    TossPayments: any;
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
  const [plans, setPlans] = useState<Plan[]>([]);
  const [userCards, setUserCards] = useState<UserCard[]>([]);

  // 폼 데이터
  const [shopName, setShopName] = useState("");
  const [category, setCategory] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [description, setDescription] = useState("");
  
  // 사업자 정보
  const [businessName, setBusinessName] = useState("");
  const [businessNumber, setBusinessNumber] = useState("");
  const [representative, setRepresentative] = useState("");
  
  // 계좌 정보
  const [bankName, setBankName] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankHolder, setBankHolder] = useState("");

  // 이미지
  const [bizRegFile, setBizRegFile] = useState<File | null>(null);
  const [bizRegPreview, setBizRegPreview] = useState("");

  // 요금제 & 결제
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash'>('card');
  const [selectedCard, setSelectedCard] = useState<UserCard | null>(null);

  useEffect(() => {
    checkUser();
    fetchCategories();
    fetchPlans();
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
        setAddress(data.roadAddress || data.jibunAddress);
      }
    }).open();
  };

  const fetchCategories = async () => {
    const { data } = await supabase
      .from("shop_categories")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (data) setCategories(data);
  };

  const fetchPlans = async () => {
    const { data } = await supabase
      .from("seller_plans")
      .select("*")
      .eq("is_active", true)
      .order("price", { ascending: true });
    if (data) setPlans(data);
  };

  const fetchUserCards = async (userId: string) => {
    const { data } = await supabase
      .from("payment_methods")
      .select("*")
      .eq("user_id", userId)
      .order("is_default", { ascending: false });
    if (data) {
      setUserCards(data);
      const defaultCard = data.find(c => c.is_default) || data[0];
      if (defaultCard) setSelectedCard(defaultCard);
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
      if (existingShop.approval_status === 'rejected') {
        // 거절된 상점은 재신청 불가
        alert(`입점 신청이 거절되었습니다.\n\n거절 사유: ${existingShop.approval_note || "사유 없음"}\n\n문의사항은 고객센터로 연락해주세요.`);
        router.push("/mypage");
        return;
      } else {
        // 승인됨 또는 대기중이면 대시보드로
        alert("이미 등록된 상점이 있습니다");
        router.push("/shop/dashboard");
        return;
      }
    }

    // 대기 중인 신청이 있는지 확인
    const { data: pendingApp } = await supabase
      .from("seller_applications")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .single();

    if (pendingApp) {
      alert("승인 대기 중인 신청이 있습니다. 24시간 내에 자동 승인됩니다.");
      router.push("/");
      return;
    }

    // 등록된 카드 가져오기
    await fetchUserCards(user.id);

    setLoading(false);
  };

  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/[^0-9]/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
  };

  const formatBusinessNumber = (value: string) => {
    const numbers = value.replace(/[^0-9]/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 5) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 5)}-${numbers.slice(5, 10)}`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBizRegFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setBizRegPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (file: File, path: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${path}/${fileName}`;
    const { error } = await supabase.storage.from("shops").upload(filePath, file);
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
    if (!businessName.trim()) { alert("상호(사업자명)를 입력해주세요"); return false; }
    if (!businessNumber.trim()) { alert("사업자번호를 입력해주세요"); return false; }
    if (!representative.trim()) { alert("대표자명을 입력해주세요"); return false; }
    if (!bankName) { alert("은행을 선택해주세요"); return false; }
    if (!bankAccount.trim()) { alert("계좌번호를 입력해주세요"); return false; }
    if (!bankHolder.trim()) { alert("예금주를 입력해주세요"); return false; }
    return true;
  };

  const validateStep3 = () => {
    if (!selectedPlan) { alert("요금제를 선택해주세요"); return false; }
    if (paymentMethod === 'card' && !selectedCard) { 
      alert("결제할 카드를 선택해주세요"); 
      return false; 
    }
    return true;
  };

  // 카드 결제 (빌링키)
  const handleCardPayment = async () => {
    if (!validateStep3()) return;
    if (!selectedCard) return;

    setSubmitting(true);
    const totalAmount = Math.round(selectedPlan!.price * 1.1); // 부가세 포함

    try {
      // 빌링키로 결제 API 호출
      const response = await fetch('/api/payments/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billingKey: selectedCard.billing_key,
          amount: totalAmount,
          orderName: `여주모아 셀러 ${selectedPlan!.name}`,
          customerKey: `customer_${user.id}`,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || '결제 실패');
      }

      // 상점 & 신청 생성
      await createShopAndApplication('card', result.paymentKey, totalAmount);

    } catch (error: any) {
      alert("결제 오류: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  // 현금 결제 (무통장)
  const handleCashPayment = async () => {
    if (!validateStep3()) return;
    
    const totalAmount = Math.round(selectedPlan!.price * 1.1); // 부가세 포함
    
    if (!confirm(`무통장 입금으로 진행하시겠습니까?\n\n입금 확인 후 승인됩니다.`)) {
      return;
    }

    setSubmitting(true);

    try {
      await createShopAndApplication('cash', null, totalAmount);
    } catch (error: any) {
      alert("오류: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  // 상점 & 신청 생성
  const createShopAndApplication = async (method: 'card' | 'cash', paymentKey: string | null, totalAmount: number) => {
    // 사업자등록증 업로드
    let bizRegUrl = "";
    if (bizRegFile) {
      bizRegUrl = await uploadImage(bizRegFile, "business-registrations");
    }

    // 상점 생성
    const { data: newShop, error: shopError } = await supabase.from("shops").insert({
      user_id: user.id,
      name: shopName,
      category: category,
      phone: phone,
      address: `${address} ${addressDetail}`.trim(),
      business_address: `${address} ${addressDetail}`.trim(),
      description: description,
      business_name: businessName,
      business_number: businessNumber,
      representative: representative,
      business_license_url: bizRegUrl,
      bank_name: bankName,
      bank_account: bankAccount,
      bank_holder: bankHolder,
      tier: 'basic',
      approval_status: "pending",
    }).select().single();

    if (shopError) throw shopError;

    // 셀러 신청 기록
    const autoApproveAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    const { error: appError } = await supabase.from("seller_applications").insert({
      user_id: user.id,
      shop_id: newShop.id,
      plan_id: selectedPlan!.id,
      paid_amount: totalAmount,
      payment_key: paymentKey,
      payment_method: method,
      paid_at: method === 'card' ? new Date().toISOString() : null,
      status: 'pending',
      auto_approve_at: autoApproveAt.toISOString(),
    });

    if (appError) throw appError;

    if (method === 'cash') {
      alert(`입점 신청이 완료되었습니다!\n\n아래 계좌로 ${totalAmount.toLocaleString()}원을 입금해주세요.\n\n국민은행 012345-67-890123\n예금주: 콘텐츠박스\n\n입금 확인 후 승인됩니다.`);
    } else {
      alert("결제 및 입점 신청이 완료되었습니다!\n24시간 내에 자동 승인됩니다.");
    }
    
    router.push("/shop/dashboard");
  };

  // 카드 등록 페이지로 이동
  const goToCardRegister = () => {
    // 현재 입력 정보 저장
    const shopData = {
      shopName, category, phone, address, addressDetail, description,
      businessName, businessNumber, representative,
      bankName, bankAccount, bankHolder,
      planId: selectedPlan?.id,
    };
    localStorage.setItem('pendingShopData', JSON.stringify(shopData));
    router.push('/mypage/cards?redirect=/shop/register&step=3');
  };

  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.bgMain }}>
        <div className="w-10 h-10 border-2 rounded-full animate-spin" style={{ borderColor: theme.border, borderTopColor: theme.accent }}></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.bgMain }}>
      {/* 헤더 */}
      <header className="fixed top-0 left-0 right-0 z-50" style={{ backgroundColor: theme.bgCard, borderBottom: `1px solid ${theme.border}` }}>
        <div className="max-w-[640px] mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => step > 1 ? setStep(step - 1) : router.back()} className="p-1 -ml-1">
            <ArrowLeft className="w-6 h-6" style={{ color: theme.textPrimary }} />
          </button>
          <span className="font-bold text-lg" style={{ color: theme.textPrimary }}>입점 신청</span>
          <div className="w-8" />
        </div>
      </header>

      <main className="pt-14 pb-32 max-w-[640px] mx-auto">
        {/* 진행 상태 */}
        <div className="px-4 py-6" style={{ backgroundColor: theme.bgCard, borderBottom: `1px solid ${theme.border}` }}>
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm"
                  style={{ backgroundColor: step >= s ? theme.accent : theme.bgInput, color: step >= s ? (isDark ? '#121212' : '#FFF') : theme.textMuted }}
                >{s}</div>
                {s < 3 && <div className="w-10 h-1 rounded" style={{ backgroundColor: step > s ? theme.accent : theme.bgInput }} />}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 px-2">
            <span className="text-xs font-medium" style={{ color: step === 1 ? theme.accent : theme.textMuted }}>기본 정보</span>
            <span className="text-xs font-medium" style={{ color: step === 2 ? theme.accent : theme.textMuted }}>사업자 정보</span>
            <span className="text-xs font-medium" style={{ color: step === 3 ? theme.accent : theme.textMuted }}>요금제 선택</span>
          </div>
        </div>

        {/* Step 1: 기본 정보 */}
        {step === 1 && (
          <div className="px-4 py-6 space-y-5">
            <div>
              <label className="flex items-center gap-1.5 text-sm font-semibold mb-2" style={{ color: theme.textPrimary }}>
                <Store className="w-4 h-4" style={{ color: theme.accent }} />
                상호명 <span style={{ color: theme.red }}>*</span>
              </label>
              <input
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="상호명을 입력하세요"
                className="w-full px-4 py-3 rounded-xl outline-none"
                style={{ backgroundColor: theme.bgInput, border: `1px solid ${theme.border}`, color: theme.textPrimary }}
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-sm font-semibold mb-2" style={{ color: theme.textPrimary }}>
                카테고리 <span style={{ color: theme.red }}>*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-3 rounded-xl outline-none"
                style={{ backgroundColor: theme.bgInput, border: `1px solid ${theme.border}`, color: theme.textPrimary }}
              >
                <option value="">선택하세요</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>{c.icon} {c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-sm font-semibold mb-2" style={{ color: theme.textPrimary }}>
                <Phone className="w-4 h-4" style={{ color: theme.accent }} />
                연락처 <span style={{ color: theme.red }}>*</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
                placeholder="010-0000-0000"
                className="w-full px-4 py-3 rounded-xl outline-none"
                style={{ backgroundColor: theme.bgInput, border: `1px solid ${theme.border}`, color: theme.textPrimary }}
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-sm font-semibold mb-2" style={{ color: theme.textPrimary }}>
                <MapPin className="w-4 h-4" style={{ color: theme.accent }} />
                주소 <span style={{ color: theme.red }}>*</span>
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={address}
                  readOnly
                  placeholder="주소 검색을 눌러주세요"
                  className="flex-1 px-4 py-3 rounded-xl outline-none"
                  style={{ backgroundColor: theme.bgInput, border: `1px solid ${theme.border}`, color: theme.textPrimary }}
                />
                <button
                  onClick={openAddressSearch}
                  className="px-4 py-3 rounded-xl font-medium shrink-0"
                  style={{ backgroundColor: theme.accent, color: isDark ? '#121212' : '#FFF' }}
                >
                  검색
                </button>
              </div>
              <input
                type="text"
                value={addressDetail}
                onChange={(e) => setAddressDetail(e.target.value)}
                placeholder="상세주소 (선택)"
                className="w-full px-4 py-3 rounded-xl outline-none"
                style={{ backgroundColor: theme.bgInput, border: `1px solid ${theme.border}`, color: theme.textPrimary }}
              />
            </div>

            <div>
              <label className="text-sm font-semibold mb-2 block" style={{ color: theme.textPrimary }}>
                상점 소개 (선택)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="상점을 소개해주세요"
                rows={3}
                className="w-full px-4 py-3 rounded-xl outline-none resize-none"
                style={{ backgroundColor: theme.bgInput, border: `1px solid ${theme.border}`, color: theme.textPrimary }}
              />
            </div>
          </div>
        )}

        {/* Step 2: 사업자 정보 */}
        {step === 2 && (
          <div className="px-4 py-6 space-y-5">
            <div>
              <label className="flex items-center gap-1.5 text-sm font-semibold mb-2" style={{ color: theme.textPrimary }}>
                상호(사업자명) <span style={{ color: theme.red }}>*</span>
              </label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="사업자등록증상의 상호"
                className="w-full px-4 py-3 rounded-xl outline-none"
                style={{ backgroundColor: theme.bgInput, border: `1px solid ${theme.border}`, color: theme.textPrimary }}
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-sm font-semibold mb-2" style={{ color: theme.textPrimary }}>
                사업자등록번호 <span style={{ color: theme.red }}>*</span>
              </label>
              <input
                type="text"
                value={businessNumber}
                onChange={(e) => setBusinessNumber(formatBusinessNumber(e.target.value))}
                placeholder="000-00-00000"
                className="w-full px-4 py-3 rounded-xl outline-none"
                style={{ backgroundColor: theme.bgInput, border: `1px solid ${theme.border}`, color: theme.textPrimary }}
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-sm font-semibold mb-2" style={{ color: theme.textPrimary }}>
                대표자명 <span style={{ color: theme.red }}>*</span>
              </label>
              <input
                type="text"
                value={representative}
                onChange={(e) => setRepresentative(e.target.value)}
                placeholder="대표자 성명"
                className="w-full px-4 py-3 rounded-xl outline-none"
                style={{ backgroundColor: theme.bgInput, border: `1px solid ${theme.border}`, color: theme.textPrimary }}
              />
            </div>

            <div className="pt-4 border-t" style={{ borderColor: theme.border }}>
              <h3 className="font-bold mb-4" style={{ color: theme.textPrimary }}>정산 계좌</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-semibold mb-2" style={{ color: theme.textPrimary }}>
                    <CreditCard className="w-4 h-4" style={{ color: theme.accent }} />
                    은행 <span style={{ color: theme.red }}>*</span>
                  </label>
                  <select
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl outline-none"
                    style={{ backgroundColor: theme.bgInput, border: `1px solid ${theme.border}`, color: theme.textPrimary }}
                  >
                    <option value="">선택하세요</option>
                    {banks.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-semibold mb-2 block" style={{ color: theme.textPrimary }}>
                    계좌번호 <span style={{ color: theme.red }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={bankAccount}
                    onChange={(e) => setBankAccount(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="- 없이 숫자만 입력"
                    className="w-full px-4 py-3 rounded-xl outline-none"
                    style={{ backgroundColor: theme.bgInput, border: `1px solid ${theme.border}`, color: theme.textPrimary }}
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold mb-2 block" style={{ color: theme.textPrimary }}>
                    예금주 <span style={{ color: theme.red }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={bankHolder}
                    onChange={(e) => setBankHolder(e.target.value)}
                    placeholder="예금주명"
                    className="w-full px-4 py-3 rounded-xl outline-none"
                    style={{ backgroundColor: theme.bgInput, border: `1px solid ${theme.border}`, color: theme.textPrimary }}
                  />
                </div>
              </div>
            </div>

            <div className="pt-4">
              <label className="flex items-center gap-1.5 text-sm font-semibold mb-2" style={{ color: theme.textPrimary }}>
                <Upload className="w-4 h-4" style={{ color: theme.accent }} />
                사업자등록증 (선택)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                id="bizRegInput"
              />
              <label
                htmlFor="bizRegInput"
                className="block w-full p-4 rounded-xl border-2 border-dashed text-center cursor-pointer"
                style={{ borderColor: theme.border, color: theme.textMuted }}
              >
                {bizRegPreview ? (
                  <img src={bizRegPreview} alt="사업자등록증" className="max-h-40 mx-auto rounded-lg" />
                ) : (
                  <span>클릭하여 이미지 업로드</span>
                )}
              </label>
            </div>
          </div>
        )}

        {/* Step 3: 요금제 & 결제 */}
        {step === 3 && (
          <div className="px-4 py-6 space-y-4">
            {/* 요금제 선택 */}
            <div>
              <h3 className="font-bold mb-3" style={{ color: theme.textPrimary }}>요금제 선택</h3>
              {plans.map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan)}
                  className="w-full p-4 rounded-2xl text-left mb-3"
                  style={{
                    backgroundColor: theme.bgCard,
                    border: `2px solid ${selectedPlan?.id === plan.id ? theme.accent : theme.border}`,
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: theme.bgInput }}>
                        {plan.duration_days >= 365 ? (
                          <Crown className="w-6 h-6" style={{ color: "#FBBF24" }} />
                        ) : (
                          <Calendar className="w-6 h-6" style={{ color: theme.accent }} />
                        )}
                      </div>
                      <div>
                        <p className="font-bold" style={{ color: theme.textPrimary }}>{plan.name}</p>
                        <p className="text-sm" style={{ color: theme.textMuted }}>{plan.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold" style={{ color: theme.accent }}>
                        {plan.price.toLocaleString()}원
                      </p>
                      <p className="text-xs" style={{ color: theme.textMuted }}>{plan.duration_days}일</p>
                    </div>
                  </div>
                  {selectedPlan?.id === plan.id && (
                    <div className="mt-3 flex items-center gap-2 text-sm font-medium" style={{ color: theme.accent }}>
                      <Check className="w-4 h-4" /> 선택됨
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* 결제 수단 선택 */}
            {selectedPlan && (
              <div>
                <h3 className="font-bold mb-3" style={{ color: theme.textPrimary }}>결제 수단</h3>
                
                {/* 카드 결제 */}
                <button
                  onClick={() => setPaymentMethod('card')}
                  className="w-full p-4 rounded-2xl text-left mb-3"
                  style={{
                    backgroundColor: theme.bgCard,
                    border: `2px solid ${paymentMethod === 'card' ? theme.accent : theme.border}`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: theme.bgInput }}>
                      <CreditCard className="w-5 h-5" style={{ color: theme.accent }} />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold" style={{ color: theme.textPrimary }}>카드 결제</p>
                      <p className="text-sm" style={{ color: theme.textMuted }}>등록된 카드로 즉시 결제</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold" style={{ color: theme.accent }}>{Math.round(selectedPlan.price * 1.1).toLocaleString()}원</p>
                      <p className="text-xs" style={{ color: theme.textMuted }}>부가세 포함</p>
                    </div>
                    {paymentMethod === 'card' && <Check className="w-5 h-5 ml-2" style={{ color: theme.accent }} />}
                  </div>
                </button>

                {/* 카드 선택 (카드 결제 선택 시) */}
                {paymentMethod === 'card' && (
                  <div className="ml-4 mb-3 space-y-2">
                    {userCards.length === 0 ? (
                      <div className="p-4 rounded-xl" style={{ backgroundColor: theme.bgInput }}>
                        <div className="flex items-center gap-2 mb-2" style={{ color: theme.textMuted }}>
                          <AlertCircle className="w-4 h-4" />
                          <span className="text-sm">등록된 카드가 없습니다</span>
                        </div>
                        <button
                          onClick={goToCardRegister}
                          className="flex items-center gap-2 text-sm font-medium"
                          style={{ color: theme.accent }}
                        >
                          <Plus className="w-4 h-4" />
                          카드 등록하기
                        </button>
                      </div>
                    ) : (
                      <>
                        {userCards.map((card) => (
                          <button
                            key={card.id}
                            onClick={() => setSelectedCard(card)}
                            className="w-full p-3 rounded-xl flex items-center justify-between"
                            style={{
                              backgroundColor: theme.bgInput,
                              border: `1px solid ${selectedCard?.id === card.id ? theme.accent : 'transparent'}`,
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <CreditCard className="w-4 h-4" style={{ color: theme.textMuted }} />
                              <span style={{ color: theme.textPrimary }}>{card.card_company}</span>
                              <span style={{ color: theme.textMuted }}>({card.card_number})</span>
                              {card.is_default && (
                                <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: theme.accent, color: isDark ? '#121212' : '#fff' }}>
                                  기본
                                </span>
                              )}
                            </div>
                            {selectedCard?.id === card.id && <Check className="w-4 h-4" style={{ color: theme.accent }} />}
                          </button>
                        ))}
                        <button
                          onClick={goToCardRegister}
                          className="w-full p-3 rounded-xl flex items-center gap-2"
                          style={{ backgroundColor: theme.bgInput, color: theme.textMuted }}
                        >
                          <Plus className="w-4 h-4" />
                          <span className="text-sm">다른 카드 등록</span>
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* 현금 결제 */}
                <button
                  onClick={() => setPaymentMethod('cash')}
                  className="w-full p-4 rounded-2xl text-left"
                  style={{
                    backgroundColor: theme.bgCard,
                    border: `2px solid ${paymentMethod === 'cash' ? theme.accent : theme.border}`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: theme.bgInput }}>
                      <Banknote className="w-5 h-5" style={{ color: "#22C55E" }} />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold" style={{ color: theme.textPrimary }}>무통장 입금</p>
                      <p className="text-sm" style={{ color: theme.textMuted }}>입금 확인 후 승인</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold" style={{ color: "#22C55E" }}>{Math.round(selectedPlan.price * 1.1).toLocaleString()}원</p>
                      <p className="text-xs" style={{ color: theme.textMuted }}>부가세 포함</p>
                    </div>
                    {paymentMethod === 'cash' && <Check className="w-5 h-5 ml-2" style={{ color: theme.accent }} />}
                  </div>
                </button>
              </div>
            )}

            {/* 결제 요약 */}
            {selectedPlan && (
              <div className="mt-6 p-4 rounded-xl" style={{ backgroundColor: theme.bgCard }}>
                <div className="flex justify-between mb-2">
                  <span style={{ color: theme.textMuted }}>선택 요금제</span>
                  <span className="font-medium" style={{ color: theme.textPrimary }}>{selectedPlan.name}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span style={{ color: theme.textMuted }}>이용 기간</span>
                  <span className="font-medium" style={{ color: theme.textPrimary }}>{selectedPlan.duration_days}일</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span style={{ color: theme.textMuted }}>결제 수단</span>
                  <span className="font-medium" style={{ color: theme.textPrimary }}>
                    {paymentMethod === 'card' ? (selectedCard ? `${selectedCard.card_company} (${selectedCard.card_number})` : '카드 선택 필요') : '무통장 입금'}
                  </span>
                </div>
                <div className="pt-2 border-t space-y-1" style={{ borderColor: theme.border }}>
                  <div className="flex justify-between">
                    <span style={{ color: theme.textMuted }}>공급가액</span>
                    <span style={{ color: theme.textPrimary }}>{selectedPlan.price.toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: theme.textMuted }}>부가세 (10%)</span>
                    <span style={{ color: theme.textPrimary }}>{Math.round(selectedPlan.price * 0.1).toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between pt-2">
                    <span className="font-bold" style={{ color: theme.textPrimary }}>총 결제금액</span>
                    <span className="text-xl font-bold" style={{ color: theme.accent }}>{Math.round(selectedPlan.price * 1.1).toLocaleString()}원</span>
                  </div>
                </div>
              </div>
            )}

            <div className="p-4 rounded-xl" style={{ backgroundColor: theme.bgInput }}>
              <p className="text-sm" style={{ color: theme.textSecondary }}>
                결제 완료 후 <strong>24시간 내 자동 승인</strong>됩니다.<br/>
                관리자가 먼저 확인하면 더 빨리 승인될 수 있어요.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* 하단 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 p-4" style={{ backgroundColor: theme.bgCard, borderTop: `1px solid ${theme.border}` }}>
        <div className="max-w-[640px] mx-auto">
          {step === 1 && (
            <button
              onClick={() => validateStep1() && setStep(2)}
              className="w-full py-4 rounded-xl font-bold"
              style={{ backgroundColor: theme.accent, color: isDark ? '#121212' : '#FFF' }}
            >
              다음
            </button>
          )}
          {step === 2 && (
            <button
              onClick={() => validateStep2() && setStep(3)}
              className="w-full py-4 rounded-xl font-bold"
              style={{ backgroundColor: theme.accent, color: isDark ? '#121212' : '#FFF' }}
            >
              다음
            </button>
          )}
          {step === 3 && (
            <button
              onClick={paymentMethod === 'card' ? handleCardPayment : handleCashPayment}
              disabled={submitting || !selectedPlan || (paymentMethod === 'card' && !selectedCard)}
              className="w-full py-4 rounded-xl font-bold"
              style={{
                backgroundColor: (selectedPlan && (paymentMethod === 'cash' || selectedCard)) ? theme.accent : theme.bgInput,
                color: (selectedPlan && (paymentMethod === 'cash' || selectedCard)) ? (isDark ? '#121212' : '#FFF') : theme.textMuted
              }}
            >
              {submitting ? '처리 중...' : (
                paymentMethod === 'card' 
                  ? (selectedPlan ? `${Math.round(selectedPlan.price * 1.1).toLocaleString()}원 결제하기` : '요금제를 선택하세요')
                  : (selectedPlan ? `${Math.round(selectedPlan.price * 1.1).toLocaleString()}원 무통장 입금 신청` : '요금제를 선택하세요')
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
