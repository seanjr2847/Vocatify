/**
 * Simple test script to verify Prisma connection to PostgreSQL
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

async function testConnection() {
  const prisma = new PrismaClient();

  try {
    console.log('🔌 Testing PostgreSQL connection...\n');

    // Test connection
    await prisma.$connect();
    console.log('✅ Connected to PostgreSQL successfully!\n');

    // Count existing records
    const songCount = await prisma.song.count();
    const dailyCount = await prisma.dailyViewCount.count();
    const crawlerCount = await prisma.crawlerProgress.count();

    console.log('📊 Current Database State:');
    console.log(`   Songs: ${songCount.toLocaleString()}`);
    console.log(`   DailyViewCounts: ${dailyCount.toLocaleString()}`);
    console.log(`   CrawlerProgress: ${crawlerCount.toLocaleString()}\n`);

    // Test query
    console.log('🔍 Testing query...');
    const sample = await prisma.song.findFirst();

    if (sample) {
      console.log('✅ Sample song found:');
      console.log(`   Title: ${sample.title}`);
      console.log(`   Artist: ${sample.artist}\n`);
    } else {
      console.log('ℹ️  No songs in database yet.\n');
    }

    console.log('✅ All tests passed! Ready for migration.\n');

  } catch (error: any) {
    console.error('❌ Connection failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
