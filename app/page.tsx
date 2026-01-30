import { createClient } from "@supabase/supabase-js";
import FeedClient from "@/components/feed/FeedClient";

// 서버에서 공개 데이터 미리 가져오기
async function getFeedData() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const now = new Date().toISOString();

  const [
    mainBannerResult,
    postResult,
    videoResult,
    feedAdResult,
  ] = await Promise.all([
    // 메인 배너 광고
    supabase
      .from("ads")
      .select("*")
      .eq("position", "home_banner")
      .eq("is_active", true)
      .or(`start_date.is.null,start_date.lte.${now}`)
      .or(`end_date.is.null,end_date.gte.${now}`)
      .order("created_at", { ascending: false }),
    // 게시물
    supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100),
    // 영상
    supabase
      .from("videos")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100),
    // 피드 목록 사이 광고
    supabase
      .from("ads")
      .select("*")
      .eq("position", "feed_list")
      .eq("is_active", true)
      .or(`start_date.is.null,start_date.lte.${now}`)
      .or(`end_date.is.null,end_date.gte.${now}`)
      .order("created_at", { ascending: false }),
  ]);

  return {
    mainBanners: mainBannerResult.data || [],
    posts: postResult.data || [],
    videos: videoResult.data || [],
    feedAds: feedAdResult.data || [],
  };
}

export default async function HomePage() {
  const data = await getFeedData();
  return <FeedClient initialData={data} />;
}
