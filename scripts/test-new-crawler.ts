/**
 * Test script for new VocaDB PostgreSQL crawler
 */

import { PrismaClient } from '../lib/generated/prisma';
import { VocaDBCrawler } from '../lib/crawlers/vocadb-crawler';

async function main() {
  const prisma = new PrismaClient();

  try {
    console.log('🧪 Testing new VocaDB PostgreSQL crawler...\n');

    // Reset any stuck progress
    await VocaDBCrawler.resetProgress(prisma);

    // Run with small batch for testing
    const crawler = new VocaDBCrawler(prisma, {
      batchSize: 50,
      maxSongsPerRun: 100,
      startOffset: 0,
      enableResume: false,
    });

    const result = await crawler.crawl();

    console.log('\n📊 Test Results:');
    console.log(`   Success: ${result.success}`);
    console.log(`   Songs processed: ${result.songsProcessed}`);
    console.log(`   Songs inserted: ${result.songsInserted}`);
    console.log(`   Songs skipped: ${result.songsSkipped}`);
    console.log(`   Last offset: ${result.lastOffset}`);
    console.log(`   Completed: ${result.completed}`);

    // Verify data in new tables
    const songCount = await prisma.song.count();
    const nameCount = await prisma.songName.count();
    const artistCount = await prisma.artist.count();
    const pvCount = await prisma.pV.count();
    const tagCount = await prisma.tag.count();

    console.log('\n📦 Database Contents:');
    console.log(`   Songs: ${songCount}`);
    console.log(`   Song Names: ${nameCount}`);
    console.log(`   Artists: ${artistCount}`);
    console.log(`   PVs: ${pvCount}`);
    console.log(`   Tags: ${tagCount}`);

    // Show sample song with relations
    const sample = await prisma.song.findFirst({
      include: {
        names: true,
        artists: { include: { artist: true } },
        pvs: true,
        tags: { include: { tag: true } },
      },
      orderBy: { favoritedTimes: 'desc' },
    });

    if (sample) {
      console.log('\n🎵 Sample Song (most favorited):');
      console.log(`   Default Name: ${sample.defaultName}`);
      console.log(`   VocaDB ID: ${sample.vocadbId}`);
      console.log(`   Song Type: ${sample.songType}`);
      console.log(`   Favorited: ${sample.favoritedTimes}`);
      console.log(`   Names: ${sample.names.map(n => `${n.language}: ${n.value}`).join(', ')}`);
      console.log(`   Artists: ${sample.artists.map(sa => `${sa.artist.name} (${sa.categories})`).join(', ')}`);
      console.log(`   PVs: ${sample.pvs.map(p => `${p.service}: ${p.pvId}`).join(', ')}`);
      console.log(`   Tags: ${sample.tags.slice(0, 5).map(st => st.tag.name).join(', ')}${sample.tags.length > 5 ? '...' : ''}`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
