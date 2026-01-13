/**
 * Check current data range in database
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDataRange() {
  try {
    console.log('📊 현재 데이터베이스 상태 확인 중...\n');

    // 총 레코드 수
    const totalCount = await prisma.dailyViewCount.count();
    console.log(`총 daily_view_counts 레코드: ${totalCount.toLocaleString()}개`);

    // 가장 오래된/최신 레코드
    const [oldest, newest] = await Promise.all([
      prisma.dailyViewCount.findFirst({
        orderBy: { recordedDate: 'asc' },
        select: { recordedDate: true },
      }),
      prisma.dailyViewCount.findFirst({
        orderBy: { recordedDate: 'desc' },
        select: { recordedDate: true },
      }),
    ]);

    if (oldest && newest) {
      const daysDiff = Math.ceil(
        (newest.recordedDate.getTime() - oldest.recordedDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      console.log(`\n📅 데이터 범위:`);
      console.log(`  가장 오래된 기록: ${oldest.recordedDate.toISOString().split('T')[0]}`);
      console.log(`  가장 최신 기록: ${newest.recordedDate.toISOString().split('T')[0]}`);
      console.log(`  보관 기간: ${daysDiff}일`);
    }

    // 데이터베이스 크기
    const sizeResult = await prisma.$queryRaw<Array<{ total: string }>>`
      SELECT pg_size_pretty(pg_database_size(current_database())) AS total;
    `;
    console.log(`\n💾 전체 DB 크기: ${sizeResult[0]?.total || 'unknown'}`);

    // 테이블별 크기
    const tables = await prisma.$queryRaw<Array<{ table_name: string; total_size: string }>>`
      SELECT
        schemaname || '.' || tablename AS table_name,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
      LIMIT 5;
    `;

    console.log(`\n📊 상위 5개 테이블:`);
    tables.forEach((table) => {
      console.log(`  ${table.table_name}: ${table.total_size}`);
    });

    // Song 수
    const songCount = await prisma.song.count();
    console.log(`\n🎵 총 노래 수: ${songCount.toLocaleString()}곡`);

  } catch (error) {
    console.error('❌ 에러:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkDataRange();
