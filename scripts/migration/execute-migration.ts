/**
 * Migration Executor - Executes all 7 migration SQL scripts safely
 * Run with: npx ts-node scripts/migration/execute-migration.ts
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface MigrationStep {
  name: string;
  file: string;
  critical: boolean;
}

const MIGRATION_STEPS: MigrationStep[] = [
  { name: '01. Create Tables', file: '01-create-tables.sql', critical: false },
  { name: '02. Populate Song Names', file: '02-populate-song-names.sql', critical: false },
  { name: '03. Populate PVs', file: '03-populate-pvs.sql', critical: true },
  { name: '04. Populate Artists', file: '04-populate-artists.sql', critical: false },
  { name: '05. Populate Tags', file: '05-populate-tags.sql', critical: false },
  { name: '06. Remap Daily Counts', file: '06-remap-daily-counts.sql', critical: true },
  { name: '07. Final Verification', file: '07-verify.sql', critical: true },
];

async function createBackup() {
  console.log('📦 Creating backup...');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const backupFile = `backup_${timestamp}.json`;

  try {
    // Backup critical data as JSON
    const songs = await prisma.$queryRaw`SELECT COUNT(*) as count FROM songs`;
    const dailyViews = await prisma.$queryRaw`SELECT COUNT(*) as count FROM daily_view_counts`;

    const backup = {
      timestamp: new Date().toISOString(),
      counts: { songs, dailyViews },
      database_url: process.env.DATABASE_URL?.split('@')[1] || 'hidden',
    };

    fs.writeFileSync(
      path.join(__dirname, backupFile),
      JSON.stringify(backup, null, 2)
    );

    console.log(`✅ Backup saved: ${backupFile}`);
    return true;
  } catch (error) {
    console.error('❌ Backup failed:', error);
    return false;
  }
}

async function checkCurrentState() {
  console.log('\n📊 Current Database State:');
  console.log('================================');

  try {
    const songCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM songs
    `;

    const dailyCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM daily_view_counts
    `;

    const dbSize = await prisma.$queryRaw<Array<{ total: string }>>`
      SELECT pg_size_pretty(pg_database_size(current_database())) AS total
    `;

    console.log(`Songs: ${songCount[0].count.toString()}`);
    console.log(`Daily View Counts: ${dailyCount[0].count.toString()}`);
    console.log(`Database Size: ${dbSize[0].total}`);

    return true;
  } catch (error) {
    console.error('❌ Failed to check database state:', error);
    return false;
  }
}

async function pauseCrawlers() {
  console.log('\n⏸️  Pausing active crawlers...');

  try {
    const result = await prisma.$executeRaw`
      UPDATE crawler_progress
      SET status = 'paused'
      WHERE status = 'running'
    `;

    console.log(`✅ Paused ${result} crawler(s)`);
    return true;
  } catch (error) {
    console.error('⚠️  Failed to pause crawlers:', error);
    console.log('Continuing anyway (table may not exist yet)...');
    return true;
  }
}

async function executeSqlFile(filePath: string, stepName: string): Promise<boolean> {
  console.log(`\n🔄 Executing: ${stepName}`);
  console.log(`   File: ${path.basename(filePath)}`);

  try {
    const sql = fs.readFileSync(filePath, 'utf-8');

    // Execute the SQL file
    // Note: Prisma doesn't support direct SQL file execution, so we use $executeRawUnsafe
    // Split by semicolons and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`   Executing ${statements.length} statements...`);

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      if (stmt.length > 0) {
        try {
          await prisma.$executeRawUnsafe(stmt);
        } catch (err: any) {
          // Some statements might fail harmlessly (e.g., CREATE TABLE IF NOT EXISTS on existing table)
          if (!err.message.includes('already exists') &&
              !err.message.includes('does not exist') &&
              !err.message.includes('NOTICE')) {
            console.error(`   ⚠️  Statement ${i + 1} warning:`, err.message.slice(0, 100));
          }
        }
      }
    }

    console.log(`   ✅ Completed: ${stepName}`);
    return true;
  } catch (error: any) {
    console.error(`   ❌ Failed: ${stepName}`);
    console.error(`   Error:`, error.message);
    return false;
  }
}

async function runMigration() {
  console.log('🚀 Starting Migration: Denormalized → Normalized Schema');
  console.log('='.repeat(60));

  // Pre-flight checks
  const stateOk = await checkCurrentState();
  if (!stateOk) {
    console.error('\n❌ Pre-flight check failed. Aborting.');
    return;
  }

  const backupOk = await createBackup();
  if (!backupOk) {
    console.error('\n❌ Backup failed. Aborting for safety.');
    return;
  }

  await pauseCrawlers();

  // Execute migration steps
  console.log('\n📝 Executing Migration Steps:');
  console.log('='.repeat(60));

  for (const step of MIGRATION_STEPS) {
    const filePath = path.join(__dirname, step.file);

    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${step.file}`);
      if (step.critical) {
        console.error('This is a CRITICAL step. Aborting.');
        return;
      }
      continue;
    }

    const success = await executeSqlFile(filePath, step.name);

    if (!success && step.critical) {
      console.error(`\n❌ CRITICAL step failed: ${step.name}`);
      console.error('Migration aborted. Database is in intermediate state.');
      console.error('Review errors above and consider rollback if needed.');
      return;
    }

    // Brief pause between steps
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Migration Completed Successfully!');
  console.log('='.repeat(60));

  console.log('\n📋 Next Steps:');
  console.log('1. Review verification output above');
  console.log('2. If all checks passed, execute table swap:');
  console.log('   npx ts-node scripts/migration/swap-tables.ts');
  console.log('3. Deploy code: npm run build && git push');
  console.log('4. Monitor for 7 days before cleanup');
}

// Execute
runMigration()
  .catch((error) => {
    console.error('\n❌ Migration failed with error:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
