/**
 * OtherVoiceSynthesizer 필터 검증 스크립트
 */

import { PrismaClient } from '../lib/generated/prisma';
import { getTotalRanking } from '../lib/db';

const prisma = new PrismaClient();

async function verifyFilterChange() {
  console.log('🔍 필터 변경 검증 중...\n');

  try {
    // 1. Check if Satisfaction (315982) is excluded
    console.log('1️⃣ Satisfaction (Benny Benassi) 제외 확인:');
    console.log('─'.repeat(60));

    const satisfaction = await prisma.songs.findUnique({
      where: { vocadb_id: 315982 },
      include: {
        song_artists: {
          include: { artists: true }
        }
      }
    });

    if (satisfaction) {
      const artistTypes = satisfaction.song_artists.map(sa => sa.artists.artist_type);
      console.log(`곡: ${satisfaction.default_name}`);
      console.log(`아티스트 타입: ${artistTypes.join(', ')}`);

      // Check if it appears in rankings
      const rankings = await getTotalRanking(500, 0);
      const inRankings = rankings.some(s => s.vocadbId === 315982);

      if (inRankings) {
        console.log(`❌ 랭킹에 포함됨 (제외되어야 함!)`);
      } else {
        console.log(`✅ 랭킹에서 제외됨`);
      }
    }

    // 2. Check voice synthesizer type distribution in top 100
    console.log('\n2️⃣ 상위 100곡의 음성 합성 엔진 분포:');
    console.log('─'.repeat(60));

    const top100 = await getTotalRanking(100, 0);
    const top100Ids = top100.map(s => s.vocadbId);

    // Use unnest to properly handle array of IDs
    const artistTypes = await prisma.$queryRaw<Array<{ artist_type: string; count: bigint }>>`
      SELECT
        a.artist_type,
        COUNT(DISTINCT sa.song_id) as count
      FROM song_artists sa
      JOIN artists a ON sa.artist_id = a.vocadb_id
      WHERE sa.song_id = ANY(ARRAY[${top100Ids.join(',')}]::int[])
      GROUP BY a.artist_type
      ORDER BY count DESC
    `;

    artistTypes.forEach(type => {
      console.log(`${type.artist_type.padEnd(30)} ${Number(type.count)}곡`);
    });

    // 3. Show sample songs from different voice synthesizers
    console.log('\n3️⃣ 다양한 음성 합성 엔진 샘플 (상위 100곡 내):');
    console.log('─'.repeat(60));

    const voiceSynthTypes = ['Vocaloid', 'UTAU', 'SynthesizerV', 'CeVIO', 'VOICEVOX'];

    for (const vsType of voiceSynthTypes) {
      const sample = await prisma.$queryRaw<Array<{
        vocadb_id: number;
        default_name: string;
        artist_name: string;
      }>>`
        SELECT DISTINCT
          s.vocadb_id,
          s.default_name,
          a.name as artist_name
        FROM songs s
        JOIN song_artists sa ON s.vocadb_id = sa.song_id
        JOIN artists a ON sa.artist_id = a.vocadb_id
        WHERE s.vocadb_id = ANY(ARRAY[${top100Ids.join(',')}]::int[])
          AND a.artist_type = ${vsType}
        LIMIT 3
      `;

      if (sample.length > 0) {
        console.log(`\n${vsType}:`);
        sample.forEach(song => {
          console.log(`  - ${song.default_name} (${song.artist_name})`);
        });
      }
    }

    // 4. Overall statistics
    console.log('\n4️⃣ 전체 통계:');
    console.log('─'.repeat(60));

    const totalSongs = await prisma.songs.count();

    const includedSongs = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(DISTINCT song_id) as count
      FROM song_artists sa
      JOIN artists a ON sa.artist_id = a.vocadb_id
      WHERE a.artist_type != 'OtherVoiceSynthesizer'
    `;

    const excludedSongs = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(DISTINCT song_id) as count
      FROM song_artists sa
      JOIN artists a ON sa.artist_id = a.vocadb_id
      WHERE a.artist_type = 'OtherVoiceSynthesizer'
        AND NOT EXISTS (
          SELECT 1 FROM song_artists sa2
          JOIN artists a2 ON sa2.artist_id = a2.vocadb_id
          WHERE sa2.song_id = sa.song_id
            AND a2.artist_type != 'OtherVoiceSynthesizer'
        )
    `;

    console.log(`전체 곡 수: ${totalSongs.toLocaleString()}곡`);
    console.log(`포함되는 곡: ${Number(includedSongs[0].count).toLocaleString()}곡`);
    console.log(`제외되는 곡: ${Number(excludedSongs[0].count).toLocaleString()}곡`);

  } catch (error) {
    console.error('❌ 에러 발생:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyFilterChange();
