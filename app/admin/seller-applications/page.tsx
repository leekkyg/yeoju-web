"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/contexts/ThemeContext";
import {
  ArrowLeft,
  Check,
  X,
  Clock,
  Store,
  CreditCard,
  Calendar,
  User,
  Phone,
  ChevronDown,
  ChevronUp,
  Banknote,
} from "lucide-react";

interface Application {
  id: string;
  user_id: string;
  shop_id: number;
  plan_id: string;
  paid_amount: number;
  payment_key: string | null;
  payment_method: string; // 'card' | 'cash'
  paid_at: string | null;
  status: string;
  auto_approve_at: string;
  approved_at: string | null;
  approved_by: string | null;
  rejection_reason: string | null;
  created_at: string;
  // 조인된 데이터
  shop?: {
    id: number;
    name: string;
    phone: string;
    address: string;
    business_name: string;
    business_number: string;
    representative: string;
  };
  plan?: {
    name: string;
    price: number;
    duration_days: number;
  };
  user?: {
    email: string;
    nickname: string;
  };
}

export default function SellerApplicationsPage() {
  const router = useRouter();
  const { theme, isDark, mounted } = useTheme();

  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<Application[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);

  useEffect(() => {
    checkAdmin();
  }, []);

  useEffect(() => {
    if (!loading) fetchApplications();
  }, [filter, loading]);

  const checkAdmin = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) {
      router.push("/login");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("email", user.email)
      .single();

    if (profile?.role !== "admin") {
      alert("관리자 권한이 없습니다");
      router.push("/");
      return;
    }

    setLoading(false);
  };

  const fetchApplications = async () => {
    let query = supabase
      .from("seller_applications")
      .select(`
        *,
        shop:shops(id, name, phone, address, business_name, business_number, representative),
        plan:seller_plans(name, price, duration_days)
      `)
      .order("created_at", { ascending: false });

    if (filter !== 'all') {
      query = query.eq("status", filter);
    }

    const { data, error } = await query;
    
    if (data) {
      // 유저 정보 가져오기
      const userIds = [...new Set(data.map(a => a.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, nickname")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      const enriched = data.map(app => ({
        ...app,
        user: profileMap.get(app.user_id),
      }));

      setApplications(enriched);
    }
  };

  const handleApprove = async (app: Application) => {
    if (!confirm("이 신청을 승인하시겠습니까?")) return;

    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    
    // 신청 승인
    const { error: appError } = await supabase
      .from("seller_applications")
      .update({
        status: "approved",
        approved_at: new Date().toISOString(),
        approved_by: user?.id,
      })
      .eq("id", app.id);

    if (appError) {
      alert("오류: " + appError.message);
      return;
    }

    // 상점 승인 + tier 업데이트
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + (app.plan?.duration_days || 30));

    const { error: shopError } = await supabase
      .from("shops")
      .update({
        approval_status: "approved",
        tier: "basic", // 셀러 A등급
        tier_expires_at: validUntil.toISOString(),
      })
      .eq("id", app.shop_id);

    if (shopError) {
      alert("상점 업데이트 오류: " + shopError.message);
      return;
    }

    alert("승인되었습니다");
    fetchApplications();
  };

  const handleReject = async () => {
    if (!showRejectModal) return;
    if (!rejectReason.trim()) {
      alert("거절 사유를 입력해주세요");
      return;
    }

    const app = applications.find(a => a.id === showRejectModal);
    if (!app) {
      alert("신청 정보를 찾을 수 없습니다");
      return;
    }

    // 카드 결제인 경우 환불 처리
    if (app.payment_key && app.payment_method === 'card') {
      try {
        const cancelResponse = await fetch('/api/payments/cancel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentKey: app.payment_key,
            cancelReason: `셀러 신청 거절: ${rejectReason.trim()}`,
          }),
        });

        if (!cancelResponse.ok) {
          const cancelError = await cancelResponse.json();
          alert("결제 취소 실패: " + cancelError.message);
          return;
        }
      } catch (error: any) {
        alert("결제 취소 중 오류: " + error.message);
        return;
      }
    }

    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;

    const { error } = await supabase
      .from("seller_applications")
      .update({
        status: "rejected",
        approved_at: new Date().toISOString(),
        approved_by: user?.id,
        rejection_reason: rejectReason.trim(),
      })
      .eq("id", showRejectModal);

    if (error) {
      alert("오류: " + error.message);
      return;
    }

    // 상점도 거절 처리
    if (app.shop_id) {
      const { error: shopError } = await supabase
        .from("shops")
        .update({ 
          approval_status: "rejected",
          approval_note: rejectReason.trim(),
        })
        .eq("id", app.shop_id);
      
      if (shopError) {
        console.error("상점 거절 처리 오류:", shopError);
        alert("상점 상태 업데이트 실패: " + shopError.message);
        return;
      }
    }

    alert(app.payment_method === 'card' ? "거절 및 환불 처리되었습니다" : "거절되었습니다");
    setShowRejectModal(null);
    setRejectReason("");
    fetchApplications();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return { bg: '#FEF3C7', color: '#92400E', text: '대기중' };
      case 'approved':
        return { bg: '#D1FAE5', color: '#065F46', text: '승인됨' };
      case 'rejected':
        return { bg: '#FEE2E2', color: '#991B1B', text: '거절됨' };
      default:
        return { bg: theme.bgInput, color: theme.textMuted, text: status };
    }
  };

  const getTimeRemaining = (autoApproveAt: string) => {
    const remaining = new Date(autoApproveAt).getTime() - Date.now();
    if (remaining <= 0) return "자동 승인 예정";
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}시간 ${minutes}분 후 자동 승인`;
  };

  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.bgMain }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: theme.accent }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20" style={{ backgroundColor: theme.bgMain }}>
      {/* 헤더 */}
      <header className="fixed top-0 left-0 right-0 z-50" style={{ backgroundColor: theme.bgCard, borderBottom: `1px solid ${theme.border}` }}>
        <div className="max-w-[640px] mx-auto px-4 h-14 flex items-center">
          <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center -ml-2">
            <ArrowLeft className="w-6 h-6" style={{ color: theme.textPrimary }} />
          </button>
          <h1 className="font-bold ml-2" style={{ color: theme.textPrimary }}>셀러 신청 관리</h1>
        </div>
      </header>

      <main className="pt-14 max-w-[640px] mx-auto px-4">
        {/* 필터 탭 */}
        <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
          {[
            { key: 'pending', label: '대기중' },
            { key: 'approved', label: '승인됨' },
            { key: 'rejected', label: '거절됨' },
            { key: 'all', label: '전체' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as any)}
              className="px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap"
              style={{
                backgroundColor: filter === tab.key ? theme.accent : theme.bgCard,
                color: filter === tab.key ? (isDark ? '#121212' : '#fff') : theme.textSecondary,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 신청 목록 */}
        <div className="mt-4 space-y-3">
          {applications.length === 0 ? (
            <div className="p-8 text-center rounded-xl" style={{ backgroundColor: theme.bgCard }}>
              <p style={{ color: theme.textMuted }}>신청 내역이 없습니다</p>
            </div>
          ) : (
            applications.map((app) => {
              const status = getStatusBadge(app.status);
              const isExpanded = expandedId === app.id;

              return (
                <div key={app.id} className="rounded-xl overflow-hidden" style={{ backgroundColor: theme.bgCard }}>
                  {/* 헤더 */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : app.id)}
                    className="w-full p-4 text-left"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.bgInput }}>
                          <Store className="w-5 h-5" style={{ color: theme.accent }} />
                        </div>
                        <div>
                          <p className="font-bold" style={{ color: theme.textPrimary }}>{app.shop?.name || '상점명 없음'}</p>
                          <p className="text-sm" style={{ color: theme.textMuted }}>{app.user?.nickname || app.user?.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className="px-2 py-1 rounded text-xs font-medium"
                          style={{ backgroundColor: status.bg, color: status.color }}
                        >
                          {status.text}
                        </span>
                        {isExpanded ? <ChevronUp className="w-5 h-5" style={{ color: theme.textMuted }} /> : <ChevronDown className="w-5 h-5" style={{ color: theme.textMuted }} />}
                      </div>
                    </div>

                    {/* 간단 정보 */}
                    <div className="flex items-center gap-4 mt-3 text-sm" style={{ color: theme.textSecondary }}>
                      <span className="flex items-center gap-1">
                        <CreditCard className="w-4 h-4" />
                        {app.plan?.name} ({app.paid_amount?.toLocaleString()}원)
                      </span>
                      <span className="flex items-center gap-1">
                        {app.payment_method === 'cash' ? <Banknote className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
                        {app.payment_method === 'cash' ? '현금' : '카드'}
                      </span>
                    </div>

                    {app.status === 'pending' && (
                      <p className="mt-2 text-xs flex items-center gap-1" style={{ color: theme.accent }}>
                        <Clock className="w-3 h-3" />
                        {getTimeRemaining(app.auto_approve_at)}
                      </p>
                    )}
                  </button>

                  {/* 상세 정보 */}
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: theme.border }}>
                      <div className="pt-3 grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p style={{ color: theme.textMuted }}>사업자명</p>
                          <p className="font-medium" style={{ color: theme.textPrimary }}>{app.shop?.business_name || '-'}</p>
                        </div>
                        <div>
                          <p style={{ color: theme.textMuted }}>사업자번호</p>
                          <p className="font-medium" style={{ color: theme.textPrimary }}>{app.shop?.business_number || '-'}</p>
                        </div>
                        <div>
                          <p style={{ color: theme.textMuted }}>대표자</p>
                          <p className="font-medium" style={{ color: theme.textPrimary }}>{app.shop?.representative || '-'}</p>
                        </div>
                        <div>
                          <p style={{ color: theme.textMuted }}>연락처</p>
                          <p className="font-medium" style={{ color: theme.textPrimary }}>{app.shop?.phone || '-'}</p>
                        </div>
                        <div className="col-span-2">
                          <p style={{ color: theme.textMuted }}>주소</p>
                          <p className="font-medium" style={{ color: theme.textPrimary }}>{app.shop?.address || '-'}</p>
                        </div>
                        <div>
                          <p style={{ color: theme.textMuted }}>신청일시</p>
                          <p className="font-medium" style={{ color: theme.textPrimary }}>
                            {new Date(app.created_at).toLocaleString('ko-KR')}
                          </p>
                        </div>
                        <div>
                          <p style={{ color: theme.textMuted }}>결제일시</p>
                          <p className="font-medium" style={{ color: theme.textPrimary }}>
                            {app.paid_at ? new Date(app.paid_at).toLocaleString('ko-KR') : (app.payment_method === 'cash' ? '입금 대기' : '-')}
                          </p>
                        </div>
                      </div>

                      {app.rejection_reason && (
                        <div className="p-3 rounded-lg" style={{ backgroundColor: '#FEE2E2' }}>
                          <p className="text-sm font-medium" style={{ color: '#991B1B' }}>거절 사유</p>
                          <p className="text-sm mt-1" style={{ color: '#991B1B' }}>{app.rejection_reason}</p>
                        </div>
                      )}

                      {/* 액션 버튼 */}
                      {app.status === 'pending' && (
                        <div className="flex gap-2 pt-2">
                          <button
                            onClick={() => handleApprove(app)}
                            className="flex-1 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2"
                            style={{ backgroundColor: '#10B981', color: '#fff' }}
                          >
                            <Check className="w-4 h-4" />
                            승인
                          </button>
                          <button
                            onClick={() => setShowRejectModal(app.id)}
                            className="flex-1 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2"
                            style={{ backgroundColor: '#EF4444', color: '#fff' }}
                          >
                            <X className="w-4 h-4" />
                            거절
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* 거절 모달 */}
      {showRejectModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowRejectModal(null)} />
          <div className="relative w-full max-w-md rounded-2xl p-5" style={{ backgroundColor: theme.bgCard }}>
            <h3 className="text-lg font-bold mb-4" style={{ color: theme.textPrimary }}>거절 사유 입력</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="거절 사유를 입력해주세요"
              rows={4}
              className="w-full px-4 py-3 rounded-xl outline-none resize-none"
              style={{ backgroundColor: theme.bgInput, border: `1px solid ${theme.border}`, color: theme.textPrimary }}
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowRejectModal(null)}
                className="flex-1 py-3 rounded-xl font-medium"
                style={{ backgroundColor: theme.bgInput, color: theme.textPrimary }}
              >
                취소
              </button>
              <button
                onClick={handleReject}
                className="flex-1 py-3 rounded-xl font-bold"
                style={{ backgroundColor: '#EF4444', color: '#fff' }}
              >
                거절하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
