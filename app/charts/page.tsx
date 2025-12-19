import { Metadata } from 'next';
import { getTotalRanking, getDailyRanking, getWeeklyRanking } from '@/lib/db';
import { ChartsClient } from './ChartsClient';

export const metadata: Metadata = {
  title: '차트 - Vocatify',
  description: 'Vocaloid 음악 차트 - 전체 랭킹, 일간 트렌딩, 주간 트렌딩',
};

export default async function ChartsPage() {
  // Fetch initial data for all tabs in parallel
  const [totalRanking, dailyRanking, weeklyRanking] = await Promise.all([
    getTotalRanking(100, 0),
    getDailyRanking(100, 0),
    getWeeklyRanking(100, 0),
  ]);

  return (
    <ChartsClient
      initialTotalRanking={totalRanking}
      initialDailyRanking={dailyRanking}
      initialWeeklyRanking={weeklyRanking}
    />
  );
}
