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
import { prisma } from '@/lib/prisma';
import { UnifiedYouTubeCrawler, UnifiedCrawlerMode } from '@/lib/crawlers/unified-youtube-crawler';

export const maxDuration = 300; // 5 minutes max (Vercel Pro)

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

    // Get parameters from query params
    const { searchParams } = new URL(request.url);
    const mode = (searchParams.get('mode') as UnifiedCrawlerMode) || 'all';
    const updateLocalizations = searchParams.get('localizations') !== 'false';
    const chunkIndex = searchParams.get('chunk') ? parseInt(searchParams.get('chunk')!) : undefined;
    const totalChunks = searchParams.get('totalChunks') ? parseInt(searchParams.get('totalChunks')!) : undefined;

    console.log(`🎬 Unified YouTube Cron Job Started (mode: ${mode}, localizations: ${updateLocalizations}, chunk: ${chunkIndex !== undefined ? `${chunkIndex + 1}/${totalChunks}` : 'none'})`);

    // Calculate ID range for chunk-based execution
    let minVocadbId: number | undefined;
    let maxVocadbId: number | undefined;

    if (chunkIndex !== undefined && totalChunks !== undefined) {
      // Get global min/max vocadbId for ID-range based chunking
      const idRange = await prisma.songs.aggregate({
        _min: { vocadb_id: true },
        _max: { vocadb_id: true },
      });

      const globalMinId = idRange._min.vocadb_id ?? 0;
      const globalMaxId = idRange._max.vocadb_id ?? 0;
      const totalIdRange = globalMaxId - globalMinId + 1;
      const idsPerChunk = Math.ceil(totalIdRange / totalChunks);

      // Calculate this chunk's ID range (inclusive bounds)
      minVocadbId = globalMinId + (chunkIndex * idsPerChunk);
      maxVocadbId = Math.min(globalMinId + ((chunkIndex + 1) * idsPerChunk) - 1, globalMaxId);

      console.log(`📊 Chunk ID Range: ${minVocadbId} - ${maxVocadbId}`);
    }

    // Initialize unified crawler
    const crawler = new UnifiedYouTubeCrawler(prisma, {
      mode,                           // Selection mode: new, old, top, all
      batchSize: 50,                  // 50 videos per API request (YouTube API max)
      maxPVsPerRun: chunkIndex !== undefined ? 2000 : 500,  // Chunk mode: 2000 PVs (safe for 5min timeout), non-chunk: 500
      enableResume: true,             // Enable progress tracking
      updateLocalizations,            // Also fetch Korean titles (default: true)
      minVocadbId,                    // Optional: minimum vocadbId for chunk
      maxVocadbId,                    // Optional: maximum vocadbId for chunk
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
          pvsProcessed: result.pvsProcessed,
          pvsUpdated: result.pvsUpdated,
          titlesUpdated: result.titlesUpdated,
          pvsFailed: result.pvsFailed,
          last_offset: result.lastOffset,
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
          pvsProcessed: result.pvsProcessed,
          pvsUpdated: result.pvsUpdated,
          titlesUpdated: result.titlesUpdated,
          pvsFailed: result.pvsFailed,
          last_offset: result.lastOffset,
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
  }
  // Note: Do NOT call prisma.$disconnect() in serverless - connections are reused
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
  }
  // Note: Do NOT call prisma.$disconnect() in serverless - connections are reused
}
