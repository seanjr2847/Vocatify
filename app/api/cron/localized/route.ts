/**
 * Localized Titles Cron Job API Route
 *
 * Endpoint: POST /api/cron/localized
 * Trigger: Vercel Cron (configured in vercel.json)
 * Schedule: Weekly on Sunday at 4:00 AM UTC
 *
 * Purpose: Fetches Korean titles from YouTube for songs
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { LocalizedTitlesCrawler } from '@/lib/crawlers/localized-titles-crawler';

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

    console.log('🌐 Localized Titles Cron Job Started');

    // Initialize crawler with serverless-friendly settings
    const crawler = new LocalizedTitlesCrawler(prisma, {
      batchSize: 50,            // 50 videos per API request (YouTube API max)
      maxSongsPerRun: 200,      // Process up to 200 songs per cron run
      enableResume: true,       // Enable progress tracking
      prioritizePopular: true,  // Prioritize popular songs
    });

    // Execute crawler
    const result = await crawler.crawl();

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    if (result.success) {
      console.log(`✅ Localized Titles Cron Job Completed in ${duration}s`);

      return NextResponse.json({
        success: true,
        message: 'Localized titles crawler completed successfully',
        data: {
          songsProcessed: result.songsProcessed,
          songsUpdated: result.songsUpdated,
          songsFailed: result.songsFailed,
          lastOffset: result.lastOffset,
          completed: result.completed,
          duration: `${duration}s`,
        },
      });
    } else {
      console.error(`❌ Localized Titles Cron Job Failed: ${result.error}`);

      return NextResponse.json({
        success: false,
        message: 'Localized titles crawler failed',
        error: result.error,
        data: {
          songsProcessed: result.songsProcessed,
          songsUpdated: result.songsUpdated,
          songsFailed: result.songsFailed,
          lastOffset: result.lastOffset,
          duration: `${duration}s`,
        },
      }, { status: 500 });
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.error('💥 Localized Titles Cron Job Fatal Error:', errorMessage);

    return NextResponse.json({
      success: false,
      message: 'Localized titles cron job failed with fatal error',
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
    const status = await LocalizedTitlesCrawler.getStatus(prisma);

    return NextResponse.json({
      success: true,
      crawler: 'localized',
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
