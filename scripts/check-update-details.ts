import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUpdateDetails() {
  try {
    console.log('=== 최근 업데이트 상세 분석 ===\n');

    // 오늘 03:45 크롤러 세션의 실제 업데이트 확인
    const today0345CrawlerTime = new Date('2026-01-23T03:45:00Z');
    const today0345EndTime = new Date('2026-01-23T04:00:00Z');

    // 해당 시간대에 업데이트된 PV 확인
    const updatedPVs = await prisma.pvs.findMany({
      where: {
        service: 'Youtube',
        view_count_updated_at: {
          gte: today0345CrawlerTime,
          lte: today0345EndTime
        }
      },
      select: {
        id: true,
        pv_id: true,
        song_id: true,
        view_count: true,
        view_count_updated_at: true,
        songs: {
          select: {
            vocadb_id: true,
            default_name: true,
            crawled_at: true
          }
        }
      },
      take: 10
    });

    console.log(`03:45 크롤러 실행 중 업데이트된 PV: ${updatedPVs.length}개 (샘플)\n`);

    if (updatedPVs.length > 0) {
      console.log('샘플 PV 5개:');
      updatedPVs.slice(0, 5).forEach((pv, idx) => {
        console.log(`\n${idx + 1}. YouTube ID: ${pv.pv_id}`);
        console.log(`   곡: ${pv.songs.default_name} (VocaDB: ${pv.songs.vocadb_id})`);
        console.log(`   조회수: ${pv.view_count?.toString() || 'null'}`);
        console.log(`   업데이트: ${pv.view_count_updated_at?.toISOString()}`);
        console.log(`   곡 크롤 시간: ${pv.songs.crawled_at?.toISOString()}`);
      });
    }

    // 오늘 03:44에 추가된 곡들 확인
    const newSongsTime = new Date('2026-01-23T03:44:00Z');
    const newSongsEndTime = new Date('2026-01-23T03:45:00Z');

    const newSongs = await prisma.songs.findMany({
      where: {
        crawled_at: {
          gte: newSongsTime,
          lte: newSongsEndTime
        }
      },
      select: {
        vocadb_id: true,
        default_name: true,
        crawled_at: true,
        pvs: {
          where: {
            service: 'Youtube'
          },
          select: {
            pv_id: true,
            view_count: true,
            view_count_updated_at: true
          }
        }
      }
    });

    console.log(`\n\n=== 03:44에 추가된 새 곡: ${newSongs.length}개 ===\n`);

    newSongs.forEach((song, idx) => {
      const pv = song.pvs[0];
      console.log(`\n${idx + 1}. ${song.default_name} (VocaDB: ${song.vocadb_id})`);
      console.log(`   크롤 시간: ${song.crawled_at.toISOString()}`);
      if (pv) {
        console.log(`   YouTube ID: ${pv.pv_id}`);
        console.log(`   조회수: ${pv.view_count?.toString() || 'null'}`);
        console.log(`   업데이트: ${pv.view_count_updated_at?.toISOString() || 'never'}`);
      } else {
        console.log(`   YouTube PV: 없음`);
      }
    });

    // 전체 통계
    console.log('\n\n=== 전체 통계 ===');

    const totalPVs = await prisma.pvs.count({
      where: { service: 'Youtube' }
    });

    const updatedToday = await prisma.pvs.count({
      where: {
        service: 'Youtube',
        view_count_updated_at: {
          gte: new Date('2026-01-23T00:00:00Z')
        }
      }
    });

    const neverUpdated = await prisma.pvs.count({
      where: {
        service: 'Youtube',
        view_count: null
      }
    });

    console.log(`전체 YouTube PV: ${totalPVs}개`);
    console.log(`오늘 업데이트된 PV: ${updatedToday}개`);
    console.log(`조회수 없는 PV: ${neverUpdated}개`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUpdateDetails();
