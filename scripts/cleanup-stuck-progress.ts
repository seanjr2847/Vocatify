/**
 * Cleanup stuck "running" crawler progress records
 * Mark records as failed if they've been running for > 30 minutes
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Cleaning up stuck crawler progress records\n');

  // Find all "running" records older than 30 minutes
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

  const stuckRecords = await prisma.crawler_progress.findMany({
    where: {
      status: 'running',
      started_at: {
        lt: thirtyMinutesAgo,
      },
    },
  });

  console.log(`📊 Found ${stuckRecords.length} stuck records (running > 30 min)\n`);

  if (stuckRecords.length === 0) {
    console.log('✅ No stuck records to clean up');
    return;
  }

  for (const record of stuckRecords) {
    const age = Math.floor((Date.now() - record.started_at.getTime()) / 1000 / 60);
    console.log(`- ${record.crawler_type} (started ${age} min ago, offset: ${record.last_offset})`);
  }

  console.log(`\n🔧 Marking ${stuckRecords.length} records as failed...\n`);

  const result = await prisma.crawler_progress.updateMany({
    where: {
      status: 'running',
      started_at: {
        lt: thirtyMinutesAgo,
      },
    },
    data: {
      status: 'failed',
      completed_at: new Date(),
      error_message: 'Automatically marked as failed: exceeded 30-minute timeout',
    },
  });

  console.log(`✅ Updated ${result.count} records to 'failed' status\n`);

  // Show remaining running records
  const remainingRunning = await prisma.crawler_progress.count({
    where: { status: 'running' },
  });

  console.log(`📊 Remaining running records: ${remainingRunning}`);

  if (remainingRunning > 0) {
    const activeRecords = await prisma.crawler_progress.findMany({
      where: { status: 'running' },
      orderBy: { started_at: 'desc' },
      take: 5,
    });

    console.log('\nActive records (< 30 min):');
    for (const record of activeRecords) {
      const age = Math.floor((Date.now() - record.started_at.getTime()) / 1000 / 60);
      console.log(`- ${record.crawler_type} (started ${age} min ago)`);
    }
  }
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
