"use client";

import { useRef } from "react";

interface VideoPlayerProps {
  src: string;
  poster?: string;
  className?: string;
}

export default function VideoPlayer({ src, poster, className }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  return (
    <video
      ref={videoRef}
      src={src}
      poster={poster}
      controls
      className={className || "w-full rounded-lg"}
      playsInline
    />
  );
}
