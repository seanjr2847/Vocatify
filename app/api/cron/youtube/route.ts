/**
 * Unified YouTube Cron Job API Route
 *
 * Endpoint: POST /api/cron/youtube
 * Trigger: Vercel Cron (configured in vercel.json) or GitHub Actions
 * Schedule: Daily at 3:00 AM UTC
 *
 * Purpose: Updates YouTube view counts AND Korean titles in single API call
 * (Merged functionality from youtube-crawler and localized-titles-crawler)
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/lib/generated/prisma';
import { UnifiedYouTubeCrawler, UnifiedCrawlerMode } from '@/lib/crawlers/unified-youtube-crawler';

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
    const mode = (searchParams.get('mode') as UnifiedCrawlerMode) || 'new';
    const updateLocalizations = searchParams.get('localizations') !== 'false';

    console.log(`🎬 Unified YouTube Cron Job Started (mode: ${mode}, localizations: ${updateLocalizations})`);

    // Initialize unified crawler
    const crawler = new UnifiedYouTubeCrawler(prisma, {
      mode,                           // Selection mode: new, old, top, all
      batchSize: 50,                  // 50 videos per API request (YouTube API max)
      maxSongsPerRun: 500,            // Process up to 500 songs per cron run
      enableResume: true,             // Enable progress tracking
      updateLocalizations,            // Also fetch Korean titles (default: true)
    });

    // Execute crawler
    const result = await crawler.crawl();

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    if (result.success) {
      console.log(`✅ Unified YouTube Cron Job Completed in ${duration}s`);

      return NextResponse.json({
        success: true,
        message: 'Unified YouTube crawler completed successfully',
        data: {
          mode,
          updateLocalizations,
          songsProcessed: result.songsProcessed,
          songsUpdated: result.songsUpdated,
          titlesUpdated: result.titlesUpdated,
          songsFailed: result.songsFailed,
          lastOffset: result.lastOffset,
          completed: result.completed,
          duration: `${duration}s`,
        },
      });
    } else {
      console.error(`❌ Unified YouTube Cron Job Failed: ${result.error}`);

      return NextResponse.json({
        success: false,
        message: 'Unified YouTube crawler failed',
        error: result.error,
        data: {
          mode,
          updateLocalizations,
          songsProcessed: result.songsProcessed,
          songsUpdated: result.songsUpdated,
          titlesUpdated: result.titlesUpdated,
          songsFailed: result.songsFailed,
          lastOffset: result.lastOffset,
          duration: `${duration}s`,
        },
      }, { status: 500 });
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.error('💥 Unified YouTube Cron Job Fatal Error:', errorMessage);

    return NextResponse.json({
      success: false,
      message: 'Unified YouTube cron job failed with fatal error',
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
    const status = await UnifiedYouTubeCrawler.getStatus(prisma);

    return NextResponse.json({
      success: true,
      crawler: 'youtube-unified',
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
