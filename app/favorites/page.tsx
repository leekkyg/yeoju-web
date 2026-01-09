"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface FavoriteShop {
  id: number;
  shop_id: number;
  shops: {
    id: number;
    name: string;
    category: string;
    logo_url: string;
    address: string;
    phone: string;
  };
}

export default function FavoritesPage() {
  const router = useRouter();
  const [favorites, setFavorites] = useState<FavoriteShop[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) { router.push("/login"); return; }
    
    const { data } = await supabase
      .from("favorite_shops")
      .select(`*, shops (id, name, category, logo_url, address, phone)`)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setFavorites(data || []);
    setLoading(false);
  };

  const removeFavorite = async (favoriteId: number) => {
    if (!confirm("단골 목록에서 삭제하시겠습니까?")) return;
    await supabase.from("favorite_shops").delete().eq("id", favoriteId);
    setFavorites(prev => prev.filter(f => f.id !== favoriteId));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      {/* 헤더 */}
      <header className="bg-gray-900 sticky top-0 z-50">
        <div className="max-w-[631px] mx-auto px-4 h-14 flex items-center">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-white mr-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-white font-bold text-lg">❤️ 단골 업체</h1>
        </div>
      </header>

      <main className="max-w-[631px] mx-auto p-4">
        {favorites.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">💔</div>
            <p className="text-gray-500 mb-4">아직 단골 업체가 없습니다</p>
            <Link href="/groupbuy" className="text-amber-500 font-medium">공동구매 둘러보기 →</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {favorites.map(fav => (
              <div key={fav.id} className="bg-white rounded-xl overflow-hidden">
                <div className="flex items-center p-4">
                  <Link href={`/shop/${fav.shops.id}`} className="flex-shrink-0">
                    <div className="w-14 h-14 rounded-xl bg-gray-800 overflow-hidden flex items-center justify-center">
                      {fav.shops.logo_url ? (
                        <img src={fav.shops.logo_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white font-bold text-xl">{fav.shops.name[0]}</span>
                      )}
                    </div>
                  </Link>

                  <Link href={`/shop/${fav.shops.id}`} className="flex-1 ml-4 min-w-0">
                    <h3 className="font-bold text-gray-900">{fav.shops.name}</h3>
                    <p className="text-sm text-gray-500">{fav.shops.category}</p>
                    <p className="text-sm text-gray-400 truncate">{fav.shops.address}</p>
                  </Link>

                  <div className="flex gap-2 ml-2">
                    <a href={`tel:${fav.shops.phone}`} className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-lg">
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </a>
                    <button onClick={() => removeFavorite(fav.id)} className="w-10 h-10 flex items-center justify-center bg-red-50 rounded-lg">
                      <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* 하단 네비게이션 */}
      <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 z-50">
        <div className="max-w-[631px] mx-auto flex">
          <Link href="/" className="flex-1 py-3 flex flex-col items-center gap-1">
            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs text-gray-500">홈</span>
          </Link>
          <Link href="/community" className="flex-1 py-3 flex flex-col items-center gap-1">
            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
            </svg>
            <span className="text-xs text-gray-500">커뮤니티</span>
          </Link>
          <Link href="/groupbuy" className="flex-1 py-3 flex flex-col items-center gap-1">
            <svg className="w-6 h-6 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/>
            </svg>
            <span className="text-xs text-gray-500">공동구매</span>
          </Link>
          <Link href="/favorites" className="flex-1 py-3 flex flex-col items-center gap-1">
            <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <span className="text-xs text-red-500 font-bold">단골</span>
          </Link>
          <Link href="/mypage" className="flex-1 py-3 flex flex-col items-center gap-1">
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
