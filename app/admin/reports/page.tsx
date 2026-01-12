"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AdminReportsPage() {
  const router = useRouter();
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
    
    // 게시글 정보 추가
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-10">
      {/* 헤더 */}
      <header className="bg-gray-900 sticky top-0 z-50">
        <div className="max-w-[631px] mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/admin" className="text-gray-400 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-white font-bold text-lg">🚨 신고 관리</h1>
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
              {pendingCount}
            </span>
          )}
        </div>
      </header>

      <main className="max-w-[631px] mx-auto px-4 py-6">
        {/* 필터 탭 */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setFilterStatus("pending")}
            className={`px-4 py-2 rounded-lg font-bold text-sm ${
              filterStatus === "pending"
                ? "bg-red-500 text-white"
                : "bg-white text-gray-700"
            }`}
          >
            미처리 {pendingCount > 0 && `(${pendingCount})`}
          </button>
          <button
            onClick={() => setFilterStatus("handled")}
            className={`px-4 py-2 rounded-lg font-bold text-sm ${
              filterStatus === "handled"
                ? "bg-gray-900 text-white"
                : "bg-white text-gray-700"
            }`}
          >
            처리완료
          </button>
          <button
            onClick={() => setFilterStatus("all")}
            className={`px-4 py-2 rounded-lg font-bold text-sm ${
              filterStatus === "all"
                ? "bg-gray-900 text-white"
                : "bg-white text-gray-700"
            }`}
          >
            전체
          </button>
        </div>

        {/* 신고 목록 */}
        <div className="space-y-3">
          {filteredReports.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center text-gray-500 shadow-md">
              {filterStatus === "pending" ? "처리할 신고가 없습니다 👍" : "신고 내역이 없습니다"}
            </div>
          ) : (
            filteredReports.map((report) => (
              <div
                key={report.id}
                className={`bg-white rounded-xl p-4 shadow-md ${
                  !report.handled_at ? "border-l-4 border-red-500" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    {/* 상태 */}
                    <div className="flex items-center gap-2 mb-2">
                      {report.handled_at ? (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">
                          {report.action || "처리완료"}
                        </span>
                      ) : (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">
                          미처리
                        </span>
                      )}
                      <span className="text-xs text-gray-400">{formatDate(report.created_at)}</span>
                    </div>

                    {/* 신고 사유 */}
                    <p className="text-gray-900 font-medium mb-2">📋 {report.reason}</p>

                    {/* 신고된 게시글 */}
                    {report.post && (
                      <div className="bg-gray-50 rounded-lg p-3 mb-2">
                        <p className="text-xs text-gray-500 mb-1">신고된 게시글:</p>
                        <p className="text-sm text-gray-700 line-clamp-2">{report.post.content}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          작성자: {report.post.is_anonymous ? "익명" : report.post.author_nickname}
                        </p>
                      </div>
                    )}

                    {report.handled_at && (
                      <p className="text-xs text-gray-400">
                        처리일: {formatDate(report.handled_at)}
                      </p>
                    )}
                  </div>

                  {/* 액션 버튼 */}
                  {!report.handled_at && (
                    <button
                      onClick={() => setSelectedReport(report)}
                      className="px-3 py-1.5 bg-amber-500 text-gray-900 font-bold text-sm rounded-lg"
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
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-4">🚨 신고 처리</h3>
            
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <p className="text-sm text-gray-700 font-medium mb-1">신고 사유:</p>
              <p className="text-sm text-gray-600">{selectedReport.reason}</p>
            </div>

            {selectedReport.post && (
              <div className="bg-red-50 rounded-lg p-3 mb-4">
                <p className="text-sm text-gray-700 font-medium mb-1">신고된 내용:</p>
                <p className="text-sm text-gray-600 line-clamp-3">{selectedReport.post.content}</p>
              </div>
            )}

            <div className="space-y-2">
              {selectedReport.post_id && (
                <button
                  onClick={() => handleReport(selectedReport.id, "delete_post")}
                  className="w-full py-3 bg-red-500 text-white font-bold rounded-xl"
                >
                  🗑️ 게시글 삭제
                </button>
              )}
              <button
                onClick={() => handleReport(selectedReport.id, "resolve")}
                className="w-full py-3 bg-amber-500 text-gray-900 font-bold rounded-xl"
              >
                ✅ 처리 완료
              </button>
              <button
                onClick={() => handleReport(selectedReport.id, "dismiss")}
                className="w-full py-3 bg-gray-200 text-gray-700 font-bold rounded-xl"
              >
                ❌ 기각 (문제없음)
              </button>
              <button
                onClick={() => setSelectedReport(null)}
                className="w-full py-3 text-gray-500 font-bold"
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
