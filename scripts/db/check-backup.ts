import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Checking backup table...\n');

  try {
    // List all tables
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `;
    console.log('Tables in database:');
    tables.forEach(t => console.log(`  - ${t.tablename}`));

    // Check backup table
    const backupExists = tables.some(t => t.tablename === 'daily_view_counts_backup');
    if (backupExists) {
      const count = await prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*) as count FROM daily_view_counts_backup
      `;
      console.log(`\n✅ Backup table exists with ${count[0].count.toLocaleString()} records`);
    } else {
      console.log('\n❌ Backup table NOT found!');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
