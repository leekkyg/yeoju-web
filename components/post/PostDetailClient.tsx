"use client";

import Link from "next/link";
import OptimizedImage from "@/components/common/OptimizedImage";
import { useTheme } from "@/contexts/ThemeContext";
import SimpleNav from "@/components/SimpleNav";
import { ArrowLeft } from "lucide-react";

interface PostDetailClientProps {
  post: any;
  ads: any[];
}

// URL 유효성 검사 함수
function isValidUrl(url: string | undefined | null): boolean {
  if (!url || typeof url !== 'string' || url.trim() === '') return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export default function PostDetailClient({ post, ads }: PostDetailClientProps) {
  const { theme, mounted } = useTheme();

  const isHtmlContent = post.content?.includes("<") && post.content?.includes(">");
  
  // 이미지 URL 유효성 검사 추가
  const mainImage = isValidUrl(post.images?.[0]) ? post.images[0] : null;

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
        <header className="sticky top-0 z-50 px-4 py-3 flex items-center gap-3" style={{ backgroundColor: theme.bgMain, borderBottom: `1px solid ${theme.borderLight}` }}>
          <button onClick={() => window.history.back()} className="p-1">
            <ArrowLeft className="w-6 h-6" style={{ color: theme.textPrimary }} />
          </button>
          <h1 className="text-lg font-bold flex-1 truncate" style={{ color: theme.textPrimary }}>게시글</h1>
        </header>

                <main className="pb-20 px-4 pt-4">
          <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}>
            {mainImage && (
              <div className="aspect-video relative">
                <OptimizedImage src={mainImage} alt={post.title} fill sizes="631px" className="object-cover" priority />
              </div>
            )}

            <article className="px-4 py-4">

            <h1 className="text-xl font-bold mb-2" style={{ color: theme.textPrimary }}>{post.title}</h1>
            <div className="flex items-center gap-2 text-sm mb-4" style={{ color: theme.textMuted }}>
              <span>{formatDate(post.created_at)}</span>
              {post.view_count > 0 && (<><span>•</span><span>조회 {post.view_count}</span></>)}
            </div>

            {isHtmlContent ? (
              <div className="prose prose-sm max-w-none post-content" style={{ color: theme.textSecondary, lineHeight: "1.8" }} dangerouslySetInnerHTML={{ __html: post.content }} />
            ) : (
              <p className="text-[15px] leading-relaxed whitespace-pre-wrap" style={{ color: theme.textSecondary }}>{post.content}</p>
            )}

            {ads.length > 0 && isValidUrl(ads[0].image_url) && (
              <div className="mt-6">
                <Link href={ads[0].link_url || "#"} className="block rounded-xl overflow-hidden">
                  <OptimizedImage src={ads[0].image_url} alt={ads[0].title || "광고"} width={600} height={150} className="w-full object-cover" />
                </Link>
                <p className="text-[10px] text-center mt-1" style={{ color: theme.textMuted }}>광고</p>
              </div>
            )}
                      </article>
          </div>

          <style jsx global>{`

            .post-content img { max-width: 100% !important; width: 100% !important; height: auto !important; display: block !important; margin: 16px 0 !important; border-radius: 8px !important; }
            .post-content p { margin-bottom: 16px; }
            .post-content b, .post-content strong { font-weight: 600; }
            .post-content ul, .post-content ol { margin-left: 20px; margin-bottom: 16px; }
            .post-content li { margin-bottom: 4px; }
          `}</style>
        </main>

                <SimpleNav />

      </div>
    </div>
  );
}
