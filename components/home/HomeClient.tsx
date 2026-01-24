"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import OptimizedImage from "@/components/common/OptimizedImage";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/contexts/ThemeContext";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { 
  ShoppingCart, 
  MessageCircle, 
  Megaphone, 
  Video, 
  Heart, 
  Package, 
  Newspaper,
  Gift,
  MapPin,
  Store,
  ChevronRight,
  ChevronLeft,
  ImageIcon,
  FileText,
  Play,
} from "lucide-react";

interface HomeClientProps {
  initialData: {
    mainBanners: any[];
    subBanners: any[];
    groupBuys: any[];
    posts: any[];
    notices: any[];
    news: any[];
    videos: any[];
  };
}

export default function HomeClient({ initialData }: HomeClientProps) {
  const { theme, isDark, mounted } = useTheme();
  
  // 서버에서 받은 데이터 (즉시 사용 가능)
  const [mainBanners] = useState(initialData.mainBanners);
  const [subBanners] = useState(initialData.subBanners);
  const [groupBuys] = useState(initialData.groupBuys);
  const [posts] = useState(initialData.posts);
  const [notices] = useState(initialData.notices);
  const [news] = useState(initialData.news);
  const [videos] = useState(initialData.videos);
  
  // 사용자 관련 데이터 (클라이언트에서 가져옴)
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // UI 상태
  const [currentBanner, setCurrentBanner] = useState(0);
  const bannerRef = useRef<HTMLDivElement>(null);
  const bannerTouchStartX = useRef(0);

  // 탭 관련
  const tabs = [
    { id: 'groupbuy', label: '공동구매', icon: ShoppingCart, href: '/groupbuy' },
    { id: 'community', label: '커뮤니티', icon: MessageCircle, href: '/community' },
    { id: 'news', label: '뉴스', icon: Newspaper, href: '/news' },
    { id: 'videos', label: '영상', icon: Video, href: '/videos' },
    { id: 'shops', label: '상점', icon: Store, href: '/shops' },
    { id: 'events', label: '이벤트', icon: Gift, href: '/events' },
  ];
  const [tabScrollIndex, setTabScrollIndex] = useState(0);
  const tabTouchStartX = useRef(0);
  const visibleTabCount = 4;

  // 공동구매 썸네일 인덱스 (3초마다 변경)
  const [gbThumbnailIndex, setGbThumbnailIndex] = useState(0);

  // 사용자 데이터만 클라이언트에서 가져오기 (빠름)
  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      setUser(user);
      
      const [profileResult, unreadResult] = await Promise.all([
        supabase.from("profiles").select("nickname, avatar_url").eq("id", user.id).single(),
        supabase.from("notifications").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("is_read", false),
      ]);
      
      if (profileResult.data) setProfile(profileResult.data);
      setUnreadCount((unreadResult as any).count || 0);
    };
    
    fetchUserData();
  }, []);

  // 배너 자동 슬라이드
  useEffect(() => {
    if (mainBanners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % mainBanners.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [mainBanners.length]);

  // 공동구매 썸네일 3초마다 변경
  useEffect(() => {
    const interval = setInterval(() => {
      setGbThumbnailIndex((prev) => prev + 1);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const formatPrice = (price: number) => {
    return price?.toLocaleString() + "원";
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return "방금 전";
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    return `${days}일 전`;
  };

  // 배너 스와이프
  const handleBannerTouchStart = (e: React.TouchEvent) => {
    bannerTouchStartX.current = e.touches[0].clientX;
  };

  const handleBannerTouchEnd = (e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX;
    const diff = bannerTouchStartX.current - touchEndX;
    
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        setCurrentBanner((prev) => (prev + 1) % displayBanners.length);
      } else {
        setCurrentBanner((prev) => (prev - 1 + displayBanners.length) % displayBanners.length);
      }
    }
  };

  // 탭 스와이프
  const handleTabTouchStart = (e: React.TouchEvent) => {
    tabTouchStartX.current = e.touches[0].clientX;
  };

  const handleTabTouchEnd = (e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX;
    const diff = tabTouchStartX.current - touchEndX;
    
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        nextTabs();
      } else {
        prevTabs();
      }
    }
  };

  // 무한 스와이프
  const nextTabs = () => {
    setTabScrollIndex(prev => (prev + 1) % tabs.length);
  };

  const prevTabs = () => {
    setTabScrollIndex(prev => (prev - 1 + tabs.length) % tabs.length);
  };

  // 무한 스와이프용 탭 배열 (현재 위치부터 4개)
  const getVisibleTabs = () => {
    const result = [];
    for (let i = 0; i < visibleTabCount; i++) {
      result.push(tabs[(tabScrollIndex + i) % tabs.length]);
    }
    return result;
  };

  // 공동구매 썸네일 가져오기
  const getGbThumbnail = (gb: any) => {
    const images = gb.thumbnails || gb.images || (gb.thumbnail_url ? [gb.thumbnail_url] : []) || (gb.image_url ? [gb.image_url] : []);
    if (images.length === 0) return gb.thumbnail_url || gb.image_url || null;
    return images[gbThumbnailIndex % images.length];
  };

  // 게시물 타입 아이콘 결정
  const getPostIcon = (post: any) => {
    if (post.video_url || post.has_video) {
      return <Video className="w-5 h-5" style={{ color: theme.accent }} strokeWidth={1.5} />;
    }
    if (post.image_url || post.thumbnail_url || post.images?.length > 0 || post.has_image) {
      return <ImageIcon className="w-5 h-5" style={{ color: theme.accent }} strokeWidth={1.5} />;
    }
    return <FileText className="w-5 h-5" style={{ color: theme.textMuted }} strokeWidth={1.5} />;
  };

  const defaultMainBanners = [{
    id: 1, image_url: null,
    title: "우리 동네 공동구매",
    subtitle: "함께하면 더 저렴하게!",
    link_url: "/groupbuy",
  }];

  const displayBanners = mainBanners.length > 0 ? mainBanners : defaultMainBanners;

  // 테마 로딩만 기다림 (데이터는 이미 있음)
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#121212]">
        <div className="w-10 h-10 border-2 border-[#333] border-t-[#D4A574] rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 transition-colors duration-300" style={{ backgroundColor: theme.bgMain }}>
      <style jsx global>{`
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .tab-item:hover .tab-icon-box {
          background-color: rgba(212, 165, 116, 0.15) !important;
          border-color: #D4A574 !important;
        }
        .tab-item:hover .tab-icon {
          color: #D4A574 !important;
          transform: scale(1.1);
        }
        .tab-item:hover .tab-label {
          color: #D4A574 !important;
        }
      `}</style>

      <Header />

      <main className="max-w-[631px] mx-auto">
        {/* 메인 배너 */}
        <section className="px-4 pt-4">
          <div 
            ref={bannerRef} 
            className="relative rounded-2xl overflow-hidden" 
            style={{ aspectRatio: '2.5/1' }}
            onTouchStart={handleBannerTouchStart}
            onTouchEnd={handleBannerTouchEnd}
          >
            {displayBanners.map((banner, index) => (
              <Link
                key={banner.id}
                href={banner.link_url || "#"}
                className={`absolute inset-0 transition-all duration-500 ease-in-out ${
                  index === currentBanner ? 'opacity-100 translate-x-0' : index < currentBanner ? 'opacity-0 -translate-x-full' : 'opacity-0 translate-x-full'
                }`}
              >
                {banner.image_url ? (
                  <OptimizedImage 
                    src={banner.image_url} 
                    alt={banner.title || ""} 
                    fill
                    sizes="(max-width: 640px) 100vw, 640px"
                    className="object-cover"
                    priority={index === 0}
                  />
                ) : (
                  <div 
                    className="w-full h-full flex items-center relative overflow-hidden"
                    style={{ background: isDark ? `linear-gradient(135deg, ${theme.bgElevated}, ${theme.bgCard})` : `linear-gradient(135deg, #FFFFFF, ${theme.bgMain})` }}
                  >
                    <div className="absolute -right-20 -top-20 w-60 h-60 rounded-full blur-3xl" style={{ backgroundColor: `${theme.accent}15` }}></div>
                    <div className="relative z-10 p-6 flex-1">
                      <p className="text-xs font-semibold mb-1" style={{ color: theme.accent }}>여주 지역 공동구매</p>
                      <h2 className="text-xl font-bold" style={{ color: theme.textPrimary }}>{banner.title}</h2>
                      <p className="text-sm mt-1" style={{ color: theme.textMuted }}>{banner.subtitle}</p>
                    </div>
                    <div className="w-20 h-20 rounded-2xl flex items-center justify-center mr-6" style={{ backgroundColor: theme.bgElevated, border: `1px solid ${theme.border}` }}>
                      <span className="text-4xl">🛒</span>
                    </div>
                  </div>
                )}
              </Link>
            ))}
            
            {displayBanners.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20">
                {displayBanners.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentBanner(index)}
                    className="transition-all duration-300 rounded-full"
                    style={{
                      width: index === currentBanner ? '20px' : '6px',
                      height: '6px',
                      backgroundColor: index === currentBanner ? theme.accent : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)')
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* 탭 네비게이션 - 무한 스와이프 */}
        <section className="mt-4 mx-4">
          <div 
            className="rounded-2xl p-3 relative transition-colors duration-300" 
            style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}
          >
            {/* 화살표 - 항상 표시 */}
            <button
              onClick={prevTabs}
              className="absolute left-1 top-1/2 -translate-y-1/2 p-1.5 rounded-full z-10 flex items-center justify-center shadow-lg"
              style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.border}` }}
            >
              <ChevronLeft className="w-4 h-4" style={{ color: theme.textPrimary }} />
            </button>
            <button
              onClick={nextTabs}
              className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-full z-10 flex items-center justify-center shadow-lg"
              style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.border}` }}
            >
              <ChevronRight className="w-4 h-4" style={{ color: theme.textPrimary }} />
            </button>

            {/* 탭 컨테이너 */}
            <div
              className="overflow-hidden mx-6"
              onTouchStart={handleTabTouchStart}
              onTouchEnd={handleTabTouchEnd}
            >
              <div className="flex transition-all duration-300 ease-out">
                {getVisibleTabs().map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <Link
                      key={tab.id}
                      href={tab.href}
                      className="tab-item flex items-center gap-2 px-2 py-2.5 rounded-xl transition-all cursor-pointer"
                      style={{ minWidth: `${100 / visibleTabCount}%` }}
                    >
                      <div 
                        className="tab-icon-box w-11 h-11 rounded-xl flex items-center justify-center transition-all flex-shrink-0"
                        style={{ 
                          backgroundColor: theme.bgInput,
                          border: `1px solid ${theme.border}`
                        }}
                      >
                        <Icon 
                          className="tab-icon w-5 h-5 transition-all duration-200" 
                          style={{ color: theme.textMuted }} 
                          strokeWidth={1.5} 
                        />
                      </div>
                      <span 
                        className="tab-label text-[12px] font-medium transition-all duration-200 whitespace-nowrap"
                        style={{ color: theme.textMuted }}
                      >
                        {tab.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* 공지사항 */}
        {notices.length > 0 && (
          <section className="px-4 mt-4">
            <div className="rounded-2xl p-4 flex items-center gap-3 transition-colors duration-300" style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: theme.bgInput }}>
                <Megaphone className="w-[18px] h-[18px]" style={{ color: theme.accent }} strokeWidth={1.5} />
              </div>
              <Link href={`/notices/${notices[0].id}`} className="flex-1 min-w-0">
                <p className="text-[11px] font-bold mb-0.5" style={{ color: theme.accent }}>공지사항</p>
                <p className="text-sm font-medium truncate" style={{ color: theme.textSecondary }}>{notices[0].title}</p>
              </Link>
              <Link href="/notices" className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors" style={{ backgroundColor: theme.bgInput, color: theme.textMuted, border: `1px solid ${theme.border}` }}>
                더보기
              </Link>
            </div>
          </section>
        )}

        {/* 진행중인 공동구매 */}
        <section className="px-4 mt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold" style={{ color: theme.textPrimary }}>🛒 진행중인 공동구매</h3>
              <p className="text-xs mt-0.5" style={{ color: theme.textMuted }}>함께 모이면 더 저렴해요</p>
            </div>
            <Link href="/groupbuy" className="flex items-center gap-0.5 text-sm font-semibold" style={{ color: theme.accent }}>
              전체보기 <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
            </Link>
          </div>
          
          {groupBuys.length === 0 ? (
            <div className="rounded-2xl p-8 text-center transition-colors duration-300" style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}>
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: theme.bgInput }}>
                <ShoppingCart className="w-6 h-6" style={{ color: theme.textMuted }} strokeWidth={1.5} />
              </div>
              <p className="font-medium text-sm" style={{ color: theme.textMuted }}>진행중인 공동구매가 없습니다</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {groupBuys.slice(0, 6).map((gb, index) => {
                const progress = Math.min(((gb.current_participants || 0) / (gb.target_participants || 1)) * 100, 100);
                const thumbnail = getGbThumbnail(gb);
                
                return (
                  <Link key={gb.id} href={`/groupbuy/${gb.id}`} className="rounded-xl overflow-hidden transition-colors duration-300" style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}>
                    <div className="aspect-square relative overflow-hidden" style={{ backgroundColor: theme.bgInput }}>
                      {thumbnail ? (
                        <OptimizedImage 
                          src={thumbnail} 
                          alt={gb.title || ""} 
                          fill
                          sizes="(max-width: 640px) 33vw, 200px"
                          className="object-cover"
                          loading={index < 3 ? "eager" : "lazy"}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingCart className="w-8 h-8" style={{ color: theme.textMuted }} strokeWidth={1} />
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 h-4 bg-black/60 flex items-center px-1.5 gap-1">
                        <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: theme.accent }}></div>
                        </div>
                        <span className="text-[9px] font-bold" style={{ color: theme.accent }}>{Math.round(progress)}%</span>
                      </div>
                    </div>
                    <div className="p-2">
                      <p className="text-[10px] font-bold truncate" style={{ color: theme.accent }}>{gb.shops?.name || gb.shop_name || '상점'}</p>
                      <p className="text-[11px] font-medium mt-0.5 line-clamp-2 leading-tight" style={{ color: theme.textPrimary }}>{gb.title}</p>
                      <p className="text-[11px] font-bold mt-1" style={{ color: theme.textPrimary }}>{formatPrice(gb.price)}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* 서브 배너 1 */}
        {subBanners.length > 0 && (
          <section className="px-4 mt-6">
            <Link href={subBanners[0]?.link_url || "#"} className="block rounded-2xl overflow-hidden transition-colors duration-300 relative" style={{ aspectRatio: '5/1', border: `1px solid ${theme.borderLight}` }}>
              {subBanners[0]?.image_url ? (
                <OptimizedImage 
                  src={subBanners[0].image_url} 
                  alt={subBanners[0].title || ""} 
                  fill
                  sizes="(max-width: 640px) 100vw, 640px"
                  className="object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center gap-3 px-4" style={{ background: `linear-gradient(135deg, ${theme.bgInput}, ${theme.bgCard})` }}>
                  {subBanners[0]?.icon && <span className="text-2xl">{subBanners[0].icon}</span>}
                  <div>
                    <p className="font-semibold" style={{ color: theme.textPrimary }}>{subBanners[0]?.title}</p>
                    {subBanners[0]?.subtitle && <p className="text-sm" style={{ color: theme.textMuted }}>{subBanners[0].subtitle}</p>}
                  </div>
                </div>
              )}
            </Link>
          </section>
        )}

        {/* 최신 게시물 */}
        <section className="px-4 mt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold" style={{ color: theme.textPrimary }}>📝 최신 게시물</h3>
              <p className="text-xs mt-0.5" style={{ color: theme.textMuted }}>이웃들의 이야기</p>
            </div>
            <Link href="/community" className="flex items-center gap-0.5 text-sm font-semibold" style={{ color: theme.accent }}>
              전체보기 <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
            </Link>
          </div>
          
          {posts.length === 0 ? (
            <div className="rounded-2xl p-8 text-center transition-colors duration-300" style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}>
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: theme.bgInput }}>
                <MessageCircle className="w-6 h-6" style={{ color: theme.textMuted }} strokeWidth={1.5} />
              </div>
              <p className="text-sm" style={{ color: theme.textMuted }}>게시글이 없습니다</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {posts.map((post) => (
                <Link 
                  key={post.id} 
                  href={`/community/${post.id}`} 
                  className="rounded-xl p-3 flex items-center gap-3 transition-colors duration-300" 
                  style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}
                >
                  {/* 내용 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: theme.bgInput, color: theme.accent }}>
                        {post.category || "자유"}
                      </span>
                      <span className="text-[10px]" style={{ color: theme.textMuted }}>{formatTime(post.created_at)}</span>
                    </div>
                    <p className="text-[13px] font-medium line-clamp-1" style={{ color: theme.textPrimary }}>{post.title || post.content}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px]" style={{ color: theme.textMuted }}>{post.profiles?.nickname || post.author_name || "익명"}</span>
                      <span className="text-[10px] flex items-center gap-0.5" style={{ color: theme.red }}>
                        <Heart className="w-3 h-3" style={{ fill: theme.red }} /> {post.like_count || 0}
                      </span>
                      <span className="text-[10px] flex items-center gap-0.5" style={{ color: theme.textMuted }}>
                        <MessageCircle className="w-3 h-3" strokeWidth={1.5} /> {post.comment_count || 0}
                      </span>
                    </div>
                  </div>
                  
                  {/* 오른쪽 아이콘 */}
                  <div className="w-12 h-12 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: theme.bgInput }}>
                    {getPostIcon(post)}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* 최신 소식 */}
        <section className="px-4 mt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold" style={{ color: theme.textPrimary }}>📰 최신 소식</h3>
              <p className="text-xs mt-0.5" style={{ color: theme.textMuted }}>여주 지역 뉴스</p>
            </div>
            <Link href="/news" className="flex items-center gap-0.5 text-sm font-semibold" style={{ color: theme.accent }}>
              전체보기 <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
            </Link>
          </div>
          
          {news.length === 0 ? (
            <div className="rounded-2xl p-8 text-center transition-colors duration-300" style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}>
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: theme.bgInput }}>
                <Newspaper className="w-6 h-6" style={{ color: theme.textMuted }} strokeWidth={1.5} />
              </div>
              <p className="font-medium text-sm" style={{ color: theme.textMuted }}>뉴스가 없습니다</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {news.map((item) => (
                <Link
                  key={item.id}
                  href={`/news/${item.id}`}
                  className="rounded-xl p-3 flex items-center gap-3 transition-colors duration-300"
                  style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}
                >
                  {/* 내용 */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[14px] font-bold line-clamp-2 mb-1.5" style={{ color: '#D4A574' }}>
                      {item.title}
                    </h4>
                    <div className="flex items-center gap-2 text-[11px]" style={{ color: theme.textMuted }}>
                      <span>{item.source || '여주굿뉴스'}</span>
                      <span>·</span>
                      <span>{formatTime(item.created_at)}</span>
                    </div>
                  </div>
                  
                  {/* 오른쪽 뉴스 아이콘 */}
                  <div className="w-12 h-12 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: theme.bgInput }}>
                    <Newspaper className="w-5 h-5" style={{ color: theme.accent }} strokeWidth={1.5} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* 서브 배너 2 */}
        {subBanners.length > 1 && (
          <section className="px-4 mt-6">
            <Link href={subBanners[1]?.link_url || "#"} className="block rounded-2xl overflow-hidden transition-colors duration-300 relative" style={{ aspectRatio: '5/1', border: `1px solid ${theme.borderLight}` }}>
              {subBanners[1]?.image_url ? (
                <OptimizedImage 
                  src={subBanners[1].image_url} 
                  alt={subBanners[1].title || ""} 
                  fill
                  sizes="(max-width: 640px) 100vw, 640px"
                  className="object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center gap-3 px-4" style={{ background: `linear-gradient(135deg, ${theme.bgInput}, ${theme.bgCard})` }}>
                  {subBanners[1]?.icon && <span className="text-2xl">{subBanners[1].icon}</span>}
                  <div>
                    <p className="font-semibold" style={{ color: theme.textPrimary }}>{subBanners[1]?.title}</p>
                    {subBanners[1]?.subtitle && <p className="text-sm" style={{ color: theme.textMuted }}>{subBanners[1].subtitle}</p>}
                  </div>
                </div>
              )}
            </Link>
          </section>
        )}

        {/* 영상 - 2열 2행 */}
        <section className="px-4 mt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold" style={{ color: theme.textPrimary }}>🎬 영상</h3>
              <p className="text-xs mt-0.5" style={{ color: theme.textMuted }}>여주마켓 영상 콘텐츠</p>
            </div>
            <Link href="/videos" className="flex items-center gap-0.5 text-sm font-semibold" style={{ color: theme.accent }}>
              전체보기 <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
            </Link>
          </div>
          
          {videos.length === 0 ? (
            <div className="rounded-2xl p-8 text-center transition-colors duration-300" style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}>
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: theme.bgInput }}>
                <Video className="w-6 h-6" style={{ color: theme.textMuted }} strokeWidth={1.5} />
              </div>
              <p className="font-medium text-sm" style={{ color: theme.textMuted }}>영상이 없습니다</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {videos.slice(0, 4).map((video, index) => (
                <Link
                  key={video.id}
                  href={`/videos/${video.id}`}
                  className="rounded-2xl overflow-hidden transition-colors duration-300"
                  style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}
                >
                  <div className="aspect-video relative bg-black">
                    {video.thumbnail_url ? (
                      <OptimizedImage 
                        src={video.thumbnail_url} 
                        alt={video.title} 
                        fill
                        sizes="(max-width: 640px) 50vw, 300px"
                        className="object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Video className="w-10 h-10" style={{ color: '#666' }} strokeWidth={1} />
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: theme.accent }}
                      >
                        <Play className="w-5 h-5 ml-0.5" style={{ color: isDark ? '#121212' : '#FFFFFF' }} fill={isDark ? '#121212' : '#FFFFFF'} strokeWidth={0} />
                      </div>
                    </div>
                    {video.duration && (
                      <div className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded">
                        {video.duration}
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <h4 className="text-[12px] font-medium line-clamp-2" style={{ color: theme.textPrimary }}>
                      {video.title}
                    </h4>
                    <p className="text-[11px] mt-1" style={{ color: theme.textMuted }}>
                      조회수 {video.view_count || 0}회
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* 입점 배너 */}
        <section className="px-4 mt-6 mb-6">
          <Link href="/shop/register" className="block rounded-2xl p-5 relative overflow-hidden group" style={{ background: `linear-gradient(135deg, ${theme.bgElevated}, ${theme.bgCard})`, border: `1px solid ${theme.border}` }}>
            <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full blur-3xl" style={{ backgroundColor: `${theme.accent}15` }}></div>
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: theme.textMuted }}>여주 지역 사장님이신가요?</p>
                <p className="text-lg font-bold mt-1" style={{ color: theme.textPrimary }}>공동구매로 매출 UP! 🚀</p>
                <p className="text-sm font-semibold mt-2 flex items-center gap-0.5" style={{ color: theme.accent }}>
                  입점 신청하기 <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform" style={{ background: `linear-gradient(135deg, ${theme.accent}, ${theme.accentDark})` }}>
                <Store className="w-6 h-6" style={{ color: isDark ? '#121212' : '#FFFFFF' }} strokeWidth={1.5} />
              </div>
            </div>
          </Link>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
