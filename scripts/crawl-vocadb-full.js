/**
 * VocaDB Full Crawler - PostgreSQL Version
 * Repeatedly calls the VocaDB cron endpoint until all songs are fetched
 */

require('dotenv').config();

const CRON_SECRET = process.env.CRON_SECRET;
const API_URL = process.env.API_URL || 'http://localhost:3000';

if (!CRON_SECRET) {
  console.error('❌ CRON_SECRET environment variable is required');
  process.exit(1);
}

async function crawlBatch() {
  try {
    const response = await fetch(`${API_URL}/api/cron/vocadb`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('❌ Crawl batch failed:', error.message);
    throw error;
  }
}

async function fullCrawl() {
  console.log('🚀 Starting full VocaDB crawl...\n');

  let totalSongsProcessed = 0;
  let totalSongsInserted = 0;
  let totalSongsSkipped = 0;
  let batchNumber = 0;
  let completed = false;

  const startTime = Date.now();

  while (!completed) {
    batchNumber++;
    console.log(`\n📦 Batch #${batchNumber}`);
    console.log('━'.repeat(50));

    try {
      const result = await crawlBatch();

      totalSongsProcessed += result.songsProcessed;
      totalSongsInserted += result.songsInserted;
      totalSongsSkipped += result.songsSkipped;
      completed = result.completed;

      console.log(`   Processed: ${result.songsProcessed} songs`);
      console.log(`   Inserted: ${result.songsInserted} songs`);
      console.log(`   Skipped: ${result.songsSkipped} songs`);
      console.log(`   Last offset: ${result.lastOffset}`);
      console.log(`   Duration: ${result.duration}`);

      console.log(`\n📊 Total Progress:`);
      console.log(`   Total processed: ${totalSongsProcessed} songs`);
      console.log(`   Total inserted: ${totalSongsInserted} songs`);
      console.log(`   Total skipped: ${totalSongsSkipped} songs`);

      if (completed) {
        console.log('\n✅ Crawl completed! No more data available.');
        break;
      }

      // Small delay between batches to avoid overwhelming the API
      console.log('\n⏳ Waiting 2 seconds before next batch...');
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error) {
      console.error('\n💥 Batch failed:', error.message);
      console.log('Stopping crawl...');
      break;
    }
  }

  const totalDuration = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

  console.log('\n' + '='.repeat(50));
  console.log('🎉 FULL CRAWL SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total batches: ${batchNumber}`);
  console.log(`Total songs processed: ${totalSongsProcessed}`);
  console.log(`Total songs inserted: ${totalSongsInserted}`);
  console.log(`Total songs skipped: ${totalSongsSkipped}`);
  console.log(`Total duration: ${totalDuration} minutes`);
  console.log('='.repeat(50));
}

// Run the full crawl
fullCrawl().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
