import NoticeDetailClient from "./NoticeDetailClient";

export default async function NoticeDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const resolvedParams = await params;
  const id = resolvedParams.id;
  
  return <NoticeDetailClient noticeId={id} />;
}
