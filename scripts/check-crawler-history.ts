import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCrawlerHistory() {
  try {
    console.log('=== 크롤러 실행 기록 전체 확인 ===\n');

    // 모든 crawler_progress 기록 조회
    const allProgress = await prisma.crawler_progress.findMany({
      orderBy: {
        started_at: 'desc'
      },
      take: 20
    });

    console.log(`총 ${allProgress.length}개의 크롤러 실행 기록\n`);

    allProgress.forEach((p, idx) => {
      console.log(`\n[${idx + 1}] ${p.crawler_type.toUpperCase()}`);
      console.log(`  ID: ${p.id}`);
      console.log(`  상태: ${p.status}`);
      console.log(`  시작: ${p.started_at.toISOString()}`);
      console.log(`  완료: ${p.completed_at?.toISOString() || '진행중/미완료'}`);
      console.log(`  처리: ${p.total_processed || 0}개`);
      console.log(`  타겟: ${p.total_target || 'N/A'}개`);

      if (p.metadata) {
        const metadata = p.metadata as any;
        console.log(`  메타데이터:`, JSON.stringify(metadata, null, 2));
      }

      if (p.error_message) {
        console.log(`  에러: ${p.error_message}`);
      }
    });

    // YouTube crawler만 필터링
    console.log('\n\n=== YouTube 크롤러만 필터링 ===\n');
    const youtubeProgress = allProgress.filter(p => p.crawler_type === 'youtube');

    console.log(`YouTube 크롤러 실행 횟수: ${youtubeProgress.length}\n`);

    youtubeProgress.forEach((p, idx) => {
      const metadata = p.metadata as any;
      const duration = p.completed_at
        ? ((p.completed_at.getTime() - p.started_at.getTime()) / 1000).toFixed(1)
        : 'N/A';

      console.log(`\n[${idx + 1}] ${p.started_at.toISOString().split('T')[0]}`);
      console.log(`  모드: ${metadata?.mode || 'N/A'}`);
      console.log(`  상태: ${p.status}`);
      console.log(`  처리: ${p.total_processed || 0}개`);
      console.log(`  소요 시간: ${duration}초`);

      if (metadata?.pvsUpdated !== undefined) {
        console.log(`  업데이트: ${metadata.pvsUpdated}개 PV`);
        console.log(`  실패: ${metadata.pvsFailed || 0}개 PV`);
      }
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCrawlerHistory();
