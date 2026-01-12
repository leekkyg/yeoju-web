"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";

export default function MyPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [myPosts, setMyPosts] = useState<any[]>([]);
  const [myShop, setMyShop] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // 저장한 글 팝업
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [bookmarkedPosts, setBookmarkedPosts] = useState<any[]>([]);
  const [loadingBookmarks, setLoadingBookmarks] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      router.push("/login");
      return;
    }
    
    setUser(user);
    
    // 프로필 조회
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    setProfile(profileData);
    
    // 내 게시글 조회
    const { data: posts } = await supabase
      .from("posts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);
    setMyPosts(posts || []);

    // 내 상점 조회
    const { data: shop } = await supabase
      .from("shops")
      .select("*")
      .eq("user_id", user.id)
      .single();
    setMyShop(shop);
    
    setLoading(false);
  };

  // 저장한 글 불러오기
  const fetchBookmarkedPosts = async () => {
    if (!user) return;
    setLoadingBookmarks(true);
    
    // 북마크 목록 조회 (post_id만)
    const { data: bookmarks } = await supabase
      .from("post_bookmarks")
      .select("post_id, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    
    if (!bookmarks || bookmarks.length === 0) {
      setBookmarkedPosts([]);
      setLoadingBookmarks(false);
      return;
    }
    
    // 해당 게시글들 조회
    const postIds = bookmarks.map(b => b.post_id);
    const { data: posts } = await supabase
      .from("posts")
      .select("id, content, created_at, user_id, is_anonymous, like_count, comment_count")
      .in("id", postIds);
    
    // 북마크 순서대로 정렬 + 삭제된 글 표시
    const postsMap = new Map((posts || []).map(p => [p.id, p]));
    const result = bookmarks.map(b => {
      const post = postsMap.get(b.post_id);
      if (post) {
        return { ...post, bookmarked_at: b.created_at, is_deleted: false };
      } else {
        return { id: b.post_id, bookmarked_at: b.created_at, is_deleted: true };
      }
    });
    
    setBookmarkedPosts(result);
    setLoadingBookmarks(false);
  };

  // 북마크 삭제
  const removeBookmark = async (postId: number) => {
    await supabase.from("post_bookmarks").delete().eq("user_id", user.id).eq("post_id", postId);
    setBookmarkedPosts(prev => prev.filter(p => p.id !== postId));
  };

  const handleLogout = async () => {
    if (confirm("로그아웃 하시겠습니까?")) {
      await supabase.auth.signOut();
      router.push("/");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR");
  };

  const openBookmarksModal = () => {
    setShowBookmarks(true);
    fetchBookmarkedPosts();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const menuItems = [
    { href: "/mypage/edit", icon: "👤", label: "프로필 수정", color: "bg-emerald-100" },
    { href: "/messages", icon: "✉️", label: "쪽지함", color: "bg-teal-100" },
    { href: "/favorites", icon: "❤️", label: "단골 업체", color: "bg-red-100" },
    { href: "/mypage/groupbuys", icon: "📦", label: "공동구매 참여내역", color: "bg-amber-100" },
    { href: "/mypage/bookmarks", icon: "🔖", label: "저장한 글", color: "bg-blue-100" },
    { href: "/notifications", icon: "🔔", label: "알림", color: "bg-purple-100" },
    { href: "/mypage/settings", icon: "⚙️", label: "설정", color: "bg-gray-100" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* 헤더 */}
      <header className="bg-white sticky top-0 z-50 border-b border-gray-100">
        <div className="max-w-[631px] mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="text-gray-900 font-bold text-lg">마이페이지</h1>
          <button
            onClick={handleLogout}
            className="text-gray-500 text-sm"
          >
            로그아웃
          </button>
        </div>
      </header>

      <main className="max-w-[631px] mx-auto px-4 py-4">
        {/* 프로필 카드 */}
        <div className="bg-white rounded-2xl p-6 mb-4">
          <div className="flex items-center gap-4">
            {/* 프로필 사진 */}
            <Link href="/mypage/edit" className="relative">
              {profile?.avatar_url ? (
                <img 
                  src={profile.avatar_url} 
                  alt="프로필" 
                  className="w-16 h-16 rounded-full object-cover border-2 border-emerald-100"
                />
              ) : (
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                  <span className="text-emerald-600 font-bold text-2xl">
                    {profile?.nickname?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
                  </span>
                </div>
              )}
              {/* 편집 아이콘 */}
              <div className="absolute bottom-0 right-0 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </div>
            </Link>

            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900">
                {profile?.nickname || "사용자"}
              </h2>
              <p className="text-gray-500 text-sm">{user?.email}</p>
            </div>
          </div>
          
          {/* 통계 */}
          <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-100">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{myPosts.length}</p>
              <p className="text-sm text-gray-500">게시글</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">0</p>
              <p className="text-sm text-gray-500">좋아요</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">0</p>
              <p className="text-sm text-gray-500">댓글</p>
            </div>
          </div>
        </div>

        {/* 관리자 메뉴 */}
        {profile?.role === "admin" && (
          <Link href="/admin" className="block bg-gradient-to-r from-gray-800 to-gray-900 rounded-2xl p-5 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">🛠️</span>
                </div>
                <div>
                  <p className="text-white font-bold text-lg">관리자</p>
                  <p className="text-gray-400 text-sm">회원·게시물·신고·상점 관리</p>
                </div>
              </div>
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        )}

        {/* 자영업자 섹션 */}
        {!myShop ? (
          <Link href="/shop/register" className="block bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl p-5 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-bold text-lg">🏪 사장님이세요?</p>
                <p className="text-emerald-100 text-sm mt-1">여주마켓에서 공동구매를 시작해보세요!</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>
        ) : myShop.approval_status === "pending" ? (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <span className="text-2xl">⏳</span>
              </div>
              <div>
                <p className="font-bold text-amber-800">상점 승인 대기중</p>
                <p className="text-amber-600 text-sm">관리자 승인 후 이용 가능합니다</p>
              </div>
            </div>
          </div>
        ) : myShop.approval_status === "rejected" ? (
          <Link href="/shop/register" className="block bg-red-50 border border-red-200 rounded-2xl p-5 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">❌</span>
                </div>
                <div>
                  <p className="font-bold text-red-800">상점 등록 거절</p>
                  <p className="text-red-600 text-sm">{myShop.approval_note || "다시 신청해주세요"}</p>
                </div>
              </div>
              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        ) : (
          <Link href="/shop/dashboard" className="block bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-5 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl overflow-hidden flex items-center justify-center">
                  {myShop.logo_url ? (
                    <img src={myShop.logo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white font-bold text-xl">{myShop.name?.[0]}</span>
                  )}
                </div>
                <div>
                  <p className="text-white font-bold text-lg">{myShop.name}</p>
                  <p className="text-emerald-100 text-sm">내 상점 관리하기</p>
                </div>
              </div>
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        )}

        {/* 메뉴 */}
        <div className="bg-white rounded-2xl overflow-hidden mb-4">
          {menuItems.map((item, index) => {
            const content = (
              <div className={`flex items-center justify-between p-4 hover:bg-gray-50 transition-colors ${
                index < menuItems.length - 1 ? 'border-b border-gray-100' : ''
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 ${item.color} rounded-xl flex items-center justify-center`}>
                    <span className="text-lg">{item.icon}</span>
                  </div>
                  <span className="text-gray-900 font-medium">{item.label}</span>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            );
            
            if (item.onClick) {
              return <button key={index} onClick={item.onClick} className="w-full text-left">{content}</button>;
            }
            return <Link key={item.href} href={item.href!}>{content}</Link>;
          })}
        </div>

        {/* 내 게시글 */}
        <div className="bg-white rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-gray-900">내 게시글</h3>
            <Link href="/mypage/posts" className="text-sm text-emerald-500 font-medium">전체보기</Link>
          </div>
          
          {myPosts.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-4xl mb-2">📝</div>
              <p className="text-gray-500">작성한 게시글이 없습니다</p>
              <Link href="/community" className="text-emerald-500 font-semibold text-sm mt-2 inline-block">
                첫 글 작성하기
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {myPosts.map((post) => (
                <Link
                  key={post.id}
                  href={`/community?post=${post.id}`}
                  className="block p-4 hover:bg-gray-50 transition-colors"
                >
                  <p className="text-gray-900 font-medium line-clamp-1">{post.content}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    <span>{formatDate(post.created_at)}</span>
                    <span>❤️ {post.like_count || 0}</span>
                    <span>💬 {post.comment_count || 0}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* 저장한 글 팝업 모달 */}
      {showBookmarks && (
        <div 
          className="fixed inset-0 bg-black/50 z-[100] flex items-end justify-center"
          onClick={() => setShowBookmarks(false)}
        >
          <div 
            className="bg-white rounded-t-3xl w-full max-w-[631px] max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">🔖 저장한 글</h3>
              <button 
                onClick={() => setShowBookmarks(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
              >
                <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* 목록 */}
            <div className="overflow-y-auto max-h-[calc(80vh-60px)]">
              {loadingBookmarks ? (
                <div className="p-8 text-center">
                  <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                </div>
              ) : bookmarkedPosts.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="text-4xl mb-2">🔖</div>
                  <p className="text-gray-500">저장한 글이 없습니다</p>
                  <p className="text-gray-400 text-sm mt-1">게시글의 메뉴에서 저장할 수 있어요</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {bookmarkedPosts.map((post) => (
                    <div key={post.id} className="relative">
                      {post.is_deleted ? (
                        // 삭제된 글
                        <div className="p-4 bg-gray-50">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400">🗑️</span>
                            <p className="text-gray-400 text-sm">삭제된 게시글입니다</p>
                          </div>
                          <button
                            onClick={() => removeBookmark(post.id)}
                            className="mt-2 text-xs text-red-500"
                          >
                            목록에서 제거
                          </button>
                        </div>
                      ) : (
                        // 정상 글
                        <Link
                          href={`/community?post=${post.id}`}
                          onClick={() => setShowBookmarks(false)}
                          className="block p-4 hover:bg-gray-50 transition-colors"
                        >
                          <p className="text-gray-900 line-clamp-2">{post.content}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                            <span>{formatDate(post.bookmarked_at)}</span>
                            <span>❤️ {post.like_count || 0}</span>
                            <span>💬 {post.comment_count || 0}</span>
                          </div>
                        </Link>
                      )}
                      {/* 삭제 버튼 */}
                      {!post.is_deleted && (
                        <button
                          onClick={() => removeBookmark(post.id)}
                          className="absolute top-4 right-4 p-1 text-gray-400 hover:text-red-500"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
