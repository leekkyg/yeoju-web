"use client";

import { useTheme } from "@/contexts/ThemeContext";

interface FeedAd {
  id: number;
  title: string;
  image_url: string;
  target_url: string | null;
}

interface FeedAdCardProps {
  ad: FeedAd;
}

export default function FeedAdCard({ ad }: FeedAdCardProps) {
  const { theme } = useTheme();

  const handleClick = () => {
    if (ad.target_url) {
      window.open(ad.target_url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      className={`rounded-xl overflow-hidden transition-all ${ad.target_url ? 'cursor-pointer hover:opacity-90' : ''}`}
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

// 피드에 광고를 삽입하는 헬퍼 함수
export function insertFeedAds<T>(
  items: T[],
  ads: FeedAd[],
  interval: number = 3 // 3개마다 광고 1개
): (T | { type: 'ad', ad: FeedAd })[] {
  if (ads.length === 0) return items;

  const result: (T | { type: 'ad', ad: FeedAd })[] = [];
  let adIndex = 0;

  // 랜덤 순서로 광고 섞기
  const shuffledAds = [...ads].sort(() => Math.random() - 0.5);

  for (let i = 0; i < items.length; i++) {
    result.push(items[i]);

    // interval개마다 광고 삽입
    if ((i + 1) % interval === 0 && adIndex < shuffledAds.length) {
      result.push({ 
        type: 'ad' as const, 
        ad: shuffledAds[adIndex] 
      });
      
      adIndex++;
      
      // 광고를 모두 사용했으면 다시 처음부터
      if (adIndex >= shuffledAds.length) {
        adIndex = 0;
      }
    }
  }

  return result;
}

// TypeScript 타입 가드
export function isFeedAd<T>(item: T | { type: 'ad', ad: FeedAd }): item is { type: 'ad', ad: FeedAd } {
  return typeof item === 'object' && item !== null && 'type' in item && item.type === 'ad';
}
