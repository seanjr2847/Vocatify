/**
 * Full VocaDB Crawl Script
 * Optimized batch processing - ~594 songs/min
 */

import { PrismaClient } from '../lib/generated/prisma';
import { VocaDBCrawler } from '../lib/crawlers/vocadb-crawler';

async function main() {
  const prisma = new PrismaClient();

  try {
    console.log('🚀 Starting FULL VocaDB crawl...');
    console.log('📊 Expected: ~270K songs, ~8 hours\n');

    // Reset any stuck progress
    await VocaDBCrawler.resetProgress(prisma);

    // Full crawl settings
    const crawler = new VocaDBCrawler(prisma, {
      batchSize: 100,           // VocaDB API limit
      maxSongsPerRun: 1000000,  // 100만곡까지
      startOffset: 0,
      enableResume: true,
    });

    const startTime = Date.now();
    const result = await crawler.crawl();
    const totalMinutes = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

    console.log('\n🎉 FULL CRAWL COMPLETE!');
    console.log(`   Total time: ${totalMinutes} minutes`);
    console.log(`   Songs processed: ${result.songsProcessed}`);
    console.log(`   Songs inserted: ${result.songsInserted}`);
    console.log(`   Songs skipped: ${result.songsSkipped}`);

  } catch (error) {
    console.error('❌ Full crawl failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
