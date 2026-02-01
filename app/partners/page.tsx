"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/contexts/ThemeContext";
import { ArrowLeft, RefreshCw, Home, Moon, Sun } from "lucide-react";

interface Partner {
  id: number;
  name: string;
  image_url: string;
  link_url: string | null;
  width: number | null;
  height: number | null;
  start_date: string | null;
  end_date: string | null;
}

export default function PartnersPage() {
  const router = useRouter();
  const { theme, isDark, mounted, toggleTheme } = useTheme();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    const { data, error } = await supabase
      .from("partners")
      .select("*");

    if (data) {
      // 게시 기간 필터링
      const now = new Date();
      const activePartners = data.filter((p: Partner) => {
        const start = p.start_date ? new Date(p.start_date) : null;
        const end = p.end_date ? new Date(p.end_date) : null;
        
        if (start && now < start) return false;
        if (end && now > end) return false;
        return true;
      });

      // 랜덤 정렬
      const shuffled = [...activePartners].sort(() => Math.random() - 0.5);
      setPartners(shuffled);
    }
    setLoading(false);
  };

  const handleShuffle = () => {
    const shuffled = [...partners].sort(() => Math.random() - 0.5);
    setPartners(shuffled);
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.bgMain }}>
      {/* 헤더 */}
      <header 
        className="fixed top-0 left-0 right-0 z-50 h-14"
        style={{ 
          backgroundColor: theme.bgMain,
          borderBottom: `1px solid ${theme.border}`
        }}
      >
        <div className="max-w-[631px] mx-auto h-full flex items-center justify-between px-4">
          <button onClick={() => router.back()} className="p-2 -ml-2">
            <ArrowLeft className="w-5 h-5" style={{ color: theme.textPrimary }} />
          </button>
          <h1 className="font-bold text-lg" style={{ color: theme.textPrimary }}>
            제휴·협력사
          </h1>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleShuffle}
              className="p-2 rounded-lg transition-colors"
              style={{ color: theme.textPrimary }}
              title="랜덤 정렬"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button 
              onClick={() => router.push("/")}
              className="p-2 rounded-lg transition-colors"
              style={{ color: theme.textPrimary }}
            >
              <Home className="w-5 h-5" />
            </button>
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-lg transition-colors"
              style={{ color: theme.textPrimary }}
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* 메인 */}
      <main className="pt-14 pb-16 max-w-[631px] mx-auto px-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <div 
              className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: theme.accent, borderTopColor: 'transparent' }}
            />
          </div>
        ) : partners.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32">
            <p className="text-lg font-medium" style={{ color: theme.textMuted }}>
              등록된 제휴사가 없습니다
            </p>
          </div>
        ) : (
          <div 
            className="columns-3 gap-2 mt-6"
            style={{ columnGap: '8px' }}
          >
            {partners.map((partner) => (
              <div
                key={partner.id}
                className="mb-2 break-inside-avoid"
              >
                {partner.link_url ? (
                  <a
                    href={partner.link_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-lg overflow-hidden transition-transform hover:scale-[1.02]"
                    style={{
                      backgroundColor: theme.bgCard,
                      border: `1px solid ${theme.border}`
                    }}
                  >
                    <img
                      src={partner.image_url}
                      alt={partner.name}
                      className="w-full h-auto"
                      loading="lazy"
                    />
                  </a>
                ) : (
                  <div
                    className="rounded-lg overflow-hidden"
                    style={{
                      backgroundColor: theme.bgCard,
                      border: `1px solid ${theme.border}`
                    }}
                  >
                    <img
                      src={partner.image_url}
                      alt={partner.name}
                      className="w-full h-auto"
                      loading="lazy"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
