"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/contexts/ThemeContext";
import BottomNav from "@/components/BottomNav";
import {
  Sun,
  Moon,
  Home,
  User,
  MessageCircle,
  Heart,
  Package,
  Bookmark,
  Bell,
  Settings,
  ChevronRight,
  Store,
  Shield,
  Clock,
  XCircle,
  PenSquare,
  X,
} from "lucide-react";

export default function MyPage() {
  const router = useRouter();
  const { theme, isDark, mounted, toggleTheme } = useTheme();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [myPosts, setMyPosts] = useState<any[]>([]);
  const [myShop, setMyShop] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
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
    
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    setProfile(profileData);
    
    const { data: posts } = await supabase
      .from("posts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);
    setMyPosts(posts || []);

    const { data: shop } = await supabase
      .from("shops")
      .select("*")
      .eq("user_id", user.id)
      .single();
    setMyShop(shop);
    
    setLoading(false);
  };

  const fetchBookmarkedPosts = async () => {
    if (!user) return;
    setLoadingBookmarks(true);
    
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
    
    const postIds = bookmarks.map(b => b.post_id);
    const { data: posts } = await supabase
      .from("posts")
      .select("id, content, created_at, user_id, is_anonymous, like_count, comment_count")
      .in("id", postIds);
    
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

  const removeBookmark = async (postId: number) => {
    await supabase.from("post_bookmarks").delete().eq("user_id", user.id).eq("post_id", postId);
    setBookmarkedPosts(prev => prev.filter(p => p.id !== postId));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR");
  };

  const openBookmarksModal = () => {
    setShowBookmarks(true);
    fetchBookmarkedPosts();
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.bgMain }}>
        <div className="w-10 h-10 border-4 rounded-full animate-spin" style={{ borderColor: theme.border, borderTopColor: theme.accent }}></div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.bgMain }}>
        <div className="w-10 h-10 border-4 rounded-full animate-spin" style={{ borderColor: theme.border, borderTopColor: theme.accent }}></div>
      </div>
    );
  }

  const menuItems = [
    { href: "/mypage/edit", icon: User, label: "프로필 수정", color: theme.accent },
    { href: "/messages", icon: MessageCircle, label: "쪽지함", color: "#0EA5E9" },
    { href: "/favorites", icon: Heart, label: "관심 업체", color: theme.red },
    { href: "/mypage/groupbuys", icon: Package, label: "공동구매 참여내역", color: "#F59E0B" },
    { href: "/mypage/bookmarks", icon: Bookmark, label: "저장한 글", color: "#3B82F6" },
    { href: "/notifications", icon: Bell, label: "알림", color: "#8B5CF6" },
    { href: "/mypage/settings", icon: Settings, label: "설정", color: theme.textMuted },
  ];

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: theme.bgMain }}>
      {/* 헤더 */}
      <header className="sticky top-0 z-50 border-b" style={{ backgroundColor: theme.bgCard, borderColor: theme.borderLight }}>
        <div className="max-w-[631px] mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="font-bold text-lg" style={{ color: theme.textPrimary }}>마이페이지</h1>
          <div className="flex items-center gap-1">
            {/* 다크모드 토글 */}
            <button onClick={toggleTheme} className="w-10 h-10 flex items-center justify-center">
              {isDark ? (
                <Sun className="w-5 h-5" style={{ color: theme.accent }} strokeWidth={1.5} />
              ) : (
                <Moon className="w-5 h-5" style={{ color: theme.accent }} strokeWidth={1.5} />
              )}
            </button>
            {/* 홈 버튼 */}
            <Link href="/" className="w-10 h-10 flex items-center justify-center">
              <Home className="w-5 h-5" style={{ color: theme.textSecondary }} strokeWidth={1.5} />
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-[631px] mx-auto px-4 py-4">
        {/* 프로필 카드 */}
        <div className="rounded-2xl p-6 mb-4" style={{ backgroundColor: theme.bgCard }}>
          <div className="flex items-center gap-4">
            <Link href="/mypage/edit" className="relative">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="프로필" className="w-16 h-16 rounded-full object-cover border-2" style={{ borderColor: theme.accent }} />
              ) : (
                <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: `${theme.accent}20` }}>
                  <span className="font-bold text-2xl" style={{ color: theme.accent }}>{profile?.nickname?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}</span>
                </div>
              )}
              <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.accent }}>
                <PenSquare className="w-3 h-3" style={{ color: isDark ? '#121212' : '#FFFFFF' }} strokeWidth={2} />
              </div>
            </Link>
            <div className="flex-1">
              <h2 className="text-xl font-bold" style={{ color: theme.textPrimary }}>{profile?.nickname || "사용자"}</h2>
              <p className="text-sm" style={{ color: theme.textMuted }}>{user?.email}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-6 pt-6" style={{ borderTop: `1px solid ${theme.border}` }}>
            <div className="text-center">
              <p className="text-2xl font-bold" style={{ color: theme.textPrimary }}>{myPosts.length}</p>
              <p className="text-sm" style={{ color: theme.textMuted }}>게시글</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold" style={{ color: theme.textPrimary }}>0</p>
              <p className="text-sm" style={{ color: theme.textMuted }}>좋아요</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold" style={{ color: theme.textPrimary }}>0</p>
              <p className="text-sm" style={{ color: theme.textMuted }}>댓글</p>
            </div>
          </div>
        </div>

        {/* 관리자 버튼 */}
        {profile?.role === "admin" && (
          <Link href="/admin" className="block rounded-2xl p-5 mb-4" style={{ background: `linear-gradient(135deg, ${theme.bgCard}, ${isDark ? '#1a1a1a' : '#f0f0f0'})`, border: `1px solid ${theme.border}` }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: theme.accent }}>
                  <Shield className="w-6 h-6" style={{ color: isDark ? '#121212' : '#FFFFFF' }} />
                </div>
                <div>
                  <p className="font-bold text-lg" style={{ color: theme.textPrimary }}>관리자</p>
                  <p className="text-sm" style={{ color: theme.textMuted }}>회원·게시물·신고·상점·광고 관리</p>
                </div>
              </div>
              <ChevronRight className="w-6 h-6" style={{ color: theme.textMuted }} />
            </div>
          </Link>
        )}

        {/* 상점 등록/관리 */}
        {!myShop ? (
          <Link href="/shop/register" className="block rounded-2xl p-5 mb-4" style={{ background: `linear-gradient(135deg, ${theme.accent}, ${theme.accentDark})` }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-lg" style={{ color: isDark ? '#121212' : '#FFFFFF' }}>혹시 사장님이세요?</p>
                <p className="text-sm mt-1" style={{ color: isDark ? '#121212cc' : '#FFFFFFcc' }}>여주마켓에서 공동구매를 시작해보세요!</p>
              </div>
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                <Store className="w-6 h-6" style={{ color: isDark ? '#121212' : '#FFFFFF' }} />
              </div>
            </div>
          </Link>
        ) : myShop.approval_status === "pending" ? (
          <div className="rounded-2xl p-5 mb-4" style={{ backgroundColor: '#FEF3C7', border: '1px solid #FCD34D' }}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#FDE68A' }}>
                <Clock className="w-6 h-6" style={{ color: '#D97706' }} />
              </div>
              <div>
                <p className="font-bold" style={{ color: '#92400E' }}>상점 승인 대기중</p>
                <p className="text-sm" style={{ color: '#B45309' }}>관리자 승인 후 이용 가능합니다</p>
              </div>
            </div>
          </div>
        ) : myShop.approval_status === "rejected" ? (
          <Link href="/shop/register" className="block rounded-2xl p-5 mb-4" style={{ backgroundColor: '#FEE2E2', border: '1px solid #FECACA' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#FECACA' }}>
                  <XCircle className="w-6 h-6" style={{ color: '#DC2626' }} />
                </div>
                <div>
                  <p className="font-bold" style={{ color: '#991B1B' }}>상점 등록 거절</p>
                  <p className="text-sm" style={{ color: '#B91C1C' }}>{myShop.approval_note || "다시 신청해주세요"}</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5" style={{ color: '#DC2626' }} />
            </div>
          </Link>
        ) : (
          <Link href="/shop/dashboard" className="block rounded-2xl p-5 mb-4" style={{ background: `linear-gradient(135deg, ${theme.accent}, ${theme.accentDark})` }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                  {myShop.logo_url ? (
                    <img src={myShop.logo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-bold text-xl" style={{ color: isDark ? '#121212' : '#FFFFFF' }}>{myShop.name?.[0]}</span>
                  )}
                </div>
                <div>
                  <p className="font-bold text-lg" style={{ color: isDark ? '#121212' : '#FFFFFF' }}>{myShop.name}</p>
                  <p className="text-sm" style={{ color: isDark ? '#121212cc' : '#FFFFFFcc' }}>→ 상점 관리하기</p>
                </div>
              </div>
              <ChevronRight className="w-6 h-6" style={{ color: isDark ? '#121212' : '#FFFFFF' }} />
            </div>
          </Link>
        )}

        {/* 메뉴 리스트 */}
        <div className="rounded-2xl overflow-hidden mb-4" style={{ backgroundColor: theme.bgCard }}>
          {menuItems.map((item, index) => (
            <Link key={item.href} href={item.href}>
              <div 
                className="flex items-center justify-between p-4 transition-colors"
                style={{ 
                  borderBottom: index < menuItems.length - 1 ? `1px solid ${theme.border}` : 'none',
                }}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${item.color}20` }}
                  >
                    <item.icon className="w-5 h-5" style={{ color: item.color }} strokeWidth={1.5} />
                  </div>
                  <span className="font-medium" style={{ color: theme.textPrimary }}>{item.label}</span>
                </div>
                <ChevronRight className="w-5 h-5" style={{ color: theme.textMuted }} />
              </div>
            </Link>
          ))}
        </div>

        {/* 내 게시글 */}
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: theme.bgCard }}>
          <div className="p-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${theme.border}` }}>
            <h3 className="font-bold" style={{ color: theme.textPrimary }}>내 게시글</h3>
            <Link href="/mypage/posts" className="text-sm font-medium" style={{ color: theme.accent }}>전체보기</Link>
          </div>
          {myPosts.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-4xl mb-2">📝</div>
              <p style={{ color: theme.textMuted }}>작성한 게시글이 없습니다</p>
              <Link href="/community" className="font-semibold text-sm mt-2 inline-block" style={{ color: theme.accent }}>첫 글 작성하기</Link>
            </div>
          ) : (
            <div>
              {myPosts.map((post, index) => (
                <Link 
                  key={post.id} 
                  href={`/community?post=${post.id}`} 
                  className="block p-4 transition-colors"
                  style={{ borderBottom: index < myPosts.length - 1 ? `1px solid ${theme.border}` : 'none' }}
                >
                  <p className="font-medium line-clamp-1" style={{ color: theme.textPrimary }}>{post.content}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs" style={{ color: theme.textMuted }}>
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

      {/* 북마크 모달 */}
      {showBookmarks && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setShowBookmarks(false)}>
          <div 
            className="rounded-t-3xl w-full max-w-[631px] max-h-[80vh] overflow-hidden"
            style={{ backgroundColor: theme.bgCard }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 px-4 py-4 flex items-center justify-between" style={{ backgroundColor: theme.bgCard, borderBottom: `1px solid ${theme.border}` }}>
              <h3 className="text-lg font-bold" style={{ color: theme.textPrimary }}>📌 저장한 글</h3>
              <button onClick={() => setShowBookmarks(false)} className="w-8 h-8 flex items-center justify-center rounded-full" style={{ backgroundColor: theme.bgInput }}>
                <X className="w-5 h-5" style={{ color: theme.textMuted }} />
              </button>
            </div>
            <div className="overflow-y-auto max-h-[calc(80vh-60px)]">
              {loadingBookmarks ? (
                <div className="p-8 text-center">
                  <div className="w-8 h-8 border-4 rounded-full animate-spin mx-auto" style={{ borderColor: theme.border, borderTopColor: theme.accent }}></div>
                </div>
              ) : bookmarkedPosts.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="text-4xl mb-2">📌</div>
                  <p style={{ color: theme.textMuted }}>저장한 글이 없습니다</p>
                  <p className="text-sm mt-1" style={{ color: theme.textMuted }}>게시글 메뉴에서 저장할 수 있어요</p>
                </div>
              ) : (
                <div>
                  {bookmarkedPosts.map((post, index) => (
                    <div key={post.id} className="relative" style={{ borderBottom: index < bookmarkedPosts.length - 1 ? `1px solid ${theme.border}` : 'none' }}>
                      {post.is_deleted ? (
                        <div className="p-4" style={{ backgroundColor: theme.bgInput }}>
                          <div className="flex items-center gap-2">
                            <span style={{ color: theme.textMuted }}>🗑️</span>
                            <p className="text-sm" style={{ color: theme.textMuted }}>삭제된 게시글입니다</p>
                          </div>
                          <button onClick={() => removeBookmark(post.id)} className="mt-2 text-xs" style={{ color: theme.red }}>목록에서 제거</button>
                        </div>
                      ) : (
                        <Link href={`/community?post=${post.id}`} onClick={() => setShowBookmarks(false)} className="block p-4 transition-colors">
                          <p className="line-clamp-2" style={{ color: theme.textPrimary }}>{post.content}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs" style={{ color: theme.textMuted }}>
                            <span>{formatDate(post.bookmarked_at)}</span>
                            <span>❤️ {post.like_count || 0}</span>
                            <span>💬 {post.comment_count || 0}</span>
                          </div>
                        </Link>
                      )}
                      {!post.is_deleted && (
                        <button onClick={() => removeBookmark(post.id)} className="absolute top-4 right-4 p-1" style={{ color: theme.textMuted }}>
                          <X className="w-5 h-5" />
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
