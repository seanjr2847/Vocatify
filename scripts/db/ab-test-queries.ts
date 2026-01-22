import * as dotenv from 'dotenv';

dotenv.config();

// Import old query functions (v1)
import {
  getTotalRanking,
  getDailyRanking,
  getWeeklyRanking,
  getNewSongsRanking,
} from '../../lib/db';

// Import new optimized query functions (v2)
import {
  getTotalRankingV2,
  getDailyRankingV2,
  getWeeklyRankingV2,
  getNewSongsRankingV2,
  clearV2Cache,
} from '../../lib/db-v2';

interface TestResult {
  queryName: string;
  v1Time: number;
  v2Time: number;
  improvement: number;
  improvementPercent: string;
  v1Count: number;
  v2Count: number;
  dataMatch: boolean;
}

async function measureQueryTime<T>(
  fn: () => Promise<T>
): Promise<{ result: T; time: number }> {
  const start = Date.now();
  const result = await fn();
  const time = Date.now() - start;
  return { result, time };
}

function compareResults(v1: any[], v2: any[]): boolean {
  if (v1.length !== v2.length) return false;

  // Compare first 10 items (rank, vocadbId, viewCount)
  for (let i = 0; i < Math.min(10, v1.length); i++) {
    if (
      v1[i].rank !== v2[i].rank ||
      v1[i].vocadbId !== v2[i].vocadbId ||
      v1[i].viewCount?.toString() !== v2[i].viewCount?.toString()
    ) {
      return false;
    }
  }

  return true;
}

async function testTotalRanking(): Promise<TestResult> {
  console.log('📊 Testing Total Ranking (100 songs)...');

  const v1 = await measureQueryTime(() => getTotalRanking(100, 0));
  clearV2Cache(); // Clear cache between tests
  const v2 = await measureQueryTime(() => getTotalRankingV2(100, 0));

  const improvement = v1.time - v2.time;
  const improvementPercent = ((improvement / v1.time) * 100).toFixed(1);

  console.log(`  V1: ${v1.time}ms | V2: ${v2.time}ms | Improvement: ${improvement}ms (${improvementPercent}%)`);

  return {
    queryName: 'Total Ranking',
    v1Time: v1.time,
    v2Time: v2.time,
    improvement,
    improvementPercent,
    v1Count: v1.result.length,
    v2Count: v2.result.length,
    dataMatch: compareResults(v1.result, v2.result),
  };
}

async function testDailyRanking(): Promise<TestResult> {
  console.log('📈 Testing Daily Ranking (100 songs)...');

  const v1 = await measureQueryTime(() => getDailyRanking(100, 0));
  clearV2Cache();
  const v2 = await measureQueryTime(() => getDailyRankingV2(100, 0));

  const improvement = v1.time - v2.time;
  const improvementPercent = ((improvement / v1.time) * 100).toFixed(1);

  console.log(`  V1: ${v1.time}ms | V2: ${v2.time}ms | Improvement: ${improvement}ms (${improvementPercent}%)`);

  return {
    queryName: 'Daily Ranking',
    v1Time: v1.time,
    v2Time: v2.time,
    improvement,
    improvementPercent,
    v1Count: v1.result.length,
    v2Count: v2.result.length,
    dataMatch: compareResults(v1.result, v2.result),
  };
}

async function testWeeklyRanking(): Promise<TestResult> {
  console.log('📅 Testing Weekly Ranking (100 songs)...');

  const v1 = await measureQueryTime(() => getWeeklyRanking(100, 0));
  clearV2Cache();
  const v2 = await measureQueryTime(() => getWeeklyRankingV2(100, 0));

  const improvement = v1.time - v2.time;
  const improvementPercent = ((improvement / v1.time) * 100).toFixed(1);

  console.log(`  V1: ${v1.time}ms | V2: ${v2.time}ms | Improvement: ${improvement}ms (${improvementPercent}%)`);

  return {
    queryName: 'Weekly Ranking',
    v1Time: v1.time,
    v2Time: v2.time,
    improvement,
    improvementPercent,
    v1Count: v1.result.length,
    v2Count: v2.result.length,
    dataMatch: compareResults(v1.result, v2.result),
  };
}

