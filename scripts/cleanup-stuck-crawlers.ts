import { prisma } from '../lib/prisma';

async function cleanupStuckCrawlers() {
  console.log('🧹 멈춘 크롤러 정리 중...\n');

  // running 상태인 크롤러 찾기
  const stuckCrawlers = await prisma.crawler_progress.findMany({
    where: { status: 'running' },
    orderBy: { started_at: 'desc' },
  });

  console.log(`발견된 멈춘 크롤러: ${stuckCrawlers.length}개\n`);

  if (stuckCrawlers.length === 0) {
    console.log('✅ 정리할 크롤러가 없습니다.');
    await prisma.$disconnect();
    return;
  }

  // 상세 정보 출력
  stuckCrawlers.forEach((crawler, i) => {
    console.log(`[${i + 1}] ${crawler.crawler_type}`);
    console.log(`    시작: ${crawler.started_at}`);
    console.log(`    처리: ${crawler.total_processed}개`);
    console.log('');
  });

  // 모두 failed로 변경
  const result = await prisma.crawler_progress.updateMany({
    where: { status: 'running' },
    data: {
      status: 'failed',
      completed_at: new Date(),
      error_message: 'Workflow incomplete - cleaned up manually',
    },
  });

  console.log(`✅ ${result.count}개의 크롤러 상태를 failed로 변경했습니다.`);

  await prisma.$disconnect();
}

cleanupStuckCrawlers().catch(console.error);
