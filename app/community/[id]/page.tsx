"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function PostDetailPage() {
  const params = useParams();
  const [post, setPost] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [user, setUser] = useState<any>(null);
  const [midAds, setMidAds] = useState<any[]>([]);

  useEffect(() => {
    fetchPost();
    fetchComments();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, [params.id]);

  const fetchPost = async () => {
    const { data } = await supabase
      .from("posts")
      .select("*")
      .eq("id", params.id)
      .single();

    if (data) {
      setPost(data);
      await supabase
        .from("posts")
        .update({ view_count: (data.view_count || 0) + 1 })
        .eq("id", params.id);
    }
    setLoading(false);
  };

  const fetchComments = async () => {
    const { data } = await supabase
      .from("comments")
      .select("*, profiles(nickname)")
      .eq("post_id", params.id)
      .order("created_at", { ascending: true });
    setComments(data || []);
  };

  // 게시물 중간 광고 모두 가져오기 (타겟팅 적용)
  const fetchMidAds = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from("ads")
      .select("*")
      .eq("position", "post_mid")
      .eq("is_active", true)
      .or(`start_date.is.null,start_date.lte.${today}`)
      .or(`end_date.is.null,end_date.gte.${today}`);
    
    if (data && data.length > 0 && post) {
      // 타겟팅 필터링
      const filteredAds = data.filter(ad => {
        // 타겟 타입이 없거나 all이면 모든 곳에 표시
        if (!ad.target_type || ad.target_type === "all") return true;
        
        // 카테고리 타겟팅
        if (ad.target_type === "category" && ad.target_categories?.length) {
          return ad.target_categories.includes(post.category);
        }
        
        // 게시물 ID 타겟팅
        if (ad.target_type === "post" && ad.target_post_ids?.length) {
          return ad.target_post_ids.includes(String(post.id));
        }
        
        // 페이지 타겟팅 (게시물 상세는 community 페이지)
        if (ad.target_type === "page" && ad.target_pages?.length) {
          return ad.target_pages.includes("community");
        }
        
        return true;
      });

      // 고정 광고 먼저, 나머지 랜덤 셔플
      const pinned = filteredAds.filter(ad => ad.is_pinned).sort((a, b) => (a.pin_order || 0) - (b.pin_order || 0));
      const random = shuffleArray(filteredAds.filter(ad => !ad.is_pinned));
      setMidAds([...pinned, ...random]);
    }
  };

  // post가 로드된 후 광고 가져오기
  useEffect(() => {
    if (post) {
      fetchMidAds();
    }
  }, [post]);

  // Fisher-Yates 셔플 알고리즘
  const shuffleArray = (array: any[]) => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    await supabase.from("comments").insert({
      post_id: params.id,
      user_id: user.id,
      content: newComment,
    });

    setNewComment("");
    fetchComments();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // 본문을 단락으로 나누고 중간에 여러 광고 삽입
  const renderContentWithAds = (content: string) => {
    if (!content) return null;
    
    // 줄바꿈 기준으로 단락 분리
    const paragraphs = content.split('\n').filter(p => p.trim());
    
    // 광고가 없으면 그냥 본문만 출력
    if (midAds.length === 0) {
      return (
        <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">
          {content}
        </div>
      );
    }
    
    // 몇 단락마다 광고를 넣을지 (기본: 3단락마다)
    const AD_INTERVAL = 3;
    
    // 표시할 광고 개수 계산
    const maxAdsToShow = Math.floor(paragraphs.length / AD_INTERVAL);
    const adsToShow = Math.min(maxAdsToShow, midAds.length);
    
    // 광고가 들어갈 위치 계산
    const adPositions: number[] = [];
    for (let i = 0; i < adsToShow; i++) {
      adPositions.push((i + 1) * AD_INTERVAL);
    }
    
    // 단락과 광고를 조합하여 렌더링
    const result: JSX.Element[] = [];
    let adIndex = 0;
    
    paragraphs.forEach((paragraph, index) => {
      result.push(
        <p key={`p-${index}`} className="text-gray-700 leading-relaxed mb-4">
          {paragraph}
        </p>
      );
      
      if (adPositions.includes(index + 1) && adIndex < adsToShow) {
        result.push(renderAdBanner(midAds[adIndex], adIndex));
        adIndex++;
      }
    });
    
    return <>{result}</>;
  };

  // 광고 배너 렌더링
  const renderAdBanner = (ad: any, index: number) => {
    if (!ad) return null;
    
    return (
      <a 
        key={`ad-${ad.id}-${index}`}
        href={ad.link_url || "#"}
        target="_blank"
        rel="noopener noreferrer"
        className="block my-6"
      >
        <div className="relative rounded-xl overflow-hidden bg-gray-100">
          <div className="absolute top-2 left-2 bg-gray-800/70 text-white text-[10px] font-medium px-1.5 py-0.5 rounded z-10">
            AD
          </div>
          
          {ad.image_url ? (
            <img 
              src={ad.image_url} 
              alt={ad.title}
              className="w-full h-auto"
            />
          ) : (
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-6 text-center">
              <p className="text-white font-bold text-lg">{ad.title}</p>
            </div>
          )}
        </div>
      </a>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <p className="text-gray-500 mb-4">게시글을 찾을 수 없습니다</p>
        <Link href="/community" className="text-emerald-600 font-medium">
          목록으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 헤더 */}
      <header className="bg-white sticky top-0 z-50 border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center">
          <Link href="/community" className="mr-3">
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="font-bold text-lg text-gray-900">게시글</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto">
        {/* 게시글 내용 */}
        <article className="bg-white">
          <div className="px-4 py-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                {post.category || "자유"}
              </span>
              <span className="text-xs text-gray-400">
                {formatDate(post.created_at)}
              </span>
            </div>

            <h1 className="text-xl font-bold text-gray-900 mb-4">
              {post.title}
            </h1>

            {post.image_url && (
              <div className="mb-4 rounded-lg overflow-hidden">
                <img src={post.image_url} alt="" className="w-full" />
              </div>
            )}

            {/* 본문 + 중간 광고들 (랜덤) */}
            {renderContentWithAds(post.content)}

            {/* 통계 */}
            <div className="flex items-center gap-4 mt-6 pt-4 border-t border-gray-100 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                조회 {post.view_count || 0}
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                좋아요 {post.like_count || 0}
              </span>
            </div>
          </div>
        </article>

        {/* 댓글 */}
        <section className="bg-white mt-2">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">댓글 {comments.length}개</h2>
          </div>

          {comments.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {comments.map((comment) => (
                <div key={comment.id} className="px-4 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-medium">
                      {comment.profiles?.nickname?.[0] || "익"}
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {comment.profiles?.nickname || "익명"}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatDate(comment.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 pl-9">
                    {comment.content}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-4 py-8 text-center text-gray-400 text-sm">
              첫 댓글을 남겨보세요
            </div>
          )}

          {/* 댓글 입력 */}
          {user ? (
            <form onSubmit={handleSubmitComment} className="px-4 py-3 border-t border-gray-100">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="댓글을 입력하세요"
                  className="flex-1 px-4 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-full text-sm font-medium"
                >
                  등록
                </button>
              </div>
            </form>
          ) : (
            <div className="px-4 py-4 border-t border-gray-100 text-center">
              <Link href="/login" className="text-emerald-600 text-sm font-medium">
                로그인하고 댓글 작성하기
              </Link>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
