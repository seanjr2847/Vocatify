const { PrismaClient } = require('../lib/generated/prisma');
const prisma = new PrismaClient();

(async () => {
  try {
    const jan20Start = new Date('2026-01-20T00:00:00+09:00');
    const jan21Start = new Date('2026-01-21T00:00:00+09:00');

    const crawlers = await prisma.crawler_progress.findMany({
      where: {
        crawler_type: { startsWith: 'youtube' },
        started_at: { gte: jan20Start, lt: jan21Start }
      },
      orderBy: { crawler_type: 'asc' }
    });

    console.log('\n📊 1월 20일 크롤러 분석\n');
    console.log('='.repeat(70));

    const chunks = crawlers.filter(c => c.crawler_type.includes('chunk'));
    const nonChunks = crawlers.filter(c => !c.crawler_type.includes('chunk'));

    console.log(`총 크롤러: ${crawlers.length}개`);
    console.log(`  - 청크 크롤러: ${chunks.length}개`);
    console.log(`  - 비청크 크롤러: ${nonChunks.length}개\n`);

    if (chunks.length > 0) {
      console.log('청크 크롤러 범위:\n');
      chunks.forEach(c => {
        const match = c.crawler_type.match(/chunk-(\d+)-(\d+)/);
        if (match) {
          const [, minId, maxId] = match;
          const range = parseInt(maxId) - parseInt(minId) + 1;
          console.log(`  ${c.crawler_type}`);
          console.log(`    범위: ${minId} ~ ${maxId} (${range.toLocaleString()} songs)`);
          console.log(`    처리: ${(c.total_processed || 0).toLocaleString()} PVs`);
          console.log(`    상태: ${c.status}\n`);
        }
      });
    }

    const totalFromChunks = chunks.reduce((sum, c) => sum + (c.total_processed || 0), 0);
    const totalFromNonChunks = nonChunks.reduce((sum, c) => sum + (c.total_processed || 0), 0);

    console.log('='.repeat(70));
    console.log(`청크 크롤러 합계: ${totalFromChunks.toLocaleString()}개`);
    console.log(`비청크 크롤러 합계: ${totalFromNonChunks.toLocaleString()}개`);
    console.log(`총합: ${(totalFromChunks + totalFromNonChunks).toLocaleString()}개\n`);

    const actualUpdated = await prisma.pvs.count({
      where: {
        service: 'Youtube',
        view_count_updated_at: { gte: jan20Start, lt: jan21Start }
      }
    });

    console.log(`실제 업데이트: ${actualUpdated.toLocaleString()}개`);
    console.log(`추적 비율: ${((totalFromChunks + totalFromNonChunks) / actualUpdated * 100).toFixed(1)}%\n`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
})();
