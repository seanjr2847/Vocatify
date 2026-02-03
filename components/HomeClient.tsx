"use client";

import React from "react";
import { NavigationSection } from "@/components/NavigationSection";
import { AdBanner } from "@/components/AdBanner";
import { RankingItem } from "@/lib/db";

// 광고 배너 설정
const AD_BANNER_CONFIG = {
  enabled: true,
  id: "main-banner-v1",
  imageUrl: "/banners/top-banner.png",
  mobileImageUrl: "/banners/top-banner-mobile.png",
  linkUrl: "/about",
  alt: "Vocatify 배너",
  height: 90,
  closeable: true,
  external: false,
};

interface HomeClientProps {
  topCharts: RankingItem[];
  newReleases: RankingItem[];
  popularSongs: RankingItem[];
}

export function HomeClient({ topCharts, newReleases, popularSongs }: HomeClientProps) {
  return (
    <div className="bg-black overflow-hidden w-full flex flex-col min-h-screen">
      <main className="flex-1 flex flex-col">
          {/* Ad Banner - 인기차트 위 */}
          {AD_BANNER_CONFIG.enabled && (
            <div className="px-4 pt-4">
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
            </div>
          )}

          <section className="flex-1 relative w-full pb-[150px]">
            <NavigationSection
              topCharts={topCharts}
              newReleases={newReleases}
              popularSongs={popularSongs}
            />
          </section>
        </main>
    </div>
  );
}
