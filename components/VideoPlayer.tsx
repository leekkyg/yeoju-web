"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize } from "lucide-react";

let currentPlayingVideo: HTMLVideoElement | null = null;

interface VideoPlayerProps {
  src: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function VideoPlayer({ src, className = "", style }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const hideControlsTimer = useRef<NodeJS.Timeout | null>(null);
  const hasAutoPlayed = useRef(false);
  const isVisible = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const wasVisible = isVisible.current;
          isVisible.current = entry.intersectionRatio >= 0.7;
          
          if (isVisible.current && !wasVisible) {
            if (!hasAutoPlayed.current) {
              if (currentPlayingVideo && currentPlayingVideo !== videoRef.current) {
                currentPlayingVideo.pause();
              }
              videoRef.current?.play().catch(() => {});
              currentPlayingVideo = videoRef.current;
              setIsPlaying(true);
              hasAutoPlayed.current = true;
            }
          } else if (!isVisible.current && wasVisible) {
            videoRef.current?.pause();
            if (currentPlayingVideo === videoRef.current) {
              currentPlayingVideo = null;
            }
            setIsPlaying(false);
          }
        });
      },
      { threshold: [0, 0.7] }
    );

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      if (currentPlayingVideo === videoRef.current) {
        currentPlayingVideo = null;
      }
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setProgress((video.currentTime / video.duration) * 100);
      setCurrentTime(video.currentTime);
    };
    
    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };
    
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    
    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
    };
  }, []);

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
    if (isPlaying) {
      videoRef.current?.pause();
      if (currentPlayingVideo === videoRef.current) {
        currentPlayingVideo = null;
      }
    } else {
      if (currentPlayingVideo && currentPlayingVideo !== videoRef.current) {
        currentPlayingVideo.pause();
      }
      videoRef.current?.play();
      currentPlayingVideo = videoRef.current;
    }
    showControlsTemporarily();
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
    showControlsTemporarily();
  };

  const toggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!containerRef.current) return;
    
    if (isFullscreen) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen();
    }
    showControlsTemporarily();
  };

  const showControlsTemporarily = () => {
    setShowControls(true);
    if (hideControlsTimer.current) {
      clearTimeout(hideControlsTimer.current);
    }
    hideControlsTimer.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    if (videoRef.current) {
      videoRef.current.currentTime = percentage * videoRef.current.duration;
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative ${className} ${isFullscreen ? "!max-h-none !h-screen" : ""}`}
      style={style}
      onClick={togglePlay}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
      onTouchStart={() => showControlsTemporarily()}
    >
      <video
        ref={videoRef}
        src={src}
        className={`w-full object-cover ${isFullscreen ? "h-full object-contain" : "h-full rounded-xl"}`}
        muted={isMuted}
        loop
        playsInline
        preload="metadata"
      />

      <div
        className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${isFullscreen ? "" : "rounded-xl"} ${
          showControls || !isPlaying ? "opacity-100" : "opacity-0"
        }`}
        style={{ backgroundColor: "rgba(0,0,0,0.3)" }}
      >
        <button
          onClick={togglePlay}
          className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors"
        >
          {isPlaying ? (
            <Pause className="w-8 h-8 text-gray-800" fill="currentColor" />
          ) : (
            <Play className="w-8 h-8 text-gray-800 ml-1" fill="currentColor" />
          )}
        </button>
      </div>

      <div
        className={`absolute bottom-0 left-0 right-0 p-4 transition-opacity duration-300 ${isFullscreen ? "" : "rounded-b-xl"} ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
        style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.8))" }}
      >
        <div
          className="w-full h-2 bg-white/30 rounded-full cursor-pointer mb-3 group"
          onClick={handleSeek}
        >
          <div
            className="h-full bg-white rounded-full transition-all relative"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="p-2 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
            >
              {isPlaying ? (
                <Pause className="w-6 h-6 text-white" fill="currentColor" />
              ) : (
                <Play className="w-6 h-6 text-white ml-0.5" fill="currentColor" />
              )}
            </button>
            
            <button
              onClick={toggleMute}
              className="p-2 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
            >
              {isMuted ? (
                <VolumeX className="w-6 h-6 text-white" />
              ) : (
                <Volume2 className="w-6 h-6 text-white" />
              )}
            </button>
            
            <span className="text-white text-sm font-medium ml-1">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <button
            onClick={toggleFullscreen}
            className="p-2 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
          >
            {isFullscreen ? (
              <Minimize className="w-6 h-6 text-white" />
            ) : (
              <Maximize className="w-6 h-6 text-white" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
