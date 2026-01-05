import { PrismaClient } from '@/lib/generated/prisma';

const prisma = new PrismaClient();

async function checkCount() {
  const count = await prisma.song.count();
  console.log('Total songs in database:', count);
  await prisma.$disconnect();
}

checkCount().catch(console.error);
