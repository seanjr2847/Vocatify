/**
 * 아티스트 타입 확인 스크립트
 * Check all artist types in the database
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkArtistTypes() {
  console.log('🔍 아티스트 타입 조회 중...\n');

  try {
    // Get all distinct artist types with counts
    const artistTypes = await prisma.$queryRaw<Array<{ artist_type: string; count: bigint }>>`
      SELECT
        artist_type,
        COUNT(*) as count
      FROM artists
      WHERE artist_type IS NOT NULL
      GROUP BY artist_type
      ORDER BY count DESC
    `;

    console.log('📊 데이터베이스 내 아티스트 타입:\n');
    console.log('─'.repeat(60));

    let totalArtists = BigInt(0);

    artistTypes.forEach((type, idx) => {
      const count = Number(type.count);
      totalArtists += type.count;
      console.log(`${idx + 1}. ${type.artist_type.padEnd(30)} ${count.toLocaleString()}명`);
    });

    console.log('─'.repeat(60));
    console.log(`\n총 아티스트 수: ${Number(totalArtists).toLocaleString()}명`);
    console.log(`총 타입 수: ${artistTypes.length}개`);

    // Check songs with Vocaloid artists vs total
    const vocaloidSongs = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(DISTINCT song_id) as count
      FROM song_artists sa
      JOIN artists a ON sa.artist_id = a.vocadb_id
      WHERE a.artist_type = 'Vocaloid'
    `;

    const totalSongs = await prisma.songs.count();

    console.log('\n📈 곡 필터링 통계:');
    console.log('─'.repeat(60));
    console.log(`전체 곡 수: ${totalSongs.toLocaleString()}곡`);
    console.log(`보카로이드 아티스트 포함 곡: ${Number(vocaloidSongs[0].count).toLocaleString()}곡`);
    console.log(`현재 필터링으로 제외되는 곡: ${(totalSongs - Number(vocaloidSongs[0].count)).toLocaleString()}곡`);

  } catch (error) {
    console.error('❌ 에러 발생:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkArtistTypes();
