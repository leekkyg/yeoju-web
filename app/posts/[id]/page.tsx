import { createClient } from "@supabase/supabase-js";
import PostDetailClient from "@/components/post/PostDetailClient";
import { notFound } from "next/navigation";

async function getPostData(id: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const now = new Date().toISOString();

  const [postResult, adResult] = await Promise.all([
    // 게시물
    supabase
      .from("posts")
      .select("*")
      .eq("id", id)
      .single(),
    // 글 상세 광고
    supabase
      .from("ads")
      .select("*")
      .eq("position", "post_detail")
      .eq("is_active", true)
      .or(`start_date.is.null,start_date.lte.${now}`)
      .or(`end_date.is.null,end_date.gte.${now}`)
      .order("created_at", { ascending: false }),
  ]);

  if (postResult.error || !postResult.data) {
    return null;
  }

  return {
    post: postResult.data,
    ads: adResult.data || [],
  };
}

export default async function PostDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params;
  const data = await getPostData(id);
  
  if (!data) {
    notFound();
  }

  return <PostDetailClient post={data.post} ads={data.ads} />;
}
