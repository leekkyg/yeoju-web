import { createClient } from "@supabase/supabase-js";
import CommunityClient from "@/components/community/CommunityClient";

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

  if (!posts || posts.length === 0) {
    return { posts: [] };
  }

  const userIds = [...new Set(posts.map(p => p.user_id).filter(Boolean))];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, avatar_url")
    .in("id", userIds);

  const profileMap = new Map();
  profiles?.forEach(p => profileMap.set(p.id, p.avatar_url));

  const postsWithAvatar = posts.map(post => ({
    ...post,
    author_avatar_url: profileMap.get(post.user_id) || null
  }));

  return { posts: postsWithAvatar };
}

export default async function CommunityPage() {
  const data = await getCommunityData();
  return <CommunityClient initialPosts={data.posts} />;
}
