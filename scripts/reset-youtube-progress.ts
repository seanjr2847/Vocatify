#!/usr/bin/env tsx
/**
 * Reset YouTube Crawler Progress Records
 *
 * Resets stuck or failed crawler_progress records to allow fresh execution.
 * Use this when crawlers are stuck in infinite loops or need to restart.
 */

import { PrismaClient } from '../lib/generated/prisma';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Resetting YouTube crawler progress records...\n');

  // Find all running or failed YouTube crawler records
  const records = await prisma.crawler_progress.findMany({
    where: {
      crawler_type: { startsWith: 'youtube-unified' },
      OR: [
        { status: 'running' },
        { status: 'failed' },
      ],
    },
    orderBy: { started_at: 'desc' },
  });

  console.log(`Found ${records.length} stuck/failed crawler records:\n`);

  for (const record of records) {
    console.log(`  📋 ${record.crawler_type}`);
    console.log(`     Status: ${record.status}`);
    console.log(`     Started: ${record.started_at.toISOString()}`);
    console.log(`     Last offset: ${record.last_offset}`);
    console.log(`     Total processed: ${record.total_processed}`);
    if (record.error_message) {
      console.log(`     Error: ${record.error_message}`);
    }
    console.log();
  }

  if (records.length === 0) {
    console.log('✅ No stuck records found. All crawlers are in healthy state.\n');
    await prisma.$disconnect();
    return;
  }

  // Reset all stuck records
  const result = await prisma.crawler_progress.updateMany({
    where: {
      crawler_type: { startsWith: 'youtube-unified' },
      OR: [
        { status: 'running' },
        { status: 'failed' },
      ],
    },
    data: {
      status: 'failed',
      completed_at: new Date(),
      error_message: 'Manually reset via reset-youtube-progress.ts script',
    },
  });

  console.log(`✅ Reset ${result.count} crawler progress records.\n`);
  console.log('Next crawler execution will start fresh from offset 0.\n');

  await prisma.$disconnect();
}

main()
  .catch((error) => {
    console.error('💥 Error resetting progress:', error);
    process.exit(1);
  });
