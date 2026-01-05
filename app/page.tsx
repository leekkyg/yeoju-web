"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [recentPosts, setRecentPosts] = useState<any[]>([]);
  const [recentVideos, setRecentVideos] = useState<any[]>([]);
  const [ads, setAds] = useState<any[]>([]);
  const [currentBanner, setCurrentBanner] = useState(0);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetchData();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  useEffect(() => {
    if (ads.length > 1) {
      const timer = setInterval(() => {
        setCurrentBanner((prev) => (prev + 1) % ads.length);
      }, 4000);
      return () => clearInterval(timer);
    }
  }, [ads.length]);

  const fetchData = async () => {
    const { data: posts } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(6);
    setRecentPosts(posts || []);

    const { data: videos } = await supabase
      .from("videos")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(4);
    setRecentVideos(videos || []);

    const { data: adsData } = await supabase
      .from("ads")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    setAds(adsData || []);
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
    <div className="min-h-screen bg-gray-100">
      {/* 헤더 */}
      <header className="bg-gray-900 sticky top-0 z-50">
        <div className="max-w-[631px] mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-amber-500 rounded-lg flex items-center justify-center">
              <span className="text-gray-900 font-black text-sm">여주</span>
            </div>
            <span className="font-bold text-xl text-white">마켓</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/community" className="text-gray-300 hover:text-white font-medium transition-colors">커뮤니티</Link>
            <Link href="/market" className="text-gray-300 hover:text-white font-medium transition-colors">마켓</Link>
            <Link href="/videos" className="text-gray-300 hover:text-white font-medium transition-colors">영상</Link>
          </nav>

          {user ? (
            <Link href="/mypage" className="flex items-center gap-2 px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
              <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="text-sm font-medium text-white hidden sm:block">마이페이지</span>
            </Link>
          ) : (
            <Link href="/login" className="px-5 py-2 bg-amber-500 text-gray-900 font-bold rounded-lg hover:bg-amber-400 transition-colors text-sm">
              로그인
            </Link>
          )}
        </div>
      </header>

      <main className="max-w-[631px] mx-auto px-4 pb-24 md:pb-10">
        {/* 광고 배너 */}
        <div className="mt-6">
          <div className="relative rounded-xl overflow-hidden bg-gray-800 aspect-[2.5/1] shadow-xl">
            {ads.length > 0 ? (
              <>
                {ads.map((ad, index) => (
                  <a
                    key={ad.id}
                    href={ad.link_url || "#"}
                    className={`absolute inset-0 transition-opacity duration-500 ${
                      index === currentBanner ? "opacity-100" : "opacity-0 pointer-events-none"
                    }`}
                  >
                    {ad.image_url ? (
                      <img src={ad.image_url} alt={ad.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-r from-gray-900 to-gray-800 flex items-center justify-center">
                        <span className="text-white text-xl font-bold">{ad.title}</span>
                      </div>
                    )}
                  </a>
                ))}
                {ads.length > 1 && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
                    {ads.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentBanner(index)}
                        className={`w-2.5 h-2.5 rounded-full transition-colors ${
                          index === currentBanner ? "bg-amber-500" : "bg-white/40"
                        }`}
                      />
                    ))}
                  </div>
                )}
                <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded">
                  {currentBanner + 1} / {ads.length}
                </div>
              </>
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-amber-500 text-sm font-bold mb-1">YEOJU MARKET</p>
                  <p className="text-white text-2xl font-bold">여주시민의 프리미엄 커뮤니티</p>
                  <p className="text-gray-400 text-sm mt-2">광고 문의: 031-XXX-XXXX</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 메인 메뉴 */}
        <div className="mt-6 grid grid-cols-4 gap-3">
          <Link href="/community" className="bg-white rounded-xl p-4 shadow-md hover:shadow-lg transition-all border-2 border-transparent hover:border-amber-500 text-center group">
            <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
              </svg>
            </div>
            <span className="text-sm font-bold text-gray-800">커뮤니티</span>
          </Link>
          <Link href="/market" className="bg-white rounded-xl p-4 shadow-md hover:shadow-lg transition-all border-2 border-transparent hover:border-amber-500 text-center group">
            <div className="w-14 h-14 bg-amber-500 rounded-xl flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <span className="text-sm font-bold text-gray-800">마켓</span>
          </Link>
          <Link href="/videos" className="bg-white rounded-xl p-4 shadow-md hover:shadow-lg transition-all border-2 border-transparent hover:border-amber-500 text-center group">
            <div className="w-14 h-14 bg-red-600 rounded-xl flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-sm font-bold text-gray-800">영상</span>
          </Link>
          <Link href="/coupons" className="bg-white rounded-xl p-4 shadow-md hover:shadow-lg transition-all border-2 border-transparent hover:border-amber-500 text-center group">
            <div className="w-14 h-14 bg-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
            </div>
            <span className="text-sm font-bold text-gray-800">쿠폰</span>
          </Link>
        </div>

        {/* 최신 게시글 */}
        <section className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-black text-gray-900">최신 게시글</h2>
            <Link href="/community" className="text-sm text-amber-600 hover:text-amber-700 font-bold flex items-center gap-1">
              더보기
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          
          <div className="space-y-3">
            {recentPosts.length > 0 ? (
              recentPosts.map((post) => (
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
                      <p className="text-sm text-gray-600 line-clamp-1">{post.content}</p>
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
              ))
            ) : (
              <div className="py-12 text-center bg-white rounded-xl shadow-md">
                <p className="text-gray-500 font-medium">게시글이 없습니다</p>
              </div>
            )}
          </div>
        </section>

        {/* 영상 콘텐츠 */}
        <section className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-black text-gray-900">영상 콘텐츠</h2>
            <Link href="/videos" className="text-sm text-amber-600 hover:text-amber-700 font-bold flex items-center gap-1">
              더보기
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {recentVideos.length > 0 ? (
              recentVideos.map((video) => (
                <Link key={video.id} href={`/videos/${video.id}`} className="group">
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-800 shadow-md group-hover:shadow-xl transition-shadow">
                    {video.thumbnail_url ? (
                      <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                        <svg className="w-12 h-12 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-amber-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                        <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                  <h3 className="mt-2 font-bold text-gray-900 line-clamp-2 group-hover:text-amber-600 transition-colors">{video.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">조회수 {video.view_count || 0}회</p>
                </Link>
              ))
            ) : (
              <div className="col-span-full py-12 text-center bg-white rounded-xl shadow-md">
                <p className="text-gray-500 font-medium">영상이 없습니다</p>
              </div>
            )}
          </div>
        </section>

        {/* 앱 다운로드 */}
        <section className="mt-10">
          <div className="bg-gray-900 rounded-xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-500/20 rounded-full blur-2xl"></div>
            <div className="relative z-10">
              <h3 className="text-xl font-black text-white mb-2">여주마켓 앱 다운로드</h3>
              <p className="text-gray-400 text-sm mb-4">앱에서 더 편리하게 이용하세요</p>
              <div className="flex gap-3">
                <button className="px-4 py-2 bg-amber-500 text-gray-900 font-bold rounded-lg text-sm hover:bg-amber-400 transition-colors">
                  App Store
                </button>
                <button className="px-4 py-2 bg-white text-gray-900 font-bold rounded-lg text-sm hover:bg-gray-100 transition-colors">
                  Google Play
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 푸터 */}
      <footer className="bg-gray-900 text-white py-10 border-t-4 border-amber-500">
        <div className="max-w-[631px] mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between gap-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
                  <span className="text-gray-900 font-black text-xs">여주</span>
                </div>
                <span className="font-bold text-lg">마켓</span>
              </div>
              <p className="text-gray-400 text-sm">여주시민을 위한 프리미엄 커뮤니티</p>
            </div>
            <div className="flex gap-12">
              <div>
                <h4 className="font-bold mb-3 text-amber-500">바로가기</h4>
                <ul className="space-y-2 text-gray-400 text-sm">
                  <li><Link href="/community" className="hover:text-white transition-colors">커뮤니티</Link></li>
                  <li><Link href="/market" className="hover:text-white transition-colors">마켓</Link></li>
                  <li><Link href="/videos" className="hover:text-white transition-colors">영상</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold mb-3 text-amber-500">고객지원</h4>
                <ul className="space-y-2 text-gray-400 text-sm">
                  <li><a href="#" className="hover:text-white transition-colors">공지사항</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">문의하기</a></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-6 text-center text-gray-500 text-sm">
            © 2025 여주마켓. All rights reserved.
          </div>
        </div>
      </footer>

      {/* 모바일 하단 네비게이션 */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 z-50">
        <div className="flex">
          <Link href="/" className="flex-1 py-3 flex flex-col items-center gap-1">
            <svg className="w-6 h-6 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
            </svg>
            <span className="text-xs font-bold text-amber-500">홈</span>
          </Link>
          <Link href="/community" className="flex-1 py-3 flex flex-col items-center gap-1">
            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-xs text-gray-500">커뮤니티</span>
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
          <Link href={user ? "/mypage" : "/login"} className="flex-1 py-3 flex flex-col items-center gap-1">
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
