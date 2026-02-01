"use client";

import { useTheme } from "@/contexts/ThemeContext";

interface PostAd {
  id: number;
  title: string;
  image_url: string;
  target_url: string | null;
}

interface PostAdBannerProps {
  ad: PostAd;
}

export function PostAdBanner({ ad }: PostAdBannerProps) {
  const { theme } = useTheme();

  const handleClick = () => {
    if (ad.target_url) {
      window.open(ad.target_url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      className={`my-6 rounded-xl overflow-hidden ${ad.target_url ? 'cursor-pointer hover:opacity-90' : ''}`}
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

// HTML 컨텐츠에 광고를 삽입하는 함수
export function insertPostAds(
  htmlContent: string,
  ads: PostAd[],
  interval: number = 3 // 3문단마다
): string {
  if (ads.length === 0 || !htmlContent) return htmlContent;

  // 랜덤 순서로 광고 섞기
  const shuffledAds = [...ads].sort(() => Math.random() - 0.5);

  // 문단 태그로 분리 (p, h1-h6, div 등)
  const paragraphTags = /<(p|h[1-6]|div)[^>]*>.*?<\/\1>/gi;
  const matches = htmlContent.match(paragraphTags) || [];
  
  if (matches.length === 0) return htmlContent;

  let result = htmlContent;
  let adIndex = 0;
  let insertCount = 0;

  // interval개 문단마다 광고 삽입
  matches.forEach((match, index) => {
    if ((index + 1) % interval === 0 && adIndex < shuffledAds.length) {
      const ad = shuffledAds[adIndex];
      
      // 광고 HTML 생성
      const adHtml = `
        <div class="post-ad-banner" data-ad-id="${ad.id}">
          <div class="post-ad-label">💰 광고</div>
          <a href="${ad.target_url || '#'}" target="_blank" rel="noopener noreferrer">
            <img src="${ad.image_url}" alt="${ad.title}" />
          </a>
        </div>
      `;

      // 해당 위치 뒤에 광고 삽입
      const matchIndex = result.indexOf(match) + match.length;
      result = result.slice(0, matchIndex) + adHtml + result.slice(matchIndex);
      
      insertCount++;
      adIndex++;
      
      // 광고를 모두 사용했으면 다시 처음부터
      if (adIndex >= shuffledAds.length) {
        adIndex = 0;
      }
    }
  });

  return result;
}

// React 컴포넌트로 사용할 때
export function PostContentWithAds({ 
  content, 
  ads 
}: { 
  content: string, 
  ads: PostAd[] 
}) {
  const { theme } = useTheme();
  const contentWithAds = insertPostAds(content, ads, 3);

  return (
    <div 
      className="prose max-w-none"
      style={{ color: theme.textPrimary }}
      dangerouslySetInnerHTML={{ __html: contentWithAds }}
    />
  );
}
