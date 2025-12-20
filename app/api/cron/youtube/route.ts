/**
 * YouTube View Count Cron Job API Route
 *
 * Endpoint: POST /api/cron/youtube
 * Trigger: Vercel Cron (configured in vercel.json)
 * Schedule: Daily at 3:00 AM UTC
 *
 * Purpose: Updates YouTube view counts for existing songs
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { YouTubeCrawler, YouTubeCrawlerMode } from '@/lib/crawlers/youtube-crawler';

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

    // Get mode from query params (default: 'new')
    const { searchParams } = new URL(request.url);
    const mode = (searchParams.get('mode') as YouTubeCrawlerMode) || 'new';

    console.log(`🎬 YouTube Cron Job Started (mode: ${mode})`);

    // Initialize crawler with serverless-friendly settings
    const crawler = new YouTubeCrawler(prisma, {
      mode,                     // Selection mode: new, old, top, all
      batchSize: 50,            // 50 videos per API request (YouTube API max)
      maxSongsPerRun: 500,      // Process up to 500 songs per cron run
      enableResume: true,       // Enable progress tracking
    });

    // Execute crawler
    const result = await crawler.crawl();

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    if (result.success) {
      console.log(`✅ YouTube Cron Job Completed in ${duration}s`);

      return NextResponse.json({
        success: true,
        message: 'YouTube crawler completed successfully',
        data: {
          mode,
          songsProcessed: result.songsProcessed,
          songsUpdated: result.songsUpdated,
          songsFailed: result.songsFailed,
          lastOffset: result.lastOffset,
          completed: result.completed,
          duration: `${duration}s`,
        },
      });
    } else {
      console.error(`❌ YouTube Cron Job Failed: ${result.error}`);

      return NextResponse.json({
        success: false,
        message: 'YouTube crawler failed',
        error: result.error,
        data: {
          mode,
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

    console.error('💥 YouTube Cron Job Fatal Error:', errorMessage);

    return NextResponse.json({
      success: false,
      message: 'YouTube cron job failed with fatal error',
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
    const status = await YouTubeCrawler.getStatus(prisma);

    return NextResponse.json({
      success: true,
      crawler: 'youtube',
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
