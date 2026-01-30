import { createClient } from "@supabase/supabase-js";
import VideoDetailClient from "@/components/video/VideoDetailClient";
import { notFound } from "next/navigation";

async function getVideoData(id: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const now = new Date().toISOString();

  const [videoResult, midAdResult, overlayAdResult] = await Promise.all([
    // 영상 정보
    supabase
      .from("videos")
      .select("*")
      .eq("id", id)
      .single(),
    // 영상 중간 광고
    supabase
      .from("ads")
      .select("*")
      .eq("position", "video_mid")
      .eq("is_active", true)
      .or(`start_date.is.null,start_date.lte.${now}`)
      .or(`end_date.is.null,end_date.gte.${now}`)
      .order("created_at", { ascending: false })
      .limit(3),
    // 영상 오버레이 광고
    supabase
      .from("ads")
      .select("*")
      .eq("position", "video_overlay")
      .eq("is_active", true)
      .or(`start_date.is.null,start_date.lte.${now}`)
      .or(`end_date.is.null,end_date.gte.${now}`)
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  if (videoResult.error || !videoResult.data) {
    return null;
  }

  // 조회수 증가
  await supabase
    .from("videos")
    .update({ view_count: (videoResult.data.view_count || 0) + 1 })
    .eq("id", id);

  return {
    video: videoResult.data,
    midAds: midAdResult.data || [],
    overlayAd: overlayAdResult.data?.[0] || null,
  };
}

export default async function VideoDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params;
  const data = await getVideoData(id);
  
  if (!data) {
    notFound();
  }

  return (
    <VideoDetailClient 
      video={data.video} 
      midAds={data.midAds}
      overlayAd={data.overlayAd}
    />
  );
}
