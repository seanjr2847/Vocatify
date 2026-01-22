/**
 * 메스머라이저 조회수 불일치 디버깅 스크립트
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugMesmerizer() {
  console.log('🔍 메스머라이저 조회수 분석\n');

  // 1. 메스머라이저 곡 찾기
  const songs = await prisma.songs.findMany({
    where: {
      OR: [
        { default_name: { contains: 'メズマライザー', mode: 'insensitive' } },
        { default_name: { contains: 'Mesmerizer', mode: 'insensitive' } },
      ],
    },
    select: {
      vocadb_id: true,
      default_name: true,
    },
  });

  console.log(`📌 발견된 메스머라이저 곡: ${songs.length}개\n`);

  for (const song of songs) {
    console.log('─'.repeat(60));
    console.log(`🎵 곡: ${song.default_name}`);
    console.log(`🆔 VocaDB ID: ${song.vocadb_id}`);

    // 2. 이 곡의 모든 PV 조회
    const pvs = await prisma.pvs.findMany({
      where: {
        song_id: song.vocadb_id,
        service: 'Youtube',
      },
      select: {
        id: true,
        pv_id: true,
        url: true,
        view_count: true,
        view_count_updated_at: true,
        pv_type: true,
      },
      orderBy: {
        view_count: 'desc',
      },
    });

    console.log(`\n📺 YouTube PV 개수: ${pvs.length}개\n`);

    let totalViews = BigInt(0);

    pvs.forEach((pv, idx) => {
      const views = pv.view_count || BigInt(0);
      totalViews += views;

      console.log(`[${idx + 1}] ${pv.pv_type || 'Unknown'} (PV ID: ${pv.id})`);
      console.log(`    YouTube ID: ${pv.pv_id}`);
      console.log(`    조회수: ${views.toLocaleString()}`);
      console.log(`    업데이트: ${pv.view_count_updated_at?.toLocaleString('ko-KR') || 'N/A'}`);
      console.log(`    URL: ${pv.url}`);
      console.log('');
    });

    console.log('─'.repeat(60));
    console.log(`💰 총 조회수 (모든 PV 합계): ${totalViews.toLocaleString()}`);
    console.log(`📊 차트 표시 값: ${totalViews.toLocaleString()} (${(Number(totalViews) / 1_000_000).toFixed(1)}M)`);
    console.log('─'.repeat(60));
    console.log('');
  }

  // 3. 랭킹 쿼리와 동일한 방식으로 계산
  console.log('\n🔢 실제 랭킹 계산 방식 재현:\n');

  const rankingData = await prisma.$queryRaw<any[]>`
    WITH song_views AS (
      SELECT
        song_id,
        SUM(view_count) as total_view_count
      FROM pvs
      WHERE service = 'Youtube' AND view_count IS NOT NULL
        AND song_id IN (${songs.map(s => s.vocadb_id).join(',')})
      GROUP BY song_id
    )
    SELECT
      s.vocadb_id,
      s.default_name,
      sv.total_view_count
    FROM songs s
    JOIN song_views sv ON s.vocadb_id = sv.song_id
    ORDER BY sv.total_view_count DESC
  `;

  rankingData.forEach(row => {
    console.log(`🎵 ${row.default_name}`);
    console.log(`   조회수: ${row.total_view_count.toLocaleString()}`);
    console.log(`   표시: ${(Number(row.total_view_count) / 1_000_000).toFixed(1)}M`);
    console.log('');
  });

  await prisma.$disconnect();
}

debugMesmerizer().catch(console.error);
