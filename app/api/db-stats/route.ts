/**
 * Database Statistics API Endpoint
 * Check current storage usage and table sizes
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Get total database size
    const totalSize = await prisma.$queryRaw<Array<{ total: string }>>`
      SELECT pg_size_pretty(pg_database_size(current_database())) AS total;
    `;

    // Get table sizes
    const tables = await prisma.$queryRaw<
      Array<{ table_name: string; total_size: string; row_count: string }>
    >`
      SELECT
        schemaname || '.' || tablename AS table_name,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
        pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS row_count
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
      LIMIT 10;
    `;

    // Count records in daily_view_counts
    const dailyCount = await prisma.daily_view_counts.count();

    // Get oldest and newest daily records
    const [oldestDaily, newestDaily] = await Promise.all([
      prisma.daily_view_counts.findFirst({
        orderBy: { recorded_date: 'asc' },
        select: { recorded_date: true },
      }),
      prisma.daily_view_counts.findFirst({
        orderBy: { recorded_date: 'desc' },
        select: { recorded_date: true },
      }),
    ]);

    return NextResponse.json({
      totalSize: totalSize[0]?.total || 'unknown',
      tables,
      dailyViewCounts: {
        count: dailyCount,
        oldestRecord: oldestDaily?.recorded_date,
        newestRecord: newestDaily?.recorded_date,
        retentionDays: oldestDaily && newestDaily
          ? Math.ceil(
              (newestDaily.recorded_date.getTime() - oldestDaily.recorded_date.getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : 0,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching database stats:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
