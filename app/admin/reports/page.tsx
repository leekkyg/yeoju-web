"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/contexts/ThemeContext";
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Trash2,
  Clock,
  FileText,
} from "lucide-react";

export default function AdminReportsPage() {
  const router = useRouter();
  const { theme, isDark, mounted } = useTheme();
  
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("pending");
  const [selectedReport, setSelectedReport] = useState<any>(null);

  useEffect(() => {
    checkAdminAndFetch();
  }, []);

  const checkAdminAndFetch = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { data: profile } = await supabase.from("profiles").select("*").eq("email", user.email).single();
    if (profile?.role !== "admin") { alert("관리자 권한이 없습니다"); router.push("/"); return; }

    await fetchReports();
    setLoading(false);
  };

  const fetchReports = async () => {
    const { data } = await supabase
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (data) {
      const reportsWithPosts = await Promise.all(
        data.map(async (report) => {
          if (report.post_id) {
            const { data: post } = await supabase
              .from("posts")
              .select("content, author_nickname, is_anonymous")
              .eq("id", report.post_id)
              .single();
            return { ...report, post };
          }
          return report;
        })
      );
      setReports(reportsWithPosts);
    }
  };

  const handleReport = async (reportId: number, action: "resolve" | "dismiss" | "delete_post") => {
    const report = reports.find(r => r.id === reportId);
    if (!report) return;

    if (action === "delete_post" && report.post_id) {
      if (!confirm("해당 게시글을 삭제하시겠습니까?")) return;
      await supabase.from("posts").delete().eq("id", report.post_id);
    }

    const actionText = action === "resolve" ? "처리 완료" : action === "dismiss" ? "기각" : "게시글 삭제";
    
    await supabase
      .from("reports")
      .update({
        handled_at: new Date().toISOString(),
        action: actionText,
      })
      .eq("id", reportId);

    setReports(reports.map(r => 
      r.id === reportId 
        ? { ...r, handled_at: new Date().toISOString(), action: actionText }
        : r
    ));
    setSelectedReport(null);
    alert(`${actionText}되었습니다`);
  };

  const formatDate = (d: string) => {
    return new Date(d).toLocaleDateString("ko-KR", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filteredReports = reports.filter(report => {
    if (filterStatus === "pending") return !report.handled_at;
    if (filterStatus === "handled") return !!report.handled_at;
    return true;
  });

  const pendingCount = reports.filter(r => !r.handled_at).length;

  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.bgMain }}>
        <div className="w-10 h-10 border-2 rounded-full animate-spin" style={{ borderColor: theme.border, borderTopColor: theme.accent }}></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-10 transition-colors duration-300" style={{ backgroundColor: theme.bgMain }}>
      {/* 헤더 */}
      <header className="sticky top-0 z-50" style={{ backgroundColor: theme.bgElevated, borderBottom: `1px solid ${theme.borderLight}` }}>
        <div className="max-w-[640px] mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/admin" className="p-1 -ml-1 rounded-lg" style={{ color: theme.textPrimary }}>
            <ArrowLeft className="w-6 h-6" strokeWidth={1.5} />
          </Link>
          <h1 className="text-lg font-bold" style={{ color: theme.textPrimary }}>🚨 신고 관리</h1>
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-bold rounded-full" style={{ backgroundColor: theme.red, color: '#FFF' }}>
              {pendingCount}
            </span>
          )}
        </div>
      </header>

      <main className="max-w-[640px] mx-auto px-4 py-4">
        {/* 필터 탭 */}
        <div className="flex gap-2 mb-4">
          {[
            { key: "pending", label: "미처리", count: pendingCount, color: theme.red },
            { key: "handled", label: "처리완료", count: null, color: theme.accent },
            { key: "all", label: "전체", count: null, color: theme.accent },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilterStatus(tab.key)}
              className="px-4 py-2 rounded-xl font-semibold text-sm transition-colors"
              style={{
                backgroundColor: filterStatus === tab.key ? (tab.key === "pending" ? theme.red : theme.accent) : theme.bgCard,
                color: filterStatus === tab.key ? (isDark ? '#121212' : '#FFF') : theme.textPrimary,
                border: `1px solid ${filterStatus === tab.key ? 'transparent' : theme.borderLight}`,
              }}
            >
              {tab.label} {tab.count !== null && tab.count > 0 && `(${tab.count})`}
            </button>
          ))}
        </div>

        {/* 신고 목록 */}
        <div className="space-y-3">
          {filteredReports.length === 0 ? (
            <div className="rounded-2xl p-8 text-center" style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}>
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: theme.bgInput }}>
                <CheckCircle className="w-6 h-6" style={{ color: theme.success }} strokeWidth={1.5} />
              </div>
              <p className="font-medium" style={{ color: theme.textMuted }}>
                {filterStatus === "pending" ? "처리할 신고가 없습니다 👍" : "신고 내역이 없습니다"}
              </p>
            </div>
          ) : (
            filteredReports.map((report) => (
              <div
                key={report.id}
                className="rounded-2xl p-4 relative overflow-hidden"
                style={{ 
                  backgroundColor: theme.bgCard, 
                  border: `1px solid ${!report.handled_at ? theme.red : theme.borderLight}`,
                  borderLeftWidth: !report.handled_at ? '4px' : '1px',
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    {/* 상태 */}
                    <div className="flex items-center gap-2 mb-2">
                      {report.handled_at ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1" style={{ backgroundColor: theme.successBg, color: theme.success }}>
                          <CheckCircle className="w-3 h-3" strokeWidth={2} />
                          {report.action || "처리완료"}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1" style={{ backgroundColor: theme.redBg, color: theme.red }}>
                          <Clock className="w-3 h-3" strokeWidth={2} />
                          미처리
                        </span>
                      )}
                      <span className="text-xs" style={{ color: theme.textMuted }}>{formatDate(report.created_at)}</span>
                    </div>

                    {/* 신고 사유 */}
                    <div className="flex items-start gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: theme.accent }} strokeWidth={1.5} />
                      <p className="font-medium text-sm" style={{ color: theme.textPrimary }}>{report.reason}</p>
                    </div>

                    {/* 신고된 게시글 */}
                    {report.post && (
                      <div className="rounded-xl p-3 mb-2" style={{ backgroundColor: theme.bgInput }}>
                        <p className="text-xs mb-1 flex items-center gap-1" style={{ color: theme.textMuted }}>
                          <FileText className="w-3 h-3" strokeWidth={1.5} />
                          신고된 게시글
                        </p>
                        <p className="text-sm line-clamp-2" style={{ color: theme.textSecondary }}>{report.post.content}</p>
                        <p className="text-xs mt-1" style={{ color: theme.textMuted }}>
                          작성자: {report.post.is_anonymous ? "익명" : report.post.author_nickname}
                        </p>
                      </div>
                    )}

                    {report.handled_at && (
                      <p className="text-xs" style={{ color: theme.textMuted }}>
                        처리일: {formatDate(report.handled_at)}
                      </p>
                    )}
                  </div>

                  {/* 액션 버튼 */}
                  {!report.handled_at && (
                    <button
                      onClick={() => setSelectedReport(report)}
                      className="px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors"
                      style={{ backgroundColor: theme.accent, color: isDark ? '#121212' : '#FFF' }}
                    >
                      처리
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* 처리 모달 */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={() => setSelectedReport(null)}>
          <div className="rounded-2xl p-6 w-full max-w-sm" style={{ backgroundColor: theme.bgCard }} onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: theme.textPrimary }}>
              <AlertTriangle className="w-5 h-5" style={{ color: theme.red }} strokeWidth={1.5} />
              신고 처리
            </h3>
            
            <div className="rounded-xl p-3 mb-4" style={{ backgroundColor: theme.bgInput }}>
              <p className="text-sm font-medium mb-1" style={{ color: theme.textPrimary }}>신고 사유:</p>
              <p className="text-sm" style={{ color: theme.textSecondary }}>{selectedReport.reason}</p>
            </div>

            {selectedReport.post && (
              <div className="rounded-xl p-3 mb-4" style={{ backgroundColor: theme.redBg }}>
                <p className="text-sm font-medium mb-1" style={{ color: theme.textPrimary }}>신고된 내용:</p>
                <p className="text-sm line-clamp-3" style={{ color: theme.textSecondary }}>{selectedReport.post.content}</p>
              </div>
            )}

            <div className="space-y-2">
              {selectedReport.post_id && (
                <button
                  onClick={() => handleReport(selectedReport.id, "delete_post")}
                  className="w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
                  style={{ backgroundColor: theme.red, color: '#FFF' }}
                >
                  <Trash2 className="w-5 h-5" strokeWidth={1.5} />
                  게시글 삭제
                </button>
              )}
              <button
                onClick={() => handleReport(selectedReport.id, "resolve")}
                className="w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
                style={{ backgroundColor: theme.accent, color: isDark ? '#121212' : '#FFF' }}
              >
                <CheckCircle className="w-5 h-5" strokeWidth={1.5} />
                처리 완료
              </button>
              <button
                onClick={() => handleReport(selectedReport.id, "dismiss")}
                className="w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
                style={{ backgroundColor: theme.bgInput, color: theme.textPrimary, border: `1px solid ${theme.border}` }}
              >
                <XCircle className="w-5 h-5" strokeWidth={1.5} />
                기각 (문제없음)
              </button>
              <button
                onClick={() => setSelectedReport(null)}
                className="w-full py-3 font-semibold"
                style={{ color: theme.textMuted }}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
