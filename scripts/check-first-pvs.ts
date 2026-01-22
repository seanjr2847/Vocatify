import { prisma } from '@/lib/prisma';

async function check() {
  const minVocadbId = 7;
  const maxVocadbId = 89953;

  console.log('🔍 Checking first 2000 PVs in chunk 0...\n');

  const pvs = await prisma.pvs.findMany({
    where: {
      service: 'Youtube',
      songs: { vocadb_id: { gte: minVocadbId, lte: maxVocadbId } },
    },
    select: {
      id: true,
      pv_id: true,
      view_count: true,
      view_count_updated_at: true,
      disabled: true,
    },
    orderBy: { id: 'asc' },
    skip: 0,
    take: 2000,
  });

  console.log(`Total PVs fetched: ${pvs.length}`);

  const stats = {
    neverUpdated: 0,
    hasViewCount: 0,
    disabled: 0,
    viewCountNull: 0,
  };

  pvs.forEach(pv => {
    if (pv.disabled) stats.disabled++;
    if (!pv.view_count_updated_at) stats.neverUpdated++;
    if (pv.view_count !== null) stats.hasViewCount++;
    if (pv.view_count === null) stats.viewCountNull++;
  });

  console.log('\nStatistics:');
  console.log(`  Never updated: ${stats.neverUpdated} (${(stats.neverUpdated/pvs.length*100).toFixed(1)}%)`);
  console.log(`  Has view_count: ${stats.hasViewCount} (${(stats.hasViewCount/pvs.length*100).toFixed(1)}%)`);
  console.log(`  view_count is null: ${stats.viewCountNull} (${(stats.viewCountNull/pvs.length*100).toFixed(1)}%)`);
  console.log(`  Disabled: ${stats.disabled} (${(stats.disabled/pvs.length*100).toFixed(1)}%)`);

  console.log('\nSample PVs (first 10):');
  pvs.slice(0, 10).forEach((pv, i) => {
    console.log(`  ${i+1}. https://youtube.com/watch?v=${pv.pv_id} - views:${pv.view_count?.toString() || 'null'}, updated:${pv.view_count_updated_at?.toISOString().slice(0,10) || 'never'}`);
  });

  await prisma.$disconnect();
}

check().catch(console.error);
