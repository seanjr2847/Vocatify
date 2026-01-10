/**
 * YouTube Chunked Update Script for GitHub Actions Matrix Strategy
 *
 * Processes a specific chunk of songs based on CHUNK_INDEX and TOTAL_CHUNKS
 * environment variables. Designed for parallel execution across multiple jobs.
 *
 * Uses ID-range based chunking (minVocadbId/maxVocadbId) instead of OFFSET
 * to avoid PostgreSQL "out of memory" errors with large OFFSET values.
 *
 * Usage: npx tsx scripts/youtube/update-chunked.ts
 *
 * Environment Variables:
 *   CHUNK_INDEX  - Current chunk index (0-based, default: 0)
 *   TOTAL_CHUNKS - Total number of chunks (default: 10)
 *   DATABASE_URL - PostgreSQL connection string
 *   YOUTUBE_API_KEY - YouTube Data API v3 key
 */

import { PrismaClient } from '../../lib/generated/prisma';
import { UnifiedYouTubeCrawler } from '../../lib/crawlers/unified-youtube-crawler';

const prisma = new PrismaClient();

async function main() {
  const chunkIndex = parseInt(process.env.CHUNK_INDEX || '0', 10);
  const totalChunks = parseInt(process.env.TOTAL_CHUNKS || '10', 10);

  console.log('='.repeat(60));
  console.log('🎬 YouTube Chunked Update - GitHub Actions Matrix (ID-Range Mode)');
  console.log(`📦 Chunk: ${chunkIndex + 1}/${totalChunks}`);
  console.log('='.repeat(60));

  // Get min and max vocadbId for ID-range based chunking
  // This avoids PostgreSQL "out of memory" errors with large OFFSET values
  const idRange = await prisma.song.aggregate({
    _min: { vocadbId: true },
    _max: { vocadbId: true },
  });

  const globalMinId = idRange._min.vocadbId ?? 0;
  const globalMaxId = idRange._max.vocadbId ?? 0;
  const totalIdRange = globalMaxId - globalMinId + 1;
  const idsPerChunk = Math.ceil(totalIdRange / totalChunks);

  // Calculate this chunk's ID range (inclusive bounds)
  const minVocadbId = globalMinId + (chunkIndex * idsPerChunk);
  const maxVocadbId = Math.min(globalMinId + ((chunkIndex + 1) * idsPerChunk) - 1, globalMaxId);

  // Count songs in this ID range
  const songsInRange = await prisma.song.count({
    where: {
      vocadbId: { gte: minVocadbId, lte: maxVocadbId },
    },
  });

  console.log(`\n📊 Chunk Configuration (ID-Range Mode):`);
  console.log(`   Global ID range: ${globalMinId.toLocaleString()} - ${globalMaxId.toLocaleString()}`);
  console.log(`   This chunk ID range: ${minVocadbId.toLocaleString()} - ${maxVocadbId.toLocaleString()}`);
  console.log(`   Songs in this range: ${songsInRange.toLocaleString()}\n`);

  if (songsInRange <= 0) {
    console.log('⚠️  No songs to process for this chunk (empty ID range)');
    return { success: true, songsProcessed: 0 };
  }

  const crawler = new UnifiedYouTubeCrawler(prisma, {
    mode: 'all',
    batchSize: 50,
    maxPVsPerRun: songsInRange, // Process all PVs in this ID range
    enableResume: false, // Fresh run for each chunk
    updateLocalizations: true,
    minVocadbId, // Use ID-range based filtering (no OFFSET)
    maxVocadbId,
  });

  const result = await crawler.crawl();

  console.log('\n' + '='.repeat(60));
  if (result.success) {
    console.log(`✅ Chunk ${chunkIndex + 1}/${totalChunks} - Complete`);
    console.log(`   Processed: ${result.pvsProcessed.toLocaleString()} PVs`);
    console.log(`   Updated: ${result.pvsUpdated.toLocaleString()} PVs`);
    console.log(`   Titles: ${result.titlesUpdated.toLocaleString()} updated`);
    console.log(`   Failed: ${result.pvsFailed.toLocaleString()} PVs`);
  } else {
    console.log(`❌ Chunk ${chunkIndex + 1}/${totalChunks} - Failed`);
    console.log(`   Error: ${result.error}`);
  }
  console.log('='.repeat(60));

  return result;
}

main()
  .then((result) => {
    process.exit(result.success ? 0 : 1);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
