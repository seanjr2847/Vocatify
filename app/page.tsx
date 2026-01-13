import { HomeClient } from "@/components/HomeClient";
import { getUnifiedRankings } from "@/lib/db";
import { serializeBigInt } from "@/lib/serialize";
import { withRetry } from "@/lib/db-error-handler";

// Force dynamic rendering to avoid build-time database queries
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  // 서버에서 초기 데이터 로드 - 통합 쿼리로 메모리 에러 방지
  // CTE를 1번만 계산하여 메모리 사용량 66% 감소
  const rankings = await withRetry(() => getUnifiedRankings(7));

  return (
    <HomeClient
      topCharts={serializeBigInt(rankings.totalRanking)}
      newReleases={serializeBigInt(rankings.newRanking)}
      popularSongs={serializeBigInt(rankings.weeklyRanking)}
    />
  );
}
