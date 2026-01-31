"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import OptimizedImage from "@/components/common/OptimizedImage";
import { useTheme } from "@/contexts/ThemeContext";
import Header from "@/components/Header";
import { FileText } from "lucide-react";

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
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [noticeItems, setNoticeItems] = useState<FeedItem[]>([]);
  const [currentBanner, setCurrentBanner] = useState(0);
  const [activeTab, setActiveTab] = useState<"all" | "notices" | "posts" | "partners">("all");
  const bannerTouchStartX = useRef(0);

  useEffect(() => {
    const posts: FeedItem[] = initialData.posts.map((p: any) => {
      let images = p.images;
      if (typeof images === 'string') {
        try { images = JSON.parse(images); } catch { images = []; }
      }
      const thumbnail = Array.isArray(images) && isValidUrl(images[0]) ? images[0] : undefined;
      
      return {
        id: p.id,
        type: "post" as const,
        title: p.title,
        thumbnail_url: thumbnail,
        created_at: p.created_at,
      };
    });

    const videos: FeedItem[] = initialData.videos.map((v: any) => ({
      id: v.id,
      type: "video" as const,
      title: v.title,
      thumbnail_url: isValidUrl(v.thumbnail_url) ? v.thumbnail_url : undefined,
      video_url: isValidUrl(v.video_url) ? v.video_url : undefined,
      duration: v.duration || null,
      created_at: v.created_at,
    }));

    // 공지사항
    const notices: FeedItem[] = (initialData.notices || []).map((n: any) => {
      let images = n.images;
      if (typeof images === 'string') {
        try { images = JSON.parse(images); } catch { images = []; }
      }
      
      return {
        id: n.id,
        type: "notice" as const,
        title: n.title,
        thumbnail_url: Array.isArray(images) && isValidUrl(images[0]) ? images[0] : undefined,
        created_at: n.created_at,
        is_pinned: n.is_pinned,
        view_count: n.view_count || 0,
        images: images,
        attachments: n.attachments || [],
      };
    });

    setNoticeItems(notices);

    const combined = [...posts, ...videos].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    setFeedItems(combined);
  }, [initialData.posts, initialData.videos, initialData.notices]);

  useEffect(() => {
    if (mainBanners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % mainBanners.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [mainBanners.length]);

  const handleBannerTouchStart = (e: React.TouchEvent) => {
    bannerTouchStartX.current = e.touches[0].clientX;
  };

  const handleBannerTouchEnd = (e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX;
    const diff = bannerTouchStartX.current - touchEndX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) setCurrentBanner((prev) => (prev + 1) % mainBanners.length);
      else setCurrentBanner((prev) => (prev - 1 + mainBanners.length) % mainBanners.length);
    }
  };

  // 탭에 따라 필터링
  const getFilteredItems = () => {
    if (activeTab === "posts") return feedItems;
    return feedItems;
  };

  const getFeedWithAds = () => {
    const items = getFilteredItems();
    if (feedAds.length === 0) return items.map((item, idx) => ({ type: 'item' as const, data: item, index: idx }));
    const result: Array<{ type: 'item' | 'ad'; data: any; index: number }> = [];
    let adIndex = 0;
    items.forEach((item, idx) => {
      result.push({ type: 'item', data: item, index: idx });
      if ((idx + 1) % 6 === 0 && adIndex < feedAds.length) {
        result.push({ type: 'ad', data: feedAds[adIndex], index: adIndex });
        adIndex++;
      }
    });
    return result;
  };

  // 날짜 포맷
  const formatDate = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / 86400000);
    
    if (days === 0) return date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
    if (days < 7) return `${days}일 전`;
    return date.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\. /g, '.').replace('.', '');
  };

  const isNew = (d: string) => Date.now() - new Date(d).getTime() < 3 * 24 * 60 * 60 * 1000;
  const hasAttachments = (notice: FeedItem) => (notice.images?.length || 0) + (notice.attachments?.length || 0) > 0;

  // 공지사항 분류
  const pinnedNotices = noticeItems.filter(n => n.is_pinned);
  const normalNotices = noticeItems.filter(n => !n.is_pinned);

  if (!mounted) {
    return <div className="min-h-screen bg-[#252529]"><div className="max-w-[631px] mx-auto" /></div>;
  }

  return (
    <div className="min-h-screen transition-colors duration-300" style={{ backgroundColor: theme.bgMain }}>
      <div className="max-w-[631px] mx-auto">
        <Header showHome={false} />
        
        <main className="pb-8">
          {/* 메인 배너 */}
          {mainBanners.length > 0 && (
            <section className="px-4 pt-4">
              <div className="relative rounded-2xl overflow-hidden" style={{ aspectRatio: "16/9" }} onTouchStart={handleBannerTouchStart} onTouchEnd={handleBannerTouchEnd}>
                {mainBanners.map((banner, index) => (
                  <Link key={banner.id} href={banner.link_url || "#"} className={`absolute inset-0 transition-opacity duration-500 ${index === currentBanner ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
                    {isValidUrl(banner.image_url) ? (
                      <OptimizedImage src={banner.image_url} alt={banner.title || "배너"} fill sizes="(max-width: 631px) 100vw, 631px" className="object-cover" priority={index === 0} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: theme.bgCard }}><span style={{ color: theme.textMuted }}>배너 이미지</span></div>
                    )}
                  </Link>
                ))}
                {mainBanners.length > 1 && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {mainBanners.map((_, index) => (
                      <button key={index} onClick={() => setCurrentBanner(index)} className={`w-2 h-2 rounded-full transition-all ${index === currentBanner ? "w-4" : ""}`} style={{ backgroundColor: index === currentBanner ? "#fff" : "rgba(255,255,255,0.5)" }} />
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* 탭 메뉴 */}
          <section className="px-4 pt-4">
            <div 
              className="flex rounded-xl overflow-hidden" 
              style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}
            >
              <button
                onClick={() => setActiveTab("all")}
                className="flex-1 py-3 text-xs sm:text-sm font-medium transition-colors"
                style={{ 
                  backgroundColor: activeTab === "all" ? theme.accent : "transparent",
                  color: activeTab === "all" ? (isDark ? "#121212" : "#FFFFFF") : theme.textSecondary
                }}
              >
                전체
              </button>
              <button
                onClick={() => setActiveTab("notices")}
                className="flex-1 py-3 text-xs sm:text-sm font-medium transition-colors"
                style={{ 
                  backgroundColor: activeTab === "notices" ? theme.accent : "transparent",
                  color: activeTab === "notices" ? (isDark ? "#121212" : "#FFFFFF") : theme.textSecondary
                }}
              >
                공지사항
              </button>
              <button
                onClick={() => setActiveTab("posts")}
                className="flex-1 py-3 text-xs sm:text-sm font-medium transition-colors"
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

          {/* 공지사항 탭 - 리스트 형태 */}
          {activeTab === "notices" && (
            <section className="px-4 pt-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm" style={{ color: theme.textMuted }}>총 {noticeItems.length}개의 공지</span>
              </div>

              {noticeItems.length === 0 ? (
                <div className="text-center py-20 rounded-2xl" style={{ backgroundColor: theme.bgCard }}>
                  <svg className="w-16 h-16 mx-auto mb-4" style={{ color: theme.textMuted }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p style={{ color: theme.textMuted }}>공지사항이 없습니다</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* 고정 공지 */}
                  {pinnedNotices.length > 0 && (
                    <div className="rounded-2xl overflow-hidden border" style={{ borderColor: theme.accent, backgroundColor: theme.bgCard }}>
                      <div className="px-4 py-2 flex items-center gap-2 border-b" style={{ borderColor: theme.border }}>
                        <svg className="w-4 h-4" style={{ color: theme.accent }} fill="currentColor" viewBox="0 0 24 24">
                          <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
                        </svg>
                        <span className="text-sm font-bold" style={{ color: theme.accent }}>중요 공지</span>
                      </div>
                      {pinnedNotices.map((notice, index) => (
                        <button
                          key={notice.id}
                          onClick={() => router.push(`/notices/${notice.id}`)}
                          className="flex items-start px-4 py-4 w-full text-left transition-colors hover:opacity-80"
                          style={{ borderTop: index > 0 ? `1px solid ${theme.border}` : 'none' }}
                        >
                          <div className="w-10 flex-shrink-0">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: theme.accent }}>
                              <svg className="w-4 h-4" style={{ color: isDark ? '#121212' : '#fff' }} fill="currentColor" viewBox="0 0 24 24">
                                <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
                              </svg>
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold truncate" style={{ color: theme.accent }}>{notice.title}</h3>
                              {hasAttachments(notice) && (
                                <svg className="w-4 h-4 flex-shrink-0" style={{ color: theme.textMuted }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                </svg>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-xs" style={{ color: theme.textMuted }}>{formatDate(notice.created_at)}</span>
                              <span className="text-xs" style={{ color: theme.border }}>·</span>
                              <span className="text-xs" style={{ color: theme.textMuted }}>조회 {notice.view_count || 0}</span>
                            </div>
                          </div>
                          <svg className="w-5 h-5 flex-shrink-0 ml-2 mt-1" style={{ color: theme.textMuted }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* 일반 공지 */}
                  {normalNotices.length > 0 && (
                    <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: theme.bgCard }}>
                      {normalNotices.map((notice, index) => (
                        <button
                          key={notice.id}
                          onClick={() => router.push(`/notices/${notice.id}`)}
                          className="flex items-start px-4 py-4 w-full text-left transition-colors hover:opacity-80"
                          style={{ 
                            borderTop: index > 0 ? `1px solid ${theme.border}` : 'none',
                            backgroundColor: index % 2 === 0 ? theme.bgCard : isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'
                          }}
                        >
                          <div className="w-10 flex-shrink-0">
                            <span 
                              className="text-sm font-medium inline-flex items-center justify-center w-7 h-7 rounded-full" 
                              style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', color: theme.textMuted }}
                            >
                              {normalNotices.length - index}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              {isNew(notice.created_at) && (
                                <span 
                                  className="text-xs font-bold px-1.5 py-0.5 rounded" 
                                  style={{ backgroundColor: theme.accent, color: isDark ? '#121212' : '#fff' }}
                                >
                                  NEW
                                </span>
                              )}
                              <h3 className="truncate" style={{ color: theme.textPrimary }}>{notice.title}</h3>
                              {hasAttachments(notice) && (
                                <svg className="w-4 h-4 flex-shrink-0" style={{ color: theme.textMuted }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                </svg>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-xs" style={{ color: theme.textMuted }}>{formatDate(notice.created_at)}</span>
                              <span className="text-xs" style={{ color: theme.border }}>·</span>
                              <span className="text-xs" style={{ color: theme.textMuted }}>조회 {notice.view_count || 0}</span>
                            </div>
                          </div>
                          <svg className="w-5 h-5 flex-shrink-0 ml-2 mt-1" style={{ color: theme.textMuted }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* 제휴·협력사 탭 */}
          {activeTab === "partners" && (
            <section className="px-4 pt-4">
              <div className="text-center py-20 rounded-2xl" style={{ backgroundColor: theme.bgCard }}>
                <svg className="w-16 h-16 mx-auto mb-4" style={{ color: theme.textMuted }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p style={{ color: theme.textMuted }}>제휴·협력사 정보가 없습니다</p>
                <p className="text-sm mt-2" style={{ color: theme.textMuted }}>곧 업데이트 예정입니다</p>
              </div>
            </section>
          )}

          {/* 전체/게시물 탭 - 카드 형태 */}
          {(activeTab === "all" || activeTab === "posts") && (
            <section className="px-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {getFeedWithAds().map((entry, idx) => {
                  if (entry.type === 'ad') {
                    return (
                      <div key={`ad-${entry.index}`} className="col-span-1 md:col-span-2">
                        <Link href={entry.data.link_url || "#"} className="block rounded-2xl overflow-hidden" style={{ aspectRatio: "4/1" }}>
                          {isValidUrl(entry.data.image_url) ? <OptimizedImage src={entry.data.image_url} alt={entry.data.title || "광고"} width={600} height={150} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: theme.bgCard }}><span style={{ color: theme.textMuted }}>광고</span></div>}
                        </Link>
                        <p className="text-[10px] text-center mt-1" style={{ color: theme.textMuted }}>광고</p>
                      </div>
                    );
                  }
                  const item = entry.data as FeedItem;
                  if (item.type === "video") return <VideoTile key={`video-${item.id}`} item={item} theme={theme} isDark={isDark} />;
                  return (
                    <Link key={`post-${item.id}`} href={`/posts/${item.id}`} className="rounded-2xl overflow-hidden transition-colors duration-300" style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}>
                      <div className="aspect-video relative" style={{ backgroundColor: theme.bgInput }}>
                        {isValidUrl(item.thumbnail_url) ? <OptimizedImage src={item.thumbnail_url!} alt={item.title} fill sizes="(max-width: 768px) 100vw, 300px" className="object-cover" /> : <div className="w-full h-full flex items-center justify-center"><FileText className="w-10 h-10" style={{ color: theme.textMuted }} strokeWidth={1} /></div>}
                      </div>
                      <div className="p-3"><h4 className="text-[14px] font-semibold line-clamp-2" style={{ color: theme.textPrimary }}>{item.title}</h4></div>
                    </Link>
                  );
                })}
              </div>
              {getFilteredItems().length === 0 && <div className="rounded-2xl p-8 text-center" style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}><p style={{ color: theme.textMuted }}>콘텐츠가 없습니다</p></div>}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

function VideoTile({ item, theme, isDark }: { item: FeedItem; theme: any; isDark: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => { setIsMobile('ontouchstart' in window); }, []);

  const handleMouseEnter = () => {
    if (isMobile) return;
    setIsHovering(true);
    if (videoRef.current && item.video_url) { videoRef.current.currentTime = 0; videoRef.current.play().catch(() => {}); }
  };

  const handleMouseLeave = () => {
    if (isMobile) return;
    setIsHovering(false);
    if (videoRef.current) { videoRef.current.pause(); videoRef.current.currentTime = 0; }
  };

  const isValidVideoUrl = (url: string | undefined | null): boolean => {
    if (!url || typeof url !== 'string' || url.trim() === '') return false;
    try { new URL(url); return true; } catch { return false; }
  };

  return (
    <Link href={`/videos/${item.id}`} className="rounded-2xl overflow-hidden transition-colors duration-300 group" style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <div className="aspect-video relative bg-black">
        {isValidVideoUrl(item.video_url) && !isMobile && <video ref={videoRef} src={item.video_url} className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${isHovering ? "opacity-100" : "opacity-0"}`} muted loop playsInline />}
        <div className={`absolute inset-0 transition-opacity duration-300 ${isHovering && isValidVideoUrl(item.video_url) && !isMobile ? "opacity-0" : "opacity-100"}`}>
          {isValidUrl(item.thumbnail_url) ? <OptimizedImage src={item.thumbnail_url!} alt={item.title} fill sizes="(max-width: 768px) 100vw, 300px" className="object-cover" /> : <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: theme.bgInput }}><div className="w-12 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(255,0,0,0.9)" }}><svg className="w-4 h-4 ml-0.5" fill="#FFFFFF" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></div></div>}
        </div>
        {/* 유튜브 스타일 재생 버튼 - hover 시 숨김 */}
        {!isHovering && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div 
              className="w-14 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
              style={{ backgroundColor: "rgba(255, 0, 0, 0.9)" }}
            >
              <svg className="w-5 h-5 ml-0.5" fill="#FFFFFF" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </div>
          </div>
        )}
        {/* 재생 시간 - hover 시에만 표시 */}
        {item.duration && (
          <div 
            className={`absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded transition-opacity duration-300 ${isHovering ? "opacity-100" : "opacity-0 md:group-hover:opacity-100"}`}
          >
            {item.duration}
          </div>
        )}
      </div>
      <div className="p-3"><h4 className="text-[14px] font-semibold line-clamp-2" style={{ color: theme.textPrimary }}>{item.title}</h4></div>
    </Link>
  );
}
