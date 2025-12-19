import { HomeClient } from "@/components/HomeClient";
import { getTotalRanking, getNewSongsRanking, getWeeklyRanking } from "@/lib/db";

export default async function HomePage() {
  // 서버에서 초기 데이터 로드
  const [topCharts, newReleases, popularSongs] = await Promise.all([
    getTotalRanking(7, 0), // 인기 차트 7곡
    getNewSongsRanking(7, 0), // 신곡 7곡
    getWeeklyRanking(7, 0), // 주간 인기곡 7곡
  ]);

  return (
    <HomeClient
      topCharts={topCharts}
      newReleases={newReleases}
      popularSongs={popularSongs}
    />
  );
}
