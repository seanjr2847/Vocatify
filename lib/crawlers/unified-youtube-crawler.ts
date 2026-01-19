import crypto from 'crypto';
/**
 * Unified YouTube Crawler v2 (New Schema)
 *
 * Updated for new relational schema:
 * - YouTube IDs stored in PV table (not Song)
 * - View counts stored in PV table
 * - DailyViewCount references PV.id (not songId)
 * - Korean titles stored in SongName table
 *
 * Features:
 * - Single API call for both view counts AND Korean titles
 * - Uses: part=statistics,snippet,localizations
 * - CrawlerProgress tracking for resumption
 * - Smart selection modes (new, old, top, all)
 */

import { PrismaClient } from '../generated/prisma';
import pLimit from 'p-limit';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

export type UnifiedCrawlerMode = 'new' | 'old' | 'top' | 'all';

export interface UnifiedYouTubeCrawlerOptions {
  mode?: UnifiedCrawlerMode;
  batchSize?: number;
  maxPVsPerRun?: number;
  enableResume?: boolean;
  updateLocalizations?: boolean;
  startOffset?: number;

  // ID-range based chunking (for parallel execution without duplicate processing)
  minVocadbId?: number;  // Minimum vocadbId (inclusive)
  maxVocadbId?: number;  // Maximum vocadbId (inclusive)
}

export interface UnifiedYouTubeCrawlerResult {
  success: boolean;
  pvsProcessed: number;
  pvsUpdated: number;
  titlesUpdated: number;
  pvsFailed: number;
  lastOffset: number;
  completed: boolean;
  error?: string;
}

interface YouTubeVideoItem {
  id: string;
  statistics?: {
    viewCount?: string;
  };
  snippet?: {
    title?: string;
    defaultLanguage?: string;
  };
  localizations?: {
    ko?: { title?: string };
    kr?: { title?: string };
    [key: string]: { title?: string } | undefined;
  };
}

interface PVWithSong {
  id: number;
  song_id: number;
  pv_id: string;
  view_count: bigint | null;
  view_count_updated_at: Date | null;
}

export class UnifiedYouTubeCrawler {
  private prisma: PrismaClient;
  private options: Omit<Required<UnifiedYouTubeCrawlerOptions>, 'minVocadbId' | 'maxVocadbId'> & {
    minVocadbId?: number;
    maxVocadbId?: number;
  };
  private progressId?: string;

  /**
   * Generate unique progress key for chunk-specific tracking
   * - ID-range mode: youtube-unified-chunk-{minId}-{maxId}
   * - Sequential mode: youtube-unified
   */
  private getProgressKey(): string {
    if (this.options.minVocadbId !== undefined && this.options.maxVocadbId !== undefined) {
      return `youtube-unified-chunk-${this.options.minVocadbId}-${this.options.maxVocadbId}`;
    }
    return 'youtube-unified';
  }

  constructor(prisma: PrismaClient, options: UnifiedYouTubeCrawlerOptions = {}) {
    this.prisma = prisma;

    // Validate ID range parameters
    if (options.minVocadbId !== undefined && options.maxVocadbId === undefined) {
      throw new Error('maxVocadbId must be provided when minVocadbId is set');
    }
    if (options.maxVocadbId !== undefined && options.minVocadbId === undefined) {
      throw new Error('minVocadbId must be provided when maxVocadbId is set');
    }
    if (options.minVocadbId !== undefined && options.maxVocadbId !== undefined) {
      if (options.minVocadbId > options.maxVocadbId) {
        throw new Error('minVocadbId cannot be greater than maxVocadbId');
      }
    }

    this.options = {
      mode: options.mode ?? 'new',
      batchSize: Math.min(options.batchSize ?? 50, 50),
      maxPVsPerRun: options.maxPVsPerRun ?? 500,
      enableResume: options.enableResume ?? true,
      updateLocalizations: options.updateLocalizations ?? true,
      startOffset: options.startOffset ?? 0,
      minVocadbId: options.minVocadbId,
      maxVocadbId: options.maxVocadbId,
    };

    if (!YOUTUBE_API_KEY) {
      throw new Error('YOUTUBE_API_KEY environment variable is required');
    }
  }

