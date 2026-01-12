"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPosts: 0,
    totalComments: 0,
    totalShops: 0,
    pendingShops: 0,
    totalReports: 0,
    pendingReports: 0,
    totalNotices: 0,
    todayUsers: 0,
    todayPosts: 0,
  });

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert("로그인이 필요합니다");
      router.push("/login");
      return;
    }
    setUser(user);

    const { data: profile } = await supabase.from("profiles").select("*").eq("email", user.email).single();
    setUserProfile(profile);

    if (profile?.role !== "admin") {
      alert("관리자 권한이 없습니다");
      router.push("/");
      return;
    }

    await fetchStats();
    setLoading(false);
  };

  const fetchStats = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    // 전체 회원수
    const { count: totalUsers } = await supabase.from("profiles").select("*", { count: "exact", head: true });

    // 전체 게시글
    const { count: totalPosts } = await supabase.from("posts").select("*", { count: "exact", head: true });

    // 전체 댓글
    const { count: totalComments } = await supabase.from("comments").select("*", { count: "exact", head: true });

    // 전체 상점
    const { count: totalShops } = await supabase.from("shops").select("*", { count: "exact", head: true });

    // 승인 대기 상점
    const { count: pendingShops } = await supabase.from("shops").select("*", { count: "exact", head: true }).eq("status", "pending");

    // 전체 신고
    const { count: totalReports } = await supabase.from("reports").select("*", { count: "exact", head: true });

    // 미처리 신고
    const { count: pendingReports } = await supabase.from("reports").select("*", { count: "exact", head: true }).is("handled_at", null);

    // 전체 공지
    const { count: totalNotices } = await supabase.from("notices").select("*", { count: "exact", head: true });

    // 오늘 가입 회원
    const { count: todayUsers } = await supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", todayISO);

    // 오늘 게시글
    const { count: todayPosts } = await supabase.from("posts").select("*", { count: "exact", head: true }).gte("created_at", todayISO);

    setStats({
      totalUsers: totalUsers || 0,
      totalPosts: totalPosts || 0,
      totalComments: totalComments || 0,
      totalShops: totalShops || 0,
      pendingShops: pendingShops || 0,
      totalReports: totalReports || 0,
      pendingReports: pendingReports || 0,
      totalNotices: totalNotices || 0,
      todayUsers: todayUsers || 0,
      todayPosts: todayPosts || 0,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const menuItems = [
    { href: "/admin/users", icon: "👥", label: "회원 관리", count: stats.totalUsers, color: "bg-blue-500" },
    { href: "/admin/posts", icon: "📝", label: "게시물 관리", count: stats.totalPosts, color: "bg-green-500" },
    { href: "/admin/reports", icon: "🚨", label: "신고 관리", count: stats.pendingReports, badge: true, color: "bg-red-500" },
    { href: "/admin/shops", icon: "🏪", label: "상점 관리", count: stats.pendingShops, badge: true, color: "bg-purple-500" },
    { href: "/admin/messages", icon: "✉️", label: "쪽지 관리", count: 0, color: "bg-emerald-500" },
    { href: "/notices", icon: "📢", label: "공지사항", count: stats.totalNotices, color: "bg-amber-500" },
  ];

  return (
    <div className="min-h-screen bg-gray-100 pb-10">
      {/* 헤더 */}
      <header className="bg-gray-900 sticky top-0 z-50">
        <div className="max-w-[631px] mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-white font-bold text-lg">🛠️ 관리자</h1>
          </div>
          <span className="text-gray-400 text-sm">{userProfile?.nickname || user?.email}</span>
        </div>
      </header>

      <main className="max-w-[631px] mx-auto px-4 py-6">
        {/* 오늘 통계 */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-6 mb-6 text-white">
          <h2 className="text-lg font-bold mb-4">📊 오늘의 통계</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/20 rounded-xl p-4">
              <p className="text-3xl font-bold">{stats.todayUsers}</p>
              <p className="text-sm opacity-80">신규 가입</p>
            </div>
            <div className="bg-white/20 rounded-xl p-4">
              <p className="text-3xl font-bold">{stats.todayPosts}</p>
              <p className="text-sm opacity-80">신규 게시글</p>
            </div>
          </div>
        </div>

        {/* 전체 통계 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-md">
            <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
            <p className="text-sm text-gray-500">전체 회원</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-md">
            <p className="text-2xl font-bold text-gray-900">{stats.totalPosts}</p>
            <p className="text-sm text-gray-500">전체 게시글</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-md">
            <p className="text-2xl font-bold text-gray-900">{stats.totalComments}</p>
            <p className="text-sm text-gray-500">전체 댓글</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-md">
            <p className="text-2xl font-bold text-gray-900">{stats.totalShops}</p>
            <p className="text-sm text-gray-500">전체 상점</p>
          </div>
        </div>

        {/* 메뉴 */}
        <h2 className="text-lg font-bold text-gray-900 mb-4">관리 메뉴</h2>
        <div className="space-y-3">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center justify-between bg-white rounded-xl p-4 shadow-md hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 ${item.color} rounded-xl flex items-center justify-center text-2xl`}>
                  {item.icon}
                </div>
                <div>
                  <p className="font-bold text-gray-900">{item.label}</p>
                  <p className="text-sm text-gray-500">
                    {item.badge && item.count > 0 ? `${item.count}건 처리 필요` : `총 ${item.count}건`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {item.badge && item.count > 0 && (
                  <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
                    {item.count}
                  </span>
                )}
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>

        {/* 빠른 액션 */}
        <h2 className="text-lg font-bold text-gray-900 mt-8 mb-4">빠른 액션</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/notices/write"
            className="flex items-center justify-center gap-2 bg-amber-500 text-gray-900 font-bold py-4 rounded-xl"
          >
            <span>📢</span>
            <span>공지 작성</span>
          </Link>
          <Link
            href="/admin/reports"
            className="flex items-center justify-center gap-2 bg-red-500 text-white font-bold py-4 rounded-xl"
          >
            <span>🚨</span>
            <span>신고 확인</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
