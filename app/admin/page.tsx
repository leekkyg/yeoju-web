"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function AdminPage() {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'reports' | 'restrictions'>('reports');
  
  const [reports, setReports] = useState<any[]>([]);
  const [restrictions, setRestrictions] = useState<any[]>([]);
  
  // 제재 모달
  const [restrictModal, setRestrictModal] = useState<any>(null);
  const [restrictType, setRestrictType] = useState('post_ban');
  const [restrictDuration, setRestrictDuration] = useState('1');
  const [restrictReason, setRestrictReason] = useState('');

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = '/login';
      return;
    }
    setUser(user);
    
    const { data: profile } = await supabase.from("profiles").select("*").eq("email", user.email).single();
    if (profile?.role !== 'admin') {
      alert('관리자만 접근 가능합니다');
      window.location.href = '/';
      return;
    }
    setUserProfile(profile);
    fetchReports();
    fetchRestrictions();
    setLoading(false);
  };

  const fetchReports = async () => {
    const { data } = await supabase
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false });
    setReports(data || []);
  };

  const fetchRestrictions = async () => {
    const { data } = await supabase
      .from("user_restrictions")
      .select("*")
      .order("created_at", { ascending: false });
    setRestrictions(data || []);
  };

  // 신고 처리 완료
  const handleResolveReport = async (reportId: number) => {
    await supabase.from("reports").update({ status: 'resolved' }).eq("id", reportId);
    setReports(reports.map(r => r.id === reportId ? { ...r, status: 'resolved' } : r));
  };

  // 제재 적용
  const handleRestrict = async () => {
    if (!restrictModal || !restrictReason.trim()) {
      alert('사유를 입력하세요');
      return;
    }

    const hours = parseInt(restrictDuration);
    const restrictedUntil = new Date(Date.now() + hours * 60 * 60 * 1000);

    await supabase.from("user_restrictions").insert({
      user_id: restrictModal.userId,
      restriction_type: restrictType,
      reason: restrictReason,
      restricted_until: restrictedUntil.toISOString(),
      created_by: user.id,
    });

    // 신고도 처리 완료
    if (restrictModal.reportId) {
      await supabase.from("reports").update({ status: 'resolved' }).eq("id", restrictModal.reportId);
      setReports(reports.map(r => r.id === restrictModal.reportId ? { ...r, status: 'resolved' } : r));
    }

    alert(`제재가 적용되었습니다 (${hours}시간)`);
    setRestrictModal(null);
    setRestrictReason('');
    fetchRestrictions();
  };

  // 제재 해제
  const handleLiftRestriction = async (restrictionId: number) => {
    if (!confirm('제재를 해제하시겠습니까?')) return;
    await supabase.from("user_restrictions").delete().eq("id", restrictionId);
    setRestrictions(restrictions.filter(r => r.id !== restrictionId));
  };

  // 게시글 삭제
  const handleDeletePost = async (postId: number) => {
    if (!confirm('게시글을 삭제하시겠습니까?')) return;
    await supabase.from("posts").delete().eq("id", postId);
    alert('삭제되었습니다');
  };

  const formatDate = (d: string) => new Date(d).toLocaleString("ko-KR");

  const getRestrictionTypeText = (type: string) => {
    switch (type) {
      case 'post_ban': return '게시글 작성 금지';
      case 'comment_ban': return '댓글 작성 금지';
      case 'full_ban': return '전체 이용 정지';
      default: return type;
    }
  };

  const isRestrictionActive = (restrictedUntil: string) => {
    return new Date(restrictedUntil) > new Date();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-10">
      {/* 제재 모달 */}
      {restrictModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={() => setRestrictModal(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-4">🚫 유저 제재</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">제재 유형</label>
              <select
                value={restrictType}
                onChange={(e) => setRestrictType(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="post_ban">게시글 작성 금지</option>
                <option value="comment_ban">댓글 작성 금지</option>
                <option value="full_ban">전체 이용 정지</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">제재 기간</label>
              <select
                value={restrictDuration}
                onChange={(e) => setRestrictDuration(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="1">1시간</option>
                <option value="3">3시간</option>
                <option value="6">6시간</option>
                <option value="12">12시간</option>
                <option value="24">24시간 (1일)</option>
                <option value="72">72시간 (3일)</option>
                <option value="168">168시간 (7일)</option>
                <option value="720">720시간 (30일)</option>
                <option value="8760">8760시간 (1년)</option>
                <option value="87600">87600시간 (영구)</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">제재 사유</label>
              <textarea
                value={restrictReason}
                onChange={(e) => setRestrictReason(e.target.value)}
                placeholder="제재 사유를 입력하세요"
                className="w-full h-24 p-3 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setRestrictModal(null)} className="flex-1 py-3 bg-gray-200 text-gray-700 font-bold rounded-xl">취소</button>
              <button onClick={handleRestrict} className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl">제재 적용</button>
            </div>
          </div>
        </div>
      )}

      {/* 헤더 */}
      <header className="bg-gray-900 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-white font-bold text-lg">관리자 페이지</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* 탭 */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-6 py-3 rounded-xl font-bold transition-colors ${
              activeTab === 'reports' ? 'bg-amber-500 text-gray-900' : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            🚨 신고 관리 ({reports.filter(r => r.status === 'pending').length})
          </button>
          <button
            onClick={() => setActiveTab('restrictions')}
            className={`px-6 py-3 rounded-xl font-bold transition-colors ${
              activeTab === 'restrictions' ? 'bg-amber-500 text-gray-900' : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            🚫 제재 현황 ({restrictions.filter(r => isRestrictionActive(r.restricted_until)).length})
          </button>
        </div>

        {/* 신고 목록 */}
        {activeTab === 'reports' && (
          <div className="space-y-4">
            {reports.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center">
                <p className="text-gray-500">신고 내역이 없습니다</p>
              </div>
            ) : (
              reports.map((report) => (
                <div key={report.id} className={`bg-white rounded-xl p-4 shadow-md ${report.status === 'resolved' ? 'opacity-60' : ''}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        report.status === 'pending' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                      }`}>
                        {report.status === 'pending' ? '대기 중' : '처리 완료'}
                      </span>
                      <p className="text-xs text-gray-500 mt-2">{formatDate(report.created_at)}</p>
                    </div>
                    {report.post_id && (
                      <Link href={`/community/${report.post_id}`} className="text-sm text-blue-500 hover:underline">
                        게시글 보기 →
                      </Link>
                    )}
                  </div>

                  <div className="mb-3">
                    <p className="text-sm text-gray-500">신고 사유:</p>
                    <p className="text-gray-900">{report.reason}</p>
                  </div>

                  <div className="text-xs text-gray-500 mb-3">
                    <p>신고자 ID: {report.reporter_id?.slice(0, 8)}...</p>
                    <p>피신고자 ID: {report.reported_user_id?.slice(0, 8)}...</p>
                  </div>

                  {report.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setRestrictModal({ userId: report.reported_user_id, reportId: report.id })}
                        className="flex-1 py-2 bg-red-500 text-white font-bold rounded-lg text-sm"
                      >
                        제재하기
                      </button>
                      {report.post_id && (
                        <button
                          onClick={() => handleDeletePost(report.post_id)}
                          className="py-2 px-4 bg-gray-800 text-white font-bold rounded-lg text-sm"
                        >
                          글 삭제
                        </button>
                      )}
                      <button
                        onClick={() => handleResolveReport(report.id)}
                        className="py-2 px-4 bg-gray-200 text-gray-700 font-bold rounded-lg text-sm"
                      >
                        무시
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* 제재 현황 */}
        {activeTab === 'restrictions' && (
          <div className="space-y-4">
            {restrictions.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center">
                <p className="text-gray-500">제재 내역이 없습니다</p>
              </div>
            ) : (
              restrictions.map((restriction) => {
                const isActive = isRestrictionActive(restriction.restricted_until);
                return (
                  <div key={restriction.id} className={`bg-white rounded-xl p-4 shadow-md ${!isActive ? 'opacity-60' : ''}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          isActive ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {isActive ? '제재 중' : '만료됨'}
                        </span>
                        <p className="font-bold text-gray-900 mt-2">{getRestrictionTypeText(restriction.restriction_type)}</p>
                      </div>
                      {isActive && (
                        <button
                          onClick={() => handleLiftRestriction(restriction.id)}
                          className="text-sm text-blue-500 hover:underline"
                        >
                          해제하기
                        </button>
                      )}
                    </div>

                    <div className="text-sm text-gray-600 space-y-1">
                      <p>사유: {restriction.reason}</p>
                      <p>대상 ID: {restriction.user_id?.slice(0, 8)}...</p>
                      <p>시작: {formatDate(restriction.created_at)}</p>
                      <p>종료: {formatDate(restriction.restricted_until)}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </main>
    </div>
  );
}
