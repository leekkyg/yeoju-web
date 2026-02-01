"use client";

import { useTheme } from "@/contexts/ThemeContext";

interface VideoAd {
  id: number;
  title: string;
  image_url: string;
  target_url: string | null;
}

interface VideoAdBannerProps {
  ads: VideoAd[];
}

export default function VideoAdBanner({ ads }: VideoAdBannerProps) {
  const { theme } = useTheme();

  if (ads.length === 0) return null;

  // 랜덤으로 하나 선택
  const ad = ads[Math.floor(Math.random() * ads.length)];

  const handleClick = () => {
    if (ad.target_url) {
      window.open(ad.target_url, '_blank', 'noopener noreferrer');
    }
  };

  return (
    <div
      className={`mt-4 rounded-xl overflow-hidden ${ad.target_url ? 'cursor-pointer hover:opacity-90' : ''}`}
      style={{
        backgroundColor: theme.bgCard,
        border: `1px solid ${theme.border}`,
      }}
      onClick={handleClick}
    >
      {/* 광고 표시 */}
      <div className="px-3 py-2 text-xs font-medium" style={{ color: theme.textMuted }}>
        💰 광고
      </div>
      
      {/* 광고 이미지 */}
      <img
        src={ad.image_url}
        alt={ad.title}
        className="w-full h-auto"
      />
    </div>
  );
}
