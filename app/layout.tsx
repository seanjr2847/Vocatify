import type { Metadata } from "next";
import { Quicksand, Noto_Sans_KR } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { MusicPlayerProvider } from "@/lib/MusicPlayerContext";
import { Toaster } from "sonner";

const quicksand = Quicksand({
  subsets: ["latin"],
  variable: "--font-quicksand",
});

const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-sans-kr",
});

export const metadata: Metadata = {
  title: "Vocatify - 보컬로이드 음악 차트",
  description: "트렌딩 보컬로이드 음악과 차트를 발견하세요",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${quicksand.variable} ${notoSansKr.variable} font-sans`} style={{ fontFamily: 'var(--font-noto-sans-kr), var(--font-quicksand), sans-serif' }}>
        <MusicPlayerProvider>
          {children}
          <Toaster richColors position="top-center" />
        </MusicPlayerProvider>
        <Analytics />
      </body>
    </html>
  );
}
