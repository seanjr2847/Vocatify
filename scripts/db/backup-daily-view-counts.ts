/**
 * DailyViewCount Backup Script
 *
 * DB 재설계 전 기존 DailyViewCount 데이터를 백업합니다.
 * youtube_id를 포함하여 나중에 새 PV 테이블과 매칭할 수 있게 합니다.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 DailyViewCount 백업 시작...\n');

  // 1. 백업 테이블 생성 (youtube_id 포함)
  console.log('📦 백업 테이블 생성 중...');

  try {
    // 기존 백업 테이블이 있으면 삭제
    await prisma.$executeRaw`DROP TABLE IF EXISTS daily_view_counts_backup`;

    // 백업 테이블 생성 (songs 테이블과 JOIN하여 youtube_id 포함)
    await prisma.$executeRaw`
      CREATE TABLE daily_view_counts_backup AS
      SELECT
        dvc.song_id,
        dvc.recorded_date,
        dvc.total_views,
        s.youtube_id
      FROM daily_view_counts dvc
      JOIN songs s ON dvc.song_id = s.vocadb_id
    `;

    console.log('✅ 백업 테이블 생성 완료\n');

    // 2. 백업된 레코드 수 확인
    const backupCount = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count FROM daily_view_counts_backup
    `;

    console.log(`📊 백업된 레코드 수: ${backupCount[0].count.toLocaleString()}`);

    // 3. 날짜 범위 확인
    const dateRange = await prisma.$queryRaw<[{ min_date: Date; max_date: Date }]>`
      SELECT MIN(recorded_date) as min_date, MAX(recorded_date) as max_date
      FROM daily_view_counts_backup
    `;

    if (dateRange[0].min_date && dateRange[0].max_date) {
      console.log(`📅 날짜 범위: ${dateRange[0].min_date.toISOString().split('T')[0]} ~ ${dateRange[0].max_date.toISOString().split('T')[0]}`);
    }

    // 4. 고유 곡 수 확인
    const uniqueSongs = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(DISTINCT youtube_id) as count FROM daily_view_counts_backup
    `;

    console.log(`🎵 고유 곡 수: ${uniqueSongs[0].count.toLocaleString()}`);

    // 5. 샘플 데이터 확인
    const samples = await prisma.$queryRaw<Array<{
      song_id: number;
      youtube_id: string;
      recorded_date: Date;
      total_views: bigint;
    }>>`
      SELECT song_id, youtube_id, recorded_date, total_views
      FROM daily_view_counts_backup
      ORDER BY total_views DESC
      LIMIT 5
    `;

    console.log('\n📋 샘플 데이터 (조회수 TOP 5):');
    for (const sample of samples) {
      console.log(`  - song_id: ${sample.song_id}, youtube_id: ${sample.youtube_id}, views: ${sample.total_views.toLocaleString()}`);
    }

    console.log('\n✅ DailyViewCount 백업 완료!');
    console.log('💡 새 스키마 마이그레이션 후 restore-daily-view-counts.ts 스크립트로 복원하세요.');

  } catch (error) {
    console.error('❌ 백업 실패:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
