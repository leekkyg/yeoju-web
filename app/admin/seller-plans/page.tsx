"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/contexts/ThemeContext";
import {
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Crown,
  Calendar,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

interface Plan {
  id: string;
  name: string;
  price: number;
  duration_days: number;
  description: string;
  is_active: boolean;
  created_at: string;
}

export default function SellerPlansPage() {
  const router = useRouter();
  const { theme, isDark, mounted } = useTheme();

  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 폼 상태
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    duration_days: "",
    description: "",
    is_active: true,
  });

  useEffect(() => {
    checkAdmin();
  }, []);

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

    await fetchPlans();
    setLoading(false);
  };

  const fetchPlans = async () => {
    const { data } = await supabase
      .from("seller_plans")
      .select("*")
      .order("price", { ascending: true });
    if (data) setPlans(data);
  };

  const openAddModal = () => {
    setEditingPlan(null);
    setFormData({
      name: "",
      price: "",
      duration_days: "",
      description: "",
      is_active: true,
    });
    setShowModal(true);
  };

  const openEditModal = (plan: Plan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      price: plan.price.toString(),
      duration_days: plan.duration_days.toString(),
      description: plan.description || "",
      is_active: plan.is_active,
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      alert("요금제 이름을 입력하세요");
      return;
    }
    if (!formData.price || parseInt(formData.price) <= 0) {
      alert("가격을 입력하세요");
      return;
    }
    if (!formData.duration_days || parseInt(formData.duration_days) <= 0) {
      alert("이용 기간을 입력하세요");
      return;
    }

    setSubmitting(true);

    const planData = {
      name: formData.name.trim(),
      price: parseInt(formData.price),
      duration_days: parseInt(formData.duration_days),
      description: formData.description.trim(),
      is_active: formData.is_active,
    };

    try {
      if (editingPlan) {
        // 수정
        const { error } = await supabase
          .from("seller_plans")
          .update(planData)
          .eq("id", editingPlan.id);
        if (error) throw error;
        alert("요금제가 수정되었습니다");
      } else {
        // 추가
        const { error } = await supabase
          .from("seller_plans")
          .insert(planData);
        if (error) throw error;
        alert("요금제가 추가되었습니다");
      }

      setShowModal(false);
      fetchPlans();
    } catch (error: any) {
      alert("오류: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (plan: Plan) => {
    const { error } = await supabase
      .from("seller_plans")
      .update({ is_active: !plan.is_active })
      .eq("id", plan.id);

    if (error) {
      alert("오류: " + error.message);
    } else {
      fetchPlans();
    }
  };

  const deletePlan = async (plan: Plan) => {
    if (!confirm(`"${plan.name}" 요금제를 삭제하시겠습니까?`)) return;

    const { error } = await supabase
      .from("seller_plans")
      .delete()
      .eq("id", plan.id);

    if (error) {
      alert("오류: " + error.message);
    } else {
      alert("삭제되었습니다");
      fetchPlans();
    }
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
        <div className="max-w-[640px] mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center">
            <ArrowLeft className="w-6 h-6" style={{ color: theme.textPrimary }} />
          </button>
          <h1 className="font-bold" style={{ color: theme.textPrimary }}>셀러 요금제 관리</h1>
          <button onClick={openAddModal} className="w-10 h-10 flex items-center justify-center">
            <Plus className="w-6 h-6" style={{ color: theme.accent }} />
          </button>
        </div>
      </header>

      <main className="pt-14 max-w-[640px] mx-auto px-4">
        {/* 안내 */}
        <div className="mt-4 p-4 rounded-xl" style={{ backgroundColor: theme.bgInput }}>
          <p className="text-sm" style={{ color: theme.textSecondary }}>
            셀러 A등급 요금제를 관리합니다. 가격, 기간, 활성화 여부를 설정할 수 있습니다.
          </p>
        </div>

        {/* 요금제 목록 */}
        <div className="mt-4 space-y-3">
          {plans.length === 0 ? (
            <div className="p-8 text-center rounded-xl" style={{ backgroundColor: theme.bgCard }}>
              <p style={{ color: theme.textMuted }}>등록된 요금제가 없습니다</p>
              <button
                onClick={openAddModal}
                className="mt-4 px-4 py-2 rounded-lg font-medium"
                style={{ backgroundColor: theme.accent, color: isDark ? '#121212' : '#fff' }}
              >
                요금제 추가
              </button>
            </div>
          ) : (
            plans.map((plan) => (
              <div
                key={plan.id}
                className="p-4 rounded-xl"
                style={{
                  backgroundColor: theme.bgCard,
                  opacity: plan.is_active ? 1 : 0.6,
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: theme.bgInput }}
                    >
                      {plan.duration_days >= 365 ? (
                        <Crown className="w-6 h-6" style={{ color: "#FBBF24" }} />
                      ) : (
                        <Calendar className="w-6 h-6" style={{ color: theme.accent }} />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold" style={{ color: theme.textPrimary }}>{plan.name}</p>
                        {!plan.is_active && (
                          <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: theme.red, color: '#fff' }}>
                            비활성
                          </span>
                        )}
                      </div>
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

                {/* 액션 버튼 */}
                <div className="flex items-center gap-2 mt-4 pt-3 border-t" style={{ borderColor: theme.border }}>
                  <button
                    onClick={() => toggleActive(plan)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium"
                    style={{ backgroundColor: theme.bgInput, color: theme.textPrimary }}
                  >
                    {plan.is_active ? (
                      <>
                        <ToggleRight className="w-4 h-4" style={{ color: theme.accent }} />
                        활성
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="w-4 h-4" />
                        비활성
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => openEditModal(plan)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium"
                    style={{ backgroundColor: theme.bgInput, color: theme.textPrimary }}
                  >
                    <Edit2 className="w-4 h-4" />
                    수정
                  </button>
                  <button
                    onClick={() => deletePlan(plan)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium"
                    style={{ backgroundColor: theme.bgInput, color: theme.red }}
                  >
                    <Trash2 className="w-4 h-4" />
                    삭제
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* 추가/수정 모달 */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-md rounded-2xl p-5" style={{ backgroundColor: theme.bgCard }}>
            <h3 className="text-lg font-bold mb-4" style={{ color: theme.textPrimary }}>
              {editingPlan ? "요금제 수정" : "새 요금제 추가"}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block" style={{ color: theme.textSecondary }}>
                  요금제 이름 <span style={{ color: theme.red }}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="예: 월정액, 연정액"
                  className="w-full px-4 py-3 rounded-xl outline-none"
                  style={{ backgroundColor: theme.bgInput, border: `1px solid ${theme.border}`, color: theme.textPrimary }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block" style={{ color: theme.textSecondary }}>
                    가격 (원) <span style={{ color: theme.red }}>*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="30000"
                    className="w-full px-4 py-3 rounded-xl outline-none"
                    style={{ backgroundColor: theme.bgInput, border: `1px solid ${theme.border}`, color: theme.textPrimary }}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block" style={{ color: theme.textSecondary }}>
                    기간 (일) <span style={{ color: theme.red }}>*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.duration_days}
                    onChange={(e) => setFormData({ ...formData, duration_days: e.target.value })}
                    placeholder="30"
                    className="w-full px-4 py-3 rounded-xl outline-none"
                    style={{ backgroundColor: theme.bgInput, border: `1px solid ${theme.border}`, color: theme.textPrimary }}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block" style={{ color: theme.textSecondary }}>
                  설명
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="요금제 설명"
                  className="w-full px-4 py-3 rounded-xl outline-none"
                  style={{ backgroundColor: theme.bgInput, border: `1px solid ${theme.border}`, color: theme.textPrimary }}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: theme.bgInput }}>
                <span className="font-medium" style={{ color: theme.textPrimary }}>활성화</span>
                <button
                  onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                  className="w-12 h-7 rounded-full relative transition-colors"
                  style={{ backgroundColor: formData.is_active ? theme.accent : theme.border }}
                >
                  <div
                    className="absolute top-1 w-5 h-5 rounded-full bg-white transition-all"
                    style={{ left: formData.is_active ? '26px' : '4px' }}
                  />
                </button>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-3 rounded-xl font-medium"
                style={{ backgroundColor: theme.bgInput, color: theme.textPrimary }}
              >
                취소
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 py-3 rounded-xl font-bold"
                style={{ backgroundColor: theme.accent, color: isDark ? '#121212' : '#fff' }}
              >
                {submitting ? "저장 중..." : (editingPlan ? "수정" : "추가")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
