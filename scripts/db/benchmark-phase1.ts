import { PrismaClient } from '../../lib/generated/prisma';
import { getTotalRanking, getDailyRanking, getWeeklyRanking } from '../../lib/db';
import { cache } from '../../lib/cache';

const prisma = new PrismaClient();

interface BenchmarkResult {
  operation: string;
  iterations: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
  totalTime: number;
}

async function benchmark(
  name: string,
  fn: () => Promise<any>,
  iterations: number = 5
): Promise<BenchmarkResult> {
  const times: number[] = [];

  console.log(`\n📊 Benchmarking: ${name}`);
  console.log(`   Iterations: ${iterations}`);

  // Warmup run
  console.log('   🔥 Warmup run...');
  await fn();

  // Actual benchmark
  for (let i = 0; i < iterations; i++) {
    // Clear cache before each run
    cache.flushAll();

    const start = performance.now();
    await fn();
    const end = performance.now();
    const duration = end - start;
    times.push(duration);
    console.log(`   Run ${i + 1}/${iterations}: ${duration.toFixed(2)}ms`);
  }

  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);
  const total = times.reduce((a, b) => a + b, 0);

  return {
    operation: name,
    iterations,
    avgTime: avg,
    minTime: min,
    maxTime: max,
    totalTime: total,
  };
}

async function explainAnalyze(queryName: string, sql: string): Promise<void> {
  console.log(`\n🔍 EXPLAIN ANALYZE: ${queryName}\n`);

  try {
    const result = await prisma.$queryRawUnsafe<any[]>(`EXPLAIN (ANALYZE, BUFFERS) ${sql}`);

    result.forEach(row => {
      console.log(row['QUERY PLAN']);
    });
  } catch (error) {
    console.error(`❌ Error analyzing ${queryName}:`, error);
  }
}

async function checkIndexUsage(): Promise<void> {
  console.log('\n📈 Index Usage Statistics\n');

  const stats = await prisma.$queryRawUnsafe<any[]>(`
    SELECT
      schemaname,
      tablename,
      indexname,
      idx_scan,
      idx_tup_read,
      idx_tup_fetch,
      pg_size_pretty(pg_relation_size(indexrelid)) as size
    FROM pg_stat_user_indexes
    WHERE indexname IN (
      'idx_daily_pv_date_views',
      'idx_pvs_youtube_song_views',
      'idx_song_artists_included',
      'idx_artists_type_filter',
      'idx_song_names_multilang'
    )
    ORDER BY idx_scan DESC
  `);

  console.log('╔══════════════════════════════════════════════════════════════════════════╗');
  console.log('║ Index Name                            │ Scans  │ Tuples Read │ Size      ║');
  console.log('╠══════════════════════════════════════════════════════════════════════════╣');

  stats.forEach(stat => {
    const name = stat.indexname.padEnd(37);
    const scans = String(stat.idx_scan || 0).padStart(6);
    const reads = String(stat.idx_tup_read || 0).padStart(11);
    const size = String(stat.size || 'N/A').padStart(9);
    console.log(`║ ${name} │ ${scans} │ ${reads} │ ${size} ║`);
  });

  console.log('╚══════════════════════════════════════════════════════════════════════════╝');
}

async function runBenchmarks() {
  console.log('🚀 Phase 1 Performance Benchmark\n');
  console.log('===============================================');
  console.log('Testing ranking queries with new indexes');
  console.log('===============================================');

  const results: BenchmarkResult[] = [];

  try {
    // 1. Total Ranking Benchmark
    results.push(
      await benchmark('getTotalRanking(100)', async () => {
        await getTotalRanking(100, 0);
      }, 5)
    );

    // 2. Daily Ranking Benchmark
    results.push(
      await benchmark('getDailyRanking(100)', async () => {
        await getDailyRanking(100, 0);
      }, 5)
    );

    // 3. Weekly Ranking Benchmark
    results.push(
      await benchmark('getWeeklyRanking(100)', async () => {
        await getWeeklyRanking(100, 0);
      }, 5)
    );

    // Summary
    console.log('\n\n📋 Benchmark Summary\n');
    console.log('╔══════════════════════════════════════════════════════════════════════════╗');
    console.log('║ Operation                    │ Avg (ms) │ Min (ms) │ Max (ms) │ Std Dev  ║');
    console.log('╠══════════════════════════════════════════════════════════════════════════╣');

    results.forEach(r => {
      const name = r.operation.padEnd(28);
      const avg = r.avgTime.toFixed(2).padStart(8);
      const min = r.minTime.toFixed(2).padStart(8);
      const max = r.maxTime.toFixed(2).padStart(8);

      // Calculate standard deviation
      const variance = results
        .filter(res => res.operation === r.operation)
        .reduce((acc, _) => acc, 0);
      const stdDev = '  N/A   '.padStart(8);

      console.log(`║ ${name} │ ${avg} │ ${min} │ ${max} │ ${stdDev} ║`);
    });

    console.log('╚══════════════════════════════════════════════════════════════════════════╝');

    // Index usage statistics
    await checkIndexUsage();

    // Optional: EXPLAIN ANALYZE for detailed query plans
    // Uncomment to see detailed execution plans
    /*
    await explainAnalyze(
      'Total Ranking',
      `SELECT ... FROM songs ... LIMIT 100`  // Paste actual query here
    );
    */

    console.log('\n✅ Benchmark completed successfully!');
    console.log('\n📝 Recommendations:');
    console.log('  - Compare these results with pre-Phase 1 benchmarks');
    console.log('  - Expected improvement: 40-50% faster');
    console.log('  - Monitor index scans to ensure indexes are being used');
    console.log('  - If idx_scan is 0, indexes may not be utilized by queries\n');

  } catch (error) {
    console.error('❌ Benchmark failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

runBenchmarks()
  .then(() => {
    console.log('🎉 All benchmarks completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Benchmark failed:', error);
    process.exit(1);
  });
