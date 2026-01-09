"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Search, ArrowLeft, FileText, Video, MessageCircle, ChevronRight } from "lucide-react";

function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";

  const [searchQuery, setSearchQuery] = useState(query);
  const [posts, setPosts] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    if (query) {
      setSearchQuery(query);
      performSearch(query);
    } else {
      setLoading(false);
    }
  }, [query]);

  const performSearch = async (q: string) => {
    setLoading(true);

    const { data: postsData } = await supabase
      .from("posts")
      .select("*")
      .or(`title.ilike.%${q}%,content.ilike.%${q}%`)
      .order("created_at", { ascending: false })
      .limit(20);

    const { data: videosData } = await supabase
      .from("videos")
      .select("*")
      .or(`title.ilike.%${q}%,description.ilike.%${q}%`)
      .order("created_at", { ascending: false })
      .limit(20);

    setPosts(postsData || []);
    setVideos(videosData || []);
    setLoading(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery.trim())}`;
    }
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

  const totalCount = posts.length + videos.length;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-[631px] mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/" className="p-2 -ml-2 hover:bg-gray-100 rounded-full">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </Link>

          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="검색어를 입력하세요"
                className="w-full h-10 pl-4 pr-10 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                autoFocus
              />
              <button
                type="submit"
                className="absolute right-1 top-1 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center hover:bg-emerald-600 transition-colors"
              >
                <Search className="w-4 h-4 text-white" />
              </button>
            </div>
          </form>
        </div>
      </header>

      <main className="max-w-[631px] mx-auto bg-white min-h-screen">
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setActiveTab("all")}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              activeTab === "all"
                ? "text-emerald-600 border-b-2 border-emerald-500"
                : "text-gray-500"
            }`}
          >
            전체 ({totalCount})
          </button>
          <button
            onClick={() => setActiveTab("posts")}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              activeTab === "posts"
                ? "text-emerald-600 border-b-2 border-emerald-500"
                : "text-gray-500"
            }`}
          >
            게시글 ({posts.length})
          </button>
          <button
            onClick={() => setActiveTab("videos")}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              activeTab === "videos"
                ? "text-emerald-600 border-b-2 border-emerald-500"
                : "text-gray-500"
            }`}
          >
            영상 ({videos.length})
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
          </div>
        ) : !query ? (
          <div className="text-center py-20">
            <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">검색어를 입력해주세요</p>
          </div>
        ) : totalCount === 0 ? (
          <div className="text-center py-20">
            <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">"{query}" 검색 결과가 없습니다</p>
            <p className="text-gray-400 text-sm mt-2">다른 검색어로 시도해보세요</p>
          </div>
        ) : (
          <div>
            {(activeTab === "all" || activeTab === "posts") && posts.length > 0 && (
              <div className="border-b border-gray-100">
                {activeTab === "all" && (
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-600" />
                      <span className="font-semibold text-gray-800">게시글</span>
                      <span className="text-sm text-gray-500">({posts.length})</span>
                    </div>
                    {posts.length > 3 && (
                      <button
                        onClick={() => setActiveTab("posts")}
                        className="text-sm text-emerald-600 font-medium flex items-center gap-1"
                      >
                        더보기 <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
                <div>
                  {(activeTab === "all" ? posts.slice(0, 3) : posts).map((post) => (
                    <Link
                      key={post.id}
                      href={`/community/${post.id}`}
                      className="block px-4 py-4 border-b border-gray-50 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                              {post.category || "자유"}
                            </span>
                          </div>
                          <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">{post.title}</h3>
                          <p className="text-sm text-gray-500 line-clamp-2">{post.content}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                            <span>{post.author_name || "익명"}</span>
                            <span>{formatDate(post.created_at)}</span>
                            <span className="flex items-center gap-1">
                              <MessageCircle className="w-3 h-3" />
                              {post.comment_count || 0}
                            </span>
                          </div>
                        </div>
                        {post.image_url && (
                          <img
                            src={post.image_url}
                            alt=""
                            className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                          />
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {(activeTab === "all" || activeTab === "videos") && videos.length > 0 && (
              <div>
                {activeTab === "all" && (
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
                    <div className="flex items-center gap-2">
                      <Video className="w-4 h-4 text-red-500" />
                      <span className="font-semibold text-gray-800">영상</span>
                      <span className="text-sm text-gray-500">({videos.length})</span>
                    </div>
                    {videos.length > 3 && (
                      <button
                        onClick={() => setActiveTab("videos")}
                        className="text-sm text-emerald-600 font-medium flex items-center gap-1"
                      >
                        더보기 <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3 p-4">
                  {(activeTab === "all" ? videos.slice(0, 4) : videos).map((video) => (
                    <Link key={video.id} href={`/videos/${video.id}`} className="group">
                      <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-100">
                        {video.thumbnail_url ? (
                          <img
                            src={video.thumbnail_url}
                            alt={video.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                            <Video className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors" />
                        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                          {video.duration || "0:00"}
                        </div>
                      </div>
                      <h3 className="mt-2 text-sm font-semibold text-gray-900 line-clamp-2 group-hover:text-emerald-600">
                        {video.title}
                      </h3>
                      <p className="text-xs text-gray-400 mt-1">{formatDate(video.created_at)}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div></div>}>
      <SearchContent />
    </Suspense>
  );
}