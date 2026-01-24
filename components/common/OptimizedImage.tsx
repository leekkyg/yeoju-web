"use client";

import Image, { ImageProps } from "next/image";
import { useState } from "react";

// 어두운 회색 blur placeholder (흰색 아님)
const BLUR_DATA_URL = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMCwsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAB//2Q==";

interface OptimizedImageProps extends Omit<ImageProps, 'placeholder' | 'blurDataURL' | 'onLoad' | 'onError'> {
  fallback?: React.ReactNode;
}

export default function OptimizedImage({ 
  src, 
  alt = "",
  fallback,
  className = "",
  style,
  ...props 
}: OptimizedImageProps) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // src가 없거나 에러인 경우
  if (!src || error) {
    if (fallback) return <>{fallback}</>;
    return null;
  }

  return (
    <Image
      src={src}
      alt={alt}
      className={`transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'} ${className}`}
      style={{ 
        ...style,
        backgroundColor: '#2a2a2a'  // 로딩 중 어두운 회색 배경
      }}
      onLoad={() => setLoaded(true)}
      onError={() => setError(true)}
      {...props}
    />
  );
}
