/**
 * One-time script to populate ranking cache
 * Run this before testing the new cached ranking system
 */

import { updateRankingCache } from '../lib/ranking-updater';

async function main() {
  console.log('🚀 Populating ranking cache...\n');

  try {
    const result = await updateRankingCache();

    console.log('\n✅ Success!');
    console.log(`   Total rankings: ${result.totalCount}`);
    console.log(`   Weekly rankings: ${result.weeklyCount}`);
    console.log(`   New rankings: ${result.newCount}`);
    console.log(`   Duration: ${result.duration}ms\n`);
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

main();
