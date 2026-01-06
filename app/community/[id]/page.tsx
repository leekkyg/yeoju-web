"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function PostDetailPage() {
  const params = useParams();
  const postId = params.id;
  
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  
  // 이미지 슬라이드 상태
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const sliderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (postId) {
      fetchPost();
      incrementViewCount();
    }
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      setUser(user);
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        setUserProfile(profile);
      }
    });
  }, [postId]);

  const fetchPost = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("posts")
      .select("*")
      .eq("id", postId)
      .single();
    setPost(data);
    setLoading(false);
  };

  const incrementViewCount = async () => {
    await supabase.rpc('increment_view_count', { post_id: postId });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getImages = (post: any): string[] => {
    if (!post?.images) return [];
    if (typeof post.images === 'string') {
      try {
        return JSON.parse(post.images);
      } catch {
        return [];
      }
    }
    return post.images;
  };

  // 관리자 여부
  const isAdmin = userProfile?.role === 'admin';

  // 작성자 이름
  const getAuthorName = () => {
    if (!post) return '';
    if (isAdmin) {
      const name = post.author_nickname || '알수없음';
      if (post.is_anonymous) {
        return `익명 (${name})`;
      }
      return name;
    } else {
      if (post.is_anonymous) {
        return '익명';
      }
      return post.author_nickname || '알수없음';
    }
  };

  // 이미지 슬라이드 핸들러
  const handlePrevImage = () => {
    const images = getImages(post);
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    const images = getImages(post);
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  // 터치 스와이프 핸들러
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStart - touchEnd > 75) {
      handleNextImage();
    }
    if (touchStart - touchEnd < -75) {
      handlePrevImage();
    }
  };

  // 공유 기능
  const handleShare = async () => {
    const shareUrl = window.location.href;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: post?.title || '커뮤니티 게시글',
          text: post?.content?.slice(0, 100) || '',
          url: shareUrl,
        });
      } catch (err) {}
    } else {
      await navigator.clipboard.writeText(shareUrl);
      alert('링크가 복사되었습니다!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">게시글을 찾을 수 없습니다</p>
          <Link href="/community" className="text-amber-600 font-bold">목록으로</Link>
        </div>
      </div>
    );
  }

  const postImages = getImages(post);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 헤더 */}
      <header className="bg-gray-900 sticky top-0 z-50">
        <div className="max-w-[631px] mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/community" className="text-gray-400 hover:text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-white font-bold text-lg">게시글</h1>
          </div>
          <button onClick={handleShare} className="text-gray-400 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>
        </div>
      </header>

      <main className="max-w-[631px] mx-auto bg-white min-h-screen">
        {/* 작성자 정보 */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center">
              <span className="text-white font-bold">
                {post.is_anonymous ? '?' : (post.author_nickname?.[0]?.toUpperCase() || 'U')}
              </span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-900">{getAuthorName()}</span>
                {post.is_anonymous && (
                  <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">익명</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">{formatDate(post.created_at)}</span>
                {/* 관리자만 IP 표시 */}
                {isAdmin && post.ip_address && (
                  <span className="text-xs text-red-400">IP: {post.ip_address}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 이미지 슬라이드 */}
        {postImages.length > 0 && (
          <div className="relative bg-black">
            <div 
              ref={sliderRef}
              className="relative overflow-hidden"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <div 
                className="flex transition-transform duration-300 ease-out"
                style={{ transform: `translateX(-${currentImageIndex * 100}%)` }}
              >
                {postImages.map((imgUrl, idx) => (
                  <div key={idx} className="w-full flex-shrink-0">
                    <img 
                      src={imgUrl} 
                      alt={`이미지 ${idx + 1}`}
                      className="w-full max-h-[500px] object-contain"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* 좌우 화살표 (PC용) */}
            {postImages.length > 1 && (
              <>
                <button 
                  onClick={handlePrevImage}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors hidden md:flex"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button 
                  onClick={handleNextImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors hidden md:flex"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}

            {/* 이미지 인디케이터 */}
            {postImages.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                {postImages.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      idx === currentImageIndex ? 'bg-white' : 'bg-white/50'
                    }`}
                  />
                ))}
              </div>
            )}

            {/* 이미지 카운터 */}
            {postImages.length > 1 && (
              <div className="absolute top-4 right-4 bg-black/50 text-white text-sm px-2.5 py-1 rounded-full">
                {currentImageIndex + 1} / {postImages.length}
              </div>
            )}
          </div>
        )}

        {/* 본문 내용 */}
        <div className="p-4">
          <p className="text-gray-900 whitespace-pre-wrap leading-relaxed">{post.content}</p>
        </div>

        {/* 좋아요, 댓글, 조회수 */}
        <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-6 text-sm text-gray-500">
          <button className="flex items-center gap-1.5 hover:text-blue-500 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
            </svg>
            좋아요 {post.like_count || 0}
          </button>
          
          <button className="flex items-center gap-1.5 hover:text-blue-500 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            댓글 {post.comment_count || 0}
          </button>
          
          <span className="flex items-center gap-1.5 ml-auto">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            조회 {post.view_count || 0}
          </span>
        </div>

        {/* 댓글 영역 (추후 구현) */}
        <div className="p-4 border-t border-gray-100">
          <h3 className="font-bold text-gray-900 mb-4">댓글</h3>
          <div className="text-center py-8 text-gray-400">
            <p>아직 댓글이 없습니다</p>
          </div>
        </div>
      </main>
    </div>
  );
}
