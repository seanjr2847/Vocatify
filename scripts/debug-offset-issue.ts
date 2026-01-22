import { prisma } from '@/lib/prisma';

async function debug() {
  console.log('🔍 Debugging offset issue...\n');

  // Check chunk 0 range (vocadb_id 7-89953)
  const minVocadbId = 7;
  const maxVocadbId = 89953;

  // Total PVs in chunk 0
  const total = await prisma.pvs.count({
    where: {
      service: 'Youtube',
      songs: { vocadb_id: { gte: minVocadbId, lte: maxVocadbId } },
    },
  });
  console.log(`Total PVs in chunk 0 (vocadb_id ${minVocadbId}-${maxVocadbId}): ${total.toLocaleString()}`);

  // First 5 PVs (skip 0)
  const first5 = await prisma.pvs.findMany({
    where: {
      service: 'Youtube',
      songs: { vocadb_id: { gte: minVocadbId, lte: maxVocadbId } },
    },
    select: { id: true, song_id: true, pv_id: true },
    orderBy: { id: 'asc' },
    skip: 0,
    take: 5,
  });

  console.log('\nFirst 5 PVs (skip: 0):');
  first5.forEach((pv, i) => {
    console.log(`  ${i + 1}. PV.id=${pv.id}, song_id=${pv.song_id}, pv_id=${pv.pv_id}`);
  });

  // Next 5 PVs (skip 2000)
  const next5 = await prisma.pvs.findMany({
    where: {
      service: 'Youtube',
      songs: { vocadb_id: { gte: minVocadbId, lte: maxVocadbId } },
    },
    select: { id: true, song_id: true, pv_id: true },
    orderBy: { id: 'asc' },
    skip: 2000,
    take: 5,
  });

  console.log('\nNext 5 PVs (skip: 2000):');
  next5.forEach((pv, i) => {
    console.log(`  ${i + 1}. PV.id=${pv.id}, song_id=${pv.song_id}, pv_id=${pv.pv_id}`);
  });

  // Check if they're different
  const same = first5.every((pv, i) => pv.id === next5[i]?.id);
  console.log(`\n${same ? '❌ PROBLEM: Same results!' : '✅ Different results (normal)'}`);

  await prisma.$disconnect();
}

debug().catch(console.error);
