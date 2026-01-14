import { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import NoticeDetailClient from "./NoticeDetailClient";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const DEFAULT_OG_IMAGE = "/og-default.png";
const SITE_NAME = "여주마켓";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://yeoju.market";

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const noticeId = params.id;
  
  const { data: notice } = await supabase
    .from("notices")
    .select("*")
    .eq("id", noticeId)
    .single();

  if (!notice) {
    return {
      title: "공지사항을 찾을 수 없습니다 | " + SITE_NAME,
      description: "요청하신 공지사항이 존재하지 않습니다.",
    };
  }

  const title = notice.title || "공지사항";
  const description = notice.content?.slice(0, 150)?.replace(/\n/g, ' ') || "여주마켓 공지사항";

  // 섬네일 결정
  let thumbnail = DEFAULT_OG_IMAGE;
  if (notice.images && notice.images.length > 0) {
    const images = typeof notice.images === 'string' ? JSON.parse(notice.images) : notice.images;
    if (images.length > 0) {
      thumbnail = images[0];
    }
  }

  const pageUrl = `${SITE_URL}/notices/${noticeId}`;

  return {
    title: `${title} | ${SITE_NAME}`,
    description,
    openGraph: {
      title: `📢 ${title}`,
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
      publishedTime: notice.created_at,
    },
    twitter: {
      card: "summary_large_image",
      title: `📢 ${title}`,
      description,
      images: [thumbnail],
    },
    alternates: {
      canonical: pageUrl,
    },
  };
}

export default function NoticeDetailPage({ params }: { params: { id: string } }) {
  return <NoticeDetailClient noticeId={params.id} />;
}