async function testNewSongsRanking(): Promise<TestResult> {
  console.log('🆕 Testing New Songs Ranking (100 songs)...');

  const v1 = await measureQueryTime(() => getNewSongsRanking(100, 0));
  clearV2Cache();
  const v2 = await measureQueryTime(() => getNewSongsRankingV2(100, 0));

  const improvement = v1.time - v2.time;
  const improvementPercent = ((improvement / v1.time) * 100).toFixed(1);

  console.log(`  V1: ${v1.time}ms | V2: ${v2.time}ms | Improvement: ${improvement}ms (${improvementPercent}%)`);

  return {
    queryName: 'New Songs Ranking',
    v1Time: v1.time,
    v2Time: v2.time,
    improvement,
    improvementPercent,
    v1Count: v1.result.length,
    v2Count: v2.result.length,
    dataMatch: compareResults(v1.result, v2.result),
  };
}

async function runABTest() {
  console.log('🧪 Starting A/B Performance Test\n');
  console.log('Comparing lib/db.ts (V1) vs lib/db-v2.ts (V2)\n');

  try {
    // Clear cache before starting
    clearV2Cache();

    const results: TestResult[] = [];

    // Run all tests
    results.push(await testTotalRanking());
    console.log('');

    results.push(await testDailyRanking());
    console.log('');

    results.push(await testWeeklyRanking());
    console.log('');

    results.push(await testNewSongsRanking());
    console.log('');

    // Print summary
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 A/B Test Results Summary\n');

    console.log('Query Name              | V1 Time | V2 Time | Improvement | % Faster');
    console.log('------------------------|---------|---------|-------------|----------');

    results.forEach((r) => {
      const name = r.queryName.padEnd(23);
      const v1 = `${r.v1Time}ms`.padEnd(7);
      const v2 = `${r.v2Time}ms`.padEnd(7);
      const imp = `${r.improvement}ms`.padEnd(11);
      const pct = `${r.improvementPercent}%`.padEnd(8);
      console.log(`${name} | ${v1} | ${v2} | ${imp} | ${pct}`);
    });

    console.log('');

    // Calculate overall statistics
    const totalV1Time = results.reduce((sum, r) => sum + r.v1Time, 0);
    const totalV2Time = results.reduce((sum, r) => sum + r.v2Time, 0);
    const totalImprovement = totalV1Time - totalV2Time;
    const overallPercent = ((totalImprovement / totalV1Time) * 100).toFixed(1);

    console.log('📈 Overall Performance:');
    console.log(`  Total V1 time: ${totalV1Time}ms`);
    console.log(`  Total V2 time: ${totalV2Time}ms`);
    console.log(`  Total improvement: ${totalImprovement}ms (${overallPercent}% faster)\n`);

    // Data consistency check
    console.log('✅ Data Consistency Check:');
    const allMatch = results.every((r) => r.dataMatch);
    results.forEach((r) => {
      const status = r.dataMatch ? '✅' : '❌';
      console.log(
        `  ${status} ${r.queryName}: ${r.v1Count} vs ${r.v2Count} results ${r.dataMatch ? 'match' : 'MISMATCH'}`
      );
    });

    if (!allMatch) {
      console.log('\n⚠️  WARNING: Some results do not match! Review implementation.');
    }

    console.log('\n📝 Next Steps:');
    if (allMatch && totalImprovement > 0) {
      console.log('  1. ✅ Performance improved and data matches');
      console.log('  2. Update API routes to use v2 functions');
      console.log('  3. Set up automatic sync jobs for songs_enhanced');
      console.log('  4. Monitor production performance');
    } else {
      console.log('  1. ⚠️  Review data mismatches or performance issues');
      console.log('  2. Debug and fix before production deployment');
    }

    console.log('\n🎉 A/B test completed successfully');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ A/B test failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

runABTest();
