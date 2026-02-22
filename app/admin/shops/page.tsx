"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/contexts/ThemeContext";
import {
  ArrowLeft,
  Store,
  Clock,
  CheckCircle,
  XCircle,
  ChevronRight,
  X,
  Phone,
  MapPin,
  User,
  Mail,
  Calendar,
  FileText,
  AlertTriangle,
} from "lucide-react";

interface Shop {
  id: number;
  user_id: string;
  name: string;
  description: string;
  category: string;
  phone: string;
  address: string;
  address_detail: string;
  business_hours: string;
  closed_days: string;
  logo_url: string;
  banner_url: string;
  business_registration_url: string;
  business_number: string;
  approval_status: string;
  approval_note: string;
  created_at: string;
  profiles: { nickname: string; email: string; phone: string };
}

export default function AdminShopsPage() {
  const router = useRouter();
  const { theme, isDark, mounted } = useTheme();
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [shops, setShops] = useState<Shop[]>([]);
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  useEffect(() => { checkAdmin(); }, []);
  useEffect(() => { if (isAdmin) fetchShops(); }, [isAdmin, activeTab]);

  const checkAdmin = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) { router.push("/login"); return; }

    const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (profile?.role !== "admin") { alert("관리자 권한이 없습니다"); router.push("/"); return; }

    setIsAdmin(true);
    setLoading(false);
  };

  const fetchShops = async () => {
    const { data } = await supabase
      .from("shops")
      .select(`*, profiles:user_id (nickname, email, phone)`)
      .eq("approval_status", activeTab)
      .order("created_at", { ascending: activeTab === "pending" });
    setShops(data || []);
  };

  const handleApprove = async (shop: Shop) => {
    if (!confirm(`"${shop.name}" 승인하시겠습니까?`)) return;
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;

    await supabase.from("shops").update({
      approval_status: "approved",
      is_active: true,
      approved_at: new Date().toISOString(),
      approved_by: user?.id
    }).eq("id", shop.id);

    alert("승인되었습니다");
    fetchShops();
    setSelectedShop(null);
  };

  const handleReject = async (shop: Shop) => {
    if (!rejectNote.trim()) { alert("거절 사유를 입력해주세요"); return; }

    await supabase.from("shops").update({
      approval_status: "rejected",
      approval_note: rejectNote
    }).eq("id", shop.id);

    alert("거절되었습니다");
    fetchShops();
    setSelectedShop(null);
    setRejectNote("");
  };

  const formatDate = (d: string) => new Date(d).toLocaleString("ko-KR");

  const tabs = [
    { key: "pending", label: "대기", icon: Clock, count: null },
    { key: "approved", label: "승인", icon: CheckCircle, count: null },
    { key: "rejected", label: "거절", icon: XCircle, count: null },
  ];

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
      <header className="sticky top-0 z-50" style={{ backgroundColor: theme.bgElevated, borderBottom: `1px solid ${theme.borderLight}` }}>
        <div className="max-w-[640px] mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1 -ml-1 rounded-lg" style={{ color: theme.textPrimary }}>
            <ArrowLeft className="w-6 h-6" strokeWidth={1.5} />
          </button>
          <h1 className="text-lg font-bold" style={{ color: theme.textPrimary }}>🏪 상점 승인</h1>
        </div>
      </header>

      <main className="max-w-[640px] mx-auto">
        {/* 탭 */}
        <div className="flex" style={{ backgroundColor: theme.bgCard, borderBottom: `1px solid ${theme.border}` }}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className="flex-1 py-3 font-medium relative flex items-center justify-center gap-1.5 transition-colors"
              style={{ color: activeTab === tab.key ? theme.accent : theme.textMuted }}
            >
              <tab.icon className="w-4 h-4" strokeWidth={1.5} />
              {tab.label}
              {activeTab === tab.key && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ backgroundColor: theme.accent }} />
              )}
            </button>
          ))}
        </div>

        {/* 목록 */}
        <div className="p-4 space-y-3">
          {shops.length === 0 ? (
            <div className="rounded-2xl p-10 text-center" style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}>
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: theme.bgInput }}>
                <Store className="w-7 h-7" style={{ color: theme.textMuted }} strokeWidth={1.5} />
              </div>
              <p style={{ color: theme.textMuted }}>
                {activeTab === "pending" ? "대기중인 상점 없음" : activeTab === "approved" ? "승인된 상점 없음" : "거절된 상점 없음"}
              </p>
            </div>
          ) : (
            shops.map(shop => (
              <div 
                key={shop.id} 
                onClick={() => setSelectedShop(shop)}
                className="rounded-2xl overflow-hidden cursor-pointer transition-shadow"
                style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}
              >
                <div className="flex">
                  <div className="w-20 h-20 flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: theme.bgInput }}>
                    {shop.logo_url ? (
                      <img src={shop.logo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Store className="w-8 h-8" style={{ color: theme.textMuted }} strokeWidth={1.5} />
                    )}
                  </div>

                  <div className="flex-1 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold" style={{ color: theme.textPrimary }}>{shop.name}</h3>
                      <span 
                        className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                        style={{
                          backgroundColor: shop.approval_status === "pending" ? `${theme.accent}20` : shop.approval_status === "approved" ? theme.successBg : theme.redBg,
                          color: shop.approval_status === "pending" ? theme.accent : shop.approval_status === "approved" ? theme.success : theme.red
                        }}
                      >
                        {shop.approval_status === "pending" ? "대기" : shop.approval_status === "approved" ? "승인" : "거절"}
                      </span>
                    </div>
                    <p className="text-sm" style={{ color: theme.textSecondary }}>{shop.category} · {shop.address}</p>
                    <p className="text-xs mt-1" style={{ color: theme.textMuted }}>{formatDate(shop.created_at)}</p>
                  </div>

                  <div className="flex items-center pr-3">
                    <ChevronRight className="w-5 h-5" style={{ color: theme.textMuted }} strokeWidth={1.5} />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* 상세 모달 */}
      {selectedShop && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={() => setSelectedShop(null)}>
          <div className="rounded-2xl w-full max-w-[640px] max-h-[90vh] overflow-y-auto" style={{ backgroundColor: theme.bgCard }} onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 px-4 py-4 flex items-center justify-between" style={{ backgroundColor: theme.bgCard, borderBottom: `1px solid ${theme.border}` }}>
              <h3 className="font-bold text-lg" style={{ color: theme.textPrimary }}>상점 상세정보</h3>
              <button onClick={() => setSelectedShop(null)} className="p-1 rounded-lg" style={{ color: theme.textMuted }}>
                <X className="w-6 h-6" strokeWidth={1.5} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* 이미지 */}
              <div className="flex gap-4">
                {selectedShop.banner_url && (
                  <div className="flex-1 h-32 rounded-xl overflow-hidden" style={{ backgroundColor: theme.bgInput }}>
                    <img src={selectedShop.banner_url} alt="배너" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: theme.bgInput }}>
                  {selectedShop.logo_url ? (
                    <img src={selectedShop.logo_url} alt="로고" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl font-bold" style={{ color: theme.accent }}>{selectedShop.name[0]}</span>
                  )}
                </div>
              </div>

              {/* 기본 정보 */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="flex items-center gap-1" style={{ color: theme.textMuted }}>
                    <Store className="w-3 h-3" strokeWidth={1.5} /> 상점명
                  </span>
                  <p className="font-medium" style={{ color: theme.textPrimary }}>{selectedShop.name}</p>
                </div>
                <div>
                  <span style={{ color: theme.textMuted }}>업종</span>
                  <p className="font-medium" style={{ color: theme.textPrimary }}>{selectedShop.category}</p>
                </div>
                <div>
                  <span className="flex items-center gap-1" style={{ color: theme.textMuted }}>
                    <Phone className="w-3 h-3" strokeWidth={1.5} /> 전화
                  </span>
                  <p className="font-medium" style={{ color: theme.textPrimary }}>{selectedShop.phone}</p>
                </div>
                <div>
                  <span style={{ color: theme.textMuted }}>영업시간</span>
                  <p className="font-medium" style={{ color: theme.textPrimary }}>{selectedShop.business_hours || "-"}</p>
                </div>
                <div className="col-span-2">
                  <span className="flex items-center gap-1" style={{ color: theme.textMuted }}>
                    <MapPin className="w-3 h-3" strokeWidth={1.5} /> 주소
                  </span>
                  <p className="font-medium" style={{ color: theme.textPrimary }}>{selectedShop.address}</p>
                </div>
              </div>

              {/* 신청자 정보 */}
              <div className="rounded-xl p-4" style={{ backgroundColor: theme.bgInput }}>
                <h4 className="font-bold mb-2 flex items-center gap-1" style={{ color: theme.textPrimary }}>
                  <User className="w-4 h-4" strokeWidth={1.5} /> 신청자
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span style={{ color: theme.textMuted }}>닉네임: </span><span style={{ color: theme.textPrimary }}>{selectedShop.profiles?.nickname || "-"}</span></div>
                  <div><span style={{ color: theme.textMuted }}>이메일: </span><span style={{ color: theme.textPrimary }}>{selectedShop.profiles?.email || "-"}</span></div>
                  <div><span style={{ color: theme.textMuted }}>신청일: </span><span style={{ color: theme.textPrimary }}>{formatDate(selectedShop.created_at)}</span></div>
                </div>
              </div>

              {/* 사업자등록증 */}
              <div className="rounded-xl p-4" style={{ backgroundColor: `${theme.accent}15`, border: `1px solid ${theme.accent}30` }}>
                <h4 className="font-bold mb-2 flex items-center gap-1" style={{ color: theme.accent }}>
                  <FileText className="w-4 h-4" strokeWidth={1.5} /> 사업자등록증
                </h4>
                {selectedShop.business_number && <p className="text-sm mb-2" style={{ color: theme.textSecondary }}>사업자번호: {selectedShop.business_number}</p>}
                {selectedShop.business_registration_url ? (
                  <a href={selectedShop.business_registration_url} target="_blank" rel="noopener noreferrer">
                    <img src={selectedShop.business_registration_url} alt="사업자등록증" className="max-h-64 rounded-lg border" style={{ borderColor: theme.border }} />
                    <p className="text-xs mt-2" style={{ color: theme.accent }}>클릭하여 크게 보기</p>
                  </a>
                ) : (
                  <p style={{ color: theme.red }}>⚠️ 사업자등록증 없음</p>
                )}
              </div>

              {/* 거절 사유 */}
              {selectedShop.approval_status === "rejected" && selectedShop.approval_note && (
                <div className="rounded-xl p-4" style={{ backgroundColor: theme.redBg, border: `1px solid ${theme.red}30` }}>
                  <h4 className="font-bold mb-1 flex items-center gap-1" style={{ color: theme.red }}>
                    <AlertTriangle className="w-4 h-4" strokeWidth={1.5} /> 거절 사유
                  </h4>
                  <p style={{ color: theme.textSecondary }}>{selectedShop.approval_note}</p>
                </div>
              )}

              {/* 승인/거절 버튼 */}
              {selectedShop.approval_status === "pending" && (
                <div className="space-y-3 pt-4" style={{ borderTop: `1px solid ${theme.border}` }}>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: theme.textPrimary }}>거절 사유</label>
                    <textarea 
                      value={rejectNote} 
                      onChange={(e) => setRejectNote(e.target.value)}
                      placeholder="거절 시 사유 입력" 
                      rows={2}
                      className="w-full px-3 py-2 rounded-xl resize-none outline-none"
                      style={{ backgroundColor: theme.bgInput, border: `1px solid ${theme.border}`, color: theme.textPrimary }}
                    />
                  </div>

                  <div className="flex gap-3">
                    <button 
                      onClick={() => handleReject(selectedShop)}
                      className="flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-1"
                      style={{ backgroundColor: theme.red, color: '#FFF' }}
                    >
                      <XCircle className="w-5 h-5" strokeWidth={1.5} /> 거절
                    </button>
                    <button 
                      onClick={() => handleApprove(selectedShop)}
                      className="flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-1"
                      style={{ backgroundColor: theme.success, color: '#FFF' }}
                    >
                      <CheckCircle className="w-5 h-5" strokeWidth={1.5} /> 승인
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
