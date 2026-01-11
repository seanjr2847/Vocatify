import { Suspense } from 'react';
import { Metadata } from 'next';
import { getTotalRanking, getDailyRanking, getWeeklyRanking, getNewSongsRanking } from '@/lib/db';
import { serializeBigInt } from '@/lib/serialize';
import { ChartsClient } from './ChartsClient';

export const metadata: Metadata = {
  title: '차트 - Vocatify',
  description: 'Vocaloid 음악 차트 - 전체 랭킹, 일간 트렌딩, 주간 트렌딩, 최신 발매',
};

export default async function ChartsPage() {
  // Fetch initial data for all tabs in parallel
  const [totalRanking, dailyRanking, weeklyRanking, newRanking] = await Promise.all([
    getTotalRanking(100, 0),
    getDailyRanking(100, 0),
    getWeeklyRanking(100, 0),
    getNewSongsRanking(100, 0),
  ]);

  return (
    <Suspense fallback={<div className="bg-[#1d2123] min-h-screen flex items-center justify-center"><span className="text-white">로딩 중...</span></div>}>
      <ChartsClient
        initialTotalRanking={serializeBigInt(totalRanking)}
        initialDailyRanking={serializeBigInt(dailyRanking)}
        initialWeeklyRanking={serializeBigInt(weeklyRanking)}
        initialNewRanking={serializeBigInt(newRanking)}
      />
    </Suspense>
  );
}
