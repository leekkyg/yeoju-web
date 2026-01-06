"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { 
  MessageCircle, 
  ShoppingBag, 
  Newspaper, 
  Play, 
  Home,
  User,
  Eye,
  Heart,
  ChevronRight,
  ChevronLeft,
  Pause,
  Smartphone,
  Gift,
  Bell,
  Star,
  Megaphone
} from "lucide-react";

export default function HomePage() {
  const [recentPosts, setRecentPosts] = useState<any[]>([]);
  const [recentVideos, setRecentVideos] = useState<any[]>([]);
  const [recentNews, setRecentNews] = useState<any[]>([]);
  const [ads, setAds] = useState<any[]>([]);
  const [subBanner, setSubBanner] = useState<any>(null);
  const [quickMenus, setQuickMenus] = useState<any[]>([]);
  const [currentBanner, setCurrentBanner] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [user, setUser] = useState<any>(null);

  const iconMap: { [key: string]: any } = {
    smartphone: Smartphone,
    gift: Gift,
    bell: Bell,
    star: Star,
    megaphone: Megaphone,
  };

  useEffect(() => {
    fetchData();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  useEffect(() => {
    if (ads.length > 1 && !isPaused) {
      const timer = setInterval(() => {
        setCurrentBanner((prev) => (prev + 1) % ads.length);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [ads.length, isPaused]);

  const fetchData = async () => {
    const { data: posts } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5);
    setRecentPosts(posts || []);

    const { data: videos } = await supabase
      .from("videos")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(4);
    setRecentVideos(videos || []);

    const { data: news } = await supabase
      .from("posts")
      .select("*")
      .eq("category", "뉴스")
      .order("created_at", { ascending: false })
      .limit(4);
    setRecentNews(news || []);

    const { data: adsData } = await supabase
      .from("ads")
      .select("*")
      .eq("position", "home_banner")
      .eq("is_active", true)
      .or(`start_date.is.null,start_date.lte.${new Date().toISOString().split('T')[0]}`)
      .or(`end_date.is.null,end_date.gte.${new Date().toISOString().split('T')[0]}`);
    
    // 홈 배너: 고정 먼저, 나머지 랜덤 셔플
    if (adsData && adsData.length > 0) {
      const pinned = adsData.filter(ad => ad.is_pinned).sort((a, b) => (a.pin_order || 0) - (b.pin_order || 0));
      const random = adsData.filter(ad => !ad.is_pinned).sort(() => Math.random() - 0.5);
      setAds([...pinned, ...random]);
    }

    const today = new Date().toISOString().split('T')[0];
    const { data: subBannersData } = await supabase
      .from("sub_banners")
      .select("*")
      .eq("is_active", true)
      .or(`start_date.is.null,start_date.lte.${today}`)
      .or(`end_date.is.null,end_date.gte.${today}`);
    
    // 서브 배너: 고정 있으면 고정 먼저, 없으면 랜덤
    if (subBannersData && subBannersData.length > 0) {
      const pinned = subBannersData.filter(b => b.is_pinned).sort((a, b) => (a.pin_order || 0) - (b.pin_order || 0));
      if (pinned.length > 0) {
        setSubBanner(pinned[0]);
      } else {
        const randomIndex = Math.floor(Math.random() * subBannersData.length);
        setSubBanner(subBannersData[randomIndex]);
      }
    }

    // 퀵메뉴 가져오기
    const { data: menuData } = await supabase
      .from("quick_menus")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .limit(8);
    setQuickMenus(menuData || []);
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

  const menuItems = [
    { 
      href: "/community", 
      label: "커뮤니티",
      iconBg: "bg-blue-500",
      icon: <MessageCircle className="w-6 h-6 text-white" strokeWidth={2} />
    },
    { 
      href: "/market", 
      label: "마켓",
      iconBg: "bg-orange-500",
      icon: <ShoppingBag className="w-6 h-6 text-white" strokeWidth={2} />
    },
    { 
      href: "/news", 
      label: "지역소식",
      iconBg: "bg-teal-500",
      icon: <Newspaper className="w-6 h-6 text-white" strokeWidth={2} />
    },
    { 
      href: "/videos", 
      label: "영상",
      iconBg: "bg-rose-500",
      icon: <Play className="w-6 h-6 text-white fill-white" strokeWidth={0} />
    },
  ];

  // 퀵메뉴 아이콘 이모지 매핑
  const menuIconEmoji: { [key: string]: string } = {
    "edit": "✏️", "shopping-bag": "🛍️", "video": "📺", "ticket": "🎫",
    "building": "🏢", "utensils": "🍴", "calendar": "📅", "megaphone": "📢",
    "heart": "❤️", "star": "⭐", "gift": "🎁", "map-pin": "📍",
    "phone": "📞", "mail": "✉️", "settings": "⚙️", "user": "👤",
    "home": "🏠", "search": "🔍", "bell": "🔔", "dollar": "💰",
    "briefcase": "💼", "graduation": "🎓", "hospital": "🏥", "bus": "🚌",
  };

  // DB 퀵메뉴가 있으면 사용, 없으면 기본 메뉴
  const displayMenus = quickMenus.length > 0 ? quickMenus : null;

  const SubBannerIcon = subBanner ? iconMap[subBanner.icon] || Smartphone : Smartphone;

  return (
    <div className="min-h-screen bg-white">
      {/* Material Icons 폰트 로드 */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,1,0"
      />
      <style jsx global>{`
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
        * {
          font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif;
          box-sizing: border-box;
        }
        body {
          background: white;
          margin: 0;
          padding: 0;
        }
      `}</style>

      {/* 헤더 */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-[631px] mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-xs">여주</span>
            </div>
            <span className="font-extrabold text-lg text-gray-900">마켓</span>
          </Link>

          <nav className="hidden md:flex items-center gap-5">
            <Link href="/community" className="text-sm text-gray-600 hover:text-emerald-600 font-semibold">커뮤니티</Link>
            <Link href="/market" className="text-sm text-gray-600 hover:text-emerald-600 font-semibold">마켓</Link>
            <Link href="/news" className="text-sm text-gray-600 hover:text-emerald-600 font-semibold">지역소식</Link>
            <Link href="/videos" className="text-sm text-gray-600 hover:text-emerald-600 font-semibold">영상</Link>
          </nav>

          {user ? (
            <Link href="/mypage" className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
              <User className="w-5 h-5 text-gray-600" />
            </Link>
          ) : (
            <Link href="/login" className="px-4 py-1.5 bg-emerald-500 text-white font-bold rounded-lg text-sm hover:bg-emerald-600">
              로그인
            </Link>
          )}
        </div>
      </header>

      {/* 회색 영역: 배너 + 아이콘만 */}
      <section className="bg-[#f5f5f5]">
        <div className="max-w-[631px] mx-auto px-4 py-4">
          {/* 메인 배너 */}
          <div className="relative rounded-2xl overflow-hidden aspect-[3/1]">
            {ads.length > 0 ? (
              <>
                {ads.map((ad, index) => (
                  <a
                    key={ad.id}
                    href={ad.link_url || "#"}
                    className={`absolute inset-0 transition-opacity duration-700 ${
                      index === currentBanner ? "opacity-100" : "opacity-0 pointer-events-none"
                    }`}
                  >
                    {ad.image_url ? (
                      <img src={ad.image_url} alt={ad.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center">
                        <span className="text-white text-xl font-bold">{ad.title}</span>
                      </div>
                    )}
                  </a>
                ))}
                {ads.length > 1 && (
                  <div className="absolute bottom-3 right-3 bg-black/50 text-white text-xs px-2 py-1.5 rounded-full font-medium flex items-center gap-1">
                    <span>{currentBanner + 1}/{ads.length}</span>
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentBanner((prev) => (prev - 1 + ads.length) % ads.length);
                      }}
                      className="p-0.5 hover:bg-white/20 rounded"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        setIsPaused(!isPaused);
                      }}
                      className="p-0.5 hover:bg-white/20 rounded"
                    >
                      {isPaused ? <Play className="w-4 h-4 fill-white" /> : <Pause className="w-4 h-4" />}
                    </button>
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentBanner((prev) => (prev + 1) % ads.length);
                      }}
                      className="p-0.5 hover:bg-white/20 rounded"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-white/80 text-sm font-medium mb-1">YEOJU MARKET</p>
                  <p className="text-white text-xl font-black">여주시민의 프리미엄 커뮤니티</p>
                </div>
              </div>
            )}
          </div>

          {/* 퀵메뉴 - 흰색 카드 안에 */}
          <div className="mt-4 bg-white rounded-2xl p-4">
            <div className="grid grid-cols-4 gap-2">
              {displayMenus ? (
                // DB에서 가져온 메뉴
                displayMenus.map((menu) => {
                  const iconType = menu.icon_type || "material";
                  return (
                    <Link key={menu.id} href={menu.link || "#"} className="flex flex-col items-center gap-2 py-2 group">
                      <div className={`w-12 h-12 ${iconType === 'image' && menu.icon_url ? 'bg-white shadow-md border' : menu.color || 'bg-emerald-500'} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform overflow-hidden`}>
                        {iconType === "image" && menu.icon_url ? (
                          <img src={menu.icon_url} alt={menu.title} className="w-8 h-8 object-contain" />
                        ) : iconType === "material" ? (
                          <span className="material-symbols-outlined text-white text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                            {menu.icon_code || "edit"}
                          </span>
                        ) : (
                          <span className="text-xl">{menuIconEmoji[menu.icon] || "📋"}</span>
                        )}
                      </div>
                      <span className="text-xs font-bold text-gray-700">{menu.title}</span>
                    </Link>
                  );
                })
              ) : (
                // 기본 하드코딩 메뉴
                menuItems.map((item) => (
                  <Link key={item.href} href={item.href} className="flex flex-col items-center gap-2 py-2 group">
                    <div className={`w-12 h-12 ${item.iconBg} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      {item.icon}
                    </div>
                    <span className="text-xs font-bold text-gray-700">{item.label}</span>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 흰색 영역 시작 */}
      <main className="max-w-[631px] mx-auto bg-white">
        
        {/* 서브배너 - 이미지 또는 아이콘+텍스트 */}
        {subBanner && (
          <a 
            href={subBanner.link_url || "#"}
            className="block mx-4 my-4 rounded-xl overflow-hidden hover:opacity-90 transition-opacity"
          >
            {subBanner.image_url ? (
              // 이미지 배너
              <img 
                src={subBanner.image_url} 
                alt={subBanner.title} 
                className="w-full h-16 object-cover"
              />
            ) : (
              // 아이콘 + 텍스트 배너
              <div className="p-4 bg-emerald-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
                    <SubBannerIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-gray-900 text-sm font-bold">{subBanner.title}</p>
                    <p className="text-gray-500 text-xs">{subBanner.description}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-emerald-500" />
              </div>
            )}
          </a>
        )}

        {/* 영상 콘텐츠 */}
        <section className="px-4 py-5 border-t border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-gray-900">영상 콘텐츠</h2>
            <Link href="/videos" className="text-sm text-gray-400 hover:text-emerald-600 font-semibold flex items-center gap-1">
              더보기
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {recentVideos.length > 0 ? (
              recentVideos.map((video) => (
                <Link key={video.id} href={`/videos/${video.id}`} className="group">
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-100">
                    {video.thumbnail_url ? (
                      <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                        <Play className="w-10 h-10 text-gray-400 fill-gray-400" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="w-4 h-4 text-gray-900 fill-gray-900 ml-0.5" />
                      </div>
                    </div>
                  </div>
                  <h3 className="mt-2 text-sm font-bold text-gray-900 line-clamp-2 group-hover:text-emerald-600 transition-colors">{video.title}</h3>
                  <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                    <Eye className="w-3 h-3" /> {video.view_count || 0}
                  </p>
                </Link>
              ))
            ) : (
              <div className="col-span-full py-10 text-center">
                <p className="text-gray-400 text-sm">영상이 없습니다</p>
              </div>
            )}
          </div>
        </section>

        {/* 지역소식 */}
        <section className="px-4 py-5 border-t border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-gray-900">지역소식</h2>
            <Link href="/news" className="text-sm text-gray-400 hover:text-emerald-600 font-semibold flex items-center gap-1">
              더보기
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="space-y-3">
            {recentNews.length > 0 ? (
              recentNews.map((news) => (
                <Link
                  key={news.id}
                  href={`/news/${news.id}`}
                  className="flex gap-4 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group"
                >
                  {news.image_url && (
                    <div className="w-20 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-200">
                      <img src={news.image_url} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 text-sm line-clamp-2 group-hover:text-emerald-600 transition-colors">{news.title}</h3>
                    <p className="text-xs text-gray-400 mt-1">{formatDate(news.created_at)}</p>
                  </div>
                </Link>
              ))
            ) : (
              <div className="py-10 text-center">
                <p className="text-gray-400 text-sm">지역소식이 없습니다</p>
              </div>
            )}
          </div>
        </section>

        {/* 커뮤니티 */}
        <section className="px-4 py-5 border-t border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-gray-900">커뮤니티</h2>
            <Link href="/community" className="text-sm text-gray-400 hover:text-emerald-600 font-semibold flex items-center gap-1">
              더보기
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="divide-y divide-gray-100">
            {recentPosts.length > 0 ? (
              recentPosts.map((post) => (
                <Link
                  key={post.id}
                  href={`/community/${post.id}`}
                  className="block py-3 group"
                >
                  <div className="flex gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                          {post.category || "자유"}
                        </span>
                        <span className="text-[11px] text-gray-400">{formatDate(post.created_at)}</span>
                      </div>
                      <h3 className="font-bold text-gray-900 group-hover:text-emerald-600 transition-colors line-clamp-1 text-sm">{post.title}</h3>
                      <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{post.content}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="flex items-center gap-1 text-[11px] text-gray-400">
                          <Eye className="w-3 h-3" />
                          {post.view_count || 0}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-gray-400">
                          <Heart className="w-3 h-3" />
                          {post.like_count || 0}
                        </span>
                      </div>
                    </div>
                    {post.image_url && (
                      <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                        <img src={post.image_url} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                </Link>
              ))
            ) : (
              <div className="py-10 text-center">
                <p className="text-gray-400 text-sm">게시글이 없습니다</p>
              </div>
            )}
          </div>
        </section>

        {/* 중고마켓 */}
        <section className="px-4 py-5 border-t border-gray-100 pb-24 md:pb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-gray-900">중고마켓</h2>
            <Link href="/market" className="text-sm text-gray-400 hover:text-emerald-600 font-semibold flex items-center gap-1">
              더보기
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="text-center py-10 bg-gray-50 rounded-xl">
            <div className="w-12 h-12 bg-gray-200 rounded-xl flex items-center justify-center mx-auto mb-3">
              <ShoppingBag className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-gray-500 text-sm font-medium">마켓이 곧 오픈됩니다</p>
            <p className="text-gray-400 text-xs mt-1">중고거래를 기대해주세요!</p>
          </div>
        </section>
      </main>

      {/* 푸터 */}
      <footer className="bg-gray-50 border-t border-gray-100 py-6">
        <div className="max-w-[631px] mx-auto px-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 bg-emerald-500 rounded flex items-center justify-center">
              <span className="text-white font-black text-[8px]">여주</span>
            </div>
            <span className="font-extrabold text-sm text-gray-900">마켓</span>
          </div>
          <p className="text-xs text-gray-400 mb-4">여주시민을 위한 프리미엄 커뮤니티</p>
          <div className="flex gap-4 text-xs text-gray-400">
            <Link href="/community" className="hover:text-gray-900">커뮤니티</Link>
            <Link href="/market" className="hover:text-gray-900">마켓</Link>
            <Link href="/news" className="hover:text-gray-900">지역소식</Link>
            <Link href="/videos" className="hover:text-gray-900">영상</Link>
          </div>
          <div className="border-t border-gray-200 mt-4 pt-4 text-[11px] text-gray-300">
            © 2025 여주마켓. All rights reserved.
          </div>
        </div>
      </footer>

      {/* 모바일 하단 네비게이션 */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="max-w-[631px] mx-auto flex">
          <Link href="/" className="flex-1 py-2 flex flex-col items-center gap-0.5">
            <Home className="w-6 h-6 text-emerald-600" />
            <span className="text-[10px] font-bold text-emerald-600">홈</span>
          </Link>
          <Link href="/community" className="flex-1 py-2 flex flex-col items-center gap-0.5">
            <MessageCircle className="w-6 h-6 text-gray-400" />
            <span className="text-[10px] font-bold text-gray-400">커뮤니티</span>
          </Link>
          <Link href="/news" className="flex-1 py-2 flex flex-col items-center gap-0.5">
            <Newspaper className="w-6 h-6 text-gray-400" />
            <span className="text-[10px] font-bold text-gray-400">지역소식</span>
          </Link>
          <Link href="/videos" className="flex-1 py-2 flex flex-col items-center gap-0.5">
            <Play className="w-6 h-6 text-gray-400" />
            <span className="text-[10px] font-bold text-gray-400">영상</span>
          </Link>
          <Link href={user ? "/mypage" : "/login"} className="flex-1 py-2 flex flex-col items-center gap-0.5">
            <User className="w-6 h-6 text-gray-400" />
            <span className="text-[10px] font-bold text-gray-400">MY</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
