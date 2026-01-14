"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/contexts/ThemeContext";
import BottomNav from "@/components/BottomNav";
import {
  ArrowLeft,
  Heart,
  Phone,
  MapPin,
  Store,
} from "lucide-react";

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
  const { theme, isDark, mounted } = useTheme();
  
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
    if (!confirm("찜 목록에서 삭제하시겠습니까?")) return;
    await supabase.from("favorite_shops").delete().eq("id", favoriteId);
    setFavorites(prev => prev.filter(f => f.id !== favoriteId));
  };

  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.bgMain }}>
        <div className="w-10 h-10 border-2 rounded-full animate-spin" style={{ borderColor: theme.border, borderTopColor: theme.accent }}></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 transition-colors duration-300" style={{ backgroundColor: theme.bgMain }}>
      {/* 헤더 */}
      <header className="sticky top-0 z-50" style={{ backgroundColor: theme.bgMain, borderBottom: `1px solid ${theme.borderLight}` }}>
        <div className="max-w-[640px] mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1 -ml-1 rounded-lg" style={{ color: theme.textPrimary }}>
            <ArrowLeft className="w-6 h-6" strokeWidth={1.5} />
          </button>
          <h1 className="text-lg font-bold" style={{ color: theme.textPrimary }}>찜한 상점</h1>
          <span className="text-sm" style={{ color: theme.textMuted }}>({favorites.length})</span>
        </div>
      </header>

      <main className="max-w-[640px] mx-auto px-4 py-4">
        {favorites.length === 0 ? (
          <div className="rounded-2xl py-16 text-center" style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}>
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: theme.bgInput }}>
              <Heart className="w-8 h-8" style={{ color: theme.textMuted }} strokeWidth={1.5} />
            </div>
            <p className="font-medium mb-2" style={{ color: theme.textPrimary }}>아직 찜한 상점이 없습니다</p>
            <p className="text-sm mb-4" style={{ color: theme.textMuted }}>마음에 드는 상점을 찜해보세요</p>
            <Link 
              href="/groupbuy" 
              className="inline-block px-6 py-3 rounded-xl font-semibold"
              style={{ backgroundColor: theme.accent, color: isDark ? '#121212' : '#FFF' }}
            >
              공동구매 둘러보기
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {favorites.map(fav => (
              <div 
                key={fav.id} 
                className="rounded-2xl overflow-hidden"
                style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}
              >
                <div className="flex items-center p-4">
                  <Link href={`/shop/${fav.shops.id}`} className="flex-shrink-0">
                    <div 
                      className="w-14 h-14 rounded-xl overflow-hidden flex items-center justify-center"
                      style={{ backgroundColor: theme.bgInput, border: `1px solid ${theme.border}` }}
                    >
                      {fav.shops.logo_url ? (
                        <img src={fav.shops.logo_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Store className="w-6 h-6" style={{ color: theme.accent }} strokeWidth={1.5} />
                      )}
                    </div>
                  </Link>

                  <Link href={`/shop/${fav.shops.id}`} className="flex-1 ml-4 min-w-0">
                    <h3 className="font-bold" style={{ color: theme.textPrimary }}>{fav.shops.name}</h3>
                    <p className="text-sm" style={{ color: theme.accent }}>{fav.shops.category}</p>
                    <p className="text-sm truncate flex items-center gap-1 mt-0.5" style={{ color: theme.textMuted }}>
                      <MapPin className="w-3 h-3 flex-shrink-0" strokeWidth={1.5} />
                      {fav.shops.address}
                    </p>
                  </Link>

                  <div className="flex gap-2 ml-2">
                    <a 
                      href={`tel:${fav.shops.phone}`} 
                      className="w-10 h-10 flex items-center justify-center rounded-xl transition-colors"
                      style={{ backgroundColor: theme.bgInput, border: `1px solid ${theme.border}` }}
                    >
                      <Phone className="w-5 h-5" style={{ color: theme.accent }} strokeWidth={1.5} />
                    </a>
                    <button 
                      onClick={() => removeFavorite(fav.id)} 
                      className="w-10 h-10 flex items-center justify-center rounded-xl transition-colors"
                      style={{ backgroundColor: theme.redBg, border: `1px solid ${theme.red}30` }}
                    >
                      <Heart className="w-5 h-5" style={{ color: theme.red }} fill={theme.red} strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
