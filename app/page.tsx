import { HomeClient } from "@/components/HomeClient";
import { getCachedUnifiedRankings } from "@/lib/db";
import { serializeBigInt } from "@/lib/serialize";

// Force dynamic rendering to avoid build-time database queries
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  // 서버에서 초기 데이터 로드 - 사전 계산된 캐시 테이블에서 조회 (초고속)
  // 복잡한 CTE 연산 없이 단순 SELECT로 0.1초 이하 응답
  const rankings = await getCachedUnifiedRankings(7);

  return (
    <HomeClient
      topCharts={serializeBigInt(rankings.totalRanking)}
      newReleases={serializeBigInt(rankings.newRanking)}
      popularSongs={serializeBigInt(rankings.weeklyRanking)}
    />
  );
}
