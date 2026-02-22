"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function NotificationSettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [settings, setSettings] = useState({
    push_enabled: true,
    notify_new_post: true,
    notify_comment: true,
    notify_reply: true,
    notify_like: false,
    notify_follow: true,
  });

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => { const user = session?.user;
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);
      fetchSettings(user.id);
    });
  }, []);

  const fetchSettings = async (userId: string) => {
    setLoading(true);
    
    const { data } = await supabase
      .from("notification_settings")
      .select("*")
      .eq("user_id", userId)
      .single();
    
    if (data) {
      setSettings({
        push_enabled: data.push_enabled ?? true,
        notify_new_post: data.notify_new_post ?? true,
        notify_comment: data.notify_comment ?? true,
        notify_reply: data.notify_reply ?? true,
        notify_like: data.notify_like ?? false,
        notify_follow: data.notify_follow ?? true,
      });
    }
    
    setLoading(false);
  };

  const handleToggle = (key: keyof typeof settings) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const saveSettings = async () => {
    if (!user) return;
    
    setSaving(true);
    
    try {
      const { error } = await supabase
        .from("notification_settings")
        .upsert({
          user_id: user.id,
          ...settings,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        });
      
      if (error) throw error;
      
      alert('설정이 저장되었습니다');
    } catch (error: any) {
      alert('저장 실패: ' + error.message);
    }
    
    setSaving(false);
  };

  const ToggleSwitch = ({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) => (
    <button
      onClick={onToggle}
      className={`relative w-12 h-7 rounded-full transition-colors ${
        enabled ? 'bg-amber-500' : 'bg-gray-300'
      }`}
    >
      <div
        className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-24 md:pb-10">
      {/* 헤더 */}
      <header className="bg-gray-900 sticky top-0 z-50">
        <div className="max-w-[631px] mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/notifications" className="text-gray-400 hover:text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-white font-bold text-lg">알림 설정</h1>
          </div>
        </div>
      </header>

      <main className="max-w-[631px] mx-auto px-4 py-4">
        {/* 푸시 알림 전체 */}
        <div className="bg-white rounded-xl p-4 shadow-md mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-900">푸시 알림</h3>
              <p className="text-sm text-gray-500">앱을 사용하지 않을 때도 알림 받기</p>
            </div>
            <ToggleSwitch 
              enabled={settings.push_enabled} 
              onToggle={() => handleToggle('push_enabled')} 
            />
          </div>
        </div>

        {/* 알림 항목 */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-900">알림 받을 항목</h3>
          </div>
          
          {/* 팔로우한 사람의 새 글 */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">팔로우한 사람의 새 글</p>
                <p className="text-xs text-gray-500">팔로우한 사람이 글을 올리면 알림</p>
              </div>
            </div>
            <ToggleSwitch 
              enabled={settings.notify_new_post} 
              onToggle={() => handleToggle('notify_new_post')} 
            />
          </div>

          {/* 내 글에 댓글 */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">내 글에 댓글</p>
                <p className="text-xs text-gray-500">누군가 내 글에 댓글을 남기면 알림</p>
              </div>
            </div>
            <ToggleSwitch 
              enabled={settings.notify_comment} 
              onToggle={() => handleToggle('notify_comment')} 
            />
          </div>

          {/* 내 댓글에 답글 */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">내 댓글에 답글</p>
                <p className="text-xs text-gray-500">누군가 내 댓글에 답글을 남기면 알림</p>
              </div>
            </div>
            <ToggleSwitch 
              enabled={settings.notify_reply} 
              onToggle={() => handleToggle('notify_reply')} 
            />
          </div>

          {/* 좋아요 */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">좋아요</p>
                <p className="text-xs text-gray-500">내 글/댓글에 좋아요가 달리면 알림</p>
              </div>
            </div>
            <ToggleSwitch 
              enabled={settings.notify_like} 
              onToggle={() => handleToggle('notify_like')} 
            />
          </div>

          {/* 새 팔로워 */}
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">새 팔로워</p>
                <p className="text-xs text-gray-500">누군가 나를 팔로우하면 알림</p>
              </div>
            </div>
            <ToggleSwitch 
              enabled={settings.notify_follow} 
              onToggle={() => handleToggle('notify_follow')} 
            />
          </div>
        </div>

        {/* 저장 버튼 */}
        <button
          onClick={saveSettings}
          disabled={saving}
          className="w-full mt-6 py-4 bg-amber-500 text-gray-900 font-bold rounded-xl hover:bg-amber-400 transition-colors disabled:opacity-50"
        >
          {saving ? '저장 중...' : '설정 저장'}
        </button>
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
            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-xs text-gray-500">커뮤니티</span>
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
          <Link href="/mypage" className="flex-1 py-3 flex flex-col items-center gap-1">
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
