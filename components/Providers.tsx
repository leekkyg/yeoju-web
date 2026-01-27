"use client";
import { ReactNode, useEffect } from "react";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { App } from "@capacitor/app";

export default function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Android 뒤로가기 버튼 처리
    App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        App.exitApp();
      }
    });

    return () => {
      App.removeAllListeners();
    };
  }, []);

  return (
    <AuthProvider>
      <ThemeProvider>{children}</ThemeProvider>
    </AuthProvider>
  );
}