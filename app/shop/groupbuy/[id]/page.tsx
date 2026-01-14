"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/contexts/ThemeContext";
import { ArrowLeft, Home, Sun, Moon, Users, RotateCcw } from "lucide-react";

interface Participant {
  id: number;
  name: string;
  phone: string;
  quantity: number;
  status: string;
  created_at: string;
  paid_at?: string;
  picked_at?: string;
  user_id?: string;
}

interface GroupBuy {
  id: number;
  title: string;
  sale_price: number;
  current_quantity: number;
  min_quantity: number;
  image_url?: string;
  shop: {
    id: number;
    name: string;
    user_id: string;
  };
}

export default function ShopGroupBuyManagePage() {
  const params = useParams();
  const router = useRouter();
  const { theme, isDark, mounted, toggleTheme } = useTheme();
  
  const [groupBuy, setGroupBuy] = useState<GroupBuy | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [user, setUser] = useState<any>(null);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, params.id]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }
    setUser(user);
  };

  const fetchData = async () => {
    // 공구 정보 가져오기
    const { data: gbData } = await supabase
      .from("group_buys")
      .select("*, shop:shops(id, name, user_id)")
      .eq("id", params.id)
      .single();

    if (!gbData) {
      alert("공구를 찾을 수 없습니다");
      router.back();
      return;
    }

    // 본인 상점인지 확인
    if (gbData.shop?.user_id !== user.id) {
      alert("접근 권한이 없습니다");
      router.back();
      return;
    }

    setGroupBuy(gbData);
    setIsOwner(true);

    // 참여자 목록 가져오기
    const { data: pData } = await supabase
      .from("group_buy_participants")
      .select("*")
      .eq("group_buy_id", params.id)
      .order("created_at", { ascending: false });

    setParticipants(pData || []);
    setLoading(false);
  };

  // 상태 변경 (미입금 → 입금확인 → 픽업완료)
  const handleStatusChange = async (participant: Participant) => {
    let newStatus = "";
    let updateData: any = {};

    if (participant.status === "unpaid") {
      newStatus = "paid";
      updateData = { status: "paid", paid_at: new Date().toISOString() };
    } else if (participant.status === "paid") {
      newStatus = "picked";
      updateData = { status: "picked", picked_at: new Date().toISOString() };
    } else {
      return; // 이미 픽업완료거나 취소면 변경 안함
    }

    const { error } = await supabase
      .from("group_buy_participants")
      .update(updateData)
      .eq("id", participant.id);

    if (error) {
      alert("상태 변경 실패: " + error.message);
      return;
    }

    // 목록 새로고침
    setParticipants(prev =>
      prev.map(p => p.id === participant.id ? { ...p, ...updateData } : p)
    );
  };

  // 되돌리기 (입금확인 → 미입금, 픽업완료 → 입금확인)
  const handleRevert = async (participant: Participant) => {
    let newStatus = "";
    let updateData: any = {};

    if (participant.status === "paid") {
      newStatus = "unpaid";
      updateData = { status: "unpaid", paid_at: null };
    } else if (participant.status === "picked") {
      newStatus = "paid";
      updateData = { status: "paid", picked_at: null };
    } else {
      return;
    }

    if (!confirm("이전 상태로 되돌리시겠습니까?")) return;

    const { error } = await supabase
      .from("group_buy_participants")
      .update(updateData)
      .eq("id", participant.id);

    if (error) {
      alert("되돌리기 실패: " + error.message);
      return;
    }

    setParticipants(prev =>
      prev.map(p => p.id === participant.id ? { ...p, ...updateData } : p)
    );
  };

  // 취소 처리
  const handleCancel = async (participant: Participant) => {
    if (!confirm(`${participant.name}님의 주문을 취소하시겠습니까?`)) return;

    const { error } = await supabase
      .from("group_buy_participants")
      .update({ status: "cancelled" })
      .eq("id", participant.id);

    if (error) {
      alert("취소 실패: " + error.message);
      return;
    }

    setParticipants(prev =>
      prev.map(p => p.id === participant.id ? { ...p, status: "cancelled" } : p)
    );
  };

  // 필터링된 참여자
  const filteredParticipants = filter === "all"
    ? participants
    : participants.filter(p => p.status === filter);

  // 통계
  const unpaidCount = participants.filter(p => p.status === "unpaid").length;
  const paidCount = participants.filter(p => p.status === "paid").length;
  const pickedCount = participants.filter(p => p.status === "picked").length;
  const cancelledCount = participants.filter(p => p.status === "cancelled").length;
  const totalAmount = participants
    .filter(p => p.status !== "cancelled")
    .reduce((sum, p) => sum + (p.quantity * (groupBuy?.sale_price || 0)), 0);

  // 상태 뱃지
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "unpaid":
        return { text: "미입금", bg: theme.red, color: "#fff" };
      case "paid":
        return { text: "입금확인", bg: "#F59E0B", color: "#fff" };
      case "picked":
        return { text: "픽업완료", bg: "#3B82F6", color: "#fff" };
      case "cancelled":
        return { text: "취소", bg: theme.textMuted, color: "#fff" };
      default:
        return { text: "확인중", bg: theme.bgInput, color: theme.textMuted };
    }
  };

  // 다음 상태 버튼 텍스트
  const getNextStatusText = (status: string) => {
    switch (status) {
      case "unpaid":
        return "입금확인";
      case "paid":
        return "픽업완료";
      default:
        return null;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`;
  };

  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.bgMain }}>
        <div className="w-10 h-10 border-4 rounded-full animate-spin" style={{ borderColor: theme.border, borderTopColor: theme.accent }}></div>
      </div>
    );
  }

  if (!groupBuy || !isOwner) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.bgMain }}>
        <p style={{ color: theme.textPrimary }}>접근 권한이 없습니다</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8" style={{ backgroundColor: theme.bgMain }}>
      {/* 헤더 */}
      <header className="sticky top-0 z-50 border-b" style={{ backgroundColor: theme.bgCard, borderColor: theme.borderLight }}>
        <div className="max-w-[640px] mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center">
              <ArrowLeft className="w-5 h-5" style={{ color: theme.textPrimary }} />
            </button>
            <h1 className="font-bold" style={{ color: theme.textPrimary }}>참여자 관리</h1>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={toggleTheme} className="w-10 h-10 flex items-center justify-center">
              {isDark ? <Sun className="w-5 h-5" style={{ color: theme.accent }} /> : <Moon className="w-5 h-5" style={{ color: theme.accent }} />}
            </button>
            <Link href="/" className="w-10 h-10 flex items-center justify-center">
              <Home className="w-5 h-5" style={{ color: theme.textSecondary }} />
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-[640px] mx-auto px-4 py-4">
        {/* 공구 정보 */}
        <div className="rounded-2xl p-4 mb-4 flex items-center gap-4" style={{ backgroundColor: theme.bgCard }}>
          {groupBuy.image_url ? (
            <img src={groupBuy.image_url} alt="" className="w-16 h-16 rounded-xl object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-xl flex items-center justify-center" style={{ backgroundColor: theme.bgInput }}>
              <span className="text-2xl">🛒</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-bold truncate" style={{ color: theme.textPrimary }}>{groupBuy.title}</p>
            <p className="text-sm" style={{ color: theme.textMuted }}>{groupBuy.sale_price.toLocaleString()}원</p>
          </div>
        </div>

        {/* 상세 통계 */}
        <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: theme.bgCard }}>
          <div className="grid grid-cols-2 gap-3">
            {/* 총 주문 */}
            <div className="p-3 rounded-xl" style={{ backgroundColor: theme.bgInput }}>
              <p className="text-xs mb-1" style={{ color: theme.textMuted }}>총 주문</p>
              <p className="text-xl font-black" style={{ color: theme.textPrimary }}>
                {participants.filter(p => p.status !== "cancelled").length}건
              </p>
              <p className="text-sm font-bold" style={{ color: theme.accent }}>
                {totalAmount.toLocaleString()}원
              </p>
            </div>
            
            {/* 입금 완료 */}
            <div className="p-3 rounded-xl" style={{ backgroundColor: "#F59E0B15" }}>
              <p className="text-xs mb-1" style={{ color: "#F59E0B" }}>입금 완료</p>
              <p className="text-xl font-black" style={{ color: "#F59E0B" }}>
                {paidCount + pickedCount}건
              </p>
              <p className="text-sm font-bold" style={{ color: "#F59E0B" }}>
                {participants
                  .filter(p => p.status === "paid" || p.status === "picked")
                  .reduce((sum, p) => sum + (p.quantity * (groupBuy?.sale_price || 0)), 0)
                  .toLocaleString()}원
              </p>
            </div>
          </div>
          
          {/* 하단 상태별 요약 */}
          <div className="flex items-center justify-between mt-3 pt-3 text-xs" style={{ borderTop: `1px solid ${theme.border}` }}>
            <span style={{ color: theme.red }}>미입금 {unpaidCount}건</span>
            <span style={{ color: "#F59E0B" }}>입금확인 {paidCount}건</span>
            <span style={{ color: "#3B82F6" }}>픽업완료 {pickedCount}건</span>
            <span style={{ color: theme.textMuted }}>취소 {cancelledCount}건</span>
          </div>
        </div>

        {/* 필터 버튼 */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setFilter("all")}
            className={`flex-1 py-2 rounded-xl text-sm font-medium ${filter === "all" ? "ring-2" : ""}`}
            style={{ 
              backgroundColor: theme.bgCard,
              color: theme.textPrimary,
              ringColor: theme.accent
            }}
          >
            전체
          </button>
          <button
            onClick={() => setFilter("unpaid")}
            className={`flex-1 py-2 rounded-xl text-sm font-medium ${filter === "unpaid" ? "ring-2" : ""}`}
            style={{ 
              backgroundColor: `${theme.red}15`,
              color: theme.red,
              ringColor: theme.red
            }}
          >
            미입금
          </button>
          <button
            onClick={() => setFilter("paid")}
            className={`flex-1 py-2 rounded-xl text-sm font-medium ${filter === "paid" ? "ring-2" : ""}`}
            style={{ 
              backgroundColor: "#F59E0B15",
              color: "#F59E0B",
              ringColor: "#F59E0B"
            }}
          >
            입금확인
          </button>
          <button
            onClick={() => setFilter("picked")}
            className={`flex-1 py-2 rounded-xl text-sm font-medium ${filter === "picked" ? "ring-2" : ""}`}
            style={{ 
              backgroundColor: "#3B82F615",
              color: "#3B82F6",
              ringColor: "#3B82F6"
            }}
          >
            픽업완료
          </button>
        </div>


        {/* 필터 표시 & 전체보기 */}
        {filter !== "all" && (
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-sm" style={{ color: theme.textMuted }}>
              <strong style={{ color: theme.textPrimary }}>
                {filter === "unpaid" ? "미입금" : filter === "paid" ? "입금확인" : filter === "picked" ? "픽업완료" : "취소"}
              </strong> 목록 ({filteredParticipants.length}명)
            </span>
            <button onClick={() => setFilter("all")} className="text-sm font-medium" style={{ color: theme.accent }}>
              전체보기
            </button>
          </div>
        )}

        {/* 안내 문구 */}
        <p className="text-xs mb-3 px-1" style={{ color: theme.textMuted }}>
          💡 버튼을 누르면 다음 단계로 변경돼요 (미입금→입금확인→픽업완료)
        </p>

        {/* 참여자 목록 */}
        {filteredParticipants.length === 0 ? (
          <div className="rounded-2xl p-12 text-center" style={{ backgroundColor: theme.bgCard }}>
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: theme.bgInput }}>
              <Users className="w-8 h-8" style={{ color: theme.textMuted }} />
            </div>
            <p className="font-medium" style={{ color: theme.textPrimary }}>
              {filter === "all" ? "아직 참여자가 없어요" : "해당 상태의 참여자가 없습니다"}
            </p>
            {filter !== "all" && (
              <button onClick={() => setFilter("all")} className="text-sm mt-2" style={{ color: theme.accent }}>
                전체보기
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredParticipants.map((p, idx) => {
              const badge = getStatusBadge(p.status);
              const isCancelled = p.status === "cancelled";

              return (
                <div
                  key={p.id}
                  className={`rounded-xl p-3 flex items-center gap-3 ${isCancelled ? "opacity-50" : ""}`}
                  style={{ backgroundColor: theme.bgCard }}
                >
                  {/* 번호 */}
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                    style={{ backgroundColor: badge.bg, color: badge.color }}
                  >
                    {idx + 1}
                  </div>

                  {/* 이름 + 수량/금액 (한 줄) */}
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <p className="font-bold text-base" style={{ color: theme.textPrimary }}>{p.name}</p>
                    <p className="text-xs" style={{ color: theme.textMuted }}>
                      {p.quantity}개 · {(p.quantity * (groupBuy?.sale_price || 0)).toLocaleString()}원
                    </p>
                  </div>

                  {/* 상태 버튼 */}
                  {!isCancelled ? (
                    <div className="flex items-center flex-shrink-0">
                      {/* 이전 단계 버튼 */}
                      {(p.status === "paid" || p.status === "picked") && (
                        <button
                          onClick={() => handleRevert(p)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center mr-3"
                          style={{ backgroundColor: theme.bgInput }}
                          title="이전 단계로"
                        >
                          <RotateCcw className="w-4 h-4" style={{ color: theme.textMuted }} />
                        </button>
                      )}

                      {/* 취소 버튼 (미입금만) - 왼쪽에 */}
                      {p.status === "unpaid" && (
                        <button
                          onClick={() => handleCancel(p)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center mr-3"
                          style={{ backgroundColor: theme.bgInput, color: theme.textMuted }}
                          title="취소"
                        >
                          ✕
                        </button>
                      )}

                      {/* 현재 상태 → 다음 상태 버튼 */}
                      {p.status === "unpaid" && (
                        <button
                          onClick={() => handleStatusChange(p)}
                          className="px-4 py-2 rounded-xl text-sm font-bold"
                          style={{ backgroundColor: theme.red, color: "#fff" }}
                        >
                          미입금
                        </button>
                      )}
                      {p.status === "paid" && (
                        <button
                          onClick={() => handleStatusChange(p)}
                          className="px-4 py-2 rounded-xl text-sm font-bold"
                          style={{ backgroundColor: "#F59E0B", color: "#fff" }}
                        >
                          입금확인
                        </button>
                      )}
                      {p.status === "picked" && (
                        <span
                          className="px-4 py-2 rounded-xl text-sm font-bold"
                          style={{ backgroundColor: "#3B82F6", color: "#fff" }}
                        >
                          픽업완료
                        </span>
                      )}
                    </div>
                  ) : (
                    <span
                      className="px-4 py-2 rounded-xl text-sm font-bold flex-shrink-0"
                      style={{ backgroundColor: theme.bgInput, color: theme.textMuted }}
                    >
                      취소됨
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
