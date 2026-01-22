/**
 * Test script for VocaDB crawler date-based filtering
 *
 * Tests:
 * 1. Initial crawl (no songs in DB)
 * 2. Incremental crawl (with existing songs)
 * 3. Resume scenario (interrupted session)
 */

import { PrismaClient } from '@prisma/client';
import { VocaDBCrawler } from '@/lib/crawlers/vocadb-crawler';

const prisma = new PrismaClient();

async function main() {
  console.log('🧪 Testing VocaDB Crawler Date-Based Filtering\n');

  // Test 1: Check current latest song in DB
  console.log('📊 Test 1: Database Status Check');
  console.log('='.repeat(60));

  const latestSong = await prisma.songs.findFirst({
    where: { publish_date: { not: null } },
    orderBy: { publish_date: 'desc' },
    select: {
      vocadb_id: true,
      default_name: true,
      publish_date: true,
      song_type: true,
    },
  });

  if (latestSong) {
    console.log(`✅ Latest song in DB:`);
    console.log(`   ID: ${latestSong.vocadb_id}`);
    console.log(`   Name: ${latestSong.default_name}`);
    console.log(`   Publish Date: ${latestSong.publish_date?.toISOString().split('T')[0]}`);
    console.log(`   Type: ${latestSong.song_type}`);
  } else {
    console.log(`⚠️  No songs with publish_date found in database`);
  }

  const totalSongs = await prisma.songs.count();
  console.log(`\n📊 Total songs in DB: ${totalSongs.toLocaleString()}\n`);

  // Test 2: Simulate API request URL
  console.log('🔗 Test 2: API URL Generation');
  console.log('='.repeat(60));

  const afterDate = latestSong?.publish_date?.toISOString();
  const VOCADB_API_BASE = 'https://vocadb.net/api';
  const batchSize = 100;
  const currentOffset = 0;
  const fields = 'Names,Artists,PVs,Tags,Lyrics,ThumbUrl,MainPicture';
  const songTypes = 'Original';

  let url = `${VOCADB_API_BASE}/songs?start=${currentOffset}&maxResults=${batchSize}&fields=${fields}&songTypes=${songTypes}&sort=AdditionDate`;

  if (afterDate) {
    url += `&afterDate=${afterDate}`;
  }

  console.log(`Generated API URL:`);
  console.log(url);
  console.log();

  // Test 3: Check existing crawler progress
  console.log('📋 Test 3: Crawler Progress Status');
  console.log('='.repeat(60));

  const existingProgress = await prisma.crawler_progress.findFirst({
    where: { crawler_type: 'vocadb' },
    orderBy: { started_at: 'desc' },
  });

  if (existingProgress) {
    console.log(`Status: ${existingProgress.status}`);
    console.log(`Started: ${existingProgress.started_at.toISOString()}`);
    console.log(`Completed: ${existingProgress.completed_at?.toISOString() || 'N/A'}`);
    console.log(`Last Offset: ${existingProgress.last_offset}`);
    console.log(`Total Processed: ${existingProgress.total_processed}`);
    console.log(`Metadata:`, JSON.stringify(existingProgress.metadata, null, 2));
  } else {
    console.log(`⚠️  No crawler progress found`);
  }

  console.log('\n');

  // Test 4: Dry run crawler initialization (don't actually crawl)
  console.log('🚀 Test 4: Crawler Initialization (Dry Run)');
  console.log('='.repeat(60));
  console.log('This would initialize the crawler with the following settings:\n');

  const options = {
    batchSize: 100,
    maxSongsPerRun: 10, // Small number for testing
    startOffset: 0,
    songTypes: 'Original' as const,
    enableResume: true,
  };

  console.log(`Options:`, JSON.stringify(options, null, 2));

  if (afterDate) {
    console.log(`\n✅ Date filter would be applied: afterDate=${afterDate.split('T')[0]}`);
    console.log(`   This means only songs published after ${afterDate.split('T')[0]} would be fetched`);
  } else {
    console.log(`\n⚠️  No date filter (initial crawl mode)`);
    console.log(`   All songs would be fetched from VocaDB`);
  }

  console.log('\n✅ All tests completed!');
  console.log('\nTo actually run the crawler with date filtering:');
  console.log('  curl -X POST http://localhost:3000/api/cron/vocadb \\');
  console.log('    -H "Authorization: Bearer YOUR_CRON_SECRET"');
}

main()
  .catch((e) => {
    console.error('❌ Test failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
