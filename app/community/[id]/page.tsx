import { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import { use } from "react";
import CommunityDetailClient from "./CommunityDetailClient";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// 기본 OG 이미지 (섬네일 없을 때 사용)
const DEFAULT_OG_IMAGE = "/og-default.png";
const SITE_NAME = "여주마켓";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://yeoju.market";

// 링크에서 첫 번째 이미지 추출 (링크 프리뷰용)
async function fetchLinkPreviewImage(url: string): Promise<string | null> {
  try {
    const response = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`, {
      next: { revalidate: 3600 } // 1시간 캐시
    });
    const data = await response.json();
    if (data.status === 'success' && data.data) {
      return data.data.image?.url || data.data.logo?.url || null;
    }
  } catch (error) {
    console.error('Link preview fetch error:', error);
  }
  return null;
}

// URL에서 링크 추출
function extractFirstLink(text: string): string | null {
  const match = text?.match(/(https?:\/\/[^\s]+)/);
  return match ? match[0] : null;
}

// 유튜브 썸네일 추출
function getYoutubeThumbnail(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([^&\s?]+)/);
  return match ? `https://img.youtube.com/vi/${match[1]}/maxresdefault.jpg` : null;
}

// 동적 메타데이터 생성
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id: postId } = await params;
  
  // 게시물 조회
  const { data: post } = await supabase
    .from("posts")
    .select("*")
    .eq("id", postId)
    .single();

  if (!post) {
    return {
      title: "게시물을 찾을 수 없습니다 | " + SITE_NAME,
      description: "요청하신 게시물이 존재하지 않습니다.",
    };
  }

  // 제목 (본문 앞 50자)
  const title = post.content?.slice(0, 50)?.replace(/\n/g, ' ') || "커뮤니티 게시물";
  
  // 설명 (본문 앞 150자)
  const description = post.content?.slice(0, 150)?.replace(/\n/g, ' ') || "여주시민들의 소통 공간";

  // 섬네일 결정 (우선순위)
let thumbnail = DEFAULT_OG_IMAGE;

// 1. 영상 썸네일이 있으면 사용
if (post.thumbnail_url) {
  thumbnail = post.thumbnail_url;
}
// 2. 게시물에 첨부된 이미지가 있으면 첫 번째 이미지 사용
else if (post.images && post.images.length > 0) {
  const images = typeof post.images === 'string' ? JSON.parse(post.images) : post.images;
  if (images.length > 0) {
    // 비디오가 아닌 첫 번째 이미지 찾기
    const firstImage = images.find((url: string) => !/\.(mp4|mov|webm|avi)/i.test(url));
    if (firstImage) {
      thumbnail = firstImage;
    }
  }
}
  
  // 2. 이미지가 없고 본문에 링크가 있으면 링크 프리뷰 이미지 사용
  if (thumbnail === DEFAULT_OG_IMAGE && post.content) {
    const firstLink = extractFirstLink(post.content);
    if (firstLink) {
      // 유튜브 링크면 유튜브 썸네일 사용
      const youtubeThumbnail = getYoutubeThumbnail(firstLink);
      if (youtubeThumbnail) {
        thumbnail = youtubeThumbnail;
      } else {
        // 일반 링크면 링크 프리뷰 이미지 가져오기
        const linkImage = await fetchLinkPreviewImage(firstLink);
        if (linkImage) {
          thumbnail = linkImage;
        }
      }
    }
  }

  // 작성자 이름
  const authorName = post.is_anonymous ? "익명" : (post.author_nickname || "사용자");

  const pageUrl = `${SITE_URL}/community/${postId}`;

  return {
    title: `${title} | ${SITE_NAME} 커뮤니티`,
    description,
    authors: [{ name: authorName }],
    openGraph: {
      title: `${title}`,
      description,
      url: pageUrl,
      siteName: SITE_NAME,
      images: [
        {
          url: thumbnail,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      type: "article",
      publishedTime: post.created_at,
      authors: [authorName],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title}`,
      description,
      images: [thumbnail],
      creator: authorName,
    },
    alternates: {
      canonical: pageUrl,
    },
  };
}

// 페이지 컴포넌트 - use()로 params 언래핑
export default function CommunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <CommunityDetailClient postId={id} />;
}