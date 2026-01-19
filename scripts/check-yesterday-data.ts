import { prisma } from '../lib/prisma';

async function checkYesterdayData() {
  // 어제 날짜 계산 (UTC 기준)
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const dayAfterYesterday = new Date(yesterday);
  dayAfterYesterday.setUTCDate(dayAfterYesterday.getUTCDate() + 1);

  const yesterdayStr = yesterday.toISOString().split('T')[0];
  console.log(`어제(${yesterdayStr}) 조회수 수집 확인 중...\n`);

  // 1. daily_view_counts에서 어제 데이터 확인
  const yesterdayCount = await prisma.daily_view_counts.count({
    where: {
      recorded_date: {
        gte: yesterday,
        lt: dayAfterYesterday,
      },
    },
  });

  console.log(`📊 daily_view_counts 테이블:`);
  console.log(`  ${yesterdayStr} 데이터: ${yesterdayCount.toLocaleString()}개`);

  // 2. 최근 업데이트된 PV들 확인 (pvs 테이블)
  const recentlyUpdated = await prisma.pvs.count({
    where: {
      view_count_updated_at: {
        gte: yesterday,
      },
    },
  });

  console.log(`\n🎵 pvs 테이블:`);
  console.log(`  2026-01-15 이후 업데이트된 PV: ${recentlyUpdated.toLocaleString()}개`);

  // 3. 가장 최근 업데이트 시간 확인
  const latestUpdate = await prisma.pvs.findFirst({
    where: {
      view_count_updated_at: { not: null },
    },
    orderBy: {
      view_count_updated_at: 'desc',
    },
    select: {
      pv_id: true,
      view_count_updated_at: true,
      songs: {
        select: {
          default_name: true,
        },
      },
    },
  });

  if (latestUpdate) {
    console.log(`\n⏰ 가장 최근 업데이트:`);
    console.log(`  곡: ${latestUpdate.songs.default_name}`);
    console.log(`  PV ID: ${latestUpdate.pv_id}`);
    console.log(`  시간: ${latestUpdate.view_count_updated_at}`);
  }

  // 4. crawler_progress 확인
  const crawlerProgress = await prisma.crawler_progress.findMany({
    where: {
      crawler_type: 'youtube',
    },
    orderBy: {
      started_at: 'desc',
    },
    take: 3,
  });

  console.log(`\n🤖 최근 YouTube 크롤러 실행 기록:`);
  crawlerProgress.forEach((p, idx) => {
    console.log(`\n  [${idx + 1}] ${p.status}`);
    console.log(`    시작: ${p.started_at}`);
    if (p.completed_at) console.log(`    완료: ${p.completed_at}`);
    if (p.total_processed) console.log(`    처리: ${p.total_processed}개`);
    if (p.error_message) console.log(`    에러: ${p.error_message}`);
  });

  // 5. 날짜별 데이터 추이 확인
  const dateCounts = await prisma.$queryRaw<{ date: Date; count: bigint }[]>`
    SELECT
      recorded_date::date as date,
      COUNT(*) as count
    FROM daily_view_counts
    WHERE recorded_date >= CURRENT_DATE - INTERVAL '7 days'
    GROUP BY recorded_date::date
    ORDER BY date DESC
  `;

  console.log(`\n📅 최근 7일 데이터 추이:`);
  dateCounts.forEach((row) => {
    const dateStr = row.date.toISOString().split('T')[0];
    console.log(`  ${dateStr}: ${row.count.toString().padStart(8)}개`);
  });

  await prisma.$disconnect();
}

checkYesterdayData().catch(console.error);
