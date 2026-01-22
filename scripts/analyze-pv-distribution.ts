#!/usr/bin/env tsx
/**
 * Analyze PV distribution for optimal chunking strategy
 *
 * Compares:
 * 1. Current V1 strategy: vocadb_id based (uneven distribution)
 * 2. Proposed V2 strategy: PV.id based (even distribution)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('📊 PV Distribution Analysis for Chunking Strategy\n');

  // 1. Overall statistics
  const stats = await prisma.pvs.aggregate({
    where: { service: 'Youtube' },
    _count: { id: true },
    _min: { id: true, song_id: true },
    _max: { id: true, song_id: true }
  });

  console.log('=== Overall Statistics ===');
  console.log(`Total YouTube PVs: ${stats._count.id?.toLocaleString()}`);
  console.log(`PV.id range: ${stats._min.id} → ${stats._max.id}`);
  console.log(`song_id range: ${stats._min.song_id} → ${stats._max.song_id}\n`);

  // 2. Current V1 strategy (vocadb_id based)
  console.log('=== V1 Strategy: vocadb_id based chunking ===');

  const totalChunks = 10;
  const songsWithPVs = await prisma.songs.findMany({
    where: {
      pvs: {
        some: { service: 'Youtube' }
      }
    },
    select: { vocadb_id: true },
    orderBy: { vocadb_id: 'asc' }
  });

  const minVocadbId = songsWithPVs[0].vocadb_id;
  const maxVocadbId = songsWithPVs[songsWithPVs.length - 1].vocadb_id;
  const vocadbIdRange = maxVocadbId - minVocadbId;
  const idsPerChunk = Math.ceil(vocadbIdRange / totalChunks);

  console.log(`VocaDB ID range: ${minVocadbId} → ${maxVocadbId}`);
  console.log(`IDs per chunk: ${idsPerChunk.toLocaleString()}\n`);

  const v1Distribution = [];
  for (let i = 0; i < totalChunks; i++) {
    const chunkMinId = minVocadbId + (i * idsPerChunk);
    const chunkMaxId = minVocadbId + ((i + 1) * idsPerChunk) - 1;

    const pvCount = await prisma.pvs.count({
      where: {
        service: 'Youtube',
        songs: {
          vocadb_id: { gte: chunkMinId, lte: chunkMaxId }
        }
      }
    });

    v1Distribution.push({ chunk: i, minId: chunkMinId, maxId: chunkMaxId, pvCount });
    console.log(`Chunk ${i}: vocadb_id ${chunkMinId}-${chunkMaxId} → ${pvCount.toLocaleString()} PVs`);
  }

  // Calculate V1 statistics
  const v1PVCounts = v1Distribution.map(d => d.pvCount);
  const v1Min = Math.min(...v1PVCounts);
  const v1Max = Math.max(...v1PVCounts);
  const v1Avg = v1PVCounts.reduce((a, b) => a + b, 0) / v1PVCounts.length;
  const v1StdDev = Math.sqrt(
    v1PVCounts.map(x => Math.pow(x - v1Avg, 2)).reduce((a, b) => a + b, 0) / v1PVCounts.length
  );

  console.log(`\nV1 Distribution:`);
  console.log(`  Min: ${v1Min.toLocaleString()} PVs`);
  console.log(`  Max: ${v1Max.toLocaleString()} PVs`);
  console.log(`  Avg: ${Math.round(v1Avg).toLocaleString()} PVs`);
  console.log(`  Std Dev: ${Math.round(v1StdDev).toLocaleString()}`);
  console.log(`  Max/Min Ratio: ${(v1Max / v1Min).toFixed(2)}x`);
  console.log(`  Coefficient of Variation: ${((v1StdDev / v1Avg) * 100).toFixed(1)}%\n`);

  // 3. Proposed V2 strategy (PV.id based)
  console.log('=== V2 Strategy: PV.id based chunking ===');

  const { _min: pvIdMin, _max: pvIdMax } = await prisma.pvs.aggregate({
    where: { service: 'Youtube' },
    _min: { id: true },
    _max: { id: true }
  });

  const minPvId = pvIdMin.id ?? 0;
  const maxPvId = pvIdMax.id ?? 0;
  const pvsPerChunk = Math.ceil((maxPvId - minPvId + 1) / totalChunks);

  console.log(`PV.id range: ${minPvId} → ${maxPvId}`);
  console.log(`Theoretical PVs per chunk: ${pvsPerChunk.toLocaleString()}\n`);

  const v2Distribution = [];
  for (let i = 0; i < totalChunks; i++) {
    const chunkMinPvId = minPvId + (i * pvsPerChunk);
    const chunkMaxPvId = Math.min(minPvId + ((i + 1) * pvsPerChunk) - 1, maxPvId);

    const pvCount = await prisma.pvs.count({
      where: {
        service: 'Youtube',
        id: { gte: chunkMinPvId, lte: chunkMaxPvId }
      }
    });

    v2Distribution.push({ chunk: i, minId: chunkMinPvId, maxId: chunkMaxPvId, pvCount });
    console.log(`Chunk ${i}: PV.id ${chunkMinPvId}-${chunkMaxPvId} → ${pvCount.toLocaleString()} PVs`);
  }

  // Calculate V2 statistics
  const v2PVCounts = v2Distribution.map(d => d.pvCount);
  const v2Min = Math.min(...v2PVCounts);
  const v2Max = Math.max(...v2PVCounts);
  const v2Avg = v2PVCounts.reduce((a, b) => a + b, 0) / v2PVCounts.length;
  const v2StdDev = Math.sqrt(
    v2PVCounts.map(x => Math.pow(x - v2Avg, 2)).reduce((a, b) => a + b, 0) / v2PVCounts.length
  );

  console.log(`\nV2 Distribution:`);
  console.log(`  Min: ${v2Min.toLocaleString()} PVs`);
  console.log(`  Max: ${v2Max.toLocaleString()} PVs`);
  console.log(`  Avg: ${Math.round(v2Avg).toLocaleString()} PVs`);
  console.log(`  Std Dev: ${Math.round(v2StdDev).toLocaleString()}`);
  console.log(`  Max/Min Ratio: ${(v2Max / v2Min).toFixed(2)}x`);
  console.log(`  Coefficient of Variation: ${((v2StdDev / v2Avg) * 100).toFixed(1)}%\n`);

  // 4. Comparison
  console.log('=== Comparison: V1 vs V2 ===\n');

  console.log('Distribution Evenness:');
  console.log(`  V1 Std Dev: ${Math.round(v1StdDev).toLocaleString()}`);
  console.log(`  V2 Std Dev: ${Math.round(v2StdDev).toLocaleString()}`);
  console.log(`  Improvement: ${((1 - v2StdDev / v1StdDev) * 100).toFixed(1)}% more even\n`);

  console.log('Load Imbalance:');
  console.log(`  V1 Max/Min Ratio: ${(v1Max / v1Min).toFixed(2)}x`);
  console.log(`  V2 Max/Min Ratio: ${(v2Max / v2Min).toFixed(2)}x`);
  console.log(`  Improvement: ${((1 - (v2Max / v2Min) / (v1Max / v1Min)) * 100).toFixed(1)}% better balance\n`);

  console.log('Coefficient of Variation (lower is better):');
  console.log(`  V1: ${((v1StdDev / v1Avg) * 100).toFixed(1)}%`);
  console.log(`  V2: ${((v2StdDev / v2Avg) * 100).toFixed(1)}%`);

  // 5. Execution time estimation
  console.log('\n=== Estimated Execution Time ===\n');

  const avgSecondsPerPV = 0.25; // Assumption: 250ms per PV (YouTube API + DB update)

  console.log('V1 Strategy (worst case):');
  const v1MaxTime = (v1Max * avgSecondsPerPV) / 60;
  console.log(`  Chunk with max PVs (${v1Max.toLocaleString()}): ${v1MaxTime.toFixed(1)} minutes`);
  console.log(`  Risk: ${v1MaxTime > 150 ? '❌ Likely timeout (>2.5h)' : v1MaxTime > 120 ? '⚠️  May timeout (>2h)' : '✅ Safe (<2h)'}\n`);

  console.log('V2 Strategy (worst case):');
  const v2MaxTime = (v2Max * avgSecondsPerPV) / 60;
  console.log(`  Chunk with max PVs (${v2Max.toLocaleString()}): ${v2MaxTime.toFixed(1)} minutes`);
  console.log(`  Risk: ${v2MaxTime > 150 ? '❌ Likely timeout (>2.5h)' : v2MaxTime > 120 ? '⚠️  May timeout (>2h)' : '✅ Safe (<2h)'}\n`);

  // 6. ID gaps analysis
  console.log('=== PV.id Gap Analysis ===\n');

  const pvIdGaps = maxPvId - minPvId + 1 - (stats._count.id ?? 0);
  const gapPercentage = (pvIdGaps / (maxPvId - minPvId + 1)) * 100;

  console.log(`Total PV.id range: ${(maxPvId - minPvId + 1).toLocaleString()}`);
  console.log(`Actual PVs: ${stats._count.id?.toLocaleString()}`);
  console.log(`Gaps (deleted PVs): ${pvIdGaps.toLocaleString()}`);
  console.log(`Gap percentage: ${gapPercentage.toFixed(2)}%`);

  if (gapPercentage > 30) {
    console.log(`\n⚠️  WARNING: High gap percentage (${gapPercentage.toFixed(1)}%)`);
    console.log(`   V2 chunks may have uneven distribution due to ID gaps`);
    console.log(`   Consider using dense ID mapping or hybrid strategy`);
  } else {
    console.log(`\n✅ Gap percentage acceptable (<30%)`);
    console.log(`   V2 PV.id based chunking is reliable`);
  }

  // 7. Final recommendation
  console.log('\n=== Final Recommendation ===\n');

  const improvementFactor = v1StdDev / v2StdDev;

  if (improvementFactor > 1.5 && gapPercentage < 30) {
    console.log('✅ STRONGLY RECOMMEND V2 (PV.id based)');
    console.log(`   - ${((improvementFactor - 1) * 100).toFixed(0)}% better distribution evenness`);
    console.log(`   - ${((1 - (v2Max / v2Min) / (v1Max / v1Min)) * 100).toFixed(0)}% better load balance`);
    console.log(`   - Acceptable gap percentage (${gapPercentage.toFixed(1)}%)`);
    console.log(`   - Cursor pagination eliminates infinite loop risk`);
  } else if (improvementFactor > 1.2) {
    console.log('⚠️  RECOMMEND V2 with monitoring');
    console.log(`   - Moderate improvement (${((improvementFactor - 1) * 100).toFixed(0)}%)`);
    console.log(`   - Monitor for edge cases`);
  } else {
    console.log('❌ CONSIDER ALTERNATIVE STRATEGY');
    console.log(`   - V2 does not significantly improve distribution`);
    console.log(`   - High gap percentage: ${gapPercentage.toFixed(1)}%`);
    console.log(`   - Suggest: Dense ID mapping or hybrid approach`);
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
