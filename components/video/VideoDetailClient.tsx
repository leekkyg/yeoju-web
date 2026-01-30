"use client";

import { useTheme } from "@/contexts/ThemeContext";
import VideoPlayer from "@/components/VideoPlayer";
import SimpleNav from "@/components/SimpleNav";
import { ArrowLeft } from "lucide-react";

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
        <main className="pb-20 px-4 pt-4">
          <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}>
            {/* 비디오 플레이어 - 커뮤니티 플레이어 사용 */}
            <VideoPlayer
              src={video.video_url}
              className="w-full aspect-video"
              autoPlay={true}
              autoPlayOnScroll={false}
            />

            {/* 영상 정보 */}
            <div className="px-4 py-4">

        
            <h1
              className="text-xl font-bold mb-2"
              style={{ color: theme.textPrimary }}
            >
              {video.title}
            </h1>

            <div className="flex items-center gap-2 text-sm mb-4" style={{ color: theme.textMuted }}>
              <span>조회수 {video.view_count || 0}회</span>
              <span>•</span>
              <span>{formatDate(video.created_at)}</span>
            </div>

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
        </main>


        <SimpleNav />
      </div>
    </div>
  );
}
