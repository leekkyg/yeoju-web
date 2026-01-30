"use client";

import Link from "next/link";
import OptimizedImage from "@/components/common/OptimizedImage";
import { useTheme } from "@/contexts/ThemeContext";
import BottomNav from "@/components/BottomNav";
import { ArrowLeft, Clock, Eye } from "lucide-react";

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
  const { theme, mounted } = useTheme();

  const isHtmlContent = post.content?.includes("<") && post.content?.includes(">");
  
  // 이미지 URL 유효성 검사 적용
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

  if (!mounted) {
    return <div className="min-h-screen bg-[#252529]"><div className="max-w-[631px] mx-auto" /></div>;
  }

  return (
    <div className="min-h-screen transition-colors duration-300" style={{ backgroundColor: theme.bgMain }}>
      <div className="max-w-[631px] mx-auto">
        {/* 헤더 */}
        <header className="sticky top-0 z-50 px-4 py-3 flex items-center gap-3" style={{ backgroundColor: theme.bgMain, borderBottom: `1px solid ${theme.borderLight}` }}>
          <button onClick={() => window.history.back()} className="p-1">
            <ArrowLeft className="w-6 h-6" style={{ color: theme.textPrimary }} />
          </button>
          <h1 className="text-lg font-bold flex-1 truncate" style={{ color: theme.textPrimary }}>게시글</h1>
        </header>

        <main className="pb-20">
          {/* PC: 카드 스타일 / 모바일: 꽉 차게 */}
          <div className="md:px-4 md:pt-4">
            <div 
              className="md:rounded-2xl md:overflow-hidden"
              style={{ 
                backgroundColor: theme.bgCard || theme.bgMain,
              }}
            >
              {/* 대표 이미지 - 모바일: 꽉 참, PC: 카드 내부 */}
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

              {/* 텍스트 영역 - 양쪽 여백 있음 */}
              <article className="px-4 py-5">
                {/* 제목 - 굵게 */}
                <h1 className="text-xl font-extrabold mb-3 leading-tight" style={{ color: theme.textPrimary }}>
                  {post.title}
                </h1>
                
                {/* 날짜 & 조회수 - 아이콘 + 작은 텍스트 */}
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

                {/* 본문 내용 */}
                {isHtmlContent ? (
                  <div 
                    className="prose prose-sm max-w-none post-content" 
                    style={{ color: theme.textSecondary, lineHeight: "1.8" }} 
                    dangerouslySetInnerHTML={{ __html: post.content }} 
                  />
                ) : (
                  <p 
                    className="text-[15px] leading-relaxed whitespace-pre-wrap" 
                    style={{ color: theme.textSecondary }}
                  >
                    {post.content}
                  </p>
                )}
              </article>
            </div>
          </div>

          {/* 광고 - 모바일: 꽉 참, PC: 여백 */}
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
            .post-content a { 
              color: #3b82f6; 
              text-decoration: underline; 
            }
            .post-content a:hover { 
              color: #2563eb; 
            }
            /* 링크 프리뷰 카드 */
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
            .post-content .link-preview-info {
              padding: 12px;
            }
            .post-content .link-preview-title {
              font-weight: 600;
              margin-bottom: 4px;
            }
            .post-content .link-preview-desc {
              font-size: 13px;
              opacity: 0.7;
            }
          `}</style>
        </main>

        <BottomNav />
      </div>
    </div>
  );
}
