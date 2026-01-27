const { PrismaClient } = require('../lib/generated/prisma');
const prisma = new PrismaClient();

(async () => {
  try {
    const jan20Start = new Date('2026-01-20T00:00:00+09:00');
    const jan21Start = new Date('2026-01-21T00:00:00+09:00');

    console.log('📊 1월 20일 데이터 조회\n');
    console.log('='.repeat(70));

    // 1. daily_view_counts 테이블 확인
    const dailyViewCounts = await prisma.daily_view_counts.count({
      where: {
        recorded_date: {
          gte: jan20Start,
          lt: jan21Start
        }
      }
    });

    console.log(`\n1️⃣ daily_view_counts 테이블 (시계열 데이터)`);
    console.log(`   1월 20일 기록: ${dailyViewCounts.toLocaleString()}개`);

    // 2. pvs 테이블에서 view_count_updated_at 확인
    const pvsUpdated = await prisma.pvs.count({
      where: {
        service: 'Youtube',
        view_count_updated_at: {
          gte: jan20Start,
          lt: jan21Start
        }
      }
    });

    console.log(`\n2️⃣ pvs 테이블 (view_count_updated_at)`);
    console.log(`   1월 20일 업데이트: ${pvsUpdated.toLocaleString()}개`);

    // 3. crawler_progress에서 1월 20일 실행 기록
    const crawlerRuns = await prisma.crawler_progress.findMany({
      where: {
        crawler_type: { startsWith: 'youtube' },
        started_at: { gte: jan20Start, lt: jan21Start }
      },
      orderBy: { started_at: 'asc' }
    });

    console.log(`\n3️⃣ crawler_progress 기록`);
    console.log(`   1월 20일 실행 횟수: ${crawlerRuns.length}개`);

    if (crawlerRuns.length > 0) {
      console.log(`\n   상세 내역:`);
      const totalProcessed = crawlerRuns.reduce((sum, r) => sum + (r.total_processed || 0), 0);

      crawlerRuns.forEach(run => {
        console.log(`   - ${run.crawler_type}`);
        console.log(`     처리: ${(run.total_processed || 0).toLocaleString()} PVs | 상태: ${run.status}`);
      });

      console.log(`\n   합계: ${totalProcessed.toLocaleString()} PVs`);
    }

    // 4. 비율 계산
    console.log('\n' + '='.repeat(70));
    console.log('📈 데이터 정합성 분석\n');

    if (pvsUpdated > 0) {
      const totalTracked = crawlerRuns.reduce((sum, r) => sum + (r.total_processed || 0), 0);
      const trackingRatio = (totalTracked / pvsUpdated * 100).toFixed(1);
      console.log(`추적 비율: ${trackingRatio}%`);
      console.log(`  - crawler_progress 기록: ${totalTracked.toLocaleString()}`);
      console.log(`  - 실제 pvs 업데이트: ${pvsUpdated.toLocaleString()}`);
    }

    if (dailyViewCounts !== pvsUpdated) {
      console.log(`\n⚠️  불일치 발견:`);
      console.log(`  - daily_view_counts: ${dailyViewCounts.toLocaleString()}`);
      console.log(`  - pvs updated: ${pvsUpdated.toLocaleString()}`);
      console.log(`  - 차이: ${Math.abs(dailyViewCounts - pvsUpdated).toLocaleString()}`);
    } else {
      console.log(`\n✅ 데이터 일치: daily_view_counts와 pvs 업데이트 개수 동일`);
    }

    console.log('\n');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
})();
