/**
 * Search Performance Test
 * 기존 5-table JOIN vs songs_enhanced 단일 테이블 비교
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testSearch() {
  console.log('🔍 검색 성능 테스트: 기존 vs 최적화\n');

  const testQueries = ['miku', '하츠네', 'vocaloid', 'ボカロ'];

  // Test optimized search (songs_enhanced)
  console.log('═══════════════════════════════════════════════');
  console.log('✨ 최적화된 검색 (songs_enhanced 테이블)');
  console.log('═══════════════════════════════════════════════\n');

  for (const query of testQueries) {
    const searchTerm = `%${query}%`;
    const start = Date.now();

    const results = await prisma.$queryRaw<{ song_id: number; default_name: string }[]>`
      SELECT
        se.song_id,
        se.default_name
      FROM songs_enhanced se
      WHERE (
        se.default_name ILIKE ${searchTerm}
        OR se.title_korean ILIKE ${searchTerm}
        OR se.title_english ILIKE ${searchTerm}
        OR se.title_japanese ILIKE ${searchTerm}
        OR se.title_romaji ILIKE ${searchTerm}
        OR se.artist_string ILIKE ${searchTerm}
      )
      AND se.is_vocaloid_song = true
      ORDER BY COALESCE(se.view_count, 0) DESC
      LIMIT 20
    `;

    const elapsed = Date.now() - start;
    console.log(`📝 "${query}": ${elapsed}ms (${results.length} results)`);
  }

  // Test legacy search (5-table JOIN)
  console.log('\n═══════════════════════════════════════════════');
  console.log('📦 기존 검색 (5-table JOIN)');
  console.log('═══════════════════════════════════════════════\n');

  for (const query of testQueries) {
    const searchTerm = `%${query}%`;
    const start = Date.now();

    const results = await prisma.$queryRaw<{ vocadb_id: number }[]>`
      SELECT DISTINCT s.vocadb_id
      FROM songs s
      LEFT JOIN song_names sn ON s.vocadb_id = sn.song_id
      LEFT JOIN song_artists sa ON s.vocadb_id = sa.song_id
      LEFT JOIN artists a ON sa.artist_id = a.vocadb_id
      WHERE (s.default_name ILIKE ${searchTerm}
         OR sn.value ILIKE ${searchTerm}
         OR a.name ILIKE ${searchTerm})
        AND EXISTS (
          SELECT 1 FROM song_artists sa2
          JOIN artists a2 ON sa2.artist_id = a2.vocadb_id
          WHERE sa2.song_id = s.vocadb_id AND a2.artist_type = 'Vocaloid'
        )
      LIMIT 20
    `;

    const elapsed = Date.now() - start;
    console.log(`📝 "${query}": ${elapsed}ms (${results.length} results)`);
  }

  // EXPLAIN ANALYZE for optimized query
  console.log('\n═══════════════════════════════════════════════');
  console.log('📊 Query Plan (songs_enhanced)');
  console.log('═══════════════════════════════════════════════\n');

  const explain = await prisma.$queryRaw<{ 'QUERY PLAN': string }[]>`
    EXPLAIN (ANALYZE, COSTS, BUFFERS)
    SELECT se.song_id, se.default_name
    FROM songs_enhanced se
    WHERE (
      se.default_name ILIKE '%miku%'
      OR se.title_korean ILIKE '%miku%'
      OR se.title_english ILIKE '%miku%'
      OR se.title_japanese ILIKE '%miku%'
      OR se.title_romaji ILIKE '%miku%'
      OR se.artist_string ILIKE '%miku%'
    )
    AND se.is_vocaloid_song = true
    ORDER BY COALESCE(se.view_count, 0) DESC
    LIMIT 20
  `;

  explain.forEach((r) => console.log(`   ${r['QUERY PLAN']}`));

  await prisma.$disconnect();
}

testSearch().catch(console.error);
