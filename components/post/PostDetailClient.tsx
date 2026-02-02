"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import OptimizedImage from "@/components/common/OptimizedImage";
import { useTheme } from "@/contexts/ThemeContext";
import Header from "@/components/Header";
import { Clock, Eye, FileText } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

interface PostDetailClientProps {
  post: any;
  ads: any[];
}

// URL 유효성 검사 함수
const isValidUrl = (url: string | undefined | null): boolean => {
  if (!url || typeof url !== 'string') return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export default function PostDetailClient({ post, ads }: PostDetailClientProps) {
  const { theme, isDark, mounted } = useTheme();
  const [relatedPosts, setRelatedPosts] = useState<any[]>([]);

  const isHtmlContent = post.content?.includes("<") && post.content?.includes(">");
  const rawImage = post.images?.[0];
  const mainImage = isValidUrl(rawImage) ? rawImage : null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // 관련 게시물 가져오기
  useEffect(() => {
    const fetchRelatedPosts = async () => {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      
      const { data } = await supabase
        .from("posts")
        .select("id, title, images, created_at")
        .neq("id", post.id)
        .order("created_at", { ascending: false })
        .limit(6);
      
      if (data) setRelatedPosts(data);
    };
    
    fetchRelatedPosts();
  }, [post.id]);

  if (!mounted) {
    return <div className="min-h-screen bg-[#252529]"><div className="max-w-[631px] mx-auto" /></div>;
  }

  return (
    <div className="min-h-screen transition-colors duration-300" style={{ backgroundColor: theme.bgMain }}>
      <div className="max-w-[631px] mx-auto">
        {/* 공통 헤더 */}
        <Header showHome={true} showThemeToggle={true} showNotification={true} />

        <main className="pb-8">
          {/* PC: 카드 스타일 / 모바일: 꽉 차게 */}
          <div className="md:px-4 md:pt-4">
            <div 
              className="md:rounded-2xl md:overflow-hidden"
              style={{ backgroundColor: theme.bgCard || theme.bgMain }}
            >
              {/* 대표 이미지 */}
              {mainImage && (
                <div className="aspect-video relative w-full">
                  <OptimizedImage 
                    src={mainImage} 
                    alt={post.title} 
                    fill 
                    sizes="(max-width: 768px) 100vw, 631px" 
                    className="object-cover" 
                    priority 
                  />
                </div>
              )}

              {/* 텍스트 영역 */}
              <article className="px-4 py-5">
                <h1 className="text-xl font-extrabold mb-3 leading-tight" style={{ color: theme.textPrimary }}>
                  {post.title}
                </h1>
                
                <div className="flex items-center gap-4 text-xs mb-5" style={{ color: theme.textMuted }}>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {formatDate(post.created_at)}
                  </span>
                  {post.view_count > 0 && (
                    <span className="flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" />
                      {post.view_count}
                    </span>
                  )}
                </div>

                {isHtmlContent ? (
                  <div 
                    className="prose prose-sm max-w-none post-content" 
                    style={{ color: theme.textSecondary, lineHeight: "1.8" }} 
                    dangerouslySetInnerHTML={{ __html: post.content }} 
                  />
                ) : (
                  <p className="text-[15px] leading-relaxed whitespace-pre-wrap" style={{ color: theme.textSecondary }}>
                    {post.content}
                  </p>
                )}
              </article>
            </div>
          </div>

          {/* 광고 */}
          {ads.length > 0 && isValidUrl(ads[0].image_url) && (
            <div className="mt-4 md:px-4">
              <Link href={ads[0].link_url || "#"} className="block md:rounded-xl md:overflow-hidden">
                <OptimizedImage 
                  src={ads[0].image_url} 
                  alt={ads[0].title || "광고"} 
                  width={631} 
                  height={150} 
                  className="w-full object-cover" 
                />
              </Link>
              <p className="text-[10px] text-center mt-1 px-4" style={{ color: theme.textMuted }}>광고</p>
            </div>
          )}

                   {/* Livere 댓글 */}
          <div className="mt-6 px-4">
            <h3 className="text-base font-bold mb-4" style={{ color: theme.textPrimary }}>댓글</h3>
            <div 
              className="rounded-xl overflow-hidden" 
              style={{ 
                backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
                border: `1px solid ${theme.borderLight}` 
              }}
            >
              <div 
                id="livere-comments"
                style={{
                  filter: isDark ? 'invert(1) hue-rotate(180deg)' : 'none',
                }}
                dangerouslySetInnerHTML={{
                  __html: `<livere-comment client-id="gSoyK4WDjal75heUDfIB" article-id="${post.id}"></livere-comment><script type="module" src="https://www.livere.org/livere-widget.js"><\/script>`
                }}
              />
            </div>
          </div>

          <Script 
            src="https://www.livere.org/livere-widget.js" 
            strategy="lazyOnload"
            type="module"
          />

          {/* 관련 글 목록 */}
          <div className="mt-8 px-4">
            <h3 className="text-base font-bold mb-4" style={{ color: theme.textPrimary }}>다른 게시물</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {relatedPosts.map((relatedPost) => (
                <Link 
                  key={relatedPost.id} 
                  href={`/posts/${relatedPost.id}`}
                  className="rounded-xl overflow-hidden transition-transform hover:scale-[1.02]"
                  style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}
                >
                  <div className="aspect-video relative" style={{ backgroundColor: theme.bgInput }}>
                    {isValidUrl(relatedPost.images?.[0]) ? (
                      <OptimizedImage 
                        src={relatedPost.images[0]} 
                        alt={relatedPost.title} 
                        fill 
                        sizes="200px" 
                        className="object-cover" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FileText className="w-8 h-8" style={{ color: theme.textMuted }} strokeWidth={1} />
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <h4 className="text-[11px] font-medium line-clamp-2" style={{ color: theme.textPrimary }}>
                      {relatedPost.title}
                    </h4>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <style jsx global>{`
            .post-content img { 
              max-width: 100% !important; 
              width: 100% !important; 
              height: auto !important; 
              display: block !important; 
              margin: 16px 0 !important; 
              border-radius: 8px !important; 
            }
            .post-content p { margin-bottom: 16px; }
            .post-content b, .post-content strong { font-weight: 600; }
            .post-content ul, .post-content ol { margin-left: 20px; margin-bottom: 16px; }
            .post-content li { margin-bottom: 4px; }
            .post-content a { color: #3b82f6; text-decoration: underline; }
            .post-content a:hover { color: #2563eb; }
            .post-content .link-preview {
              display: block;
              border: 1px solid rgba(255,255,255,0.1);
              border-radius: 12px;
              overflow: hidden;
              margin: 16px 0;
              text-decoration: none;
            }
            .post-content .link-preview img {
              margin: 0 !important;
              border-radius: 0 !important;
            }
          `}</style>
        </main>
      </div>
    </div>
  );
}
