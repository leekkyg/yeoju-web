"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

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
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [shops, setShops] = useState<Shop[]>([]);
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  useEffect(() => { checkAdmin(); }, []);
  useEffect(() => { if (isAdmin) fetchShops(); }, [isAdmin, activeTab]);

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { data: admin } = await supabase.from("admins").select("*").eq("user_id", user.id).single();
    if (!admin) { alert("관리자 권한이 없습니다"); router.push("/"); return; }

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
    const { data: { user } } = await supabase.auth.getUser();

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 헤더 */}
      <header className="bg-gray-900 sticky top-0 z-50">
        <div className="max-w-[631px] mx-auto px-4 h-14 flex items-center">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-white mr-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-white font-bold text-lg">🔐 상점 승인</h1>
        </div>
      </header>

      <main className="max-w-[631px] mx-auto">
        {/* 탭 */}
        <div className="bg-white flex border-b border-gray-100">
          {[
            { key: "pending", label: "대기", color: "amber" },
            { key: "approved", label: "승인", color: "green" },
            { key: "rejected", label: "거절", color: "red" }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex-1 py-3 font-medium relative ${activeTab === tab.key ? `text-${tab.color}-500` : "text-gray-500"}`}
            >
              {tab.label}
              {activeTab === tab.key && (
                <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${
                  tab.key === "pending" ? "bg-amber-500" : tab.key === "approved" ? "bg-green-500" : "bg-red-500"
                }`} />
              )}
            </button>
          ))}
        </div>

        {/* 목록 */}
        <div className="p-4 space-y-3">
          {shops.length === 0 ? (
            <div className="bg-white rounded-xl p-10 text-center text-gray-500">
              {activeTab === "pending" ? "대기중인 상점 없음" : activeTab === "approved" ? "승인된 상점 없음" : "거절된 상점 없음"}
            </div>
          ) : (
            shops.map(shop => (
              <div key={shop.id} onClick={() => setSelectedShop(shop)}
                className="bg-white rounded-xl overflow-hidden cursor-pointer hover:shadow-md transition-shadow">
                <div className="flex">
                  <div className="w-20 h-20 bg-gray-200 flex-shrink-0">
                    {shop.logo_url ? (
                      <img src={shop.logo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl">🏪</div>
                    )}
                  </div>

                  <div className="flex-1 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-gray-900">{shop.name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        shop.approval_status === "pending" ? "bg-amber-100 text-amber-700" :
                        shop.approval_status === "approved" ? "bg-green-100 text-green-700" :
                        "bg-red-100 text-red-700"
                      }`}>
                        {shop.approval_status === "pending" ? "대기" : shop.approval_status === "approved" ? "승인" : "거절"}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{shop.category} · {shop.address}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatDate(shop.created_at)}</p>
                  </div>

                  <div className="flex items-center pr-3">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* 상세 모달 */}
      {selectedShop && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-[631px] max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-4 py-4 flex items-center justify-between">
              <h3 className="font-bold text-lg">상점 상세정보</h3>
              <button onClick={() => setSelectedShop(null)} className="text-2xl text-gray-500">×</button>
            </div>

            <div className="p-4 space-y-4">
              {/* 이미지 */}
              <div className="flex gap-4">
                {selectedShop.banner_url && (
                  <div className="flex-1 h-32 bg-gray-100 rounded-xl overflow-hidden">
                    <img src={selectedShop.banner_url} alt="배너" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="w-24 h-24 bg-gray-800 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center">
                  {selectedShop.logo_url ? (
                    <img src={selectedShop.logo_url} alt="로고" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white text-3xl font-bold">{selectedShop.name[0]}</span>
                  )}
                </div>
              </div>

              {/* 기본 정보 */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-500">상점명</span><p className="font-medium">{selectedShop.name}</p></div>
                <div><span className="text-gray-500">업종</span><p className="font-medium">{selectedShop.category}</p></div>
                <div><span className="text-gray-500">전화</span><p className="font-medium">{selectedShop.phone}</p></div>
                <div><span className="text-gray-500">영업시간</span><p className="font-medium">{selectedShop.business_hours || "-"}</p></div>
                <div className="col-span-2"><span className="text-gray-500">주소</span><p className="font-medium">{selectedShop.address}</p></div>
              </div>

              {/* 신청자 정보 */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="font-bold mb-2">👤 신청자</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-gray-500">닉네임: </span>{selectedShop.profiles?.nickname || "-"}</div>
                  <div><span className="text-gray-500">이메일: </span>{selectedShop.profiles?.email || "-"}</div>
                  <div><span className="text-gray-500">신청일: </span>{formatDate(selectedShop.created_at)}</div>
                </div>
              </div>

              {/* 사업자등록증 */}
              <div className="bg-amber-50 rounded-xl p-4">
                <h4 className="font-bold text-amber-800 mb-2">📄 사업자등록증</h4>
                {selectedShop.business_number && <p className="text-sm mb-2">사업자번호: {selectedShop.business_number}</p>}
                {selectedShop.business_registration_url ? (
                  <a href={selectedShop.business_registration_url} target="_blank" rel="noopener noreferrer">
                    <img src={selectedShop.business_registration_url} alt="사업자등록증" className="max-h-64 rounded-lg border" />
                    <p className="text-xs text-amber-600 mt-2">클릭하여 크게 보기</p>
                  </a>
                ) : (
                  <p className="text-red-500">❌ 사업자등록증 없음</p>
                )}
              </div>

              {/* 거절 사유 */}
              {selectedShop.approval_status === "rejected" && selectedShop.approval_note && (
                <div className="bg-red-50 rounded-xl p-4">
                  <h4 className="font-bold text-red-800 mb-1">거절 사유</h4>
                  <p className="text-red-700">{selectedShop.approval_note}</p>
                </div>
              )}

              {/* 승인/거절 버튼 */}
              {selectedShop.approval_status === "pending" && (
                <div className="space-y-3 pt-4 border-t">
                  <div>
                    <label className="block text-sm font-medium mb-1">거절 사유</label>
                    <textarea value={rejectNote} onChange={(e) => setRejectNote(e.target.value)}
                      placeholder="거절 시 사유 입력" rows={2}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 resize-none" />
                  </div>

                  <div className="flex gap-3">
                    <button onClick={() => handleReject(selectedShop)}
                      className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold">❌ 거절</button>
                    <button onClick={() => handleApprove(selectedShop)}
                      className="flex-1 py-3 bg-green-500 text-white rounded-xl font-bold">✅ 승인</button>
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
