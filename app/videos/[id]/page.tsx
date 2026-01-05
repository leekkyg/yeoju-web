"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function VideoDetailPage() {
  const params = useParams();
  const [video, setVideo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVideo();
  }, [params.id]);

  const fetchVideo = async () => {
    const { data } = await supabase
      .from("videos")
      .select("*")
      .eq("id", params.id)
      .single();
    
    if (data) {
      setVideo(data);
      await supabase
        .from("videos")
        .update({ view_count: (data.view_count || 0) + 1 })
        .eq("id", params.id);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <p className="text-gray-500 mb-4">영상을 찾을 수 없습니다</p>
        <Link href="/videos" className="text-green-600 font-medium">
          목록으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white sticky top-0 z-50 border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center">
          <Link href="/videos" className="mr-3">
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="font-bold text-lg text-gray-900 line-clamp-1">{video.title}</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto">
        {/* 비디오 플레이어 */}
        <div className="aspect-video bg-black">
          {video.video_url ? (
            <video
              src={video.video_url}
              controls
              className="w-full h-full"
              poster={video.thumbnail_url}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg className="w-16 h-16 text-white/50" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </div>
          )}
        </div>

        {/* 영상 정보 */}
        <div className="bg-white px-4 py-4">
          <h1 className="text-lg font-bold text-gray-900 mb-2">
            {video.title}
          </h1>
          <p className="text-sm text-gray-500">
            조회수 {video.view_count || 0}회
          </p>
          {video.description && (
            <p className="text-sm text-gray-700 mt-4 whitespace-pre-wrap">
              {video.description}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
