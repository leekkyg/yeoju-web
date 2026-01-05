"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const categories = ["전체", "자유", "질문", "정보", "일상", "맛집"];

export default function CommunityPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [user, setUser] = useState<any>(null);
  const [expandedPosts, setExpandedPosts] = useState<Set<number>>(new Set());
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  
  // 글쓰기 상태
  const [content, setContent] = useState("");
  const [postCategory, setPostCategory] = useState("자유");
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [posting, setPosting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchPosts();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, [selectedCategory]);

  const fetchPosts = async () => {
    setLoading(true);
    let query = supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (selectedCategory !== "전체") {
      query = query.eq("board_type", selectedCategory);
    }

    const { data } = await query;
    setPosts(data || []);
    setLoading(false);
  };

  const togglePost = (postId: number) => {
    setExpandedPosts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + images.length > 50) {
      alert("이미지는 최대 50장까지 첨부할 수 있습니다");
      return;
    }
    
    setImages([...images, ...files]);
    
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreviews(prev => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
    setImagePreviews(imagePreviews.filter((_, i) => i !== index));
  };

  const uploadImage = async (file: File): Promise<string> => {
    const fileName = `posts/${Date.now()}-${Math.random().toString(36).substring(7)}.${file.name.split('.').pop()}`;
    
    const response = await fetch(`https://yeoju-r2-worker.kkyg9300.workers.dev/${fileName}`, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    });
    
    const data = await response.json();
    return data.url;
  };

  const handlePost = async () => {
    if (!user) {
      alert("로그인이 필요합니다");
      return;
    }
    if (!content.trim()) {
      alert("내용을 입력하세요");
      return;
    }

    setPosting(true);

    try {
      let imageUrls: string[] = [];
      for (const image of images) {
        const url = await uploadImage(image);
        imageUrls.push(url);
      }

      const { error } = await supabase.from("posts").insert({
        title: content.slice(0, 50),
        content: content,
        board_type: postCategory,
        images: imageUrls,
      });

      if (error) throw error;

      setContent("");
      setImages([]);
      setImagePreviews([]);
      setPostCategory("자유");
      
      fetchPosts();
    } catch (error: any) {
      alert("게시 실패: " + error.message);
    }

    setPosting(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;
    return date.toLocaleDateString("ko-KR");
  };

  const getImages = (post: any): string[] => {
    if (!post.images) return [];
    if (typeof post.images === 'string') {
      try {
        return JSON.parse(post.images);
      } catch {
        return [];
      }
    }
    return post.images;
  };

  return (
    <div className="min-h-screen bg-gray-100 pb-24 md:pb-10">
      {/* 이미지 확대 모달 */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <button 
            className="absolute top-4 right-4 text-white text-4xl font-light hover:text-gray-300"
            onClick={() => setLightboxImage(null)}
          >
            ×
          </button>
          <img 
            src={lightboxImage} 
            alt="" 
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* 헤더 */}
      <header className="bg-gray-900 sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-white font-bold text-lg">커뮤니티</h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-4">
        {/* 글쓰기 박스 */}
        {user ? (
          <div className="bg-white rounded-xl p-4 shadow-md mb-4">
            <div className="flex gap-3">
              <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-gray-900 font-bold text-sm">
                  {user.email?.[0]?.toUpperCase() || "U"}
                </span>
              </div>
              <div className="flex-1">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="무슨 생각을 하고 계신가요?"
                  rows={3}
                  className="w-full resize-none border-none focus:outline-none text-gray-900 placeholder-gray-400"
                />
                
                {imagePreviews.length > 0 && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative">
                        <img src={preview} alt="" className="w-20 h-20 object-cover rounded-lg" />
                        <button
                          onClick={() => removeImage(index)}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageSelect}
                      accept="image/*"
                      multiple
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 text-gray-500 hover:text-amber-500 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </button>
                    
                    <select
                      value={postCategory}
                      onChange={(e) => setPostCategory(e.target.value)}
                      className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="자유">자유</option>
                      <option value="질문">질문</option>
                      <option value="정보">정보</option>
                      <option value="일상">일상</option>
                      <option value="맛집">맛집</option>
                    </select>
                  </div>

                  <button
                    onClick={handlePost}
                    disabled={posting || !content.trim()}
                    className="px-4 py-2 bg-amber-500 text-gray-900 font-bold rounded-lg text-sm hover:bg-amber-400 transition-colors disabled:opacity-50"
                  >
                    {posting ? "게시 중..." : "게시"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl p-4 shadow-md mb-4 text-center">
            <p className="text-gray-500 mb-2">로그인하고 글을 작성하세요</p>
            <Link href="/login" className="text-amber-600 font-bold">로그인</Link>
          </div>
        )}

        {/* 카테고리 필터 */}
        <div className="flex gap-1 overflow-x-auto py-2 mb-4">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-colors ${
                selectedCategory === category
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-200"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* 게시글 목록 */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl shadow-md">
            <p className="text-gray-500 font-medium">게시글이 없습니다</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => {
              const isExpanded = expandedPosts.has(post.id);
              const postImages = getImages(post);
              const isLongText = post.content && post.content.length > 100;
              
              return (
                <div
                  key={post.id}
                  className="bg-white rounded-xl p-4 shadow-md"
                >
                  {/* 헤더 */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">U</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 text-sm">익명</span>
                        <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                          {post.board_type || "자유"}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">{formatDate(post.created_at)}</span>
                    </div>
                  </div>
                  
                  {/* 텍스트 내용 */}
                  <div className="mb-3">
                    {isLongText && !isExpanded ? (
                      <>
                        <p className="text-gray-900 whitespace-pre-wrap">{post.content.slice(0, 100)}...</p>
                        <button 
                          onClick={() => togglePost(post.id)}
                          className="text-gray-500 hover:text-gray-700 text-sm font-medium mt-1"
                        >
                          더 보기
                        </button>
                      </>
                    ) : (
                      <>
                        <p className="text-gray-900 whitespace-pre-wrap">{post.content}</p>
                        {isLongText && (
                          <button 
                            onClick={() => togglePost(post.id)}
                            className="text-gray-500 hover:text-gray-700 text-sm font-medium mt-1"
                          >
                            접기
                          </button>
                        )}
                      </>
                    )}
                  </div>
                  
                  {/* 이미지 - 항상 보임 */}
                  {postImages.length > 0 && (
                    <div className={`mb-3 ${
                      postImages.length === 1 ? '' : 
                      postImages.length === 2 ? 'grid grid-cols-2 gap-1' :
                      postImages.length === 3 ? 'grid grid-cols-2 gap-1' :
                      'grid grid-cols-2 gap-1'
                    }`}>
                      {postImages.slice(0, 4).map((imgUrl, idx) => (
                        <div 
                          key={idx} 
                          className={`relative overflow-hidden rounded-lg cursor-pointer ${
                            postImages.length === 3 && idx === 0 ? 'row-span-2' : ''
                          }`}
                          onClick={() => setLightboxImage(imgUrl)}
                        >
                          <img 
                            src={imgUrl} 
                            alt="" 
                            className={`w-full object-cover hover:opacity-90 transition-opacity ${
                              postImages.length === 1 ? 'max-h-96' : 'h-48'
                            }`}
                          />
                          {/* 4장 이상일 때 마지막에 +N 표시 */}
                          {idx === 3 && postImages.length > 4 && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <span className="text-white text-2xl font-bold">+{postImages.length - 4}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 좋아요, 댓글, 조회수 */}
                  <div className="flex items-center gap-4 text-sm text-gray-500 pt-3 border-t border-gray-100">
                    <button className="flex items-center gap-1 hover:text-red-500 transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                      좋아요 {post.like_count || 0}
                    </button>
                    <button className="flex items-center gap-1 hover:text-blue-500 transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      댓글
                    </button>
                    <span className="flex items-center gap-1 ml-auto">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      {post.view_count || 0}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 하단 네비게이션 */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 z-50">
        <div className="flex">
          <Link href="/" className="flex-1 py-3 flex flex-col items-center gap-1">
            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs text-gray-500">홈</span>
          </Link>
          <Link href="/community" className="flex-1 py-3 flex flex-col items-center gap-1">
            <svg className="w-6 h-6 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-xs font-bold text-amber-500">커뮤니티</span>
          </Link>
          <Link href="/market" className="flex-1 py-3 flex flex-col items-center gap-1">
            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <span className="text-xs text-gray-500">마켓</span>
          </Link>
          <Link href="/videos" className="flex-1 py-3 flex flex-col items-center gap-1">
            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs text-gray-500">영상</span>
          </Link>
          <Link href="/login" className="flex-1 py-3 flex flex-col items-center gap-1">
            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-xs text-gray-500">MY</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}