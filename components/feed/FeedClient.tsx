"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
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
  const { theme, isDark, mounted } = useTheme();
  const [mainBanners] = useState(initialData.mainBanners);
  const [feedAds] = useState(initialData.feedAds);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [currentBanner, setCurrentBanner] = useState(0);
  const [activeTab, setActiveTab] = useState<"all" | "notices" | "posts">("all");
  const bannerTouchStartX = useRef(0);

  useEffect(() => {
    const posts: FeedItem[] = initialData.posts.map((p: any) => {
      // images가 문자열인 경우 파싱
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

    const combined = [...posts, ...videos].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    setFeedItems(combined);
  }, [initialData.posts, initialData.videos]);

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
    if (activeTab === "posts") return feedItems.filter(item => item.type === "post");
    if (activeTab === "notices") return feedItems.filter(item => item.type === "notice");
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
                className="flex-1 py-3 text-sm font-medium transition-colors"
                style={{ 
                  backgroundColor: activeTab === "all" ? theme.accent : "transparent",
                  color: activeTab === "all" ? (isDark ? "#121212" : "#FFFFFF") : theme.textSecondary
                }}
              >
                전체
              </button>
              <button
                onClick={() => setActiveTab("notices")}
                className="flex-1 py-3 text-sm font-medium transition-colors"
                style={{ 
                  backgroundColor: activeTab === "notices" ? theme.accent : "transparent",
                  color: activeTab === "notices" ? (isDark ? "#121212" : "#FFFFFF") : theme.textSecondary
                }}
              >
                공지사항
              </button>
              <button
                onClick={() => setActiveTab("posts")}
                className="flex-1 py-3 text-sm font-medium transition-colors"
                style={{ 
                  backgroundColor: activeTab === "posts" ? theme.accent : "transparent",
                  color: activeTab === "posts" ? (isDark ? "#121212" : "#FFFFFF") : theme.textSecondary
                }}
              >
                게시물
              </button>
            </div>
          </section>

          {/* 피드 목록 - PC 2열, 모바일 1열 */}
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

  const isValidUrl = (url: string | undefined | null): boolean => {
    if (!url || typeof url !== 'string' || url.trim() === '') return false;
    try { new URL(url); return true; } catch { return false; }
  };

  return (
    <Link href={`/videos/${item.id}`} className="rounded-2xl overflow-hidden transition-colors duration-300 group" style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <div className="aspect-video relative bg-black">
        {isValidUrl(item.video_url) && !isMobile && <video ref={videoRef} src={item.video_url} className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${isHovering ? "opacity-100" : "opacity-0"}`} muted loop playsInline />}
        <div className={`absolute inset-0 transition-opacity duration-300 ${isHovering && isValidUrl(item.video_url) && !isMobile ? "opacity-0" : "opacity-100"}`}>
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