const { PrismaClient } = require('../lib/generated/prisma');
const prisma = new PrismaClient();

(async () => {
  try {
    // KST (한국 시간) 기준
    const jan20StartKST = new Date('2026-01-20T00:00:00+09:00');
    const jan21StartKST = new Date('2026-01-21T00:00:00+09:00');

    // UTC 기준 (1월 19일 15:00 ~ 1월 20일 15:00)
    const jan20StartUTC = new Date('2026-01-19T15:00:00Z');
    const jan21StartUTC = new Date('2026-01-20T15:00:00Z');

    console.log('📊 1월 20일 데이터 조회 (타임존 비교)\n');
    console.log('='.repeat(80));

    console.log('\n🇰🇷 KST 기준 (2026-01-20 00:00 ~ 2026-01-21 00:00 KST)');
    console.log('   = UTC (2026-01-19 15:00 ~ 2026-01-20 15:00 UTC)\n');

    // KST 기준 조회
    const pvsKST = await prisma.pvs.count({
      where: {
        service: 'Youtube',
        view_count_updated_at: {
          gte: jan20StartKST,
          lt: jan21StartKST
        }
      }
    });

    const dailyKST = await prisma.daily_view_counts.count({
      where: {
        recorded_date: {
          gte: jan20StartKST,
          lt: jan21StartKST
        }
      }
    });

    console.log(`1️⃣ KST 기준:`);
    console.log(`   - pvs.view_count_updated_at: ${pvsKST.toLocaleString()}개`);
    console.log(`   - daily_view_counts.recorded_date: ${dailyKST.toLocaleString()}개`);

    // UTC 기준 조회
    const pvsUTC = await prisma.pvs.count({
      where: {
        service: 'Youtube',
        view_count_updated_at: {
          gte: jan20StartUTC,
          lt: jan21StartUTC
        }
      }
    });

    const dailyUTC = await prisma.daily_view_counts.count({
      where: {
        recorded_date: {
          gte: jan20StartUTC,
          lt: jan21StartUTC
        }
      }
    });

    console.log(`\n2️⃣ UTC 기준 (같은 시간대):`);
    console.log(`   - pvs.view_count_updated_at: ${pvsUTC.toLocaleString()}개`);
    console.log(`   - daily_view_counts.recorded_date: ${dailyUTC.toLocaleString()}개`);

    // 전체 1월 20일 (UTC 00:00 ~ 24:00)
    const jan20FullStart = new Date('2026-01-20T00:00:00Z');
    const jan20FullEnd = new Date('2026-01-21T00:00:00Z');

    const pvsFull = await prisma.pvs.count({
      where: {
        service: 'Youtube',
        view_count_updated_at: {
          gte: jan20FullStart,
          lt: jan20FullEnd
        }
      }
    });

    const dailyFull = await prisma.daily_view_counts.count({
      where: {
        recorded_date: {
          gte: jan20FullStart,
          lt: jan20FullEnd
        }
      }
    });

    console.log(`\n3️⃣ UTC 전체 1월 20일 (00:00 ~ 24:00 UTC):`);
    console.log(`   - pvs.view_count_updated_at: ${pvsFull.toLocaleString()}개`);
    console.log(`   - daily_view_counts.recorded_date: ${dailyFull.toLocaleString()}개`);

    // crawler_progress 확인
    const crawlerKST = await prisma.crawler_progress.findMany({
      where: {
        crawler_type: { startsWith: 'youtube' },
        started_at: { gte: jan20StartKST, lt: jan21StartKST }
      }
    });

    const totalProcessed = crawlerKST.reduce((sum, r) => sum + (r.total_processed || 0), 0);

    console.log(`\n4️⃣ crawler_progress (KST 기준):`);
    console.log(`   - 실행 횟수: ${crawlerKST.length}개`);
    console.log(`   - 처리 합계: ${totalProcessed.toLocaleString()} PVs`);

    console.log('\n' + '='.repeat(80));
    console.log('💡 분석:\n');

    if (pvsKST < 1000 && dailyKST > 100000) {
      console.log('⚠️  pvs.view_count_updated_at이 제대로 업데이트되지 않는 것으로 보입니다!');
      console.log('    daily_view_counts는 정상적으로 쌓이고 있지만,');
      console.log('    pvs 테이블의 타임스탬프는 업데이트 안 되고 있을 가능성이 있습니다.\n');
    }

    console.log(`✅ 실제 데이터: daily_view_counts = ${dailyKST.toLocaleString()}개`);
    console.log(`   (1월 20일 KST 기준으로 이만큼 쌓였습니다)\n`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
})();
