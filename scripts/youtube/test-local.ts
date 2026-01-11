/**
 * Local Test Script for YouTube Crawler
 *
 * Tests the transaction-free crawler implementation with a small sample.
 * Safe for local testing before deployment.
 *
 * Usage: npx tsx scripts/youtube/test-local.ts
 */

import { PrismaClient } from '../../lib/generated/prisma';
import { UnifiedYouTubeCrawler } from '../../lib/crawlers/unified-youtube-crawler';

const prisma = new PrismaClient();

async function main() {
  console.log('='.repeat(60));
  console.log('🧪 Local Test - YouTube Crawler (Transaction-Free)');
  console.log('='.repeat(60));

  // Test with very small sample
  const TEST_BATCH_SIZE = 10;  // Process only 10 PVs per batch
  const TEST_MAX_PVS = 50;     // Total limit: 50 PVs

  console.log(`\n📊 Test Configuration:`);
  console.log(`   Batch size: ${TEST_BATCH_SIZE} PVs`);
  console.log(`   Max PVs: ${TEST_MAX_PVS} PVs`);
  console.log(`   Mode: new (songs < 30 days)`);
  console.log(`\n⚠️  This is a SAFE test with limited scope\n`);

  const crawler = new UnifiedYouTubeCrawler(prisma, {
    mode: 'all',  // All songs (more reliable for testing)
    batchSize: TEST_BATCH_SIZE,
    maxPVsPerRun: TEST_MAX_PVS,
    enableResume: false,
    updateLocalizations: true,
  });

  console.log('🚀 Starting test crawl...\n');
  const result = await crawler.crawl();

  console.log('\n' + '='.repeat(60));
  if (result.success) {
    console.log(`✅ Test Complete - SUCCESS`);
    console.log(`   Processed: ${result.pvsProcessed.toLocaleString()} PVs`);
    console.log(`   Updated: ${result.pvsUpdated.toLocaleString()} PVs`);
    console.log(`   Titles: ${result.titlesUpdated.toLocaleString()} updated`);
    console.log(`   Failed: ${result.pvsFailed.toLocaleString()} PVs`);

    if (result.pvsFailed === 0) {
      console.log(`\n🎉 No failures! Transaction-free approach is working!`);
    } else {
      console.log(`\n⚠️  ${result.pvsFailed} failures detected - check logs above`);
    }
  } else {
    console.log(`❌ Test Failed`);
    console.log(`   Error: ${result.error}`);
  }
  console.log('='.repeat(60));

  return result;
}

main()
  .then((result) => {
    console.log('\n💡 Next steps:');
    if (result.success && result.pvsFailed === 0) {
      console.log('   ✅ All tests passed! Safe to deploy.');
      console.log('   👉 Run: git add . && git commit && git push');
    } else {
      console.log('   ⚠️  Review errors before deploying.');
    }
    process.exit(result.success && result.pvsFailed === 0 ? 0 : 1);
  })
  .catch((error) => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
