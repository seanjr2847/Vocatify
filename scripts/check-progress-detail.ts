import { prisma } from '../lib/prisma';

async function main() {
  const progress = await prisma.crawler_progress.findMany({
    where: {
      crawler_type: { startsWith: 'youtube-unified-chunk' },
    },
    orderBy: { started_at: 'desc' },
    take: 5,
  });

  console.log('📊 Recent Crawler Progress Records:\n');

  for (const p of progress) {
    console.log(`Crawler: ${p.crawler_type}`);
    console.log(`Status: ${p.status}`);
    console.log(`Started: ${p.started_at}`);
    console.log(`Last Offset: ${p.last_offset}`);
    console.log(`Total Processed: ${p.total_processed}`);
    console.log(`Metadata:`, JSON.stringify(p.metadata, null, 2));
    console.log('---\n');
  }

  await prisma.$disconnect();
}

main();
