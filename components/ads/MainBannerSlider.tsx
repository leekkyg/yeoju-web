"use client";

import { useState, useEffect, useRef } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface BannerAd {
  id: number;
  title: string;
  image_url: string;
  target_url: string | null;
}

interface MainBannerSliderProps {
  ads: BannerAd[];
}

export default function MainBannerSlider({ ads }: MainBannerSliderProps) {
  const { theme } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 자동 슬라이드 (3초마다)
  useEffect(() => {
    if (ads.length <= 1) return;

    const startTimer = () => {
      timerRef.current = setInterval(() => {
        handleNext();
      }, 3000);
    };

    startTimer();

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [currentIndex, ads.length]);

  const handleNext = () => {
    if (isTransitioning || ads.length <= 1) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => (prev + 1) % ads.length);
    setTimeout(() => setIsTransitioning(false), 300);
  };

  const handlePrev = () => {
    if (isTransitioning || ads.length <= 1) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => (prev - 1 + ads.length) % ads.length);
    setTimeout(() => setIsTransitioning(false), 300);
  };

  const handleDotClick = (index: number) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex(index);
    setTimeout(() => setIsTransitioning(false), 300);
  };

  // 터치 이벤트
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const minSwipeDistance = 50;

    if (distance > minSwipeDistance) {
      handleNext();
    } else if (distance < -minSwipeDistance) {
      handlePrev();
    }

    setTouchStart(0);
    setTouchEnd(0);
  };

  // 마우스 드래그
  const handleMouseDown = (e: React.MouseEvent) => {
    setTouchStart(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (touchStart) {
      setTouchEnd(e.clientX);
    }
  };

  const handleMouseUp = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const minSwipeDistance = 50;

    if (distance > minSwipeDistance) {
      handleNext();
    } else if (distance < -minSwipeDistance) {
      handlePrev();
    }

    setTouchStart(0);
    setTouchEnd(0);
  };

  const handleBannerClick = (targetUrl: string | null) => {
    if (targetUrl) {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    }
  };

  if (ads.length === 0) return null;

  return (
    <div
      className="relative rounded-2xl overflow-hidden select-none"
      style={{ backgroundColor: theme.bgCard }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        setTouchStart(0);
        setTouchEnd(0);
      }}
    >
      {/* 슬라이더 컨테이너 */}
      <div
        className="flex transition-transform duration-300 ease-out"
        style={{
          transform: `translateX(-${currentIndex * 100}%)`,
        }}
      >
        {ads.map((ad) => (
          <div
            key={ad.id}
            className="min-w-full cursor-pointer"
            onClick={() => handleBannerClick(ad.target_url)}
          >
            <img
              src={ad.image_url}
              alt={ad.title}
              className="w-full h-auto"
              draggable={false}
            />
          </div>
        ))}
      </div>

      {/* 좌우 버튼 */}
      {ads.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
            style={{ color: 'white' }}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
            style={{ color: 'white' }}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* 하단 표시 */}
      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
        {/* 좌측: 페이지 번호 */}
        <div className="px-3 py-1 rounded-full bg-black/70 text-white text-sm font-medium">
          {currentIndex + 1}/{ads.length}
        </div>

        {/* 우측: 도트 인디케이터 */}
        <div className="flex items-center gap-2">
          {ads.map((_, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                handleDotClick(index);
              }}
              className="transition-all"
              style={{
                width: index === currentIndex ? '24px' : '8px',
                height: '8px',
                borderRadius: '4px',
                backgroundColor: index === currentIndex ? 'white' : 'rgba(255, 255, 255, 0.5)',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
