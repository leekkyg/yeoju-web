"use client";

import { useTheme } from "@/contexts/ThemeContext";
import VideoPlayerWithAds from "@/components/video/VideoPlayerWithAds";
import BottomNav from "@/components/BottomNav";
import { ArrowLeft, Clock, Eye } from "lucide-react";

interface VideoDetailClientProps {
  video: any;
  midAds: any[];
  overlayAd: any;
}

export default function VideoDetailClient({ 
  video, 
  midAds,
  overlayAd 
}: VideoDetailClientProps) {
  const { theme, mounted } = useTheme();

  // 중간 광고 데이터 변환
  const midrollAds = midAds.map(ad => ({
    id: ad.id,
    type: ad.ad_type === "video" ? "video" as const : "image" as const,
    url: ad.video_url || ad.image_url,
    link_url: ad.link_url,
    duration: 5,
    skip_after: 5,
  }));

  // 영상 길이에 따라 중간 광고 시점 자동 계산
  const getMidrollTimes = () => {
    const duration = video.duration_seconds || 180;
    const times: number[] = [];
    
    if (duration >= 60 && midrollAds.length >= 1) {
      times.push(Math.floor(duration / 3));
    }
    if (duration >= 120 && midrollAds.length >= 2) {
      times.push(Math.floor((duration / 3) * 2));
    }
    
    return times;
  };

  // 오버레이 광고 데이터 변환
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

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#121212]">
        <div className="max-w-[631px] mx-auto" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen transition-colors duration-300"
      style={{ backgroundColor: theme.bgMain }}
    >
      <div className="max-w-[631px] mx-auto">
        {/* 헤더 */}
        <header
          className="sticky top-0 z-50 px-4 py-3 flex items-center gap-3"
          style={{
            backgroundColor: theme.bgMain,
            borderBottom: `1px solid ${theme.borderLight}`,
          }}
        >
          <button onClick={() => window.history.back()} className="p-1">
            <ArrowLeft className="w-6 h-6" style={{ color: theme.textPrimary }} />
          </button>
          <h1 className="text-lg font-bold flex-1 truncate" style={{ color: theme.textPrimary }}>
            영상
          </h1>
        </header>

        <main className="pb-20">
          {/* PC: 카드 스타일 / 모바일: 꽉 차게 */}
          <div className="md:px-4 md:pt-4">
            <div 
              className="md:rounded-2xl md:overflow-hidden"
              style={{ 
                backgroundColor: theme.bgCard || theme.bgMain,
              }}
            >
              {/* 비디오 플레이어 - 모바일: 꽉 참, PC: 카드 내부 */}
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

              {/* 영상 정보 - 양쪽 여백 있음 */}
              <div className="px-4 py-5">
                {/* 제목 - 굵게 */}
                <h1
                  className="text-xl font-extrabold mb-3 leading-tight"
                  style={{ color: theme.textPrimary }}
                >
                  {video.title}
                </h1>

                {/* 날짜 & 조회수 - 아이콘 + 작은 텍스트 */}
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

                {/* 설명 */}
                {video.description && (
                  <p
                    className="text-[15px] leading-relaxed whitespace-pre-wrap"
                    style={{ color: theme.textSecondary }}
                  >
                    {video.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        </main>

        <BottomNav />
      </div>
    </div>
  );
}
