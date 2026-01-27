const { PrismaClient } = require('../lib/generated/prisma');
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('📊 VocaDB 크롤러 상태 확인\n');
    console.log('='.repeat(80));

    // 1. 최근 VocaDB crawler_progress 기록
    console.log('\n1️⃣ crawler_progress 기록 (최근 10개)\n');

    const vocadbProgress = await prisma.crawler_progress.findMany({
      where: {
        crawler_type: { startsWith: 'vocadb' }
      },
      orderBy: { started_at: 'desc' },
      take: 10
    });

    if (vocadbProgress.length === 0) {
      console.log('   ❌ VocaDB 크롤러 실행 기록이 없습니다!\n');
    } else {
      vocadbProgress.forEach(p => {
        const duration = p.completed_at && p.started_at
          ? ((p.completed_at.getTime() - p.started_at.getTime()) / 1000).toFixed(0)
          : 'N/A';

        console.log(`   ${p.crawler_type}`);
        console.log(`   - 시작: ${p.started_at.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`);
        console.log(`   - 상태: ${p.status} | 처리: ${p.total_processed || 0} | 소요: ${duration}s`);
        if (p.error_message) {
          console.log(`   - 오류: ${p.error_message}`);
        }
        console.log('');
      });
    }

    // 2. songs 테이블 최신 데이터
    console.log('2️⃣ songs 테이블 최신 데이터\n');

    const totalSongs = await prisma.songs.count();
    console.log(`   전체 곡 수: ${totalSongs.toLocaleString()}개`);

    const recentSongs = await prisma.songs.findMany({
      orderBy: { vocadb_id: 'desc' },
      take: 5,
      select: {
        vocadb_id: true,
        default_name: true,
        publish_date: true,
        crawled_at: true
      }
    });

    console.log(`\n   최근 추가된 곡 (vocadb_id 기준):`);
    recentSongs.forEach(song => {
      console.log(`   - ID ${song.vocadb_id}: ${song.default_name}`);
      console.log(`     발행일: ${song.publish_date ? song.publish_date.toISOString().split('T')[0] : 'N/A'}`);
      console.log(`     크롤링: ${song.crawled_at.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`);
    });

    // 3. 최근 7일간 추가된 곡
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentAdded = await prisma.songs.count({
      where: {
        publish_date: {
          gte: sevenDaysAgo
        }
      }
    });

    console.log(`\n   최근 7일간 발행된 곡: ${recentAdded.toLocaleString()}개`);

    // 4. 최대 vocadb_id 확인
    const maxIdResult = await prisma.songs.aggregate({
      _max: {
        vocadb_id: true
      }
    });

    const maxId = maxIdResult._max.vocadb_id || 0;
    console.log(`   최대 vocadb_id: ${maxId.toLocaleString()}`);

    // 5. GitHub Actions 스케줄 정보
    console.log('\n' + '='.repeat(80));
    console.log('📅 스케줄 정보\n');
    console.log('   VocaDB 크롤러 스케줄:');
    console.log('   - GitHub Actions: 매일 오전 2시 (UTC) = 오전 11시 (KST)');
    console.log('   - Vercel cron: 매일 오전 2시 (UTC) = 오전 11시 (KST)');

    const now = new Date();
    console.log(`\n   현재 시각: ${now.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} KST`);
    console.log(`   현재 시각: ${now.toISOString()} UTC`);

    // 6. 마지막 실행 시간 분석
    if (vocadbProgress.length > 0) {
      const lastRun = vocadbProgress[0];
      const hoursSinceLastRun = (Date.now() - lastRun.started_at.getTime()) / (1000 * 60 * 60);

      console.log('\n' + '='.repeat(80));
      console.log('⏰ 마지막 실행 분석\n');
      console.log(`   마지막 실행: ${lastRun.started_at.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} KST`);
      console.log(`   경과 시간: ${hoursSinceLastRun.toFixed(1)}시간 전`);

      if (hoursSinceLastRun > 24) {
        console.log(`\n   ⚠️  24시간 이상 실행되지 않았습니다!`);
        console.log(`   → GitHub Actions 자동 실행이 작동하지 않을 수 있습니다.`);
      } else if (hoursSinceLastRun > 12) {
        console.log(`\n   ⚠️  12시간 이상 실행되지 않았습니다.`);
      } else {
        console.log(`\n   ✅ 최근에 실행되었습니다.`);
      }
    }

    console.log('\n');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
})();
