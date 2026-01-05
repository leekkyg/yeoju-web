"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const categories = ["전체", "자유", "질문", "정보", "일상", "맛집"];

export default function CommunityPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetchPosts();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, [selectedCategory]);

  const fetchPosts = async () => {
    setLoading(true);
    let query = supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (selectedCategory !== "전체") {
      query = query.eq("category", selectedCategory);
    }

    const { data } = await query;
    setPosts(data || []);
    setLoading(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;
    return date.toLocaleDateString("ko-KR");
  };

  return (
    <div className="min-h-screen bg-gray-100 pb-24 md:pb-10">
      <header className="bg-gray-900 sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-white font-bold text-lg">커뮤니티</h1>
          </div>
          <Link
            href={user ? "/community/write" : "/login"}
            className="px-4 py-1.5 bg-amber-500 text-gray-900 font-bold rounded-lg text-sm hover:bg-amber-400 transition-colors"
          >
            글쓰기
          </Link>
        </div>
      </header>

      <div className="bg-white border-b border-gray-200 sticky top-14 z-40">
        <div className="max-w-3xl mx-auto px-4 flex gap-1 overflow-x-auto py-3">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-colors ${
                selectedCategory === category
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 py-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl shadow-md">
            <p className="text-gray-500 font-medium">게시글이 없습니다</p>
            <Link
              href={user ? "/community/write" : "/login"}
              className="inline-block mt-4 px-6 py-2 bg-amber-500 text-gray-900 font-bold rounded-lg hover:bg-amber-400 transition-colors"
            >
              첫 글 작성하기
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/community/${post.id}`}
                className="block bg-white rounded-xl p-4 shadow-md hover:shadow-lg transition-all border-l-4 border-amber-500"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold text-white bg-gray-800 px-2 py-1 rounded">
                        {post.category || "자유"}
                      </span>
                      <span className="text-xs text-gray-500 font-medium">{formatDate(post.created_at)}</span>
                    </div>
                    <h3 className="font-bold text-gray-900 mb-1 truncate">{post.title}</h3>
                    <p className="text-sm text-gray-600 line-clamp-2">{post.content}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 font-medium">
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        {post.view_count || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                        {post.like_count || 0}
                      </span>
                    </div>
                  </div>
                  {post.image_url && (
                    <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gray-200">
                      <img src={post.image_url} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 z-50">
        <div className="flex">
          <Link href="/" className="flex-1 py-3 flex flex-col items-center gap-1">
            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs text-gray-500">홈</span>
          </Link>
          <Link href="/community" className="flex-1 py-3 flex flex-col items-center gap-1">
            <svg className="w-6 h-6 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-xs font-bold text-amber-500">커뮤니티</span>
          </Link>
          <Link href="/market" className="flex-1 py-3 flex flex-col items-center gap-1">
            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <span className="text-xs text-gray-500">마켓</span>
          </Link>
          <Link href="/videos" className="flex-1 py-3 flex flex-col items-center gap-1">
            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs text-gray-500">영상</span>
          </Link>
          <Link href="/login" className="flex-1 py-3 flex flex-col items-center gap-1">
            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-xs text-gray-500">MY</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}