import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * YouTube Crawler Status Monitoring Endpoint
 *
 * Returns detailed status of all chunk-based crawler progress records.
 * No authentication required - read-only monitoring.
 *
 * GET /api/cron/youtube/status
 *
 * Response:
 * - summary: Aggregated statistics across all chunks
 * - chunks: Individual chunk progress details
 */
export async function GET() {
  try {
    // Fetch all chunk progress records (recent 20)
    const chunks = await prisma.crawler_progress.findMany({
      where: {
        crawler_type: { startsWith: 'youtube-unified' }
      },
      orderBy: { started_at: 'desc' },
      take: 20,
      select: {
        id: true,
        crawler_type: true,
        status: true,
        started_at: true,
        completed_at: true,
        last_offset: true,
        total_processed: true,
        error_message: true,
        metadata: true,
      },
    });

    // Calculate summary statistics
    const summary = {
      totalChunks: chunks.length,
      completed: chunks.filter(c => c.status === 'completed').length,
      running: chunks.filter(c => c.status === 'running').length,
      failed: chunks.filter(c => c.status === 'failed').length,
      totalProcessed: chunks.reduce((sum, c) => sum + (c.total_processed || 0), 0),
      lastRun: chunks[0]?.started_at || null,
    };

    return NextResponse.json({
      success: true,
      summary,
      chunks: chunks.map(chunk => ({
        id: chunk.id,
        type: chunk.crawler_type,
        status: chunk.status,
        startedAt: chunk.started_at,
        completedAt: chunk.completed_at,
        lastOffset: chunk.last_offset,
        totalProcessed: chunk.total_processed,
        errorMessage: chunk.error_message,
        metadata: chunk.metadata,
        // Extract chunk range from crawler_type
        chunkRange: chunk.crawler_type.includes('chunk-')
          ? chunk.crawler_type.split('chunk-')[1]
          : null,
      })),
    });
  } catch (error) {
    console.error('Failed to fetch YouTube crawler status:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
