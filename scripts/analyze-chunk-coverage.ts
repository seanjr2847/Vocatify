import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeChunkCoverage() {
  try {
    console.log('=== 청크별 커버리지 분석 ===\n');

    // 문제의 곡들 확인
    const problematicSongIds = [903880, 904041, 904103, 904119, 904125, 904152, 904157, 904194, 904236];

    console.log('문제의 곡들이 속한 청크 확인:\n');

    for (const songId of problematicSongIds) {
      // 해당 곡의 청크 범위 찾기
      const chunks = [
        { name: 'CHUNK-7-90430', min: 7, max: 90430 },
        { name: 'CHUNK-90431-180854', min: 90431, max: 180854 },
        { name: 'CHUNK-180855-271278', min: 180855, max: 271278 },
        { name: 'CHUNK-271279-361702', min: 271279, max: 361702 },
        { name: 'CHUNK-361703-452126', min: 361703, max: 452126 },
        { name: 'CHUNK-452127-542550', min: 452127, max: 542550 },
        { name: 'CHUNK-542551-632974', min: 542551, max: 632974 },
        { name: 'CHUNK-632975-723398', min: 632975, max: 723398 },
        { name: 'CHUNK-723399-813822', min: 723399, max: 813822 },
        { name: 'CHUNK-813823-904239', min: 813823, max: 904239 },
      ];

      const chunk = chunks.find(c => songId >= c.min && songId <= c.max);

      if (chunk) {
        // 해당 청크의 크롤러 실행 기록 찾기
        const crawlerRecord = await prisma.crawler_progress.findFirst({
          where: {
            id: {
              contains: chunk.name.replace('CHUNK-', '')
            },
            started_at: {
              gte: new Date('2026-01-23T03:45:00Z')
            }
          }
        });

        // 해당 곡의 PV 확인
        const pv = await prisma.pvs.findFirst({
          where: {
            song_id: songId,
            service: 'Youtube'
          },
          select: {
            pv_id: true,
            view_count: true,
            view_count_updated_at: true
          }
        });

        console.log(`VocaDB ${songId}: ${chunk.name}`);
        if (crawlerRecord) {
          console.log(`  크롤러: 처리 ${crawlerRecord.total_processed}개`);
          console.log(`  상태: ${crawlerRecord.status}`);
        }
        if (pv) {
          console.log(`  PV ID: ${pv.pv_id}`);
          console.log(`  조회수: ${pv.view_count?.toString() || 'null'}`);
          console.log(`  업데이트: ${pv.view_count_updated_at?.toISOString() || 'never'}`);
        }
        console.log();
      }
    }

    // 청크 813823-904239의 상세 분석
    console.log('\n=== CHUNK-813823-904239 상세 분석 ===\n');

    const targetChunk = await prisma.crawler_progress.findFirst({
      where: {
        crawler_type: 'youtube-unified-chunk-813823-904239',
        started_at: {
          gte: new Date('2026-01-23T03:45:00Z')
        }
      }
    });

    if (targetChunk) {
      console.log('크롤러 정보:');
      console.log(`  ID: ${targetChunk.id}`);
      console.log(`  시작: ${targetChunk.started_at.toISOString()}`);
      console.log(`  완료: ${targetChunk.completed_at?.toISOString()}`);
      console.log(`  처리: ${targetChunk.total_processed}개`);
      console.log(`  에러: ${targetChunk.error_message || 'none'}\n`);

      // 해당 범위의 전체 PV 수
      const totalPVsInRange = await prisma.pvs.count({
        where: {
          service: 'Youtube',
          song_id: {
            gte: 813823,
            lte: 904239
          }
        }
      });

      // 해당 범위에서 오늘 업데이트된 PV 수
      const updatedPVsInRange = await prisma.pvs.count({
        where: {
          service: 'Youtube',
          song_id: {
            gte: 813823,
            lte: 904239
          },
          view_count_updated_at: {
            gte: new Date('2026-01-23T03:45:00Z')
          }
        }
      });

      // 해당 범위에서 조회수가 없는 PV 수
      const nullPVsInRange = await prisma.pvs.count({
        where: {
          service: 'Youtube',
          song_id: {
            gte: 813823,
            lte: 904239
          },
          view_count: null
        }
      });

      console.log('범위 내 PV 통계:');
      console.log(`  전체 PV: ${totalPVsInRange}개`);
      console.log(`  오늘 업데이트: ${updatedPVsInRange}개`);
      console.log(`  조회수 null: ${nullPVsInRange}개`);
      console.log(`  커버리지: ${((updatedPVsInRange / totalPVsInRange) * 100).toFixed(2)}%`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeChunkCoverage();
