#!/usr/bin/env tsx
/**
 * GitHub Actions에서 직접 실행하는 YouTube crawler
 * Vercel endpoint 없이 DB에 직접 연결
 *
 * Usage:
 *   npx tsx scripts/youtube-crawler-direct.ts --chunk=0 --totalChunks=10 --mode=all
 */
import { PrismaClient } from '@/lib/generated/prisma';
import { UnifiedYouTubeCrawler, UnifiedCrawlerMode } from '@/lib/crawlers/unified-youtube-crawler';

const prisma = new PrismaClient();

async function main() {
  const startTime = Date.now();

  // Parse command line arguments
  const args = process.argv.slice(2);
  const chunkArg = args.find(arg => arg.startsWith('--chunk='));
  const totalChunksArg = args.find(arg => arg.startsWith('--totalChunks='));
  const modeArg = args.find(arg => arg.startsWith('--mode='));

  const chunkIndex = chunkArg ? parseInt(chunkArg.split('=')[1]) : undefined;
  const totalChunks = totalChunksArg ? parseInt(totalChunksArg.split('=')[1]) : undefined;
  const mode = (modeArg ? modeArg.split('=')[1] : 'all') as UnifiedCrawlerMode;

  console.log(`🎬 Starting YouTube Crawler`);
  console.log(`   Mode: ${mode}`);
  console.log(`   Chunk: ${chunkIndex !== undefined ? `${chunkIndex}/${totalChunks}` : 'none'}`);

  // Calculate chunk ID range if chunk mode
  let minVocadbId: number | undefined;
  let maxVocadbId: number | undefined;

  if (chunkIndex !== undefined && totalChunks !== undefined) {
    const idRange = await getChunkIdRange(chunkIndex, totalChunks);
    minVocadbId = idRange.minId;
    maxVocadbId = idRange.maxId;
    console.log(`📊 Chunk ID Range: ${minVocadbId} - ${maxVocadbId}`);
  }

  // Initialize crawler
  const crawler = new UnifiedYouTubeCrawler(prisma, {
    mode,
    batchSize: 50,
    maxPVsPerRun: 2000,  // No timeout limit in GitHub Actions (vs Vercel 600s)
    enableResume: true,
    updateLocalizations: true,  // Also fetch Korean titles
    minVocadbId,
    maxVocadbId,
  });

  // Execute crawler
  console.log(`\n🚀 Starting crawler execution...`);
  const result = await crawler.crawl();

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  if (result.success) {
    console.log(`\n✅ Crawler completed successfully in ${duration}s`);
    console.log(`   PVs processed: ${result.pvsProcessed}`);
    console.log(`   PVs updated: ${result.pvsUpdated}`);
    console.log(`   Titles updated: ${result.titlesUpdated || 0}`);
    console.log(`   PVs failed: ${result.pvsFailed}`);
    console.log(`   Completed: ${result.completed}`);
    process.exit(0);
  } else {
    console.error(`\n❌ Crawler failed: ${result.error}`);
    console.error(`   Duration: ${duration}s`);
    console.error(`   PVs processed: ${result.pvsProcessed}`);
    console.error(`   PVs updated: ${result.pvsUpdated}`);
    process.exit(1);
  }
}

/**
 * Calculate vocadb_id range for a specific chunk
 */
async function getChunkIdRange(
  chunkIndex: number,
  totalChunks: number
): Promise<{ minId: number; maxId: number }> {
  // Get global min/max vocadb_id
  const { _min, _max } = await prisma.songs.aggregate({
    _min: { vocadb_id: true },
    _max: { vocadb_id: true },
  });

  const globalMinId = _min.vocadb_id ?? 0;
  const globalMaxId = _max.vocadb_id ?? 0;
  const totalIdRange = globalMaxId - globalMinId + 1;
  const idsPerChunk = Math.ceil(totalIdRange / totalChunks);

  // Calculate this chunk's ID range (inclusive bounds)
  const minId = globalMinId + (chunkIndex * idsPerChunk);
  const maxId = Math.min(globalMinId + ((chunkIndex + 1) * idsPerChunk) - 1, globalMaxId);

  return { minId, maxId };
}

// Run main with error handling
main()
  .catch((e) => {
    console.error('💥 Fatal Error:', e);
    console.error(e.stack);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log('\n🔌 Database connection closed');
  });
