import { createClient } from "@supabase/supabase-js";
import HomeClient from "@/components/home/HomeClient";

// 서버에서 공개 데이터 미리 가져오기
async function getHomeData() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const now = new Date().toISOString();

  // 모든 공개 데이터 병렬로 가져오기
  const [
    mainBannerResult,
    subBannerResult,
    gbResult,
    postResult,
    noticeResult,
    newsResult,
    videoResult,
  ] = await Promise.all([
    // 메인 배너
    supabase
      .from("ads")
      .select("*")
      .eq("position", "home_banner")
      .eq("is_active", true)
      .or(`start_date.is.null,start_date.lte.${now}`)
      .or(`end_date.is.null,end_date.gte.${now}`)
      .order("created_at", { ascending: false }),
    // 서브 배너
    supabase
      .from("sub_banners")
      .select("*")
      .eq("is_active", true)
      .or(`start_date.is.null,start_date.lte.${now}`)
      .or(`end_date.is.null,end_date.gte.${now}`)
      .order("sort_order", { ascending: true }),
    // 공동구매 + 상점 정보 (JOIN)
    supabase
      .from("group_buys")
      .select("*, shops:shop_id(id, name, logo_url)")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(6),
    // 게시물 + 프로필 정보 (JOIN)
    supabase
      .from("posts")
      .select("*, profiles:user_id(id, nickname, avatar_url)")
      .order("created_at", { ascending: false })
      .limit(3),
    // 공지사항
    supabase
      .from("notices")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(3),
    // 뉴스
    supabase
      .from("news")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(3),
    // 영상
    supabase
      .from("videos")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(4),
  ]);

  return {
    mainBanners: mainBannerResult.data || [],
    subBanners: subBannerResult.data || [],
    groupBuys: gbResult.data || [],
    posts: postResult.data || [],
    notices: noticeResult.data || [],
    news: newsResult.data || [],
    videos: videoResult.data || [],
  };
}

export default async function HomePage() {
  const data = await getHomeData();
  
  return <HomeClient initialData={data} />;
}
