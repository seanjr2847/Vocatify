"use client";

import React from "react";
import { NavigationSection } from "@/components/NavigationSection";
import { RankingItem } from "@/lib/db";

interface HomeClientProps {
  topCharts: RankingItem[];
  newReleases: RankingItem[];
  popularSongs: RankingItem[];
}

export function HomeClient({ topCharts, newReleases, popularSongs }: HomeClientProps) {
  return (
    <div className="bg-black overflow-hidden w-full flex flex-col min-h-screen">
      <main className="flex-1 flex flex-col">
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
