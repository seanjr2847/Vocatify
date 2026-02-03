"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { TopNavigation } from "@/components/TopNavigation";
import { MusicPlayerSection } from "@/components/MusicPlayerSection";
import { AdBanner } from "@/components/AdBanner";
import { ReactNode } from "react";

// 광고 배너 설정
const AD_BANNER_CONFIG = {
  enabled: true,
  id: "main-banner-v1",
  imageUrl: "/banners/top-banner.png",      // 데스크탑 배너 이미지 (970x90 권장)
  mobileImageUrl: "/banners/top-banner-mobile.png", // 모바일 배너 이미지 (320x50 권장)
  linkUrl: "/about",                         // 클릭 시 이동할 링크
  alt: "Vocatify 배너",
  height: 90,
  closeable: true,
  external: false,                           // 외부 링크면 true
};

export function RootLayoutClient({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // Hide sidebar and top navigation on auth pages
  const isAuthPage = pathname === "/signin";

  return (
    <>
      {/* Ad Banner - Top of page */}
      {AD_BANNER_CONFIG.enabled && !isAuthPage && (
        <AdBanner
          id={AD_BANNER_CONFIG.id}
          imageUrl={AD_BANNER_CONFIG.imageUrl}
          mobileImageUrl={AD_BANNER_CONFIG.mobileImageUrl}
          linkUrl={AD_BANNER_CONFIG.linkUrl}
          alt={AD_BANNER_CONFIG.alt}
          height={AD_BANNER_CONFIG.height}
          closeable={AD_BANNER_CONFIG.closeable}
          external={AD_BANNER_CONFIG.external}
        />
      )}

      <div className="flex min-h-screen bg-black">
        {!isAuthPage && <Sidebar />}
        <div className="flex-1 flex flex-col">
          {!isAuthPage && <TopNavigation />}
          <div className="flex-1">
            {children}
          </div>
        </div>
      </div>

      {/* Music Player - Always visible on all pages */}
      <MusicPlayerSection />
    </>
  );
}
