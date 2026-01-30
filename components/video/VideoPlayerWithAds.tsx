"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, X } from "lucide-react";
import OptimizedImage from "@/components/common/OptimizedImage";

let currentPlayingVideo: HTMLVideoElement | null = null;

interface VideoAd {
  id: string;
  type: "video" | "image";
  url: string;
  link_url?: string;
  duration?: number; // 이미지 광고 표시 시간 (초)
  skip_after?: number; // N초 후 스킵 가능
}

interface VideoPlayerWithAdsProps {
  src: string;
  className?: string;
  style?: React.CSSProperties;
  startTime?: number;
  onTimeChange?: (time: number) => void;
  autoPlayOnScroll?: boolean;
  autoPlay?: boolean;
  // 광고 설정
  midrollAds?: VideoAd[]; // 중간 광고
  midrollTimes?: number[]; // 중간 광고 재생 시점 (초)
  overlayAd?: VideoAd; // 이미지 오버레이 광고
  overlayShowAt?: number; // 오버레이 표시 시점 (초)
}

export default function VideoPlayerWithAds({ 
  src, 
  className = "", 
  style, 
  startTime = 0,
  onTimeChange,
  autoPlayOnScroll = true,
  autoPlay = false,
  midrollAds = [],
  midrollTimes = [],
  overlayAd,
  overlayShowAt = 10,
}: VideoPlayerWithAdsProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const adVideoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [progress, setProgress] = useState(0);
  const [currentTimeState, setCurrentTimeState] = useState(0);
  const [duration, setDuration] = useState(0);
  
  // 광고 상태
  const [isAdPlaying, setIsAdPlaying] = useState(false);
  const [currentAd, setCurrentAd] = useState<VideoAd | null>(null);
  const [adTimeRemaining, setAdTimeRemaining] = useState(0);
  const [canSkip, setCanSkip] = useState(false);
  const [skipCountdown, setSkipCountdown] = useState(0);
  const [showOverlayAd, setShowOverlayAd] = useState(false);
  const [playedAdTimes, setPlayedAdTimes] = useState<number[]>([]);
  
  const hideControlsTimer = useRef<NodeJS.Timeout | null>(null);
  const lastTimeUpdateRef = useRef(0);
  const onTimeChangeRef = useRef(onTimeChange);
  const hasAutoPlayed = useRef(false);

  useEffect(() => {
    onTimeChangeRef.current = onTimeChange;
  }, [onTimeChange]);

  // 시작 시간 설정
  useEffect(() => {
    if (videoRef.current && startTime > 0) {
      videoRef.current.currentTime = startTime;
    }
  }, [startTime]);

  // 자동 재생
  useEffect(() => {
    if (autoPlay && videoRef.current && !isAdPlaying) {
      videoRef.current.play().catch(() => {});
    }
  }, [autoPlay, isAdPlaying]);

  // 스크롤 감지 자동 재생
  useEffect(() => {
    if (!autoPlayOnScroll || !containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.intersectionRatio >= 0.7 && !hasAutoPlayed.current && !isAdPlaying) {
            if (currentPlayingVideo && currentPlayingVideo !== videoRef.current) {
              currentPlayingVideo.pause();
            }
            videoRef.current?.play().catch(() => {});
            currentPlayingVideo = videoRef.current;
            hasAutoPlayed.current = true;
          } else if (entry.intersectionRatio < 0.2 && hasAutoPlayed.current) {
            videoRef.current?.pause();
            if (currentPlayingVideo === videoRef.current) {
              currentPlayingVideo = null;
            }
          }
        });
      },
      { threshold: [0, 0.2, 0.7] }
    );

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      if (currentPlayingVideo === videoRef.current) {
        currentPlayingVideo = null;
      }
    };
  }, [autoPlayOnScroll, isAdPlaying]);

  // 비디오 이벤트 핸들러
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      if (isAdPlaying) return;
      
      const time = video.currentTime;
      setProgress((time / video.duration) * 100);
      setCurrentTimeState(time);
      
      // 중간 광고 체크
      midrollTimes.forEach((adTime, idx) => {
        if (
          time >= adTime && 
          time < adTime + 1 && 
          !playedAdTimes.includes(adTime) &&
          midrollAds[idx]
        ) {
          playMidrollAd(midrollAds[idx], adTime);
        }
      });

      // 오버레이 광고 체크
      if (overlayAd && time >= overlayShowAt && !showOverlayAd) {
        setShowOverlayAd(true);
      }
      
      if (onTimeChangeRef.current && time - lastTimeUpdateRef.current >= 2) {
        lastTimeUpdateRef.current = time;
        onTimeChangeRef.current(time);
      }
    };
    
    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      if (startTime > 0) {
        video.currentTime = startTime;
      }
    };
    
    const handlePlay = () => !isAdPlaying && setIsPlaying(true);
    const handlePause = () => !isAdPlaying && setIsPlaying(false);
    const handleEnded = () => {
      video.currentTime = 0;
      video.play().catch(() => {});
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("ended", handleEnded);
    
    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("ended", handleEnded);
    };
  }, [startTime, isAdPlaying, midrollTimes, midrollAds, playedAdTimes, overlayAd, overlayShowAt, showOverlayAd]);

  // 중간 광고 재생
  const playMidrollAd = (ad: VideoAd, adTime: number) => {
    videoRef.current?.pause();
    setIsAdPlaying(true);
    setCurrentAd(ad);
    setPlayedAdTimes(prev => [...prev, adTime]);
    setCanSkip(false);
    setSkipCountdown(ad.skip_after || 5);

    if (ad.type === "image") {
      setAdTimeRemaining(ad.duration || 5);
    }
  };

  // 광고 스킵 카운트다운
  useEffect(() => {
    if (!isAdPlaying || !currentAd) return;

    const interval = setInterval(() => {
      setSkipCountdown(prev => {
        if (prev <= 1) {
          setCanSkip(true);
          return 0;
        }
        return prev - 1;
      });

      // 이미지 광고 타이머
      if (currentAd.type === "image") {
        setAdTimeRemaining(prev => {
          if (prev <= 1) {
            skipAd();
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isAdPlaying, currentAd]);

  // 광고 영상 종료 핸들러
  useEffect(() => {
    const adVideo = adVideoRef.current;
    if (!adVideo) return;

    const handleAdEnded = () => {
      skipAd();
    };

    adVideo.addEventListener("ended", handleAdEnded);
    return () => adVideo.removeEventListener("ended", handleAdEnded);
  }, []);

  // 광고 스킵
  const skipAd = () => {
    setIsAdPlaying(false);
    setCurrentAd(null);
    setCanSkip(false);
    videoRef.current?.play().catch(() => {});
  };

  // 오버레이 광고 닫기
  const closeOverlayAd = () => {
    setShowOverlayAd(false);
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAdPlaying) return;
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      if (currentPlayingVideo && currentPlayingVideo !== videoRef.current) {
        currentPlayingVideo.pause();
      }
      videoRef.current.play().catch(() => {});
      currentPlayingVideo = videoRef.current;
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
    if (adVideoRef.current) {
      adVideoRef.current.muted = !isMuted;
    }
  };

  const toggleFullscreen = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!containerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error("Fullscreen error:", err);
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (isAdPlaying) return;
    if (!videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = percent * duration;
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (hideControlsTimer.current) {
      clearTimeout(hideControlsTimer.current);
    }
    hideControlsTimer.current = setTimeout(() => {
      if (isPlaying || isAdPlaying) {
        setShowControls(false);
      }
    }, 2000);
  };

  const handleMouseLeave = () => {
    if (isPlaying || isAdPlaying) {
      hideControlsTimer.current = setTimeout(() => {
        setShowControls(false);
      }, 1000);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative bg-black group ${className}`}
      style={style}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={togglePlay}
    >
      {/* 메인 비디오 */}
      <video
        ref={videoRef}
        src={src}
        className={`w-full h-full object-contain ${isAdPlaying ? 'hidden' : ''}`}
        muted={isMuted}
        playsInline
        loop
      />

      {/* 광고 레이어 */}
      {isAdPlaying && currentAd && (
        <div className="absolute inset-0 bg-black flex items-center justify-center">
          {/* 영상 광고 */}
          {currentAd.type === "video" && (
            <video
              ref={adVideoRef}
              src={currentAd.url}
              className="w-full h-full object-contain"
              muted={isMuted}
              playsInline
              autoPlay
            />
          )}

          {/* 이미지 광고 */}
          {currentAd.type === "image" && (
            <a 
              href={currentAd.link_url || "#"} 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full h-full flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={currentAd.url}
                alt="광고"
                className="max-w-full max-h-full object-contain"
              />
            </a>
          )}

          {/* 광고 표시 */}
          <div className="absolute top-3 left-3 bg-black/70 text-white text-xs px-2 py-1 rounded">
            광고 {currentAd.type === "image" ? `${adTimeRemaining}초` : ""}
          </div>

          {/* 스킵 버튼 */}
          <div className="absolute bottom-16 right-3">
            {canSkip ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  skipAd();
                }}
                className="bg-white/90 hover:bg-white text-black text-sm font-medium px-4 py-2 rounded transition-colors"
              >
                광고 건너뛰기 →
              </button>
            ) : (
              <div className="bg-black/70 text-white text-sm px-4 py-2 rounded">
                {skipCountdown}초 후 건너뛰기
              </div>
            )}
          </div>
        </div>
      )}

      {/* 오버레이 이미지 광고 (하단) */}
      {showOverlayAd && overlayAd && !isAdPlaying && (
        <div className="absolute bottom-14 left-2 right-2">
          <div className="relative">
            <a
              href={overlayAd.link_url || "#"}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={overlayAd.url}
                alt="광고"
                className="w-full rounded-lg shadow-lg"
                style={{ maxHeight: "80px", objectFit: "cover" }}
              />
            </a>
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeOverlayAd();
              }}
              className="absolute -top-2 -right-2 w-6 h-6 bg-black/80 hover:bg-black text-white rounded-full flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
            <span className="absolute bottom-1 right-2 text-[10px] text-white/70">광고</span>
          </div>
        </div>
      )}

      {/* 중앙 재생 버튼 */}
      {!isPlaying && !isAdPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <button
            onClick={togglePlay}
            className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition-colors"
          >
            <Play className="w-8 h-8 text-black ml-1" fill="currentColor" />
          </button>
        </div>
      )}

      {/* 컨트롤 바 */}
      {!isAdPlaying && (
        <div
          className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 transition-opacity duration-300 ${
            showControls ? "opacity-100" : "opacity-0"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 프로그레스 바 */}
          <div
            className="w-full h-1 bg-white/30 rounded-full cursor-pointer mb-2 group/progress"
            onClick={handleProgressClick}
          >
            <div
              className="h-full bg-white rounded-full relative"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity" />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={togglePlay}
                className="p-1 hover:bg-white/20 rounded transition-colors"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 text-white" fill="currentColor" />
                ) : (
                  <Play className="w-5 h-5 text-white" fill="currentColor" />
                )}
              </button>

              <button
                onClick={toggleMute}
                className="p-1 hover:bg-white/20 rounded transition-colors"
              >
                {isMuted ? (
                  <VolumeX className="w-5 h-5 text-white" />
                ) : (
                  <Volume2 className="w-5 h-5 text-white" />
                )}
              </button>

              <span className="text-white text-xs">
                {formatTime(currentTimeState)} / {formatTime(duration)}
              </span>
            </div>

            <button
              onClick={toggleFullscreen}
              className="p-1 hover:bg-white/20 rounded transition-colors"
            >
              {isFullscreen ? (
                <Minimize className="w-5 h-5 text-white" />
              ) : (
                <Maximize className="w-5 h-5 text-white" />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
