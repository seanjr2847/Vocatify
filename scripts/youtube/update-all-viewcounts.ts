/**
 * YouTube Full Update Script for GitHub Actions
 *
 * Uses existing UnifiedYouTubeCrawler with no song limit
 * Runs on GitHub Actions runner (6 hour timeout)
 *
 * Usage: npx tsx scripts/youtube/update-all-viewcounts.ts [mode]
 * Modes: new (default), old, top, all
 */

import { PrismaClient } from '@prisma/client';
import { UnifiedYouTubeCrawler, UnifiedCrawlerMode } from '../../lib/crawlers/unified-youtube-crawler';

const prisma = new PrismaClient();

async function main() {
  const mode = (process.argv[2] as UnifiedCrawlerMode) || 'all';

  console.log('='.repeat(60));
  console.log('🎬 YouTube Full Update - GitHub Actions');
  console.log(`📋 Mode: ${mode}`);
  console.log('='.repeat(60));

  // Get total count for reference
  const totalCount = await prisma.song.count();
  console.log(`📊 Total songs in database: ${totalCount.toLocaleString()}\n`);

  const crawler = new UnifiedYouTubeCrawler(prisma, {
    mode,
    batchSize: 50,
    maxSongsPerRun: 999999999,  // No limit
    enableResume: false,        // Fresh run each time
    updateLocalizations: true,
  });

  const result = await crawler.crawl();

  console.log('\n' + '='.repeat(60));
  if (result.success) {
    console.log('✅ YouTube Full Update - Complete');
  } else {
    console.log('❌ YouTube Full Update - Failed');
    console.log(`Error: ${result.error}`);
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
