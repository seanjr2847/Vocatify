#!/usr/bin/env tsx
/**
 * Reset YouTube crawler progress for cursor pagination migration
 *
 * Why: Legacy OFFSET-based last_offset values are incompatible with new cursor pagination
 * Solution: Delete all YouTube crawler progress records to start fresh with cursor (PV.id)
 *
 * Usage:
 *   npx tsx scripts/reset-youtube-crawler-progress.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Resetting YouTube crawler progress for cursor pagination migration\n');

  // Find all YouTube crawler progress records (including chunk-specific ones)
  const youtubeRecords = await prisma.crawler_progress.findMany({
    where: {
      crawler_type: {
        startsWith: 'youtube-unified',
      },
    },
    orderBy: { started_at: 'desc' },
  });

  console.log(`📊 Found ${youtubeRecords.length} YouTube crawler progress records\n`);

  if (youtubeRecords.length === 0) {
    console.log('✅ No YouTube crawler progress to reset');
    console.log('   Crawler will start fresh with cursor pagination (PV.id > 0)\n');
    return;
  }

  // Show details of records to be deleted
  console.log('Records to be deleted:');
  for (const record of youtubeRecords) {
    const age = Math.floor((Date.now() - record.started_at.getTime()) / 1000 / 60 / 60);
    console.log(`  - ${record.crawler_type}`);
    console.log(`    Status: ${record.status}`);
    console.log(`    Started: ${age}h ago`);
    console.log(`    Last offset: ${record.last_offset} (OFFSET counter, incompatible with cursor)`);
    console.log(`    Total processed: ${record.total_processed}`);
    if (record.error_message) {
      console.log(`    Error: ${record.error_message}`);
    }
    console.log('');
  }

  console.log('🗑️  Deleting all YouTube crawler progress records...\n');

  const result = await prisma.crawler_progress.deleteMany({
    where: {
      crawler_type: {
        startsWith: 'youtube-unified',
      },
    },
  });

  console.log(`✅ Deleted ${result.count} records\n`);
  console.log('📝 Next steps:');
  console.log('   1. GitHub Secrets: Add connection_limit=5 to DATABASE_URL');
  console.log('   2. Deploy: git push origin main');
  console.log('   3. Run: GitHub Actions will start fresh with cursor pagination');
  console.log('   4. Monitor: Check all 10 chunks complete successfully\n');
  console.log('🎯 Cursor pagination will start from PV.id > 0 (deterministic)\n');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
