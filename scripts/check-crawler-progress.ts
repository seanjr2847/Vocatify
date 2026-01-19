import { prisma } from '../lib/prisma';

async function checkCrawlerProgress() {
  // 최근 크롤러 진행 상황
  const progress = await prisma.crawler_progress.findMany({
    orderBy: { started_at: 'desc' },
    take: 10,
  });

  console.log('📊 최근 크롤러 실행 기록:\n');
  progress.forEach((p, i) => {
    console.log(`[${i+1}] ${p.crawler_type} (${p.status})`);
    console.log(`    시작: ${p.started_at}`);
    if (p.completed_at) console.log(`    완료: ${p.completed_at}`);
    console.log(`    처리: ${p.total_processed || 0}개`);
    if (p.error_message) console.log(`    에러: ${p.error_message}`);
    console.log('');
  });

  // 최근 7일 데이터 수집 통계
  const stats = await prisma.$queryRaw<{ date: Date; count: bigint }[]>`
    SELECT
      recorded_date::date as date,
      COUNT(*) as count
    FROM daily_view_counts
    WHERE recorded_date >= CURRENT_DATE - INTERVAL '7 days'
    GROUP BY recorded_date::date
    ORDER BY date DESC
  `;

  console.log('\n📅 최근 7일 데이터 수집 통계:');
  stats.forEach((row) => {
    const dateStr = row.date.toISOString().split('T')[0];
    const count = row.count.toString().padStart(8);
    console.log(`  ${dateStr}: ${count}개`);
  });

  await prisma.$disconnect();
}

checkCrawlerProgress().catch(console.error);
