"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import Header from "@/components/Header";
import { FileText, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface FeedItem {
  id: string;
  type: "post" | "video" | "notice";
  title: string;
  thumbnail_url?: string;
  video_url?: string;
  duration?: string;
  created_at: string;
  is_pinned?: boolean;
  view_count?: number;
  images?: string[];
  attachments?: string[];
}

interface Partner {
  id: number;
  name: string;
  image_url: string;
  link_url: string | null;
  width: number | null;
  height: number | null;
  start_date: string | null;
  end_date: string | null;
}

interface FeedClientProps {
  initialData: {
    mainBanners: any[];
    posts: any[];
    videos: any[];
    feedAds: any[];
    notices?: any[];
  };
}

// URL 유효성 검사 함수
function isValidUrl(url: string | undefined | null): boolean {
  if (!url || typeof url !== 'string' || url.trim() === '') return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export default function FeedClient({ initialData }: FeedClientProps) {
  const router = useRouter();
  const { theme, isDark, mounted } = useTheme();
  const [mainBanners] = useState(initialData.mainBanners);
  const [feedAds] = useState(initialData.feedAds);
  const [activeTab, setActiveTab] = useState<"all" | "posts" | "notices" | "partners">("all");
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loadingPartners, setLoadingPartners] = useState(false);
  
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [postItems, setPostItems] = useState<FeedItem[]>([]);
  const [noticeItems, setNoticeItems] = useState<FeedItem[]>([]);

  const postObserverRef = useRef<IntersectionObserver | null>(null);
  const [visiblePosts, setVisiblePosts] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!mounted) return;

    // 게시물 변환
    const posts: FeedItem[] = initialData.posts.map((post) => ({
      id: `post-${post.id}`,
      type: "post" as const,
      title: post.title,
      thumbnail_url: post.images?.[0],
      created_at: post.created_at,
      images: post.images,
      attachments: post.attachments,
    }));

    // 영상 변환
    const videos: FeedItem[] = initialData.videos.map((video) => ({
      id: `video-${video.id}`,
      type: "video" as const,
      title: video.title,
      thumbnail_url: video.thumbnail_url,
      video_url: video.video_url,
      duration: video.duration,
      created_at: video.created_at,
    }));

    // 공지사항 변환
    const notices: FeedItem[] = (initialData.notices || []).map((notice) => ({
      id: `notice-${notice.id}`,
      type: "notice" as const,
      title: notice.title,
      created_at: notice.created_at,
      is_pinned: notice.is_pinned,
      view_count: notice.view_count,
    }));

    // 전체 피드 (게시물 + 영상 혼합)
    const allFeed = [...posts, ...videos].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    setFeedItems(allFeed);
    setPostItems(posts);
    setNoticeItems(notices);
  }, [initialData, mounted]);

  // 제휴협력사 데이터 가져오기
  useEffect(() => {
    if (activeTab === "partners" && partners.length === 0) {
      fetchPartners();
    }
  }, [activeTab]);

  const fetchPartners = async () => {
    setLoadingPartners(true);
    const { data } = await supabase
      .from("partners")
      .select("*");

    if (data) {
      // 게시 기간 필터링
      const now = new Date();
      const activePartners = data.filter((p: Partner) => {
        const start = p.start_date ? new Date(p.start_date) : null;
        const end = p.end_date ? new Date(p.end_date) : null;
        
        if (start && now < start) return false;
        if (end && now > end) return false;
        return true;
      });

      const shuffled = [...activePartners].sort(() => Math.random() - 0.5);
      setPartners(shuffled);
    }
    setLoadingPartners(false);
  };

  const handleShufflePartners = () => {
    const shuffled = [...partners].sort(() => Math.random() - 0.5);
    setPartners(shuffled);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    postObserverRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const postId = entry.target.getAttribute("data-post-id");
          if (!postId) return;

          if (entry.isIntersecting) {
            setVisiblePosts((prev) => new Set(prev).add(postId));
          }
        });
      },
      { threshold: 0.1, rootMargin: "50px" }
    );

    return () => {
      postObserverRef.current?.disconnect();
    };
  }, []);

  if (!mounted) return null;

  const currentItems = activeTab === "all" ? feedItems : activeTab === "posts" ? postItems : noticeItems;

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.bgMain }}>
      <Header />

      <main className="pt-14 pb-16 max-w-[631px] mx-auto">
        {/* 메인 배너 */}
        {mainBanners.length > 0 && (
          <section className="px-4 pt-4">
            <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: theme.bgCard }}>
              {mainBanners.map((banner) => (
                <a key={banner.id} href={banner.target_url || "#"} target="_blank" rel="noopener noreferrer">
                  <img src={banner.image_url} alt={banner.title} className="w-full h-auto" />
                </a>
              ))}
            </div>
          </section>
        )}

        {/* 탭 네비게이션 */}
        <section className="px-4 pt-4 sticky top-14 z-40" style={{ backgroundColor: theme.bgMain }}>
          <div 
            className="grid grid-cols-4 rounded-xl overflow-hidden"
            style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.border}` }}
          >
            <button
              onClick={() => setActiveTab("all")}
              className="py-3 text-xs sm:text-sm font-medium transition-colors"
              style={{ 
                backgroundColor: activeTab === "all" ? theme.accent : "transparent",
                color: activeTab === "all" ? (isDark ? "#121212" : "#FFFFFF") : theme.textSecondary
              }}
            >
              전체
            </button>
            <button
              onClick={() => setActiveTab("notices")}
              className="py-3 text-xs sm:text-sm font-medium transition-colors"
              style={{ 
                backgroundColor: activeTab === "notices" ? theme.accent : "transparent",
                color: activeTab === "notices" ? (isDark ? "#121212" : "#FFFFFF") : theme.textSecondary
              }}
            >
              공지사항
            </button>
            <button
              onClick={() => setActiveTab("posts")}
              className="py-3 text-xs sm:text-sm font-medium transition-colors"
              style={{ 
                backgroundColor: activeTab === "posts" ? theme.accent : "transparent",
                color: activeTab === "posts" ? (isDark ? "#121212" : "#FFFFFF") : theme.textSecondary
              }}
            >
              게시물
            </button>
            <button
              onClick={() => setActiveTab("partners")}
              className="flex-1 py-3 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap"
              style={{ 
                backgroundColor: activeTab === "partners" ? theme.accent : "transparent",
                color: activeTab === "partners" ? (isDark ? "#121212" : "#FFFFFF") : theme.textSecondary
              }}
            >
              제휴·협력사
            </button>
          </div>
        </section>

        {/* 공지사항 탭 */}
        {activeTab === "notices" && (
          <section className="px-4 pt-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm" style={{ color: theme.textMuted }}>총 {noticeItems.length}개의 공지</span>
            </div>
            {noticeItems.length === 0 ? (
              <div className="text-center py-20 rounded-2xl" style={{ backgroundColor: theme.bgCard }}>
                <p style={{ color: theme.textMuted }}>등록된 공지사항이 없습니다</p>
              </div>
            ) : (
              <div className="space-y-2">
                {noticeItems.map((item) => (
                  <Link
                    key={item.id}
                    href={`/notices/${item.id.replace("notice-", "")}`}
                    className="block p-4 rounded-xl transition-all hover:opacity-80"
                    style={{
                      backgroundColor: theme.bgCard,
                      border: `1px solid ${theme.border}`,
                    }}
                  >
                    <div className="flex items-start gap-2 mb-2">
                      {item.is_pinned && (
                        <span 
                          className="px-2 py-0.5 text-xs font-bold rounded"
                          style={{ 
                            backgroundColor: `${theme.accent}20`,
                            color: theme.accent 
                          }}
                        >
                          고정
                        </span>
                      )}
                      <h3 className="font-semibold text-base flex-1" style={{ color: theme.textPrimary }}>
                        {item.title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-3 text-xs" style={{ color: theme.textMuted }}>
                      <span>관리자</span>
                      <span>조회 {item.view_count || 0}</span>
                      <span>{new Date(item.created_at).toLocaleDateString()}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}

        {/* 제휴·협력사 탭 */}
        {activeTab === "partners" && (
          <section className="px-4 pt-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm" style={{ color: theme.textMuted }}>
                총 {partners.length}개의 파트너
              </span>
              {partners.length > 0 && (
                <button
                  onClick={handleShufflePartners}
                  className="p-2 rounded-lg transition-colors"
                  style={{ color: theme.accent }}
                  title="랜덤 정렬"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}
            </div>

            {loadingPartners ? (
              <div className="flex justify-center py-20">
                <div 
                  className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
                  style={{ borderColor: theme.accent, borderTopColor: 'transparent' }}
                />
              </div>
            ) : partners.length === 0 ? (
              <div className="text-center py-20 rounded-2xl" style={{ backgroundColor: theme.bgCard }}>
                <p style={{ color: theme.textMuted }}>등록된 제휴사가 없습니다</p>
              </div>
            ) : (
              <div 
                className="columns-3 gap-2"
                style={{ columnGap: '8px' }}
              >
                {partners.map((partner) => (
                  <div
                    key={partner.id}
                    className="mb-2 break-inside-avoid"
                  >
                    {partner.link_url ? (
                      <a
                        href={partner.link_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block rounded-lg overflow-hidden transition-transform hover:scale-[1.02]"
                        style={{
                          backgroundColor: theme.bgCard,
                          border: `1px solid ${theme.border}`
                        }}
                      >
                        <img
                          src={partner.image_url}
                          alt={partner.name}
                          className="w-full h-auto"
                          loading="lazy"
                        />
                      </a>
                    ) : (
                      <div
                        className="rounded-lg overflow-hidden"
                        style={{
                          backgroundColor: theme.bgCard,
                          border: `1px solid ${theme.border}`
                        }}
                      >
                        <img
                          src={partner.image_url}
                          alt={partner.name}
                          className="w-full h-auto"
                          loading="lazy"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* 전체/게시물 탭 */}
        {(activeTab === "all" || activeTab === "posts") && (
          <section className="px-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {currentItems.map((item) => {
                if (item.type === "video") {
                  return (
                    <Link
                      key={item.id}
                      href={`/videos/${item.id.replace("video-", "")}`}
                      className="block rounded-xl overflow-hidden transition-all hover:opacity-90"
                      style={{
                        backgroundColor: theme.bgCard,
                        border: `1px solid ${theme.border}`,
                      }}
                    >
                      <div className="relative aspect-video">
                        {item.thumbnail_url && isValidUrl(item.thumbnail_url) ? (
                          <img
                            src={item.thumbnail_url}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div
                            className="w-full h-full flex items-center justify-center"
                            style={{ backgroundColor: isDark ? "#1e1e1e" : "#f5f5f5" }}
                          >
                            <FileText className="w-12 h-12" style={{ color: theme.textMuted }} />
                          </div>
                        )}
                        {item.duration && (
                          <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/80 text-white text-xs">
                            {item.duration}
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <h3 className="font-medium line-clamp-2" style={{ color: theme.textPrimary }}>
                          {item.title}
                        </h3>
                      </div>
                    </Link>
                  );
                }

                return (
                  <Link
                    key={item.id}
                    href={`/posts/${item.id.replace("post-", "")}`}
                    className="block rounded-xl overflow-hidden transition-all hover:opacity-90"
                    style={{
                      backgroundColor: theme.bgCard,
                      border: `1px solid ${theme.border}`,
                    }}
                    data-post-id={item.id}
                    ref={(el) => {
                      if (el && postObserverRef.current) {
                        postObserverRef.current.observe(el);
                      }
                    }}
                  >
                    <div className="relative aspect-video">
                      {item.thumbnail_url && isValidUrl(item.thumbnail_url) ? (
                        <img
                          src={item.thumbnail_url}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center"
                          style={{ backgroundColor: isDark ? "#1e1e1e" : "#f5f5f5" }}
                        >
                          <FileText className="w-12 h-12" style={{ color: theme.textMuted }} />
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="font-medium line-clamp-2" style={{ color: theme.textPrimary }}>
                        {item.title}
                      </h3>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
