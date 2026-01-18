import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import Providers from "@/components/Providers";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "여주마켓",
  description: "여주시민을 위한 지역 커뮤니티 플랫폼",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "여주마켓",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#121212",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head />
      <body suppressHydrationWarning>
        <Providers>
          {children}
          <Footer />
        </Providers>
        <Script 
          src="https://t1.kakaocdn.net/kakao_js_sdk/2.5.0/kakao.min.js"
          strategy="lazyOnload"
        />
        <Script id="kakao-init" strategy="lazyOnload">
          {`
            setTimeout(function() {
              if (window.Kakao && !window.Kakao.isInitialized()) {
                window.Kakao.init('4fac220a69a6b3040de6ef0fc88a6af9');
              }
            }, 1000);
          `}
        </Script>
      </body>
    </html>
  );
}