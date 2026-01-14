"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/contexts/ThemeContext";
import {
  ArrowLeft,
  Users,
  FileText,
  AlertTriangle,
  Store,
  Mail,
  Megaphone,
  ChevronRight,
  TrendingUp,
  UserPlus,
  PenSquare,
  MessageSquare,
  ShoppingBag,
} from "lucide-react";

export default function AdminDashboard() {
  const router = useRouter();
  const { theme, isDark, mounted } = useTheme();
  
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

    const { count: totalUsers } = await supabase.from("profiles").select("*", { count: "exact", head: true });
    const { count: totalPosts } = await supabase.from("posts").select("*", { count: "exact", head: true });
    const { count: totalComments } = await supabase.from("comments").select("*", { count: "exact", head: true });
    const { count: totalShops } = await supabase.from("shops").select("*", { count: "exact", head: true });
    const { count: pendingShops } = await supabase.from("shops").select("*", { count: "exact", head: true }).eq("status", "pending");
    const { count: totalReports } = await supabase.from("reports").select("*", { count: "exact", head: true });
    const { count: pendingReports } = await supabase.from("reports").select("*", { count: "exact", head: true }).is("handled_at", null);
    const { count: totalNotices } = await supabase.from("notices").select("*", { count: "exact", head: true });
    const { count: todayUsers } = await supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", todayISO);
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

  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.bgMain }}>
        <div className="w-10 h-10 border-2 rounded-full animate-spin" style={{ borderColor: theme.border, borderTopColor: theme.accent }}></div>
      </div>
    );
  }

  const menuItems = [
    { href: "/admin/users", icon: Users, label: "회원 관리", count: stats.totalUsers, color: theme.accent },
    { href: "/admin/posts", icon: FileText, label: "게시물 관리", count: stats.totalPosts, color: theme.accent },
    { href: "/admin/reports", icon: AlertTriangle, label: "신고 관리", count: stats.pendingReports, badge: true, color: theme.red },
    { href: "/admin/shops", icon: Store, label: "상점 관리", count: stats.pendingShops, badge: true, color: theme.accent },
    { href: "/admin/messages", icon: Mail, label: "쪽지 관리", count: 0, color: theme.accent },
    { href: "/notices", icon: Megaphone, label: "공지사항", count: stats.totalNotices, color: theme.accent },
  ];

  const statCards = [
    { label: "전체 회원", value: stats.totalUsers, icon: Users },
    { label: "전체 게시글", value: stats.totalPosts, icon: FileText },
    { label: "전체 댓글", value: stats.totalComments, icon: MessageSquare },
    { label: "전체 상점", value: stats.totalShops, icon: ShoppingBag },
  ];

  return (
    <div className="min-h-screen pb-10 transition-colors duration-300" style={{ backgroundColor: theme.bgMain }}>
      {/* 헤더 */}
      <header
        className="sticky top-0 z-50"
        style={{ backgroundColor: theme.bgElevated, borderBottom: `1px solid ${theme.borderLight}` }}
      >
        <div className="max-w-[640px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-1 -ml-1 rounded-lg transition-colors"
              style={{ color: theme.textPrimary }}
            >
              <ArrowLeft className="w-6 h-6" strokeWidth={1.5} />
            </Link>
            <h1 className="text-lg font-bold" style={{ color: theme.textPrimary }}>🛠️ 관리자</h1>
          </div>
          <span className="text-sm" style={{ color: theme.textMuted }}>{userProfile?.nickname || user?.email}</span>
        </div>
      </header>

      <main className="max-w-[640px] mx-auto px-4 py-4">
        {/* 오늘 통계 */}
        <section
          className="rounded-2xl p-5 mb-4 relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${theme.accent}, ${theme.accentDark || theme.accent})` }}
        >
          <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full blur-3xl" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}></div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5" style={{ color: isDark ? '#121212' : '#FFFFFF' }} strokeWidth={1.5} />
              <h2 className="font-bold" style={{ color: isDark ? '#121212' : '#FFFFFF' }}>오늘의 통계</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div
                className="rounded-xl p-4"
                style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <UserPlus className="w-4 h-4" style={{ color: isDark ? '#121212' : '#FFFFFF' }} strokeWidth={1.5} />
                  <span className="text-xs" style={{ color: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.8)' }}>신규 가입</span>
                </div>
                <p className="text-3xl font-bold" style={{ color: isDark ? '#121212' : '#FFFFFF' }}>{stats.todayUsers}</p>
              </div>
              <div
                className="rounded-xl p-4"
                style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <PenSquare className="w-4 h-4" style={{ color: isDark ? '#121212' : '#FFFFFF' }} strokeWidth={1.5} />
                  <span className="text-xs" style={{ color: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.8)' }}>신규 게시글</span>
                </div>
                <p className="text-3xl font-bold" style={{ color: isDark ? '#121212' : '#FFFFFF' }}>{stats.todayPosts}</p>
              </div>
            </div>
          </div>
        </section>

        {/* 전체 통계 */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {statCards.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl p-4"
              style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center mb-2"
                style={{ backgroundColor: theme.bgInput }}
              >
                <stat.icon className="w-4 h-4" style={{ color: theme.accent }} strokeWidth={1.5} />
              </div>
              <p className="text-xl font-bold" style={{ color: theme.textPrimary }}>{stat.value}</p>
              <p className="text-xs" style={{ color: theme.textMuted }}>{stat.label}</p>
            </div>
          ))}
        </section>

        {/* 관리 메뉴 */}
        <section>
          <h2 className="text-base font-bold mb-3" style={{ color: theme.textPrimary }}>관리 메뉴</h2>
          <div
            className="rounded-2xl overflow-hidden"
            style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}
          >
            {menuItems.map((item, index) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center justify-between p-4 transition-colors"
                style={{ borderBottom: index < menuItems.length - 1 ? `1px solid ${theme.border}` : 'none' }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: item.badge && item.count > 0 ? theme.redBg : theme.bgInput }}
                  >
                    <item.icon
                      className="w-5 h-5"
                      style={{ color: item.badge && item.count > 0 ? theme.red : theme.accent }}
                      strokeWidth={1.5}
                    />
                  </div>
                  <div>
                    <p className="font-semibold" style={{ color: theme.textPrimary }}>{item.label}</p>
                    <p className="text-xs" style={{ color: theme.textMuted }}>
                      {item.badge && item.count > 0 ? `${item.count}건 처리 필요` : `총 ${item.count}건`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {item.badge && item.count > 0 && (
                    <span
                      className="px-2 py-0.5 text-xs font-bold rounded-full"
                      style={{ backgroundColor: theme.red, color: '#FFFFFF' }}
                    >
                      {item.count}
                    </span>
                  )}
                  <ChevronRight className="w-5 h-5" style={{ color: theme.textMuted }} strokeWidth={1.5} />
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* 빠른 액션 */}
        <section className="mt-6">
          <h2 className="text-base font-bold mb-3" style={{ color: theme.textPrimary }}>빠른 액션</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/notices/write"
              className="flex items-center justify-center gap-2 py-4 rounded-2xl font-semibold transition-colors"
              style={{ backgroundColor: theme.accent, color: isDark ? '#121212' : '#FFFFFF' }}
            >
              <Megaphone className="w-5 h-5" strokeWidth={1.5} />
              공지 작성
            </Link>
            <Link
              href="/admin/reports"
              className="flex items-center justify-center gap-2 py-4 rounded-2xl font-semibold transition-colors"
              style={{ backgroundColor: theme.red, color: '#FFFFFF' }}
            >
              <AlertTriangle className="w-5 h-5" strokeWidth={1.5} />
              신고 확인
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
