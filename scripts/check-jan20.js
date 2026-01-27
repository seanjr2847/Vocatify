const { PrismaClient } = require('../lib/generated/prisma');
const prisma = new PrismaClient();

(async () => {
  try {
    const totalPVs = await prisma.pvs.count({
      where: { service: 'Youtube' }
    });
    
    const jan20Start = new Date('2026-01-20T00:00:00+09:00');
    const jan20End = new Date('2026-01-21T00:00:00+09:00');
    
    const jan20Crawlers = await prisma.crawler_progress.findMany({
      where: {
        crawler_type: { startsWith: 'youtube' },
        started_at: { gte: jan20Start, lt: jan20End }
      },
      orderBy: { started_at: 'desc' }
    });
    
    const totalProcessed = jan20Crawlers.reduce((sum, c) => sum + (c.total_processed || 0), 0);
    const completed = jan20Crawlers.filter(c => c.status === 'completed').length;
    
    console.log('\n📊 YouTube PV 처리 현황 (1월 20일)');
    console.log('='.repeat(60));
    console.log('전체 YouTube PV:', totalPVs.toLocaleString() + '개');
    console.log('');
    console.log('1월 20일 실행된 크롤러:', jan20Crawlers.length + '개');
    console.log('  - 완료:', completed + '개');
    console.log('  - 실행 중:', jan20Crawlers.filter(c => c.status === 'running').length + '개');
    console.log('');
    console.log('1월 20일 총 처리:', totalProcessed.toLocaleString() + '개');
    console.log('처리율:', ((totalProcessed / totalPVs) * 100).toFixed(2) + '%');
    console.log('미처리:', (totalPVs - totalProcessed).toLocaleString() + '개\n');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
})();
