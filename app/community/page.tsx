import { createClient } from "@supabase/supabase-js";
import CommunityClient from "@/components/community/CommunityClient";

// 서버에서 게시글 데이터 미리 가져오기
async function getCommunityData() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: posts, error } = await supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching posts:", error);
    return { posts: [] };
  }

  return {
    posts: posts || [],
  };
}

export default async function CommunityPage() {
  const data = await getCommunityData();
  
  return <CommunityClient initialPosts={data.posts} />;
}
