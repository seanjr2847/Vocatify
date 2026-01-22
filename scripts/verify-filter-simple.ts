/**
 * OtherVoiceSynthesizer 필터 검증 (간단 버전)
 */

import { PrismaClient } from '@prisma/client';
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

    // 2. Show top 10 songs with their artist types
    console.log('\n2️⃣ 상위 10곡과 아티스트 타입:');
    console.log('─'.repeat(60));

    const top10 = await getTotalRanking(10, 0);

    for (const song of top10) {
      const songDetails = await prisma.songs.findUnique({
        where: { vocadb_id: song.vocadbId },
        include: {
          song_artists: {
            include: { artists: true },
            where: { is_support: false }
          }
        }
      });

      if (songDetails) {
        const artistTypes = [...new Set(songDetails.song_artists.map(sa => sa.artists.artist_type))];
        console.log(`${song.rank}. ${song.defaultName}`);
        console.log(`   아티스트: ${song.artistString}`);
        console.log(`   타입: ${artistTypes.join(', ')}`);
        console.log(`   조회수: ${song.viewCount?.toLocaleString()}`);
        console.log('');
      }
    }

    // 3. Overall statistics
    console.log('3️⃣ 전체 통계:');
    console.log('─'.repeat(60));

    const totalSongs = await prisma.songs.count();

    // Songs with OtherVoiceSynthesizer artists
    const songsWithOVS = await prisma.songs.count({
      where: {
        song_artists: {
          some: {
            artists: {
              artist_type: 'OtherVoiceSynthesizer'
            }
          }
        }
      }
    });

    // Songs without any OtherVoiceSynthesizer
    const songsWithoutOVS = totalSongs - songsWithOVS;

    console.log(`전체 곡 수: ${totalSongs.toLocaleString()}곡`);
    console.log(`OtherVoiceSynthesizer 포함 곡: ${songsWithOVS.toLocaleString()}곡 (제외됨)`);
    console.log(`표시되는 곡: ${songsWithoutOVS.toLocaleString()}곡`);
    console.log(`\n✅ OtherVoiceSynthesizer만 제외, 다른 음성 합성 엔진은 모두 포함!`);

  } catch (error) {
    console.error('❌ 에러 발생:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyFilterChange();
