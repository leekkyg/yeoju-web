import { createClient } from "@supabase/supabase-js";
import FeedClient from "@/components/feed/FeedClient";

// 캐싱 비활성화 - 항상 최신 데이터 가져오기
export const dynamic = "force-dynamic";
export const revalidate = 0;

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
    noticeResult,
    partnerResult,
  ] = await Promise.all([
    // 메인 배너 광고
    supabase
      .from("ads")
      .select("*")
      .eq("ad_type", "main_banner")
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
      .eq("ad_type", "feed_ad")
      .order("created_at", { ascending: false }),
    // 공지사항
    supabase
      .from("notices")
      .select("*")
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50),
    // 제휴협력사
         supabase
  .from("partners")
  .select("*")
  .order("display_order", { ascending: true }),
  ]);

  return {
    mainBanners: mainBannerResult.data || [],
    posts: postResult.data || [],
    videos: videoResult.data || [],
    feedAds: feedAdResult.data || [],
    notices: noticeResult.data || [],
    partners: partnerResult.data || [],
  };
}

export default async function HomePage() {
  const data = await getFeedData();
  return <FeedClient initialData={data} />;
}
