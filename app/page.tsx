"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";

export default function HomePage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [groupBuys, setGroupBuys] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [notices, setNotices] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // 배너 관련
  const [mainBanners, setMainBanners] = useState<any[]>([]);
  const [subBanners, setSubBanners] = useState<any[]>([]);
  const [currentBanner, setCurrentBanner] = useState(0);
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  // 메인 배너 자동 슬라이드
  useEffect(() => {
    if (mainBanners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % mainBanners.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [mainBanners.length]);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);

    if (user) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("nickname, profile_image")
        .eq("id", user.id)
        .single();
      setProfile(profileData);

      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
      setUnreadCount(count || 0);
    }

    // 메인 배너 조회 (ads 테이블 - home_banner 위치)
    const { data: mainBannerData } = await supabase
      .from("ads")
      .select("*")
      .eq("position", "home_banner")
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    
    // 날짜 필터링 (기간 내인 것만)
    const now = new Date();
    const filteredMainBanners = (mainBannerData || []).filter(b => {
      if (b.start_date && new Date(b.start_date) > now) return false;
      if (b.end_date && new Date(b.end_date) < now) return false;
      return true;
    });
    setMainBanners(filteredMainBanners);

    // 서브 배너 조회
    const { data: subBannerData } = await supabase
      .from("sub_banners")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    
    // 날짜 필터링
    const filteredSubBanners = (subBannerData || []).filter(b => {
      if (b.start_date && new Date(b.start_date) > now) return false;
      if (b.end_date && new Date(b.end_date) < now) return false;
      return true;
    });
    setSubBanners(filteredSubBanners);

    const { data: gbData } = await supabase
      .from("group_buys")
      .select("*, shops(name, logo_url)")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(4);
    setGroupBuys(gbData || []);

    const { data: postData } = await supabase
      .from("posts")
      .select("*")
      .order("like_count", { ascending: false })
      .limit(5);
    setPosts(postData || []);

    const { data: noticeData } = await supabase
      .from("notices")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(3);
    setNotices(noticeData || []);

    setLoading(false);
  };

  const formatPrice = (price: number) => {
    return price?.toLocaleString() + "원";
  };

  const quickMenus = [
    { href: "/groupbuy", icon: "🛒", label: "공동구매" },
    { href: "/community", icon: "💬", label: "커뮤니티" },
    { href: "/notices", icon: "📢", label: "공지사항" },
    { href: "/videos", icon: "🎬", label: "영상" },
    { href: "/favorites", icon: "❤️", label: "단골업체" },
    { href: "/mypage/groupbuys", icon: "📦", label: "참여내역" },
  ];

  // 기본 메인 배너 (DB에 없을 때)
  const defaultMainBanners = [
    {
      id: 1,
      image_url: null,
      title: "우리 동네 공동구매",
      subtitle: "함께하면 더 저렴하게!",
      link_url: "/groupbuy",
    }
  ];

  const displayBanners = mainBanners.length > 0 ? mainBanners : defaultMainBanners;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900 flex items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 헤더 */}
      <header className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 sticky top-0 z-50">
        <div className="max-w-[631px] mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/30 shadow-lg">
              <span className="text-white font-black text-base drop-shadow">여</span>
            </div>
            <span className="text-white font-bold text-lg tracking-tight drop-shadow">여주마켓</span>
          </Link>
          
          <div className="flex items-center gap-2">
            <Link href="/notifications" className="relative p-2 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg animate-pulse">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
            {user ? (
              <Link href="/mypage" className="w-9 h-9 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/30 overflow-hidden">
                {profile?.profile_image ? (
                  <img src={profile.profile_image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white font-bold text-sm">
                    {profile?.nickname?.[0] || user.email?.[0]?.toUpperCase()}
                  </span>
                )}
              </Link>
            ) : (
              <Link href="/login" className="px-4 py-2 bg-white text-emerald-600 text-sm font-bold rounded-xl shadow-lg">
                로그인
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-[631px] mx-auto">
        {/* ==================== 메인 배너 슬라이더 ==================== */}
        <div className="px-4 pt-4">
          <div 
            ref={bannerRef}
            className="relative rounded-2xl overflow-hidden shadow-lg"
            style={{ aspectRatio: '3/1' }}
          >
            {displayBanners.map((banner, index) => (
              <Link
                key={banner.id}
                href={banner.link_url || "#"}
                className={`absolute inset-0 transition-all duration-500 ease-in-out ${
                  index === currentBanner ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'
                }`}
              >
                {banner.image_url ? (
                  <img 
                    src={banner.image_url} 
                    alt={banner.title || ""} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-emerald-500 via-emerald-400 to-teal-400 flex items-center relative overflow-hidden">
                    {/* 배경 장식 */}
                    <div className="absolute inset-0">
                      <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
                      <div className="absolute -left-5 -bottom-5 w-32 h-32 bg-white/5 rounded-full blur-xl"></div>
                    </div>
                    <div className="relative z-10 p-6">
                      <p className="text-white/80 text-sm font-medium">여주 지역 공동구매 플랫폼</p>
                      <h2 className="text-white text-xl font-bold mt-1">{banner.title}</h2>
                      <div className="mt-3 inline-flex items-center gap-1 px-4 py-2 bg-white text-emerald-600 font-bold text-sm rounded-full shadow-lg">
                        자세히 보기
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                )}
              </Link>
            ))}
            
            {/* 배너 인디케이터 */}
            {displayBanners.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20">
                {displayBanners.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentBanner(index)}
                    className={`transition-all duration-300 rounded-full ${
                      index === currentBanner 
                        ? 'w-6 h-2 bg-white' 
                        : 'w-2 h-2 bg-white/50 hover:bg-white/70'
                    }`}
                  />
                ))}
              </div>
            )}
            
            {/* 배너 카운터 */}
            {displayBanners.length > 1 && (
              <div className="absolute bottom-3 right-3 px-2.5 py-1 bg-black/40 backdrop-blur-sm rounded-full text-white text-xs font-medium z-20">
                {currentBanner + 1} / {displayBanners.length}
              </div>
            )}
          </div>
        </div>

        {/* 퀵메뉴 - 그린 그라디언트 배경 */}
        <div className="px-4 mt-4">
          <div className="bg-gradient-to-br from-emerald-500 via-emerald-400 to-teal-400 rounded-2xl shadow-lg shadow-emerald-500/20 p-4 relative overflow-hidden">
            {/* 배경 장식 */}
            <div className="absolute inset-0">
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
              <div className="absolute -left-5 -bottom-5 w-24 h-24 bg-white/5 rounded-full blur-xl"></div>
            </div>
            
            <div className="relative z-10 grid grid-cols-6 gap-1">
              {quickMenus.map((menu) => (
                <Link 
                  key={menu.href} 
                  href={menu.href}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-white/20 transition-colors group"
                >
                  <div className="w-11 h-11 bg-white rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-emerald-600/30 border border-white/50">
                    <span className="text-lg">{menu.icon}</span>
                  </div>
                  <span className="text-xs text-white font-semibold drop-shadow">{menu.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* 공지사항 */}
        {notices.length > 0 && (
          <div className="px-4 mt-4">
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-4 flex items-center gap-3 border border-amber-100">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-400 rounded-xl flex items-center justify-center shadow-lg shadow-amber-200/50">
                <span className="text-white text-sm">📢</span>
              </div>
              <Link href={`/notices/${notices[0].id}`} className="flex-1 min-w-0">
                <p className="text-xs text-amber-600 font-bold mb-0.5">공지사항</p>
                <p className="text-sm text-gray-800 font-medium truncate">{notices[0].title}</p>
              </Link>
              <Link href="/notices" className="text-xs text-amber-600 font-bold flex-shrink-0 px-3 py-1.5 bg-white rounded-full shadow-sm">
                더보기
              </Link>
            </div>
          </div>
        )}

        {/* 진행중인 공동구매 */}
        <section className="px-4 mt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">🔥 진행중인 공동구매</h3>
              <p className="text-xs text-gray-500 mt-0.5">함께 모이면 더 저렴해요</p>
            </div>
            <Link href="/groupbuy" className="flex items-center gap-1 text-sm text-emerald-600 font-bold px-3 py-1.5 bg-emerald-50 rounded-full">
              전체보기
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          
          {groupBuys.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-3xl">🛒</span>
              </div>
              <p className="text-gray-500 font-medium">진행중인 공동구매가 없습니다</p>
              <p className="text-gray-400 text-sm mt-1">곧 새로운 공동구매가 열려요!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {groupBuys.map((gb) => (
                <Link 
                  key={gb.id} 
                  href={`/groupbuy/${gb.id}`}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all group"
                >
                  <div className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 relative overflow-hidden">
                    {gb.thumbnail_url ? (
                      <img src={gb.thumbnail_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-5xl opacity-50">🛒</span>
                      </div>
                    )}
                    {gb.discount_rate > 0 && (
                      <div className="absolute top-2 left-2 px-2.5 py-1 bg-gradient-to-r from-red-500 to-rose-500 text-white text-xs font-bold rounded-lg shadow-lg">
                        {gb.discount_rate}% OFF
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-white/30 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-emerald-400 rounded-full"
                            style={{ width: `${Math.min(((gb.current_participants || 0) / gb.target_participants) * 100, 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-white text-xs font-bold">{Math.round(((gb.current_participants || 0) / gb.target_participants) * 100)}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="text-xs text-emerald-600 font-bold">{gb.shops?.name}</p>
                    <p className="text-sm font-bold text-gray-900 mt-1 line-clamp-2 leading-tight">{gb.title}</p>
                    <div className="mt-2 flex items-baseline gap-1.5">
                      {gb.original_price > gb.price && (
                        <span className="text-xs text-gray-400 line-through">{formatPrice(gb.original_price)}</span>
                      )}
                      <span className="text-base font-black text-emerald-600">{formatPrice(gb.price)}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1.5">
                      <span className="text-emerald-600 font-bold">{gb.current_participants || 0}명</span> 참여중
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* ==================== 서브 배너 1 ==================== */}
        {subBanners.length > 0 && (
          <div className="px-4 mt-6">
            <Link 
              href={subBanners[0]?.link_url || "#"}
              className="block rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              style={{ aspectRatio: '5/1' }}
            >
              {subBanners[0]?.image_url ? (
                <img 
                  src={subBanners[0].image_url} 
                  alt={subBanners[0].title || "광고"} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className={`w-full h-full bg-gradient-to-r ${subBanners[0]?.bg_color || 'from-blue-500 to-indigo-500'} flex items-center justify-center gap-3 px-4`}>
                  {subBanners[0]?.icon && <span className="text-2xl">{subBanners[0].icon}</span>}
                  <div className="text-white">
                    <p className="font-bold">{subBanners[0]?.title}</p>
                    {subBanners[0]?.subtitle && <p className="text-sm opacity-80">{subBanners[0].subtitle}</p>}
                  </div>
                </div>
              )}
            </Link>
          </div>
        )}

        {/* 인기 게시글 */}
        <section className="px-4 mt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">💬 인기 게시글</h3>
              <p className="text-xs text-gray-500 mt-0.5">이웃들의 이야기</p>
            </div>
            <Link href="/community" className="flex items-center gap-1 text-sm text-emerald-600 font-bold px-3 py-1.5 bg-emerald-50 rounded-full">
              전체보기
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
            {posts.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-400">게시글이 없습니다</p>
              </div>
            ) : (
              <div>
                {posts.map((post, index) => (
                  <Link 
                    key={post.id} 
                    href={`/community?post=${post.id}`}
                    className="flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-b-0"
                  >
                    <div className={`w-8 h-8 flex items-center justify-center rounded-xl text-sm font-black ${
                      index === 0 ? 'bg-gradient-to-br from-amber-400 to-orange-400 text-white shadow-lg shadow-amber-200/50' :
                      index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-white shadow-lg shadow-gray-200/50' :
                      index === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-700 text-white shadow-lg shadow-amber-200/50' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 font-medium truncate">{post.content}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <span className="text-red-400">❤️</span> {post.like_count || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="text-blue-400">💬</span> {post.comment_count || 0}
                        </span>
                      </div>
                    </div>
                    <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ==================== 서브 배너 2 ==================== */}
        {subBanners.length > 1 && (
          <div className="px-4 mt-6">
            <Link 
              href={subBanners[1]?.link_url || "#"}
              className="block rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              style={{ aspectRatio: '5/1' }}
            >
              {subBanners[1]?.image_url ? (
                <img 
                  src={subBanners[1].image_url} 
                  alt={subBanners[1].title || "광고"} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className={`w-full h-full bg-gradient-to-r ${subBanners[1]?.bg_color || 'from-purple-500 to-pink-500'} flex items-center justify-center gap-3 px-4`}>
                  {subBanners[1]?.icon && <span className="text-2xl">{subBanners[1].icon}</span>}
                  <div className="text-white">
                    <p className="font-bold">{subBanners[1]?.title}</p>
                    {subBanners[1]?.subtitle && <p className="text-sm opacity-80">{subBanners[1].subtitle}</p>}
                  </div>
                </div>
              )}
            </Link>
          </div>
        )}

        {/* ==================== 서브 배너 3 (하단) ==================== */}
        {subBanners.length > 2 ? (
          <section className="px-4 mt-6 mb-6">
            <Link 
              href={subBanners[2]?.link_url || "#"}
              className="block rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              {subBanners[2]?.image_url ? (
                <img 
                  src={subBanners[2].image_url} 
                  alt={subBanners[2].title || "광고"} 
                  className="w-full h-full object-cover"
                  style={{ aspectRatio: '5/1' }}
                />
              ) : (
                <div className={`bg-gradient-to-br ${subBanners[2]?.bg_color || 'from-gray-900 via-gray-800 to-gray-900'} p-5 relative overflow-hidden`}>
                  <div className="absolute inset-0">
                    <div className="absolute right-0 top-0 w-40 h-40 bg-emerald-500/20 rounded-full blur-3xl"></div>
                    <div className="absolute left-0 bottom-0 w-32 h-32 bg-teal-500/10 rounded-full blur-2xl"></div>
                  </div>
                  <div className="relative z-10 flex items-center justify-between">
                    <div>
                      {subBanners[2]?.subtitle && <p className="text-gray-400 text-sm font-medium">{subBanners[2].subtitle}</p>}
                      <p className="text-white text-lg font-bold mt-1">{subBanners[2]?.title}</p>
                    </div>
                    {subBanners[2]?.icon && (
                      <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                        <span className="text-2xl">{subBanners[2].icon}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Link>
          </section>
        ) : (
          /* 기본 입점 배너 (서브배너3 없을 때) */
          <section className="px-4 mt-6 mb-6">
            <Link 
              href="/shop/register"
              className="block bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl p-5 relative overflow-hidden group"
            >
              <div className="absolute inset-0">
                <div className="absolute right-0 top-0 w-40 h-40 bg-emerald-500/20 rounded-full blur-3xl"></div>
                <div className="absolute left-0 bottom-0 w-32 h-32 bg-teal-500/10 rounded-full blur-2xl"></div>
              </div>
              
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm font-medium">여주 지역 사장님이신가요?</p>
                  <p className="text-white text-lg font-bold mt-1">공동구매로 매출 UP! 🚀</p>
                  <p className="text-emerald-400 text-sm font-medium mt-2 group-hover:translate-x-1 transition-transform">
                    입점 신청하기 →
                  </p>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform">
                  <span className="text-2xl">🏪</span>
                </div>
              </div>
            </Link>
          </section>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
