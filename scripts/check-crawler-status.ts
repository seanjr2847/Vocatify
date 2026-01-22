import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCrawlerStatus() {
  try {
    console.log('\n📊 최근 크롤러 실행 기록:\n');

    const recent = await prisma.crawler_progress.findMany({
      orderBy: { started_at: 'desc' },
      take: 10,
    });

    if (recent.length === 0) {
      console.log('❌ 크롤러 실행 기록이 없습니다.');
      return;
    }

    for (const record of recent) {
      const duration = record.completed_at && record.started_at
        ? ((record.completed_at.getTime() - record.started_at.getTime()) / 1000).toFixed(1)
        : 'N/A';

      console.log(`\n${'='.repeat(60)}`);
      console.log(`크롤러 타입: ${record.crawler_type}`);
      console.log(`상태: ${record.status}`);
      console.log(`시작 시간: ${record.started_at.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`);
      console.log(`완료 시간: ${record.completed_at?.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) || 'N/A'}`);
      console.log(`실행 시간: ${duration}초`);
      console.log(`처리된 항목: ${record.total_processed || 0}`);
      console.log(`마지막 오프셋: ${record.last_offset || 0}`);

      if (record.error_message) {
        console.log(`⚠️  에러: ${record.error_message}`);
      }
    }

    console.log(`\n${'='.repeat(60)}\n`);

    // 현재 실행 중인 크롤러 확인
    const running = await prisma.crawler_progress.findMany({
      where: { status: 'running' },
    });

    if (running.length > 0) {
      console.log(`\n🔄 현재 실행 중인 크롤러: ${running.length}개\n`);
      for (const r of running) {
        console.log(`  - ${r.crawler_type} (시작: ${r.started_at.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })})`);
      }
    } else {
      console.log('\n✅ 현재 실행 중인 크롤러 없음\n');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCrawlerStatus();
