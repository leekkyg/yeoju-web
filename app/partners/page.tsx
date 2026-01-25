"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/contexts/ThemeContext";
import { ArrowLeft, Sparkles, RefreshCw } from "lucide-react";

interface Partner {
  id: number;
  name: string;
  image_url: string;
  link_url?: string;
  width?: number;
  height?: number;
}

export default function PartnersPage() {
  const router = useRouter();
  const { theme, isDark, mounted } = useTheme();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [isShuffling, setIsShuffling] = useState(false);

  useEffect(() => {
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    const { data } = await supabase
      .from("partners")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      const shuffled = [...data].sort(() => Math.random() - 0.5);
      setPartners(shuffled);
    }
    setLoading(false);
  };

  const handleShuffle = () => {
    setIsShuffling(true);
    setTimeout(() => {
      const shuffled = [...partners].sort(() => Math.random() - 0.5);
      setPartners(shuffled);
      setIsShuffling(false);
    }, 300);
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: isDark ? '#121212' : '#f5f5f5' }}>
      {/* 헤더 */}
      <header 
        className="fixed top-0 left-0 right-0 z-50 h-14"
        style={{ 
          backgroundColor: isDark ? '#121212' : '#ffffff',
          borderBottom: `1px solid ${theme.border}`
        }}
      >
        <div className="max-w-[631px] mx-auto h-full flex items-center px-4">
          <button onClick={() => router.back()} className="p-2 -ml-2">
            <ArrowLeft className="w-5 h-5" style={{ color: theme.textPrimary }} />
          </button>
          <h1 className="flex-1 text-center font-bold text-lg" style={{ color: theme.textPrimary }}>
            파트너스
          </h1>
          <button 
            onClick={handleShuffle}
            disabled={isShuffling}
            className={`p-2 -mr-2 ${isShuffling ? 'animate-spin' : ''}`}
          >
            <RefreshCw className="w-5 h-5" style={{ color: theme.accent }} />
          </button>
        </div>
      </header>

      {/* 컨텐츠 */}
      <main className="pt-20 pb-16 max-w-[631px] mx-auto px-4">
        {loading ? (
          <div className="flex justify-center items-center py-32">
            <div 
              className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: theme.accent, borderTopColor: 'transparent' }}
            />
          </div>
        ) : partners.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32">
            <Sparkles className="w-12 h-12 mb-4" style={{ color: theme.accent }} />
            <p className="text-lg font-medium mb-2" style={{ color: theme.textPrimary }}>
              파트너를 모집 중이에요
            </p>
            <p className="text-sm text-center" style={{ color: theme.textMuted }}>
              여주마켓과 함께할 파트너사를 기다리고 있습니다
            </p>
          </div>
        ) : (
          <>
            {/* 상단 타이틀 */}
            <div className="flex items-center justify-center gap-2 mb-6">
              <Sparkles className="w-4 h-4" style={{ color: theme.accent }} />
              <span 
                className="text-sm font-bold uppercase tracking-widest" 
                style={{ color: theme.accent }}
              >
                Official Partners
              </span>
            </div>

            {/* 이미지 그리드 - 원본 크기 유지 */}
            <div 
              className={`flex flex-wrap gap-3 justify-center ${isShuffling ? 'opacity-0' : 'opacity-100'} transition-opacity`}
            >
              {partners.map((partner) => (
                <div key={partner.id}>
                  {partner.link_url ? (
                    <a 
                      href={partner.link_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-xl overflow-hidden"
                    >
                      <img 
                        src={partner.image_url} 
                        alt={partner.name}
                        style={{
                          width: partner.width || 'auto',
                          height: partner.height || 'auto'
                        }}
                      />
                    </a>
                  ) : (
                    <div className="rounded-xl overflow-hidden">
                      <img 
                        src={partner.image_url} 
                        alt={partner.name}
                        style={{
                          width: partner.width || 'auto',
                          height: partner.height || 'auto'
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      {/* 하단 문구 - 고정 */}
      <div className="fixed bottom-4 left-0 right-0 text-center">
        <p 
          className="text-xs" 
          style={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }}
        >
          파트너 제휴 문의 partner@yeojumarket.com
        </p>
      </div>
    </div>
  );
}
