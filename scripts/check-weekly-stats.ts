import { prisma } from '../lib/prisma';

async function check() {
  try {
    const weeklyCount = await prisma.song_weekly_stats.count();
    console.log('Weekly stats count:', weeklyCount);

    const sample = await prisma.song_weekly_stats.findMany({
      take: 5,
      orderBy: { weekly_increase: 'desc' },
    });
    console.log('\nTop 5 weekly increases:');
    sample.forEach((s, i) => {
      console.log(`${i + 1}. Song ${s.song_id}: +${s.weekly_increase} (${s.previous_views} → ${s.current_views})`);
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

check();
