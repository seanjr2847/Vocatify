import { PrismaClient } from './lib/generated/prisma/index.js';
const p = new PrismaClient();

async function main() {
  console.log('Crawler Selection Analysis\n');
  
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const newCount = await p.pV.count({
    where: {
      service: 'Youtube',
      OR: [
        { viewCountUpdatedAt: null },
        { viewCountUpdatedAt: { lt: thirtyDaysAgo } }
      ]
    }
  });
  console.log('Mode new:', newCount, 'PVs');
  
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const oldCount = await p.pV.count({
    where: {
      service: 'Youtube',
      OR: [
        { viewCountUpdatedAt: null },
        { viewCountUpdatedAt: { lt: ninetyDaysAgo } }
      ]
    }
  });
  console.log('Mode old:', oldCount, 'PVs');
  
  const topCount = await p.pV.count({
    where: {
      service: 'Youtube',
      OR: [
        { viewCount: { gt: 1000000 } },
        { song: { favoritedTimes: { gt: 100 } } }
      ]
    }
  });
  console.log('Mode top:', topCount, 'PVs');
  
  const allCount = await p.pV.count({
    where: { service: 'Youtube' }
  });
  console.log('Mode all:', allCount, 'PVs');
  
  console.log('\nSample for new mode:');
  const sampleNew = await p.pV.findMany({
    where: {
      service: 'Youtube',
      OR: [
        { viewCountUpdatedAt: null },
        { viewCountUpdatedAt: { lt: thirtyDaysAgo } }
      ]
    },
    select: { id: true, pvId: true, viewCount: true, viewCountUpdatedAt: true },
    orderBy: { id: 'asc' },
    take: 3
  });
  console.log(JSON.stringify(sampleNew, (k,v) => typeof v === 'bigint' ? v.toString() : v, 2));
}

main().finally(() => p.$disconnect());
