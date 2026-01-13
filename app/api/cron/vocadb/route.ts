/**
 * VocaDB Cron Job API Route
 *
 * Endpoint: POST /api/cron/vocadb
 * Trigger: Vercel Cron (configured in vercel.json)
 * Schedule: Daily at 2:00 AM UTC
 *
 * Purpose: Crawls new songs from VocaDB API
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/lib/generated/prisma';
import { VocaDBCrawler } from '@/lib/crawlers/vocadb-crawler';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Verify authorization (Vercel Cron secret)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🚀 VocaDB Cron Job Started');

    // Initialize crawler with serverless-friendly settings
    const crawler = new VocaDBCrawler(prisma, {
      batchSize: 100,           // 100 songs per API request
      maxSongsPerRun: 1000,     // Process up to 1000 songs per cron run
      enableResume: true,       // Enable progress tracking
      songTypes: 'Original',    // Only original songs
    });

    // Execute crawler
    const result = await crawler.crawl();

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    if (result.success) {
      console.log(`✅ VocaDB Cron Job Completed in ${duration}s`);

      return NextResponse.json({
        success: true,
        message: 'VocaDB crawler completed successfully',
        data: {
          songsProcessed: result.songsProcessed,
          songs_inserted: result.songsInserted,
          songs_skipped: result.songsSkipped,
          last_offset: result.lastOffset,
          completed: result.completed,
          duration: `${duration}s`,
        },
      });
    } else {
      console.error(`❌ VocaDB Cron Job Failed: ${result.error}`);

      return NextResponse.json({
        success: false,
        message: 'VocaDB crawler failed',
        error: result.error,
        data: {
          songsProcessed: result.songsProcessed,
          songs_inserted: result.songsInserted,
          songs_skipped: result.songsSkipped,
          last_offset: result.lastOffset,
          duration: `${duration}s`,
        },
      }, { status: 500 });
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.error('💥 VocaDB Cron Job Fatal Error:', errorMessage);

    return NextResponse.json({
      success: false,
      message: 'VocaDB cron job failed with fatal error',
      error: errorMessage,
      duration: `${duration}s`,
    }, { status: 500 });

  } finally {
    await prisma.$disconnect();
  }
}

// For testing: Allow GET requests to check status
export async function GET() {
  try {
    const status = await VocaDBCrawler.getStatus(prisma);

    return NextResponse.json({
      success: true,
      crawler: 'vocadb',
      status,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    return NextResponse.json({
      success: false,
      error: errorMessage,
    }, { status: 500 });

  } finally {
    await prisma.$disconnect();
  }
}
