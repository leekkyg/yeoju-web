"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import { useTheme } from "@/contexts/ThemeContext";
import VideoPlayerWithAds from "@/components/video/VideoPlayerWithAds";
import Header from "@/components/Header";
import OptimizedImage from "@/components/common/OptimizedImage";
import { Clock, Eye, Play } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

interface VideoDetailClientProps {
  video: any;
  midAds: any[];
  overlayAd: any;
}

// URL 유효성 검사 함수
const isValidUrl = (url: string | undefined | null): boolean => {
  if (!url || typeof url !== 'string') return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export default function VideoDetailClient({ 
  video, 
  midAds,
  overlayAd 
}: VideoDetailClientProps) {
 const { theme, isDark, mounted } = useTheme();

  const [relatedVideos, setRelatedVideos] = useState<any[]>([]);

  // 중간 광고 데이터 변환
  const midrollAds = midAds.map(ad => ({
    id: ad.id,
    type: ad.ad_type === "video" ? "video" as const : "image" as const,
    url: ad.video_url || ad.image_url,
    link_url: ad.link_url,
    duration: 5,
    skip_after: 5,
  }));

  const getMidrollTimes = () => {
    const duration = video.duration_seconds || 180;
    const times: number[] = [];
    if (duration >= 60 && midrollAds.length >= 1) times.push(Math.floor(duration / 3));
    if (duration >= 120 && midrollAds.length >= 2) times.push(Math.floor((duration / 3) * 2));
    return times;
  };

  const overlayAdData = overlayAd ? {
    id: overlayAd.id,
    type: "image" as const,
    url: overlayAd.image_url,
    link_url: overlayAd.link_url,
  } : undefined;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // 관련 영상 가져오기
  useEffect(() => {
    const fetchRelatedVideos = async () => {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      
      const { data } = await supabase
        .from("videos")
        .select("id, title, thumbnail_url, duration, created_at")
        .neq("id", video.id)
        .order("created_at", { ascending: false })
        .limit(6);
      
      if (data) setRelatedVideos(data);
    };
    
    fetchRelatedVideos();
  }, [video.id]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#121212]">
        <div className="max-w-[631px] mx-auto" />
      </div>
    );
  }

  return (
    <div className="min-h-screen transition-colors duration-300" style={{ backgroundColor: theme.bgMain }}>
      <div className="max-w-[631px] mx-auto">
        {/* 공통 헤더 */}
        <Header showHome={true} showThemeToggle={true} showNotification={true} />

        <main className="pb-8">
          {/* PC: 카드 스타일 / 모바일: 꽉 차게 */}
          <div className="md:px-4 md:pt-4">
            <div 
              className="md:rounded-2xl md:overflow-hidden"
              style={{ backgroundColor: theme.bgCard || theme.bgMain }}
            >
              {/* 비디오 플레이어 */}
              <div className="w-full">
                <VideoPlayerWithAds
                  src={video.video_url}
                  className="w-full aspect-video"
                  autoPlay={true}
                  autoPlayOnScroll={false}
                  midrollAds={midrollAds}
                  midrollTimes={getMidrollTimes()}
                  overlayAd={overlayAdData}
                  overlayShowAt={10}
                />
              </div>

              {/* 영상 정보 */}
              <div className="px-4 py-5">
                <h1 className="text-xl font-extrabold mb-3 leading-tight" style={{ color: theme.textPrimary }}>
                  {video.title}
                </h1>

                <div className="flex items-center gap-4 text-xs mb-5" style={{ color: theme.textMuted }}>
                  <span className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" />
                    {video.view_count || 0}회
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {formatDate(video.created_at)}
                  </span>
                </div>

                {video.description && (
                  <p className="text-[15px] leading-relaxed whitespace-pre-wrap" style={{ color: theme.textSecondary }}>
                    {video.description}
                  </p>
                )}
              </div>
            </div>
          </div>

                    {/* Livere 댓글 */}
          <div className="mt-6 px-4">
            <h3 className="text-base font-bold mb-4" style={{ color: theme.textPrimary }}>댓글</h3>
            <div 
              className="rounded-xl overflow-hidden" 
              style={{ 
                backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
                border: `1px solid ${theme.borderLight}` 
              }}
            >
              <div 
                id="livere-comments"
                style={{
                  filter: isDark ? 'invert(1) hue-rotate(180deg)' : 'none',
                }}
              >
                <livere-comment client-id="gSoyK4WDjal75heUDfIB"></livere-comment>
              </div>
            </div>
          </div>

          <Script 
            src="https://www.livere.org/livere-widget.js" 
            strategy="lazyOnload"
            type="module"
          />

          {/* 관련 영상 목록 */}
          <div className="mt-8 px-4">
            <h3 className="text-base font-bold mb-4" style={{ color: theme.textPrimary }}>다른 영상</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {relatedVideos.map((relatedVideo) => (
                <Link 
                  key={relatedVideo.id} 
                  href={`/videos/${relatedVideo.id}`}
                  className="rounded-xl overflow-hidden transition-transform hover:scale-[1.02]"
                  style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}
                >
                  <div className="aspect-video relative" style={{ backgroundColor: theme.bgInput }}>
                    {isValidUrl(relatedVideo.thumbnail_url) ? (
                      <OptimizedImage 
                        src={relatedVideo.thumbnail_url} 
                        alt={relatedVideo.title} 
                        fill 
                        sizes="200px" 
                        className="object-cover" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Play className="w-8 h-8" style={{ color: theme.textMuted }} strokeWidth={1} />
                      </div>
                    )}
                    {/* 재생 시간 */}
                    {relatedVideo.duration && (
                      <div className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded">
                        {relatedVideo.duration}
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <h4 className="text-[11px] font-medium line-clamp-2" style={{ color: theme.textPrimary }}>
                      {relatedVideo.title}
                    </h4>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

// TypeScript용 커스텀 엘리먼트 선언
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'livere-comment': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { 'client-id': string }, HTMLElement>;
    }
  }
}