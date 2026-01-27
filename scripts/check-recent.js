const { PrismaClient } = require('../lib/generated/prisma');
const prisma = new PrismaClient();

(async () => {
  try {
    const recentStart = new Date(Date.now() - 30 * 60 * 1000);
    
    const recentCrawlers = await prisma.crawler_progress.findMany({
      where: {
        crawler_type: { startsWith: 'youtube' },
        started_at: { gte: recentStart }
      },
      orderBy: { started_at: 'desc' },
      take: 15
    });
    
    console.log('\n🔍 최근 30분 이내 시작된 크롤러:', recentCrawlers.length + '개\n');
    
    if (recentCrawlers.length > 0) {
      const running = recentCrawlers.filter(c => c.status === 'running').length;
      const completed = recentCrawlers.filter(c => c.status === 'completed').length;
      
      console.log('상태 분포:');
      console.log('  - 실행 중:', running + '개');
      console.log('  - 완료:', completed + '개\n');
      
      console.log('최근 크롤러 5개:');
      recentCrawlers.slice(0, 5).forEach(c => {
        const elapsed = c.completed_at && c.started_at 
          ? ((c.completed_at.getTime() - c.started_at.getTime()) / 1000).toFixed(0)
          : 'N/A';
        console.log('\n  -', c.crawler_type);
        console.log('    시작:', c.started_at.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }));
        console.log('    상태:', c.status, '| 처리:', c.total_processed || 0, '| 소요:', elapsed + 's');
      });
    } else {
      console.log('❌ 새로운 크롤러가 아직 시작되지 않았습니다.');
    }
    
    const total = await prisma.pvs.count({ where: { service: 'Youtube' } });
    const jan21Updated = await prisma.pvs.count({
      where: {
        service: 'Youtube',
        view_count_updated_at: {
          gte: new Date('2026-01-21T00:00:00+09:00')
        }
      }
    });
    
    console.log('\n\n📊 1월 21일 업데이트 현황:');
    console.log('  전체:', total.toLocaleString() + '개');
    console.log('  오늘(1/21) 업데이트:', jan21Updated.toLocaleString() + '개\n');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
})();
