import { prisma } from '../lib/prisma';

async function check() {
  try {
    const count = await prisma.daily_view_counts.count();
    console.log('Total daily_view_counts records:', count);

    const recent = await prisma.daily_view_counts.findFirst({
      orderBy: { recorded_date: 'desc' },
      select: { recorded_date: true, total_views: true },
    });
    console.log('Most recent record:', recent);

    const dateRange = await prisma.$queryRaw<any[]>`
      SELECT
        MIN(recorded_date) as oldest,
        MAX(recorded_date) as newest,
        COUNT(*) as count
      FROM daily_view_counts
    `;
    console.log('Date range:', dateRange[0]);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

check();
