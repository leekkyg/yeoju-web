"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/contexts/ThemeContext";
import { ChevronLeft, Store, Save } from "lucide-react";

export default function ShopInfoPage() {
  const router = useRouter();
  const { theme, isDark, mounted } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [shop, setShop] = useState<any>(null);
  
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankHolder, setBankHolder] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  useEffect(() => {
    fetchShop();
  }, []);

  const fetchShop = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const { data: shopData, error } = await supabase
      .from("shops")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error || !shopData) {
      router.push("/shop/register");
      return;
    }

    setShop(shopData);
    setName(shopData.name || "");
    setCategory(shopData.category || "");
    setDescription(shopData.description || "");
    setAddress(shopData.address || "");
    setPhone(shopData.phone || "");
    setBankName(shopData.bank_name || "");
    setBankAccount(shopData.bank_account || "");
    setBankHolder(shopData.bank_holder || "");
    setLogoUrl(shopData.logo_url || "");
    setLoading(false);
  };

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

  const handleSave = async () => {
    if (!name.trim()) {
      alert("상점명을 입력해주세요");
      return;
    }

    setSaving(true);
    
    const { error } = await supabase
      .from("shops")
      .update({
        name,
        category,
        description,
        address,
        phone,
        bank_name: bankName,
        bank_account: bankAccount,
        bank_holder: bankHolder,
        logo_url: logoUrl,
      })
      .eq("id", shop.id);

    if (error) {
      alert("저장 중 오류가 발생했습니다: " + error.message);
    } else {
      alert("상점 정보가 저장되었습니다");
    }
    
    setSaving(false);
  };

  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.bgMain }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: theme.accent }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: theme.bgMain }}>
      {/* 헤더 */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b" style={{ backgroundColor: theme.bgCard, borderColor: theme.border }}>
        <div className="max-w-[640px] mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center">
            <ChevronLeft className="w-6 h-6" style={{ color: theme.textSecondary }} />
          </button>
          <span className="font-bold" style={{ color: theme.textPrimary }}>상점 정보</span>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="w-10 h-10 flex items-center justify-center"
          >
            <Save className="w-5 h-5" style={{ color: theme.accent }} />
          </button>
        </div>
      </header>

      <main className="pt-14 max-w-[640px] mx-auto px-4">
        {/* 로고 */}
        <div className="py-6 flex flex-col items-center">
          <div 
            className="w-24 h-24 rounded-2xl flex items-center justify-center overflow-hidden"
            style={{ backgroundColor: theme.bgInput, border: `2px solid ${theme.border}` }}
          >
            {logoUrl ? (
              <img src={logoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <Store className="w-10 h-10" style={{ color: theme.textMuted }} />
            )}
          </div>
          <p className="text-sm mt-2" style={{ color: theme.textMuted }}>{name}</p>
        </div>

        {/* 기본 정보 (수정 불가) */}
        <section className="mb-6">
          <h3 className="text-sm font-bold mb-3 px-1" style={{ color: theme.textPrimary }}>기본 정보</h3>
          <div className="rounded-2xl overflow-hidden opacity-60" style={{ backgroundColor: theme.bgInput, border: `1px solid ${theme.border}` }}>
            <div className="p-4 border-b" style={{ borderColor: theme.border }}>
              <label className="text-xs mb-1 block" style={{ color: theme.textMuted }}>상점명</label>
              <p style={{ color: theme.textMuted }}>{name || "-"}</p>
            </div>
            <div className="p-4">
              <label className="text-xs mb-1 block" style={{ color: theme.textMuted }}>카테고리</label>
              <p style={{ color: theme.textMuted }}>{category || "-"}</p>
            </div>
          </div>
        </section>

        {/* 정산 정보 (수정 불가) */}
        <section className="mb-6">
          <h3 className="text-sm font-bold mb-3 px-1" style={{ color: theme.textPrimary }}>정산 정보</h3>
          <div className="rounded-2xl overflow-hidden opacity-60" style={{ backgroundColor: theme.bgInput, border: `1px solid ${theme.border}` }}>
            <div className="p-4 border-b" style={{ borderColor: theme.border }}>
              <label className="text-xs mb-1 block" style={{ color: theme.textMuted }}>은행명</label>
              <p style={{ color: theme.textMuted }}>{bankName || "-"}</p>
            </div>
            <div className="p-4 border-b" style={{ borderColor: theme.border }}>
              <label className="text-xs mb-1 block" style={{ color: theme.textMuted }}>계좌번호</label>
              <p style={{ color: theme.textMuted }}>{bankAccount || "-"}</p>
            </div>
            <div className="p-4">
              <label className="text-xs mb-1 block" style={{ color: theme.textMuted }}>예금주</label>
              <p style={{ color: theme.textMuted }}>{bankHolder || "-"}</p>
            </div>
          </div>
          <p className="text-xs mt-2 px-1" style={{ color: theme.textMuted }}>
            ※ 상점명, 카테고리, 정산 정보 변경은 고객센터로 문의해주세요.
          </p>
        </section>

        {/* 수정 가능 정보 */}
        <section className="mb-6">
          <h3 className="text-sm font-bold mb-3 px-1" style={{ color: theme.textPrimary }}>상점 정보 수정</h3>
          <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.border}` }}>
            <div className="p-4 border-b" style={{ borderColor: theme.border }}>
              <label className="text-xs mb-1 block" style={{ color: theme.textMuted }}>상점 소개</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="상점을 소개해주세요"
                rows={3}
                className="w-full bg-transparent focus:outline-none resize-none"
                style={{ color: theme.textPrimary }}
              />
            </div>
            <div className="p-4 border-b" style={{ borderColor: theme.border }}>
              <label className="text-xs mb-1 block" style={{ color: theme.textMuted }}>주소</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="상점 주소를 입력하세요"
                className="w-full bg-transparent focus:outline-none"
                style={{ color: theme.textPrimary }}
              />
            </div>
            <div className="p-4">
              <label className="text-xs mb-1 block" style={{ color: theme.textMuted }}>연락처</label>
              <input
                type="tel"
                value={phone}
                onChange={handlePhoneChange}
                placeholder="010-0000-0000"
                className="w-full bg-transparent focus:outline-none"
                style={{ color: theme.textPrimary }}
              />
            </div>
          </div>
        </section>

        {/* 승인 상태 */}
        <section className="mb-6">
          <div 
            className="rounded-2xl p-4 flex items-center justify-between"
            style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.border}` }}
          >
            <span style={{ color: theme.textPrimary }}>승인 상태</span>
            <span 
              className="px-3 py-1 rounded-full text-sm font-bold"
              style={{ 
                backgroundColor: shop?.approval_status === "approved" ? `${theme.accent}20` : `${theme.red}20`,
                color: shop?.approval_status === "approved" ? theme.accent : theme.red
              }}
            >
              {shop?.approval_status === "approved" ? "승인됨" : "대기중"}
            </span>
          </div>
        </section>
      </main>

      {/* 저장 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 border-t" style={{ backgroundColor: theme.bgCard, borderColor: theme.border }}>
        <div className="max-w-[640px] mx-auto px-4 py-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full h-14 font-bold text-lg rounded-2xl disabled:opacity-50"
            style={{ backgroundColor: theme.accent, color: isDark ? '#121212' : '#fff' }}
          >
            {saving ? "저장 중..." : "저장하기"}
          </button>
        </div>
      </div>
    </div>
  );
}
