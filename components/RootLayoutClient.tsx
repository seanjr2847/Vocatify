"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { TopNavigation } from "@/components/TopNavigation";
import { MusicPlayerSection } from "@/components/MusicPlayerSection";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { ReactNode } from "react";

// 배너 설정 - 여기서 배너 내용을 수정하세요
const BANNER_CONFIG = {
  enabled: true,
  id: "2024-02-launch", // 새 공지마다 ID 변경 필요
  message: "Vocatify에 오신 것을 환영합니다! 보컬로이드 음악을 발견하세요.",
  link: {
    text: "더 알아보기",
    href: "/about",
  },
  variant: "info" as const,
};

export function RootLayoutClient({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // Hide sidebar and top navigation on auth pages
  const isAuthPage = pathname === "/signin";

  return (
    <>
      {/* Announcement Banner - Top of page */}
      {BANNER_CONFIG.enabled && !isAuthPage && (
        <AnnouncementBanner
          id={BANNER_CONFIG.id}
          message={BANNER_CONFIG.message}
          link={BANNER_CONFIG.link}
          variant={BANNER_CONFIG.variant}
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
