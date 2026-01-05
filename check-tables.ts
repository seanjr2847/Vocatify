import { PrismaClient } from '@/lib/generated/prisma';

const prisma = new PrismaClient();

async function checkTables() {
  const songCount = await prisma.song.count();
  const artistCount = await prisma.artist.count();
  const tagCount = await prisma.tag.count();

  console.log('Songs:', songCount);
  console.log('Artists:', artistCount);
  console.log('Tags:', tagCount);

  await prisma.$disconnect();
}

checkTables().catch(console.error);
