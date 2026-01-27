const { PrismaClient } = require('../lib/generated/prisma');
const prisma = new PrismaClient();

(async () => {
  try {
    const jan20Start = new Date('2026-01-20T00:00:00+09:00');
    const jan21Start = new Date('2026-01-21T00:00:00+09:00');
    
    // crawler_progress에 기록된 처리량
    const crawlers = await prisma.crawler_progress.findMany({
      where: {
        crawler_type: { startsWith: 'youtube' },
        started_at: { gte: jan20Start, lt: jan21Start }
      }
    });
    
    const totalFromProgress = crawlers.reduce((sum, c) => sum + (c.total_processed || 0), 0);
    
    // 실제 pvs 테이블에서 업데이트된 개수
    const actualUpdated = await prisma.pvs.count({
      where: {
        service: 'Youtube',
        view_count_updated_at: {
          gte: jan20Start,
          lt: jan21Start
        }
      }
    });
    
    console.log('\n📊 1월 20일 데이터 비교\n');
    console.log('='.repeat(60));
    console.log('crawler_progress 테이블 기록:', totalFromProgress.toLocaleString() + '개');
    console.log('실제 pvs 업데이트:', actualUpdated.toLocaleString() + '개');
    console.log('차이:', (actualUpdated - totalFromProgress).toLocaleString() + '개\n');
    
    if (actualUpdated > totalFromProgress) {
      console.log('💡 실제로는 더 많이 업데이트되었습니다!');
      console.log('   (일부 크롤러가 progress에 기록 안 됐을 수 있음)\n');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
})();
