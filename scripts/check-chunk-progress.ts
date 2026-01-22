/**
 * Check crawler_progress state for specific chunk
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking crawler_progress for chunk 7\n');

  const chunk7Progress = await prisma.crawler_progress.findMany({
    where: {
      crawler_type: {
        contains: 'chunk-7',
      },
    },
    orderBy: { started_at: 'desc' },
    take: 5,
  });

  if (chunk7Progress.length === 0) {
    console.log('❌ No progress records found for chunk 7');
  } else {
    console.log(`📊 Found ${chunk7Progress.length} records for chunk 7:\n`);

    for (const record of chunk7Progress) {
      console.log('─'.repeat(60));
      console.log(`ID: ${record.id}`);
      console.log(`Type: ${record.crawler_type}`);
      console.log(`Status: ${record.status}`);
      console.log(`Started: ${record.started_at.toISOString()}`);
      console.log(`Completed: ${record.completed_at?.toISOString() || 'N/A'}`);
      console.log(`Last Offset: ${record.last_offset}`);
      console.log(`Total Processed: ${record.total_processed}`);
      console.log(`Error: ${record.error_message || 'None'}`);
      console.log(`Metadata: ${JSON.stringify(record.metadata, null, 2)}`);
      console.log();
    }
  }

  // Check all running progress records
  console.log('\n🔄 All running crawler progress:\n');
  const runningProgress = await prisma.crawler_progress.findMany({
    where: { status: 'running' },
    orderBy: { started_at: 'desc' },
  });

  if (runningProgress.length === 0) {
    console.log('✅ No running progress records');
  } else {
    console.log(`⚠️  Found ${runningProgress.length} running records:\n`);
    for (const record of runningProgress) {
      console.log(`- ${record.crawler_type} (offset: ${record.last_offset}, started: ${record.started_at.toISOString()})`);
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