  async crawl(): Promise<UnifiedYouTubeCrawlerResult> {
    const startTime = Date.now();
    let pvsProcessed = 0;
    let pvsUpdated = 0;
    let titlesUpdated = 0;
    let pvsFailed = 0;
    let currentOffset = this.options.startOffset;
    let lastProcessedPvId = 0; // For ID-range mode cursor
    let completed = false;

    // Determine if using ID-range mode
    const useIdRange = this.options.minVocadbId !== undefined &&
                       this.options.maxVocadbId !== undefined;

    try {
      const totalPVsToProcess = await this.getTotalCountByMode();

      console.log(`🎬 Unified YouTube Crawler v2 - Mode: ${this.options.mode}`);
      console.log(`   Chunking: ${useIdRange
        ? `ID-range (vocadbId ${this.options.minVocadbId}-${this.options.maxVocadbId})`
        : 'Sequential (OFFSET-based)'}`);
      console.log(`   Localizations: ${this.options.updateLocalizations ? 'enabled' : 'disabled'}`);
      console.log(`   Start offset: ${currentOffset.toLocaleString()}`);
      console.log(`   Max PVs per run: ${this.options.maxPVsPerRun.toLocaleString()}`);
      console.log(`   Total PVs in mode: ${totalPVsToProcess.toLocaleString()}`);

      // Initialize or resume progress
      if (this.options.enableResume) {
        const existingProgress = await this.prisma.crawler_progress.findFirst({
          where: { crawler_type: this.getProgressKey(), status: 'running' },
        });

        if (existingProgress) {
          this.progressId = existingProgress.id;
          currentOffset = existingProgress.last_offset;

          // In ID-range mode, restore offset position (not PV.id cursor)
          if (useIdRange) {
            lastProcessedPvId = existingProgress.last_offset;
            console.log(`🔄 Resuming from offset ${lastProcessedPvId} (chunk mode)`);
          } else {
            console.log(`🔄 Resuming from offset ${currentOffset}`);
          }
        } else {
          const progress = await this.prisma.crawler_progress.create({
            data: {
              id: crypto.randomUUID(),
              crawler_type: this.getProgressKey(),
              status: 'running',
              started_at: new Date(),
              last_offset: currentOffset,
              total_processed: 0,
              metadata: {
                mode: this.options.mode,
                batchSize: this.options.batchSize,
                maxPVsPerRun: this.options.maxPVsPerRun,
                updateLocalizations: this.options.updateLocalizations,
              },
            },
          });
          this.progressId = progress.id;
          console.log(`🚀 Starting new unified YouTube crawler session`);
        }
      }

      // Crawl loop
      while (pvsProcessed < this.options.maxPVsPerRun) {
        const pvs = await this.getPVsByMode(currentOffset, this.options.batchSize, lastProcessedPvId);

        if (pvs.length === 0) {
          console.log(`✅ No more PVs to process`);
          completed = true;
          break;
        }

        console.log(`📥 Processing batch: ${pvs.length} PVs (${useIdRange ? `after PV ID ${lastProcessedPvId}` : `offset ${currentOffset}`})...`);

        const batchResult = await this.processBatch(pvs);
        pvsProcessed += batchResult.processed;
        pvsUpdated += batchResult.updated;
        titlesUpdated += batchResult.titlesUpdated;
        pvsFailed += batchResult.failed;

        console.log(`   Views updated: ${batchResult.updated} PVs`);
        console.log(`   Titles updated: ${batchResult.titlesUpdated} songs`);
        console.log(`   Failed: ${batchResult.failed} PVs`);
        const percent = totalPVsToProcess > 0 ? ((pvsProcessed / totalPVsToProcess) * 100).toFixed(1) : '0';
        console.log(`   Total progress: ${pvsProcessed.toLocaleString()}/${totalPVsToProcess.toLocaleString()} (${percent}%)\n`);

        // Update offset for next batch BEFORE saving to DB
        if (useIdRange) {
          // Chunk mode: lastProcessedPvId is used as offset counter (not PV.id cursor)
          lastProcessedPvId += pvs.length;  // Increment by actual processed count
        } else {
          // Sequential mode: increment offset
          currentOffset += this.options.batchSize;
        }

        if (this.progressId) {
          const updateData: any = { total_processed: pvsProcessed };

          // Update offset/cursor for both modes
          if (!useIdRange) {
            updateData.last_offset = currentOffset;
          } else {
            // In ID-range mode, save cursor position for resumption
            updateData.last_offset = lastProcessedPvId;
          }

          await this.prisma.crawler_progress.update({
            where: { id: this.progressId },
            data: updateData,
          });
        }

        if (pvsProcessed >= this.options.maxPVsPerRun) {
          console.log(`✅ Reached max PVs limit (${this.options.maxPVsPerRun})`);
          break;
        }

        if (pvs.length < this.options.batchSize) {
          console.log(`✅ Processed all available PVs`);
          completed = true;
          break;
        }
      }

      if (this.progressId) {
        await this.prisma.crawler_progress.update({
          where: { id: this.progressId },
          data: {
            status: completed ? 'completed' : 'running',
            completed_at: completed ? new Date() : null,
            last_offset: useIdRange ? lastProcessedPvId : currentOffset,
            total_processed: pvsProcessed,
          },
        });
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`\n✅ Unified YouTube crawler completed in ${duration}s`);
      console.log(`   PVs processed: ${pvsProcessed}`);
      console.log(`   Views updated: ${pvsUpdated} PVs`);
      console.log(`   Titles updated: ${titlesUpdated} songs`);
      console.log(`   PVs failed: ${pvsFailed}`);
      console.log(`   Fully completed: ${completed ? 'Yes' : 'No'}\n`);

      return {
        success: true,
        pvsProcessed,
        pvsUpdated,
        titlesUpdated,
        pvsFailed,
        lastOffset: useIdRange ? lastProcessedPvId : currentOffset,
        completed,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`💥 Unified YouTube crawler failed:`, errorMessage);

      if (this.progressId) {
        await this.prisma.crawler_progress.update({
          where: { id: this.progressId },
          data: { status: 'failed', completed_at: new Date(), error_message: errorMessage },
        });
      }

      return {
        success: false,
        pvsProcessed,
        pvsUpdated,
        titlesUpdated,
        pvsFailed,
        lastOffset: useIdRange ? lastProcessedPvId : currentOffset,
        completed: false,
        error: errorMessage,
      };
    }
  }

