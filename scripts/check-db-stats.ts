import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabaseStats() {
  try {
    console.log('📊 Vocatify 데이터베이스 통계\n');

    // Total songs count
    const songsCount = await prisma.songs.count();
    console.log(`🎵 총 곡 수: ${songsCount.toLocaleString()}곡`);

    // Songs with Vocaloid artists (using songs_enhanced denormalized table)
    const vocaloidSongsCount = await prisma.songs_enhanced.count({
      where: { is_vocaloid_song: true }
    });
    console.log(`🎤 보컬로이드 곡: ${vocaloidSongsCount.toLocaleString()}곡`);

    // YouTube PVs count
    const pvsCount = await prisma.pvs.count();
    console.log(`📺 YouTube PV 수: ${pvsCount.toLocaleString()}개`);

    // Songs with view counts (using songs_enhanced which has denormalized view_count)
    const songsWithViews = await prisma.songs_enhanced.count({
      where: { view_count: { not: null } }
    });
    console.log(`👀 조회수 있는 곡: ${songsWithViews.toLocaleString()}곡`);

    // Daily view count records
    const dailyRecordsCount = await prisma.daily_view_counts.count();
    console.log(`📈 일별 조회수 기록: ${dailyRecordsCount.toLocaleString()}건`);

    // Songs with Korean titles (using songs_enhanced)
    const songsWithKorean = await prisma.songs_enhanced.count({
      where: { title_korean: { not: null } }
    });
    console.log(`🇰🇷 한글 제목 있는 곡: ${songsWithKorean.toLocaleString()}곡`);

    // Latest song publish date
    const latestSong = await prisma.songs.findFirst({
      where: { publish_date: { not: null } },
      orderBy: { publish_date: 'desc' },
      select: {
        publish_date: true,
        default_name: true,
        vocadb_id: true
      }
    });

    if (latestSong) {
      console.log(`\n📅 최신 곡 발행일: ${latestSong.publish_date?.toISOString().split('T')[0]}`);
      console.log(`   곡명: ${latestSong.default_name} (VocaDB ID: ${latestSong.vocadb_id})`);
    }

    // Latest view count update (from pvs table)
    const latestViewUpdate = await prisma.pvs.findFirst({
      where: { view_count_updated_at: { not: null } },
      orderBy: { view_count_updated_at: 'desc' },
      select: {
        view_count_updated_at: true,
        songs: {
          select: {
            default_name: true,
            vocadb_id: true
          }
        }
      }
    });

    if (latestViewUpdate) {
      console.log(`\n🔄 최근 조회수 업데이트: ${latestViewUpdate.view_count_updated_at?.toISOString()}`);
      console.log(`   곡명: ${latestViewUpdate.songs.default_name} (VocaDB ID: ${latestViewUpdate.songs.vocadb_id})`);
    }

    console.log('\n✅ 통계 조회 완료');

  } catch (error) {
    console.error('❌ 에러 발생:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabaseStats();
