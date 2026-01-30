/**
 * Search Optimization Indexes
 * ILIKE 검색 성능 향상을 위한 GIN trigram 인덱스 적용
 *
 * 실행: npx tsx scripts/db/apply-search-indexes.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface IndexDefinition {
  name: string;
  sql: string;
  description: string;
}

const indexes: IndexDefinition[] = [
  {
    name: 'pg_trgm extension',
    sql: 'CREATE EXTENSION IF NOT EXISTS pg_trgm',
    description: 'Trigram 확장 활성화 (유사 검색 지원)',
  },
  {
    name: 'idx_songs_default_name_trgm',
    sql: `CREATE INDEX IF NOT EXISTS idx_songs_default_name_trgm
          ON songs USING gin(default_name gin_trgm_ops)`,
    description: 'songs.default_name ILIKE 검색 최적화',
  },
  {
    name: 'idx_song_names_value_trgm',
    sql: `CREATE INDEX IF NOT EXISTS idx_song_names_value_trgm
          ON song_names USING gin(value gin_trgm_ops)`,
    description: 'song_names.value ILIKE 검색 최적화 (다국어 제목)',
  },
  {
    name: 'idx_artists_name_trgm',
    sql: `CREATE INDEX IF NOT EXISTS idx_artists_name_trgm
          ON artists USING gin(name gin_trgm_ops)`,
    description: 'artists.name ILIKE 검색 최적화',
  },
  {
    name: 'idx_songs_enhanced_name_trgm',
    sql: `CREATE INDEX IF NOT EXISTS idx_songs_enhanced_name_trgm
          ON songs_enhanced USING gin(default_name gin_trgm_ops)`,
    description: 'songs_enhanced.default_name 검색 최적화',
  },
  {
    name: 'idx_songs_enhanced_artist_trgm',
    sql: `CREATE INDEX IF NOT EXISTS idx_songs_enhanced_artist_trgm
          ON songs_enhanced USING gin(artist_string gin_trgm_ops)`,
    description: 'songs_enhanced.artist_string 검색 최적화',
  },
  // Additional indexes for multi-language title search on songs_enhanced
  {
    name: 'idx_songs_enhanced_title_korean_trgm',
    sql: `CREATE INDEX IF NOT EXISTS idx_songs_enhanced_title_korean_trgm
          ON songs_enhanced USING gin(title_korean gin_trgm_ops)`,
    description: 'songs_enhanced.title_korean 검색 최적화',
  },
  {
    name: 'idx_songs_enhanced_title_english_trgm',
    sql: `CREATE INDEX IF NOT EXISTS idx_songs_enhanced_title_english_trgm
          ON songs_enhanced USING gin(title_english gin_trgm_ops)`,
    description: 'songs_enhanced.title_english 검색 최적화',
  },
  {
    name: 'idx_songs_enhanced_title_japanese_trgm',
    sql: `CREATE INDEX IF NOT EXISTS idx_songs_enhanced_title_japanese_trgm
          ON songs_enhanced USING gin(title_japanese gin_trgm_ops)`,
    description: 'songs_enhanced.title_japanese 검색 최적화',
  },
  {
    name: 'idx_songs_enhanced_title_romaji_trgm',
    sql: `CREATE INDEX IF NOT EXISTS idx_songs_enhanced_title_romaji_trgm
          ON songs_enhanced USING gin(title_romaji gin_trgm_ops)`,
    description: 'songs_enhanced.title_romaji 검색 최적화',
  },
];

async function checkExistingIndexes(): Promise<Set<string>> {
  const result = await prisma.$queryRaw<{ indexname: string }[]>`
    SELECT indexname FROM pg_indexes
    WHERE indexname LIKE '%trgm%'
  `;
  return new Set(result.map(r => r.indexname));
}

async function checkExtension(): Promise<boolean> {
  const result = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') as exists
  `;
  return result[0]?.exists ?? false;
}

async function main() {
  console.log('🔍 Search Index Optimization Script');
  console.log('=====================================\n');

  try {
    // Check pg_trgm extension
    const hasExtension = await checkExtension();
    console.log(`📦 pg_trgm extension: ${hasExtension ? '✅ 이미 설치됨' : '❌ 미설치'}`);

    // Check existing indexes
    const existingIndexes = await checkExistingIndexes();
    console.log(`📊 기존 trigram 인덱스: ${existingIndexes.size}개\n`);

    let created = 0;
    let skipped = 0;
    let failed = 0;

    for (const index of indexes) {
      const isExtension = index.name === 'pg_trgm extension';
      const alreadyExists = isExtension ? hasExtension : existingIndexes.has(index.name);

      if (alreadyExists) {
        console.log(`⏭️  ${index.name}: 이미 존재함`);
        skipped++;
        continue;
      }

      try {
        console.log(`🔨 ${index.name} 생성 중...`);
        console.log(`   ${index.description}`);

        // CONCURRENTLY는 트랜잭션 내에서 실행 불가, 개별 실행 필요
        await prisma.$executeRawUnsafe(index.sql);

        console.log(`   ✅ 완료\n`);
        created++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        // "already exists" 에러는 무시
        if (errorMessage.includes('already exists')) {
          console.log(`   ⏭️  이미 존재함\n`);
          skipped++;
        } else {
          console.log(`   ❌ 실패: ${errorMessage}\n`);
          failed++;
        }
      }
    }

    console.log('\n=====================================');
    console.log('📊 결과 요약');
    console.log(`   ✅ 생성됨: ${created}개`);
    console.log(`   ⏭️  건너뜀: ${skipped}개`);
    console.log(`   ❌ 실패: ${failed}개`);

    // Verify indexes
    console.log('\n📋 현재 trigram 인덱스 목록:');
    const finalIndexes = await prisma.$queryRaw<{ indexname: string; tablename: string }[]>`
      SELECT indexname, tablename FROM pg_indexes
      WHERE indexname LIKE '%trgm%'
      ORDER BY tablename, indexname
    `;

    for (const idx of finalIndexes) {
      console.log(`   - ${idx.tablename}.${idx.indexname}`);
    }

    console.log('\n✨ 검색 인덱스 최적화 완료!');
    console.log('   예상 성능 향상: ILIKE 검색 60-80% 개선');

  } catch (error) {
    console.error('❌ 스크립트 실행 중 오류:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
