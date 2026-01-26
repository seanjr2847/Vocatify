"use client";

import { memo } from "react";
import { RankingItem } from "@/lib/db";
import {
  CategoryGrid,
  TrendingTable,
  AllTimeBestTable,
  NewReleasesGrid,
} from "@/components/home/tidal";

interface NavigationSectionProps {
  topCharts: RankingItem[];
  newReleases: RankingItem[];
  popularSongs: RankingItem[];
}

const NavigationSectionComponent = ({
  topCharts,
  newReleases,
  popularSongs,
}: NavigationSectionProps): JSX.Element => {
  const handlePlay = (song: RankingItem) => {
    // TODO: Implement play functionality
    console.log("Playing song:", song.defaultName);
  };

  return (
    <section className="relative w-full h-auto tidal-bg">
      {/* The Hits - Category Grid */}
      <CategoryGrid
        weeklyRanking={popularSongs}
        totalRanking={topCharts}
        newRanking={newReleases}
      />

      {/* Weekly Trending - Table View */}
      <TrendingTable songs={popularSongs} onPlay={handlePlay} />

      {/* All-Time Best - Table View */}
      <AllTimeBestTable songs={topCharts} onPlay={handlePlay} />

      {/* New Releases - Grid View */}
      <NewReleasesGrid songs={newReleases} onPlay={handlePlay} />
    </section>
  );
};

export const NavigationSection = memo(NavigationSectionComponent);
export default NavigationSection;
