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
  songId: number;
  pvId: string;
  viewCount: bigint | null;
  viewCountUpdatedAt: Date | null;
}

export class UnifiedYouTubeCrawler {
  private prisma: PrismaClient;
  private options: Omit<Required<UnifiedYouTubeCrawlerOptions>, 'minVocadbId' | 'maxVocadbId'> & {
    minVocadbId?: number;
    maxVocadbId?: number;
  };
  private progressId?: string;

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
        const existingProgress = await this.prisma.crawlerProgress.findFirst({
          where: { crawlerType: 'youtube-unified', status: 'running' },
        });

        if (existingProgress) {
          this.progressId = existingProgress.id;
          currentOffset = existingProgress.lastOffset;
          console.log(`🔄 Resuming from offset ${currentOffset}`);
        } else {
          const progress = await this.prisma.crawlerProgress.create({
            data: {
              crawlerType: 'youtube-unified',
              status: 'running',
              startedAt: new Date(),
              lastOffset: currentOffset,
              totalProcessed: 0,
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

        if (this.progressId) {
          const updateData: any = { totalProcessed: pvsProcessed };

          // Only update offset in OFFSET mode
          if (!useIdRange) {
            updateData.lastOffset = currentOffset;
          }

          await this.prisma.crawlerProgress.update({
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

        // Update cursor for next batch
        if (useIdRange) {
          // ID-range mode: update lastProcessedPvId to skip already-processed PVs
          const maxPvId = Math.max(...pvs.map(pv => pv.id));
          lastProcessedPvId = maxPvId;
        } else {
          // OFFSET mode: increment offset
          currentOffset += this.options.batchSize;
        }
      }

      if (this.progressId) {
        await this.prisma.crawlerProgress.update({
          where: { id: this.progressId },
          data: {
            status: completed ? 'completed' : 'running',
            completedAt: completed ? new Date() : null,
            lastOffset: currentOffset,
            totalProcessed: pvsProcessed,
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
        lastOffset: currentOffset,
        completed,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`💥 Unified YouTube crawler failed:`, errorMessage);

      if (this.progressId) {
        await this.prisma.crawlerProgress.update({
          where: { id: this.progressId },
          data: { status: 'failed', completedAt: new Date(), errorMessage },
        });
      }

      return {
        success: false,
        pvsProcessed,
        pvsUpdated,
        titlesUpdated,
        pvsFailed,
        lastOffset: currentOffset,
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
      ? { vocadbId: { gte: this.options.minVocadbId, lte: this.options.maxVocadbId } }
      : undefined;

    switch (this.options.mode) {
      case 'new':
        return this.prisma.pV.count({
          where: {
            ...baseWhere,
            OR: [
              { viewCountUpdatedAt: null },
              { viewCountUpdatedAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
            ],
            ...(songWhere && { song: songWhere }),  // Apply ID range filter
          },
        });

      case 'old':
        return this.prisma.pV.count({
          where: {
            ...baseWhere,
            OR: [
              { viewCountUpdatedAt: null },
              { viewCountUpdatedAt: { lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } },
            ],
            ...(songWhere && { song: songWhere }),  // Apply ID range filter
          },
        });

      case 'top':
        return this.prisma.pV.count({
          where: {
            ...baseWhere,
            OR: [
              { viewCount: { gt: 1000000 } },
              { song: { favoritedTimes: { gt: 100 } } },
            ],
            ...(songWhere && { song: songWhere }),  // Apply ID range filter
          },
        });

      case 'all':
        return this.prisma.pV.count({
          where: {
            ...baseWhere,
            ...(songWhere && { song: songWhere }),  // Apply ID range filter
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
      ? { vocadbId: { gte: this.options.minVocadbId, lte: this.options.maxVocadbId } }
      : undefined;

    // Cursor-based pagination for ID-range mode
    if (useIdRange && lastProcessedPvId > 0) {
      baseWhere.id = { gt: lastProcessedPvId };
    }

    switch (this.options.mode) {
      case 'new':
        return this.prisma.pV.findMany({
          where: {
            ...baseWhere,
            OR: [
              { viewCountUpdatedAt: null },
              { viewCountUpdatedAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
            ],
            ...(songWhere && { song: songWhere }),  // Apply ID range filter
          },
          select: { id: true, songId: true, pvId: true, viewCount: true, viewCountUpdatedAt: true },
          orderBy: { id: 'asc' },  // Always sort by ID for cursor-based pagination
          skip: useIdRange ? 0 : offset,  // Remove OFFSET when using ID-range filtering
          take: limit,
        });

      case 'old':
        return this.prisma.pV.findMany({
          where: {
            ...baseWhere,
            OR: [
              { viewCountUpdatedAt: null },
              { viewCountUpdatedAt: { lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } },
            ],
            ...(songWhere && { song: songWhere }),  // Apply ID range filter
          },
          select: { id: true, songId: true, pvId: true, viewCount: true, viewCountUpdatedAt: true },
          orderBy: { id: 'asc' },  // Always sort by ID for cursor-based pagination
          skip: useIdRange ? 0 : offset,
          take: limit,
        });

      case 'top':
        return this.prisma.pV.findMany({
          where: {
            ...baseWhere,
            OR: [
              { viewCount: { gt: 1000000 } },
              { song: { favoritedTimes: { gt: 100 } } },
            ],
            ...(songWhere && { song: songWhere }),  // Apply ID range filter
          },
          select: { id: true, songId: true, pvId: true, viewCount: true, viewCountUpdatedAt: true },
          orderBy: { viewCount: 'desc' },  // Keep viewCount ordering for 'top' mode
          skip: useIdRange ? 0 : offset,
          take: limit,
        });

      case 'all':
        return this.prisma.pV.findMany({
          where: {
            ...baseWhere,
            ...(songWhere && { song: songWhere }),  // Apply ID range filter
          },
          select: { id: true, songId: true, pvId: true, viewCount: true, viewCountUpdatedAt: true },
          orderBy: { id: 'asc' },  // Always sort by ID for cursor-based pagination
          skip: useIdRange ? 0 : offset,  // Remove OFFSET when using ID-range filtering
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

    const youtubeIds = pvs.map(pv => pv.pvId);

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

      // Process each PV
      for (const pv of pvs) {
        const videoData = videoDataMap.get(pv.pvId);

        if (videoData?.viewCount !== undefined) {
          try {
            // Extract values to ensure TypeScript type safety
            const viewCount = videoData.viewCount;
            const koreanTitle = videoData.koreanTitle;

            // Flag to track if title was created (set outside transaction)
            let titleWasCreated = false;

            // Use transaction to ensure atomicity and catch connection issues
            await this.prisma.$transaction(async (tx) => {
              // Update PV view count
              await tx.pV.update({
                where: { id: pv.id },
                data: {
                  viewCount,
                  viewCountUpdatedAt: now,
                },
              });

              // Upsert DailyViewCount (using pv.id, not songId)
              await tx.dailyViewCount.upsert({
                where: {
                  pvId_recordedDate: {
                    pvId: pv.id,
                    recordedDate: today,
                  },
                },
                update: { totalViews: viewCount },
                create: {
                  pvId: pv.id,
                  recordedDate: today,
                  totalViews: viewCount,
                },
              });

              // Update Korean title in SongName table if found
              if (koreanTitle) {
                const existingKoreanName = await tx.songName.findFirst({
                  where: { songId: pv.songId, language: 'Korean' },
                });

                if (!existingKoreanName) {
                  await tx.songName.create({
                    data: {
                      songId: pv.songId,
                      language: 'Korean',
                      value: koreanTitle,
                    },
                  });
                  titleWasCreated = true;  // Set flag inside transaction
                }
              }
            });

            // Transaction succeeded - increment counters OUTSIDE transaction
            updated++;

            if (titleWasCreated) {
              titlesUpdated++;
            }
          } catch (dbError) {
            console.error(`❌ DB update failed for PV ${pv.pvId} (ID: ${pv.id}, songId: ${pv.songId}):`, dbError);
            failed++;
          }
        } else {
          // YouTube API didn't return data (deleted/private video)
          failed++;
        }
        processed++;
      }

    } catch (error) {
      console.error(`❌ API error processing batch:`, error);
      // Don't modify counters - individual PV loop already handled counting
    }

    return { processed, updated, titlesUpdated, failed };
  }

  static async resetProgress(prisma: PrismaClient): Promise<void> {
    await prisma.crawlerProgress.updateMany({
      where: { crawlerType: 'youtube-unified', status: 'running' },
      data: { status: 'failed', completedAt: new Date(), errorMessage: 'Manually reset' },
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
    const latestProgress = await prisma.crawlerProgress.findFirst({
      where: { crawlerType: 'youtube-unified' },
      orderBy: { startedAt: 'desc' },
    });

    if (!latestProgress) {
      return { status: 'never_run', message: 'No crawler progress found' };
    }

    return {
      status: latestProgress.status,
      startedAt: latestProgress.startedAt,
      completedAt: latestProgress.completedAt,
      lastOffset: latestProgress.lastOffset,
      totalProcessed: latestProgress.totalProcessed,
      errorMessage: latestProgress.errorMessage,
      metadata: latestProgress.metadata,
    };
  }
}
