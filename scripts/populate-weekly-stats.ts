/**
 * Manual Weekly Stats Cache Population Script
 *
 * Run this locally to populate the weekly stats cache without waiting for cron job.
 * Usage: npx tsx scripts/populate-weekly-stats.ts
 */

import { updateWeeklyStatsCache } from '../lib/weekly-stats-updater';

async function main() {
  console.log('Starting manual weekly stats cache population...');

  try {
    const result = await updateWeeklyStatsCache();

    console.log('\n✅ Weekly stats cache populated successfully!');
    console.log('Result:', result);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Weekly stats cache population failed:');
    console.error(error);
    process.exit(1);
  }
}

main();
