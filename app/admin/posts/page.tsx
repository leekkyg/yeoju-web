"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/contexts/ThemeContext";
import {
  ArrowLeft,
  Search,
  Eye,
  Trash2,
  Heart,
  MessageCircle,
  Image,
  UserX,
  ChevronDown,
} from "lucide-react";

export default function AdminPostsPage() {
  const router = useRouter();
  const { theme, isDark, mounted } = useTheme();
  
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  useEffect(() => {
    checkAdminAndFetch();
  }, []);

  const checkAdminAndFetch = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { data: profile } = await supabase.from("profiles").select("*").eq("email", user.email).single();
    if (profile?.role !== "admin") { alert("관리자 권한이 없습니다"); router.push("/"); return; }

    await fetchPosts();
    setLoading(false);
  };

  const fetchPosts = async () => {
    const { data } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false });
    setPosts(data || []);
  };

  const handleDelete = async (postId: number) => {
    if (!confirm("이 게시글을 삭제하시겠습니까?")) return;
    
    await supabase.from("posts").delete().eq("id", postId);
    setPosts(posts.filter(p => p.id !== postId));
    alert("삭제되었습니다");
  };

  const formatDate = (d: string) => {
    return new Date(d).toLocaleDateString("ko-KR", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getMediaCount = (post: any): number => {
    if (!post.images) return 0;
    const images = typeof post.images === "string" ? JSON.parse(post.images) : post.images;
    return images.length;
  };

  const filteredPosts = posts.filter(post => {
    const matchesSearch = 
      post.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.author_nickname?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterType === "all") return matchesSearch;
    if (filterType === "anonymous") return matchesSearch && post.is_anonymous;
    if (filterType === "media") return matchesSearch && getMediaCount(post) > 0;
    return matchesSearch;
  });

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
          <h1 className="text-lg font-bold" style={{ color: theme.textPrimary }}>📝 게시물 관리</h1>
        </div>
      </header>

      <main className="max-w-[640px] mx-auto px-4 py-4">
        {/* 검색 & 필터 */}
        <section className="rounded-2xl p-4 mb-4" style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}>
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: theme.textMuted }} strokeWidth={1.5} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="내용 또는 작성자 검색"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-[15px] outline-none"
                style={{ backgroundColor: theme.bgInput, border: `1px solid ${theme.border}`, color: theme.textPrimary }}
              />
            </div>
            <div className="relative">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full md:w-auto px-4 py-2.5 pr-10 rounded-xl text-[15px] outline-none appearance-none"
                style={{ backgroundColor: theme.bgInput, border: `1px solid ${theme.border}`, color: theme.textPrimary }}
              >
                <option value="all">전체</option>
                <option value="anonymous">익명 글</option>
                <option value="media">미디어 포함</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: theme.textMuted }} />
            </div>
          </div>
        </section>

        {/* 통계 */}
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-sm" style={{ color: theme.textMuted }}>총 {filteredPosts.length}개</span>
        </div>

        {/* 게시물 목록 */}
        <section className="rounded-2xl overflow-hidden" style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}>
          {filteredPosts.length === 0 ? (
            <div className="p-8 text-center" style={{ color: theme.textMuted }}>검색 결과가 없습니다</div>
          ) : (
            filteredPosts.map((post, index) => (
              <div
                key={post.id}
                className="p-4"
                style={{ borderBottom: index !== filteredPosts.length - 1 ? `1px solid ${theme.border}` : 'none' }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="font-semibold text-sm" style={{ color: theme.textPrimary }}>
                        {post.is_anonymous ? `익명 (${post.author_nickname})` : post.author_nickname}
                      </span>
                      {post.is_anonymous && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5" style={{ backgroundColor: theme.bgInput, color: theme.textMuted }}>
                          <UserX className="w-3 h-3" strokeWidth={1.5} /> 익명
                        </span>
                      )}
                      {getMediaCount(post) > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5" style={{ backgroundColor: `${theme.accent}15`, color: theme.accent }}>
                          <Image className="w-3 h-3" strokeWidth={1.5} /> {getMediaCount(post)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm line-clamp-2 mb-2" style={{ color: theme.textSecondary }}>{post.content}</p>
                    <div className="flex items-center gap-3 text-xs" style={{ color: theme.textMuted }}>
                      <span>{formatDate(post.created_at)}</span>
                      <span className="flex items-center gap-0.5">
                        <Heart className="w-3 h-3" style={{ color: theme.red }} strokeWidth={1.5} />
                        {post.like_count || 0}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <MessageCircle className="w-3 h-3" strokeWidth={1.5} />
                        {post.comment_count || 0}
                      </span>
                      {post.ip_address && (
                        <span style={{ color: theme.red }}>IP: {post.ip_address}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Link
                      href={`/community/${post.id}`}
                      className="p-2 rounded-lg transition-colors"
                      style={{ color: theme.textMuted }}
                      title="보기"
                    >
                      <Eye className="w-5 h-5" strokeWidth={1.5} />
                    </Link>
                    <button
                      onClick={() => handleDelete(post.id)}
                      className="p-2 rounded-lg transition-colors"
                      style={{ color: theme.red }}
                      title="삭제"
                    >
                      <Trash2 className="w-5 h-5" strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </section>
      </main>
    </div>
  );
}
