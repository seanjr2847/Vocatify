import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkRecentViewCounts() {
  try {
    console.log('=== 최근 추가된 곡들의 조회수 상태 확인 ===\n');

    // 최근 7일 이내 추가된 곡들 조회
    const recentSongs = await prisma.songs.findMany({
      where: {
        crawled_at: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      },
      orderBy: {
        crawled_at: 'desc'
      },
      take: 100,
      select: {
        vocadb_id: true,
        default_name: true,
        publish_date: true,
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
        },
        song_artists: {
          select: {
            artists: {
              select: {
                artist_type: true
              }
            }
          }
        }
      }
    });

    console.log(`총 ${recentSongs.length}개의 최근 곡 발견\n`);

    // YouTube PV가 있는 곡들
    const songsWithYoutube = recentSongs.filter(s => s.pvs.length > 0);
    console.log(`YouTube PV 있는 곡: ${songsWithYoutube.length}개`);

    // YouTube PV는 있지만 조회수가 없는 곡들 (문제 케이스)
    const problematicSongs = songsWithYoutube.filter(s =>
      s.pvs.some(pv => pv.view_count === null)
    );
    console.log(`YouTube PV는 있지만 조회수 없는 곡: ${problematicSongs.length}개\n`);

    if (problematicSongs.length > 0) {
      console.log('=== 문제가 있는 곡들 (YouTube PV 있지만 조회수 없음) ===');
      problematicSongs.slice(0, 10).forEach(song => {
        const youtubePv = song.pvs.find(pv => pv.view_count === null);
        const isVocaloid = song.song_artists.some(sa => sa.artists.artist_type === 'Vocaloid');

        console.log(`\nVocaDB ID: ${song.vocadb_id}`);
        console.log(`제목: ${song.default_name}`);
        console.log(`YouTube ID: ${youtubePv?.pv_id}`);
        console.log(`보컬로이드 곡: ${isVocaloid ? 'Yes' : 'No'}`);
        console.log(`크롤 시간: ${song.crawled_at?.toISOString()}`);
        console.log(`발행일: ${song.publish_date?.toISOString() || 'N/A'}`);
      });
    }

    // YouTube crawler 실행 기록 확인
    console.log('\n=== YouTube Crawler 실행 기록 ===');
    const crawlerProgress = await prisma.crawler_progress.findMany({
      where: {
        crawler_type: 'youtube'
      },
      orderBy: {
        started_at: 'desc'
      },
      take: 5
    });

    crawlerProgress.forEach(p => {
      console.log(`\n상태: ${p.status}`);
      const metadata = p.metadata as any;
      console.log(`모드: ${metadata?.mode || 'N/A'}`);
      console.log(`시작: ${p.started_at?.toISOString()}`);
      console.log(`완료: ${p.completed_at?.toISOString() || '진행중'}`);
      console.log(`처리: ${p.total_processed || 0}개`);
      if (p.error_message) {
        console.log(`에러: ${p.error_message}`);
      }
    });

    // 통계 정보
    console.log('\n=== 전체 통계 ===');
    const totalSongs = await prisma.songs.count();
    const pvsWithViews = await prisma.pvs.count({
      where: {
        service: 'Youtube',
        view_count: {
          not: null
        }
      }
    });
    const totalYoutubePvs = await prisma.pvs.count({
      where: {
        service: 'Youtube'
      }
    });

    console.log(`전체 곡: ${totalSongs}개`);
    console.log(`YouTube PV: ${totalYoutubePvs}개`);
    console.log(`조회수 있는 PV: ${pvsWithViews}개`);
    console.log(`조회수 커버리지: ${((pvsWithViews / totalYoutubePvs) * 100).toFixed(2)}%`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRecentViewCounts();
