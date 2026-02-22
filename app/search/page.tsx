"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/contexts/ThemeContext";
import { Search, ArrowLeft, FileText, Video, MessageCircle, ChevronRight } from "lucide-react";

function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const { theme, isDark, mounted } = useTheme();

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

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.bgMain }}>
        <div className="w-10 h-10 border-2 rounded-full animate-spin" style={{ borderColor: theme.border, borderTopColor: theme.accent }}></div>
      </div>
    );
  }

  const tabs = [
    { key: "all", label: "전체", count: totalCount },
    { key: "posts", label: "게시글", count: posts.length },
    { key: "videos", label: "영상", count: videos.length },
  ];

  return (
    <div className="min-h-screen transition-colors duration-300" style={{ backgroundColor: theme.bgMain }}>
      {/* 헤더 */}
      <header className="sticky top-0 z-50" style={{ backgroundColor: theme.bgCard, borderBottom: `1px solid ${theme.borderLight}` }}>
        <div className="max-w-[640px] mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="p-1 -ml-1 rounded-lg" style={{ color: theme.textPrimary }}>
            <ArrowLeft className="w-6 h-6" strokeWidth={1.5} />
          </Link>

          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="검색어를 입력하세요"
                className="w-full h-10 pl-4 pr-10 rounded-full text-sm outline-none transition-all"
                style={{ backgroundColor: theme.bgInput, border: `1px solid ${theme.border}`, color: theme.textPrimary }}
                autoFocus
              />
              <button
                type="submit"
                className="absolute right-1 top-1 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                style={{ backgroundColor: theme.accent }}
              >
                <Search className="w-4 h-4" style={{ color: isDark ? '#121212' : '#FFFFFF' }} strokeWidth={1.5} />
              </button>
            </div>
          </form>
        </div>
      </header>

      <main className="max-w-[640px] mx-auto" style={{ backgroundColor: theme.bgCard }}>
        {/* 탭 */}
        <div className="flex" style={{ borderBottom: `1px solid ${theme.border}` }}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex-1 py-3 text-sm font-semibold transition-colors relative"
              style={{ color: activeTab === tab.key ? theme.accent : theme.textMuted }}
            >
              {tab.label} ({tab.count})
              {activeTab === tab.key && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ backgroundColor: theme.accent }} />
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: theme.border, borderTopColor: theme.accent }}></div>
          </div>
        ) : !query ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: theme.bgInput }}>
              <Search className="w-7 h-7" style={{ color: theme.textMuted }} strokeWidth={1.5} />
            </div>
            <p style={{ color: theme.textMuted }}>검색어를 입력해주세요</p>
          </div>
        ) : totalCount === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: theme.bgInput }}>
              <Search className="w-7 h-7" style={{ color: theme.textMuted }} strokeWidth={1.5} />
            </div>
            <p style={{ color: theme.textMuted }}>"{query}" 검색 결과가 없습니다</p>
            <p className="text-sm mt-2" style={{ color: theme.textMuted }}>다른 검색어로 시도해보세요</p>
          </div>
        ) : (
          <div>
            {/* 게시글 결과 */}
            {(activeTab === "all" || activeTab === "posts") && posts.length > 0 && (
              <div style={{ borderBottom: `1px solid ${theme.border}` }}>
                {activeTab === "all" && (
                  <div className="flex items-center justify-between px-4 py-3" style={{ backgroundColor: theme.bgInput }}>
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" style={{ color: theme.accent }} strokeWidth={1.5} />
                      <span className="font-semibold" style={{ color: theme.textPrimary }}>게시글</span>
                      <span className="text-sm" style={{ color: theme.textMuted }}>({posts.length})</span>
                    </div>
                    {posts.length > 3 && (
                      <button
                        onClick={() => setActiveTab("posts")}
                        className="text-sm font-medium flex items-center gap-1"
                        style={{ color: theme.accent }}
                      >
                        더보기 <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
                      </button>
                    )}
                  </div>
                )}
                <div>
                  {(activeTab === "all" ? posts.slice(0, 3) : posts).map((post, index) => (
                    <Link
                      key={post.id}
                      href={`/community/${post.id}`}
                      className="block px-4 py-4 transition-colors"
                      style={{ borderBottom: index !== (activeTab === "all" ? Math.min(posts.length, 3) : posts.length) - 1 ? `1px solid ${theme.border}` : 'none' }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span 
                              className="text-xs font-medium px-2 py-0.5 rounded"
                              style={{ backgroundColor: `${theme.accent}20`, color: theme.accent }}
                            >
                              {post.category || "자유"}
                            </span>
                          </div>
                          <h3 className="font-semibold mb-1 line-clamp-1" style={{ color: theme.textPrimary }}>{post.title}</h3>
                          <p className="text-sm line-clamp-2" style={{ color: theme.textMuted }}>{post.content}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs" style={{ color: theme.textMuted }}>
                            <span>{post.author_name || "익명"}</span>
                            <span>{formatDate(post.created_at)}</span>
                            <span className="flex items-center gap-1">
                              <MessageCircle className="w-3 h-3" strokeWidth={1.5} />
                              {post.comment_count || 0}
                            </span>
                          </div>
                        </div>
                        {post.image_url && (
                          <img
                            src={post.image_url}
                            alt=""
                            className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                          />
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* 영상 결과 */}
            {(activeTab === "all" || activeTab === "videos") && videos.length > 0 && (
              <div>
                {activeTab === "all" && (
                  <div className="flex items-center justify-between px-4 py-3" style={{ backgroundColor: theme.bgInput }}>
                    <div className="flex items-center gap-2">
                      <Video className="w-4 h-4" style={{ color: theme.red }} strokeWidth={1.5} />
                      <span className="font-semibold" style={{ color: theme.textPrimary }}>영상</span>
                      <span className="text-sm" style={{ color: theme.textMuted }}>({videos.length})</span>
                    </div>
                    {videos.length > 4 && (
                      <button
                        onClick={() => setActiveTab("videos")}
                        className="text-sm font-medium flex items-center gap-1"
                        style={{ color: theme.accent }}
                      >
                        더보기 <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
                      </button>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3 p-4">
                  {(activeTab === "all" ? videos.slice(0, 4) : videos).map((video) => (
                    <Link key={video.id} href={`/videos/${video.id}`} className="group">
                      <div className="relative aspect-video rounded-xl overflow-hidden" style={{ backgroundColor: theme.bgInput }}>
                        {video.thumbnail_url ? (
                          <img
                            src={video.thumbnail_url}
                            alt={video.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: theme.bgInput }}>
                            <Video className="w-8 h-8" style={{ color: theme.textMuted }} strokeWidth={1.5} />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors" />
                        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                          {video.duration || "0:00"}
                        </div>
                      </div>
                      <h3 className="mt-2 text-sm font-semibold line-clamp-2" style={{ color: theme.textPrimary }}>
                        {video.title}
                      </h3>
                      <p className="text-xs mt-1" style={{ color: theme.textMuted }}>{formatDate(video.created_at)}</p>
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
  const { theme } = useTheme();
  
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.bgMain }}>
        <div className="w-10 h-10 border-2 rounded-full animate-spin" style={{ borderColor: theme.border, borderTopColor: theme.accent }}></div>
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