  private async getTotalCountByMode(): Promise<number> {
    const baseWhere = { service: 'Youtube' };

    // ID range filter (same as getPVsByMode)
    const useIdRange = this.options.minVocadbId !== undefined && this.options.maxVocadbId !== undefined;
    const songWhere = useIdRange
      ? { vocadb_id: { gte: this.options.minVocadbId, lte: this.options.maxVocadbId } }
      : undefined;

    switch (this.options.mode) {
      case 'new':
        return this.prisma.pvs.count({
          where: {
            ...baseWhere,
            OR: [
              { view_count_updated_at: null },
              { view_count_updated_at: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
            ],
            ...(songWhere && { songs: songWhere }),  // Apply ID range filter
          },
        });

      case 'old':
        return this.prisma.pvs.count({
          where: {
            ...baseWhere,
            OR: [
              { view_count_updated_at: null },
              { view_count_updated_at: { lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } },
            ],
            ...(songWhere && { songs: songWhere }),  // Apply ID range filter
          },
        });

      case 'top':
        // In chunk mode, combine top criteria with vocadb_id range properly
        if (useIdRange && songWhere) {
          return this.prisma.pvs.count({
            where: {
              ...baseWhere,
              OR: [
                { view_count: { gt: 1000000 } },
                { songs: { AND: [songWhere, { favorited_times: { gt: 100 } }] } },
              ],
            },
          });
        }
        return this.prisma.pvs.count({
          where: {
            ...baseWhere,
            OR: [
              { view_count: { gt: 1000000 } },
              { songs: { favorited_times: { gt: 100 } } },
            ],
          },
        });

      case 'all':
        return this.prisma.pvs.count({
          where: {
            ...baseWhere,
            ...(songWhere && { songs: songWhere }),  // Apply ID range filter
          },
        });

      default:
        return 0;
    }
  }

  private async getPVsByMode(offset: number, limit: number, lastProcessedPvId = 0): Promise<PVWithSong[]> {
    const baseWhere: any = { service: 'Youtube' };

    // ID range filter (when provided, use song relation filtering instead of OFFSET)
    const useIdRange = this.options.minVocadbId !== undefined && this.options.maxVocadbId !== undefined;
    const songWhere = useIdRange
      ? { vocadb_id: { gte: this.options.minVocadbId, lte: this.options.maxVocadbId } }
      : undefined;

    // NOTE: Do NOT use cursor (PV.id) with vocadb_id range - they conflict!
    // Chunks are divided by vocadb_id, so we must use OFFSET within each chunk
    // The "lastProcessedPvId" variable is repurposed as an offset counter in chunk mode

    switch (this.options.mode) {
      case 'new':
        return this.prisma.pvs.findMany({
          where: {
            ...baseWhere,
            OR: [
              { view_count_updated_at: null },
              { view_count_updated_at: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
            ],
            ...(songWhere && { songs: songWhere }),  // Apply ID range filter
          },
          select: { id: true, song_id: true, pv_id: true, view_count: true, view_count_updated_at: true },
          orderBy: { id: 'asc' },  // Always sort by ID
          skip: useIdRange ? lastProcessedPvId : offset,  // Use lastProcessedPvId as offset in chunk mode
          take: limit,
        });

      case 'old':
        return this.prisma.pvs.findMany({
          where: {
            ...baseWhere,
            OR: [
              { view_count_updated_at: null },
              { view_count_updated_at: { lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } },
            ],
            ...(songWhere && { songs: songWhere }),  // Apply ID range filter
          },
          select: { id: true, song_id: true, pv_id: true, view_count: true, view_count_updated_at: true },
          orderBy: { id: 'asc' },  // Always sort by ID
          skip: useIdRange ? lastProcessedPvId : offset,  // Use lastProcessedPvId as offset in chunk mode
          take: limit,
        });

      case 'top':
        // In chunk mode, combine top criteria with vocadb_id range properly
        if (useIdRange && songWhere) {
          return this.prisma.pvs.findMany({
            where: {
              ...baseWhere,
              OR: [
                { view_count: { gt: 1000000 } },
                { songs: { AND: [songWhere, { favorited_times: { gt: 100 } }] } },
              ],
            },
            select: { id: true, song_id: true, pv_id: true, view_count: true, view_count_updated_at: true },
            orderBy: { id: 'asc' },  // Always sort by ID
            skip: lastProcessedPvId,
            take: limit,
          });
        }
        return this.prisma.pvs.findMany({
          where: {
            ...baseWhere,
            OR: [
              { view_count: { gt: 1000000 } },
              { songs: { favorited_times: { gt: 100 } } },
            ],
          },
          select: { id: true, song_id: true, pv_id: true, view_count: true, view_count_updated_at: true },
          orderBy: { id: 'asc' },  // Always sort by ID
          skip: offset,
          take: limit,
        });

      case 'all':
        return this.prisma.pvs.findMany({
          where: {
            ...baseWhere,
            ...(songWhere && { songs: songWhere }),  // Apply ID range filter
          },
          select: { id: true, song_id: true, pv_id: true, view_count: true, view_count_updated_at: true },
          orderBy: { id: 'asc' },  // Always sort by ID
          skip: useIdRange ? lastProcessedPvId : offset,  // Use lastProcessedPvId as offset in chunk mode
          take: limit,
        });

      default:
        throw new Error(`Unknown mode: ${this.options.mode}`);
    }
  }

  private async processBatch(pvs: PVWithSong[]): Promise<{
    processed: number;
    updated: number;
    titlesUpdated: number;
    failed: number;
  }> {
    let processed = 0;
    let updated = 0;
    let titlesUpdated = 0;
    let failed = 0;

    const youtubeIds = pvs.map(pv => pv.pv_id);

    if (youtubeIds.length === 0) {
      return { processed: 0, updated: 0, titlesUpdated: 0, failed: 0 };
    }

    try {
      // Unified API call
      const parts = this.options.updateLocalizations
        ? 'statistics,snippet,localizations'
        : 'statistics';

      const url = `${YOUTUBE_API_BASE}/videos?part=${parts}&id=${youtubeIds.join(',')}&key=${YOUTUBE_API_KEY}`;

      const response = await fetch(url);
      if (!response.ok) {
        // Check for quota exceeded (403) or rate limit (429)
        if (response.status === 403 || response.status === 429) {
          const errorBody = await response.text();
          throw new Error(`YouTube API quota/rate limit exceeded (${response.status}): ${errorBody}`);
        }
        throw new Error(`YouTube API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const items: YouTubeVideoItem[] = data.items || [];

      // Create map for quick lookup
      const videoDataMap = new Map<string, { viewCount?: bigint; koreanTitle?: string }>();

      for (const item of items) {
        const videoData: { viewCount?: bigint; koreanTitle?: string } = {};

        if (item.statistics?.viewCount) {
          videoData.viewCount = BigInt(item.statistics.viewCount);
        }

        if (this.options.updateLocalizations) {
          if (item.localizations?.ko?.title) {
            videoData.koreanTitle = item.localizations.ko.title;
          } else if (item.localizations?.kr?.title) {
            videoData.koreanTitle = item.localizations.kr.title;
          } else if (item.snippet?.defaultLanguage === 'ko' && item.snippet?.title) {
            videoData.koreanTitle = item.snippet.title;
          }
        }

        videoDataMap.set(item.id, videoData);
      }

      const now = new Date();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Limited concurrency to avoid connection pool exhaustion
      // With 10 parallel chunks, limit to 5 concurrent transactions per chunk
      // (10 chunks × 5 concurrent = 50 total, within connection pool limits)
      const limit = pLimit(5);
      const updatePromises = pvs.map((pv) =>
        limit(async () => {
        const videoData = videoDataMap.get(pv.pv_id);

        if (videoData?.viewCount === undefined) {
          return { success: false, titleCreated: false, pv_id: pv.pv_id };
        }

        try {
          const viewCount = videoData.viewCount;
          const koreanTitle = videoData.koreanTitle;
          let titleWasCreated = false;

          // No transaction needed - each operation is independent and atomic
          // This avoids connection pool exhaustion issues

          // Update PV view count
          await this.prisma.pvs.update({
            where: { id: pv.id },
            data: { view_count: viewCount, view_count_updated_at: now },
          });

          // Upsert DailyViewCount for time-series tracking
          await this.prisma.daily_view_counts.upsert({
            where: {
              pv_id_recorded_date: {
                pv_id: pv.id,
                recorded_date: today,
              },
            },
            update: { total_views: viewCount },
            create: {
              pv_id: pv.id,
              recorded_date: today,
              total_views: viewCount,
            },
          });

          // Update Korean title in SongName table if found
          // Use atomic UPSERT to prevent race conditions in parallel execution
          if (koreanTitle) {
            await this.prisma.song_names.upsert({
              where: {
                song_id_language: {  // Compound unique key
                  song_id: pv.song_id,
                  language: 'Korean',
                },
              },
              update: {
                value: koreanTitle,  // Update if title changed
              },
              create: {
                song_id: pv.song_id,
                language: 'Korean',
                value: koreanTitle,
              },
            });
            titleWasCreated = true;  // True for both create and update (acceptable)
          }

          return { success: true, titleCreated: titleWasCreated, pv_id: pv.pv_id };
        } catch (dbError) {
          console.error(`❌ DB update failed for PV ${pv.pv_id} (ID: ${pv.id}, song_id: ${pv.song_id}):`, dbError);
          return { success: false, titleCreated: false, pv_id: pv.pv_id };
        }
        })
      );

      // Execute with limited concurrency (max 5 concurrent transactions per chunk)
      const results = await Promise.all(updatePromises);

      // Count results
      for (const result of results) {
        processed++;
        if (result.success) {
          updated++;
          if (result.titleCreated) {
            titlesUpdated++;
          }
        } else {
          failed++;
        }
      }

    } catch (error) {
      console.error(`❌ API error processing batch:`, error);
      // Don't modify counters - individual PV loop already handled counting
    }

    return { processed, updated, titlesUpdated, failed };
  }

  static async resetProgress(prisma: PrismaClient): Promise<void> {
    await prisma.crawler_progress.updateMany({
      where: { crawler_type: 'youtube-unified', status: 'running' },
      data: { status: 'failed', completed_at: new Date(), error_message: 'Manually reset' },
    });
    console.log('✅ Unified YouTube crawler progress reset');
  }

  static async getStatus(prisma: PrismaClient): Promise<{
    status: string;
    startedAt?: Date;
    completedAt?: Date | null;
    lastOffset?: number;
    totalProcessed?: number;
    errorMessage?: string | null;
    metadata?: unknown;
    message?: string;
  }> {
    const latestProgress = await prisma.crawler_progress.findFirst({
      where: { crawler_type: 'youtube-unified' },
      orderBy: { started_at: 'desc' },
    });

    if (!latestProgress) {
      return { status: 'never_run', message: 'No crawler progress found' };
    }

    return {
      status: latestProgress.status,
      startedAt: latestProgress.started_at,
      completedAt: latestProgress.completed_at,
      lastOffset: latestProgress.last_offset,
      totalProcessed: latestProgress.total_processed,
      errorMessage: latestProgress.error_message,
      metadata: latestProgress.metadata,
    };
  }
}
