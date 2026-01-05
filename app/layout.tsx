import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "여주마켓 - 여주시민의 따뜻한 커뮤니티",
  description: "여주시민을 위한 지역 커뮤니티, 마켓, 영상 플랫폼",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}
