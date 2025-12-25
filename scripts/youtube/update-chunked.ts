/**
 * YouTube Chunked Update Script for GitHub Actions Matrix Strategy
 *
 * Processes a specific chunk of songs based on CHUNK_INDEX and TOTAL_CHUNKS
 * environment variables. Designed for parallel execution across multiple jobs.
 *
 * Usage: npx tsx scripts/youtube/update-chunked.ts
 *
 * Environment Variables:
 *   CHUNK_INDEX  - Current chunk index (0-based, default: 0)
 *   TOTAL_CHUNKS - Total number of chunks (default: 5)
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
  console.log('🎬 YouTube Chunked Update - GitHub Actions Matrix');
  console.log(`📦 Chunk: ${chunkIndex + 1}/${totalChunks}`);
  console.log('='.repeat(60));

  // Get total song count
  const totalSongs = await prisma.song.count();
  const songsPerChunk = Math.ceil(totalSongs / totalChunks);

  // Calculate this chunk's range
  const startOffset = chunkIndex * songsPerChunk;
  const maxSongs = Math.min(songsPerChunk, totalSongs - startOffset);

  console.log(`\n📊 Chunk Configuration:`);
  console.log(`   Total songs in DB: ${totalSongs.toLocaleString()}`);
  console.log(`   Songs per chunk: ${songsPerChunk.toLocaleString()}`);
  console.log(`   This chunk range: ${startOffset.toLocaleString()} - ${(startOffset + maxSongs).toLocaleString()}`);
  console.log(`   Max songs to process: ${maxSongs.toLocaleString()}\n`);

  if (maxSongs <= 0) {
    console.log('⚠️  No songs to process for this chunk (offset exceeds total)');
    return { success: true, songsProcessed: 0 };
  }

  const crawler = new UnifiedYouTubeCrawler(prisma, {
    mode: 'all',
    batchSize: 50,
    maxSongsPerRun: maxSongs,
    enableResume: false, // Fresh run for each chunk
    updateLocalizations: true,
    startOffset,
  });

  const result = await crawler.crawl();

  console.log('\n' + '='.repeat(60));
  if (result.success) {
    console.log(`✅ Chunk ${chunkIndex + 1}/${totalChunks} - Complete`);
    console.log(`   Processed: ${result.songsProcessed.toLocaleString()} songs`);
    console.log(`   Updated: ${result.songsUpdated.toLocaleString()} songs`);
    console.log(`   Titles: ${result.titlesUpdated.toLocaleString()} updated`);
    console.log(`   Failed: ${result.songsFailed.toLocaleString()} songs`);
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
