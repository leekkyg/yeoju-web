"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AdminPostsPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [selectedPost, setSelectedPost] = useState<any>(null);

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
    setSelectedPost(null);
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
          <h1 className="text-white font-bold text-lg">📝 게시물 관리</h1>
        </div>
      </header>

      <main className="max-w-[631px] mx-auto px-4 py-6">
        {/* 검색 & 필터 */}
        <div className="bg-white rounded-xl p-4 shadow-md mb-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="내용 또는 작성자 검색"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">전체</option>
              <option value="anonymous">익명 글</option>
              <option value="media">미디어 포함</option>
            </select>
          </div>
        </div>

        {/* 통계 */}
        <div className="flex items-center justify-between mb-4 px-1">
          <span className="text-sm text-gray-500">총 {filteredPosts.length}개</span>
        </div>

        {/* 게시물 목록 */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {filteredPosts.length === 0 ? (
            <div className="p-8 text-center text-gray-500">검색 결과가 없습니다</div>
          ) : (
            filteredPosts.map((post, index) => (
              <div
                key={post.id}
                className={`p-4 ${index !== filteredPosts.length - 1 ? "border-b border-gray-100" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-gray-900 text-sm">
                        {post.is_anonymous ? `익명 (${post.author_nickname})` : post.author_nickname}
                      </span>
                      {post.is_anonymous && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">익명</span>
                      )}
                      {getMediaCount(post) > 0 && (
                        <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">
                          📷 {getMediaCount(post)}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-700 text-sm line-clamp-2 mb-2">{post.content}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span>{formatDate(post.created_at)}</span>
                      <span>좋아요 {post.like_count || 0}</span>
                      <span>댓글 {post.comment_count || 0}</span>
                      {post.ip_address && <span className="text-red-400">IP: {post.ip_address}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/community/${post.id}`}
                      className="p-2 text-gray-400 hover:text-amber-500 hover:bg-gray-100 rounded-lg"
                      title="보기"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </Link>
                    <button
                      onClick={() => handleDelete(post.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                      title="삭제"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
