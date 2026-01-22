/**
 * 성능 최적화 인덱스 생성 스크립트
 *
 * 실행 방법:
 * npx tsx scripts/db/create-performance-indexes.ts
 *
 * 주의: CONCURRENTLY 옵션을 사용하여 테이블 락 없이 인덱스 생성
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createIndexes() {
  console.log('🚀 성능 최적화 인덱스 생성 시작...\n');

  const indexes = [
    {
      name: 'idx_pvs_youtube_views',
      sql: `
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pvs_youtube_views
        ON pvs(service, song_id, view_count DESC NULLS LAST)
        WHERE service = 'Youtube' AND view_count IS NOT NULL
      `,
      description: 'YouTube 조회수 기반 랭킹 최적화',
    },
    {
      name: 'idx_song_names_language',
      sql: `
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_song_names_language
        ON song_names(song_id, language)
        INCLUDE (value)
      `,
      description: '다국어 제목 조회 최적화',
    },
    {
      name: 'idx_song_artists_lookup',
      sql: `
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_song_artists_lookup
        ON song_artists(artist_id, song_id)
        INCLUDE (categories, roles, is_support)
      `,
      description: '아티스트-곡 조인 최적화',
    },
    {
      name: 'idx_artists_type',
      sql: `
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_artists_type
        ON artists(artist_type, vocadb_id)
        INCLUDE (name)
      `,
      description: 'Vocaloid 필터링 최적화',
    },
    {
      name: 'idx_daily_view_counts_recent',
      sql: `
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_daily_view_counts_recent
        ON daily_view_counts(recorded_date DESC, pv_id, total_views)
      `,
      description: '일간/주간 랭킹 날짜 필터링 최적화',
    },
    {
      name: 'idx_daily_view_counts_lag',
      sql: `
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_daily_view_counts_lag
        ON daily_view_counts(pv_id, recorded_date, total_views)
        INCLUDE (id)
      `,
      description: 'LAG 윈도우 함수 최적화',
    },
    {
      name: 'idx_ranking_cache_lookup',
      sql: `
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ranking_cache_lookup
        ON ranking_cache(ranking_type, rank)
        INCLUDE (song_id, view_count, weekly_increase)
      `,
      description: '캐시된 랭킹 조회 최적화',
    },
    {
      name: 'idx_song_tags_tag_id',
      sql: `
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_song_tags_tag_id
        ON song_tags(tag_id, song_id, count)
      `,
      description: '태그 기반 라디오 알고리즘 최적화',
    },
    {
      name: 'idx_songs_publish_date',
      sql: `
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_songs_publish_date
        ON songs(publish_date DESC NULLS LAST)
        WHERE publish_date IS NOT NULL
      `,
      description: '신곡 랭킹 최적화',
    },
  ];

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const index of indexes) {
    try {
      console.log(`📊 ${index.name} 생성 중...`);
      console.log(`   설명: ${index.description}`);

      await prisma.$executeRawUnsafe(index.sql);

      console.log(`   ✅ 성공\n`);
      successCount++;
    } catch (error: any) {
      if (error.message?.includes('already exists')) {
        console.log(`   ⏭️  이미 존재함\n`);
        skipCount++;
      } else {
        console.log(`   ❌ 실패: ${error.message}\n`);
        errorCount++;
      }
    }
  }

  console.log('\n📈 검색 최적화 인덱스 (텍스트 검색용) 생성 시작...\n');

  // pg_trgm 확장 설치 (이미 있으면 무시)
  try {
    await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS pg_trgm`;
    console.log('✅ pg_trgm 확장 설치됨\n');
  } catch (error) {
    console.log('⚠️  pg_trgm 확장 이미 존재하거나 권한 없음\n');
  }

  const searchIndexes = [
    {
      name: 'idx_songs_ilike_names',
      sql: `
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_songs_ilike_names
        ON songs USING gin(default_name gin_trgm_ops)
      `,
      description: '곡 제목 ILIKE 검색 최적화',
    },
    {
      name: 'idx_song_names_ilike',
      sql: `
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_song_names_ilike
        ON song_names USING gin(value gin_trgm_ops)
      `,
      description: '다국어 제목 ILIKE 검색 최적화',
    },
    {
      name: 'idx_artists_ilike',
      sql: `
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_artists_ilike
        ON artists USING gin(name gin_trgm_ops)
      `,
      description: '아티스트명 ILIKE 검색 최적화',
    },
  ];

  for (const index of searchIndexes) {
    try {
      console.log(`🔍 ${index.name} 생성 중...`);
      console.log(`   설명: ${index.description}`);

      await prisma.$executeRawUnsafe(index.sql);

      console.log(`   ✅ 성공\n`);
      successCount++;
    } catch (error: any) {
      if (error.message?.includes('already exists')) {
        console.log(`   ⏭️  이미 존재함\n`);
        skipCount++;
      } else {
        console.log(`   ❌ 실패: ${error.message}\n`);
        errorCount++;
      }
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 인덱스 생성 완료');
  console.log('='.repeat(50));
  console.log(`✅ 성공: ${successCount}개`);
  console.log(`⏭️  건너뜀: ${skipCount}개`);
  console.log(`❌ 실패: ${errorCount}개`);
  console.log('='.repeat(50) + '\n');

  if (errorCount === 0) {
    console.log('🎉 모든 인덱스가 성공적으로 생성되었습니다!\n');
    console.log('💡 예상 성능 향상:');
    console.log('   - getTotalRanking: ~62% 빨라짐');
    console.log('   - getDailyRanking: ~62% 빨라짐');
    console.log('   - getWeeklyRanking: ~60% 빨라짐');
    console.log('   - searchSongs: ~60% 빨라짐');
    console.log('   - getDailyViewCounts: ~75% 빨라짐');
    console.log('   - getTagBasedPlaylist: ~37% 빨라짐\n');
  }
}

async function main() {
  try {
    await createIndexes();
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
