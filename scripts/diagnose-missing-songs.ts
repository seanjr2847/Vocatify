/**
 * Diagnostic script to investigate missing songs issue
 * Checks crawler progress, tag filtering, and database state
 */

import { PrismaClient } from '@/lib/generated/prisma';

const prisma = new PrismaClient();

async function diagnose() {
  console.log('🔍 Diagnosing missing songs issue...\n');

  try {
    // 1. Check recent crawler runs
    console.log('📊 Recent Crawler Runs:');
    const recentRuns = await prisma.crawlerProgress.findMany({
      where: { crawlerType: 'vocadb' },
      orderBy: { startedAt: 'desc' },
      take: 3,
    });

    for (const run of recentRuns) {
      console.log(`  Status: ${run.status}`);
      console.log(`  Started: ${run.startedAt}`);
      console.log(`  Completed: ${run.completedAt}`);
      console.log(`  Total Processed: ${run.totalProcessed}`);
      console.log(`  Last Offset: ${run.lastOffset}`);
      console.log(`  Error: ${run.errorMessage || 'None'}`);
      console.log('');
    }

    // 2. Count songs in database
    console.log('📈 Database Statistics:');
    const totalSongs = await prisma.song.count();
    const totalTags = await prisma.tag.count();
    const totalSongTags = await prisma.songTag.count();
    console.log(`  Total Songs: ${totalSongs.toLocaleString()}`);
    console.log(`  Total Tags: ${totalTags.toLocaleString()}`);
    console.log(`  Total Song-Tag Relations: ${totalSongTags.toLocaleString()}`);
    console.log('');

    // 3. Check for excluded tags in database
    console.log('🏷️  Excluded Tags Check:');
    const excludedTagNames = ['human singers', 'out of scope (cover unifier)'];

    for (const tagName of excludedTagNames) {
      const tag = await prisma.tag.findFirst({
        where: { name: { equals: tagName, mode: 'insensitive' } },
      });

      if (tag) {
        const songCount = await prisma.songTag.count({
          where: { tagId: tag.vocadbId },
        });
        console.log(`  Tag "${tagName}" (ID: ${tag.vocadbId}): ${songCount} songs`);
        console.log(`  ⚠️  WARNING: Excluded tag found in database! Should have been filtered by crawler.`);
      } else {
        console.log(`  Tag "${tagName}": Not found (✓ correctly excluded)`);
      }
    }
    console.log('');

    // 4. Sample some tags to see what's in the database
    console.log('📋 Sample Tags (top 20 by song count):');
    const topTags = await prisma.$queryRaw<Array<{ name: string; songCount: bigint }>>`
      SELECT t.name, COUNT(st.song_id) as "songCount"
      FROM tags t
      JOIN song_tags st ON t.vocadb_id = st.tag_id
      GROUP BY t.name
      ORDER BY COUNT(st.song_id) DESC
      LIMIT 20
    `;

    topTags.forEach((tag, idx) => {
      console.log(`  ${idx + 1}. ${tag.name}: ${tag.songCount.toString()} songs`);
    });
    console.log('');

    // 5. Check songs with YouTube PVs
    console.log('📺 Songs with YouTube PVs:');
    const songsWithYoutube = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(DISTINCT song_id) as count
      FROM pvs
      WHERE service = 'Youtube'
    `;
    console.log(`  Songs with at least one YouTube PV: ${Number(songsWithYoutube[0].count).toLocaleString()}`);

    const songsWithViewCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(DISTINCT song_id) as count
      FROM pvs
      WHERE service = 'Youtube' AND view_count IS NOT NULL
    `;
    console.log(`  Songs with view counts: ${Number(songsWithViewCount[0].count).toLocaleString()}`);
    console.log('');

    // 6. Check for case sensitivity issues with tag matching
    console.log('🔤 Tag Name Variations (potential case issues):');
    const tagVariations = await prisma.$queryRaw<Array<{ name: string; variations: number }>>`
      SELECT LOWER(name) as name, COUNT(*) as variations
      FROM tags
      GROUP BY LOWER(name)
      HAVING COUNT(*) > 1
      ORDER BY COUNT(*) DESC
      LIMIT 10
    `;

    if (tagVariations.length > 0) {
      console.log('  ⚠️  Found tags with case variations:');
      tagVariations.forEach((tag) => {
        console.log(`    "${tag.name}" has ${tag.variations} different case variations`);
      });
    } else {
      console.log('  ✓ No case sensitivity issues found');
    }
    console.log('');

    // 7. Analyze excluded_songs query performance
    console.log('⚡ Testing excluded_songs CTE:');
    const excludedSongsCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
      WITH excluded_songs AS (
        SELECT DISTINCT st.song_id
        FROM song_tags st
        JOIN tags t ON st.tag_id = t.vocadb_id
        WHERE LOWER(t.name) IN ('human singers', 'out of scope (cover unifier)')
      )
      SELECT COUNT(*) as count FROM excluded_songs
    `;

    const excludedCount = Number(excludedSongsCount[0].count);
    console.log(`  Songs matching excluded_songs CTE: ${excludedCount}`);

    if (excludedCount > 0) {
      console.log(`  ⚠️  WARNING: ${excludedCount} songs with excluded tags found in database!`);
      console.log(`     These should have been filtered by crawler.`);
    } else {
      console.log(`  ✓ No songs with excluded tags in database (correct)`);
      console.log(`  ℹ️  The excluded_songs CTE in db.ts is redundant and can be removed.`);
    }

  } catch (error) {
    console.error('❌ Error during diagnosis:', error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnose();
