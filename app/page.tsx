import { HomeClient } from "@/components/HomeClient";
import { getTotalRanking, getNewSongsRanking, getWeeklyRanking } from "@/lib/db";
import { serializeBigInt } from "@/lib/serialize";
import { withRetry } from "@/lib/db-error-handler";

// Force dynamic rendering to avoid build-time database queries
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  // 서버에서 초기 데이터 로드 (with retry for connection pool timeouts)
  const [topCharts, newReleases, popularSongs] = await Promise.all([
    withRetry(() => getTotalRanking(7, 0)), // 인기 차트 7곡
    withRetry(() => getNewSongsRanking(7, 0)), // 신곡 7곡
    withRetry(() => getWeeklyRanking(7, 0)), // 주간 인기곡 7곡
  ]);

  return (
    <HomeClient
      topCharts={serializeBigInt(topCharts)}
      newReleases={serializeBigInt(newReleases)}
      popularSongs={serializeBigInt(popularSongs)}
    />
  );
}
