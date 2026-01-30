"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // 초기 세션 복원
    const initSession = async () => {
      try {
        // 1. 저장된 세션 가져오기
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("세션 복원 에러:", error);
        }

        if (mounted) {
          if (session) {
            setSession(session);
            setUser(session.user);
            
            // 2. 세션이 있으면 토큰 갱신 시도 (만료 방지)
            const { data: refreshData } = await supabase.auth.refreshSession();
            if (refreshData.session) {
              setSession(refreshData.session);
              setUser(refreshData.session.user);
            }
          }
          setLoading(false);
        }
      } catch (err) {
        console.error("세션 초기화 실패:", err);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initSession();

    // 세션 변경 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        console.log("Auth 이벤트:", event);

        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          setSession(session);
          setUser(session?.user ?? null);
        } else if (event === "SIGNED_OUT") {
          setSession(null);
          setUser(null);
        } else {
          setSession(session);
          setUser(session?.user ?? null);
        }
        
        setLoading(false);
      }
    );

    // 브라우저 포커스 시 세션 체크 (탭 전환 후 복귀 시)
    const handleFocus = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && mounted) {
        // 세션 갱신 시도
        const { data } = await supabase.auth.refreshSession();
        if (data.session) {
          setSession(data.session);
          setUser(data.session.user);
        }
      }
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
