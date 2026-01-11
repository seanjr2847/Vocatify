/**
 * Reset stuck crawler progress
 * Use this when crawler is stuck in "running" state
 */

import { PrismaClient } from '@/lib/generated/prisma';

const prisma = new PrismaClient();

async function resetStuckCrawler() {
  console.log('🔄 Checking for stuck crawlers...\n');

  try {
    // Find all running crawlers
    const runningCrawlers = await prisma.crawlerProgress.findMany({
      where: { status: 'running' },
      orderBy: { startedAt: 'asc' },
    });

    if (runningCrawlers.length === 0) {
      console.log('✅ No stuck crawlers found. All clear!\n');
      return;
    }

    console.log(`⚠️  Found ${runningCrawlers.length} crawler(s) in "running" state:\n`);

    for (const crawler of runningCrawlers) {
      const age = Date.now() - crawler.startedAt.getTime();
      const ageHours = (age / 1000 / 60 / 60).toFixed(1);

      console.log(`  Crawler: ${crawler.crawlerType}`);
      console.log(`  Started: ${crawler.startedAt}`);
      console.log(`  Age: ${ageHours} hours`);
      console.log(`  Last Offset: ${crawler.lastOffset}`);
      console.log(`  Total Processed: ${crawler.totalProcessed}`);
      console.log('');

      // Reset crawler status
      await prisma.crawlerProgress.update({
        where: { id: crawler.id },
        data: {
          status: 'failed',
          completedAt: new Date(),
          errorMessage: `Manually reset - crawler stuck for ${ageHours} hours`,
        },
      });

      console.log(`  ✅ Reset crawler "${crawler.crawlerType}" to failed status\n`);
    }

    console.log('✅ All stuck crawlers have been reset. You can now run new crawlers.\n');

  } catch (error) {
    console.error('❌ Error resetting crawlers:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetStuckCrawler();
