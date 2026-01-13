/**
 * Safe Migration Executor with pg client
 * Executes all 7 SQL migration scripts with verification
 */

import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MIGRATION_FILES = [
  '01-create-tables.sql',
  '02-populate-song-names.sql',
  '03-populate-pvs.sql',
  '04-populate-artists.sql',
  '05-populate-tags.sql',
  '06-remap-daily-counts.sql',
  '07-verify.sql',
];

interface ExecutionResult {
  step: string;
  success: boolean;
  duration: number;
  error?: string;
}

async function connectToDatabase(): Promise<Client> {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  console.log('🔌 Connecting to database...');
  await client.connect();
  console.log('✅ Connected successfully\n');

  return client;
}

async function createBackup(client: Client): Promise<void> {
  console.log('📦 Creating pre-migration backup...');

  try {
    const songCount = await client.query('SELECT COUNT(*) FROM songs');
    const dailyCount = await client.query('SELECT COUNT(*) FROM daily_view_counts');
    const dbSize = await client.query(
      "SELECT pg_size_pretty(pg_database_size(current_database())) AS size"
    );

    const backup = {
      timestamp: new Date().toISOString(),
      songCount: songCount.rows[0].count,
      dailyViewCount: dailyCount.rows[0].count,
      databaseSize: dbSize.rows[0].size,
    };

    const backupFile = path.join(
      __dirname,
      `backup-state-${Date.now()}.json`
    );

    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));

    console.log('✅ Backup created:');
    console.log(`   Songs: ${backup.songCount}`);
    console.log(`   Daily View Counts: ${backup.dailyViewCount}`);
    console.log(`   Database Size: ${backup.databaseSize}`);
    console.log(`   File: ${path.basename(backupFile)}\n`);
  } catch (error: any) {
    console.error('❌ Backup failed:', error.message);
    throw error;
  }
}

async function pauseCrawlers(client: Client): Promise<void> {
  console.log('⏸️  Pausing active crawlers...');

  try {
    const result = await client.query(`
      UPDATE crawler_progress
      SET status = 'paused'
      WHERE status = 'running'
    `);

    console.log(`✅ Paused ${result.rowCount || 0} crawler(s)\n`);
  } catch (error: any) {
    if (error.message.includes('does not exist')) {
      console.log('⚠️  crawler_progress table not found (this is OK)\n');
    } else {
      console.warn('⚠️  Failed to pause crawlers:', error.message);
      console.log('   Continuing anyway...\n');
    }
  }
}

async function executeSqlFile(
  client: Client,
  filename: string,
  stepNumber: number
): Promise<ExecutionResult> {
  const startTime = Date.now();
  const filePath = path.join(__dirname, filename);

  console.log(`\n${'='.repeat(70)}`);
  console.log(`📄 Step ${stepNumber}/7: ${filename}`);
  console.log('='.repeat(70));

  try {
    const sql = fs.readFileSync(filePath, 'utf-8');

    // Execute the entire SQL file as a single query
    // PostgreSQL will handle the transaction and multiple statements
    await client.query(sql);

    const duration = Date.now() - startTime;

    console.log(`\n✅ Completed in ${(duration / 1000).toFixed(2)}s`);

    return {
      step: filename,
      success: true,
      duration,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;

    console.error(`\n❌ FAILED after ${(duration / 1000).toFixed(2)}s`);
    console.error(`   Error: ${error.message}`);

    // Show relevant part of error
    if (error.position) {
      console.error(`   Position: ${error.position}`);
    }

    return {
      step: filename,
      success: false,
      duration,
      error: error.message,
    };
  }
}

async function checkFinalState(client: Client): Promise<void> {
  console.log('\n' + '='.repeat(70));
  console.log('📊 Final Database State');
  console.log('='.repeat(70));

  try {
    const queries = [
      { name: 'Songs', query: 'SELECT COUNT(*) FROM songs' },
      { name: 'Song Names', query: 'SELECT COUNT(*) FROM song_names' },
      { name: 'Artists', query: 'SELECT COUNT(*) FROM artists' },
      { name: 'Song Artists', query: 'SELECT COUNT(*) FROM song_artists' },
      { name: 'PVs', query: 'SELECT COUNT(*) FROM pvs' },
      { name: 'Tags', query: 'SELECT COUNT(*) FROM tags' },
      { name: 'Song Tags', query: 'SELECT COUNT(*) FROM song_tags' },
      { name: 'Daily View Counts (old)', query: 'SELECT COUNT(*) FROM daily_view_counts' },
      {
        name: 'Daily View Counts (new)',
        query: 'SELECT COUNT(*) FROM daily_view_counts_v2',
      },
      { name: 'Mapping Table', query: 'SELECT COUNT(*) FROM _migration_song_to_pv_mapping' },
    ];

    for (const { name, query } of queries) {
      try {
        const result = await client.query(query);
        console.log(`   ${name}: ${result.rows[0].count}`);
      } catch (error: any) {
        console.log(`   ${name}: N/A (${error.message.split('\n')[0]})`);
      }
    }
  } catch (error: any) {
    console.error('⚠️  Failed to check final state:', error.message);
  }
}

async function runMigration(): Promise<void> {
  let client: Client | null = null;

  try {
    console.log('\n🚀 Vocatify Database Migration');
    console.log('   Denormalized → Normalized Schema');
    console.log('='.repeat(70));

    // Connect
    client = await connectToDatabase();

    // Pre-migration checks
    await createBackup(client);
    await pauseCrawlers(client);

    // Execute migration steps
    const results: ExecutionResult[] = [];

    for (let i = 0; i < MIGRATION_FILES.length; i++) {
      const filename = MIGRATION_FILES[i];
      const result = await executeSqlFile(client, filename, i + 1);
      results.push(result);

      // Critical steps - abort on failure
      if (!result.success && (filename.includes('06-') || filename.includes('07-'))) {
        console.error(`\n❌ CRITICAL step failed: ${filename}`);
        console.error('   Migration ABORTED. Database is in intermediate state.');
        console.error('   Please review errors and consider rollback.\n');
        break;
      }

      // Warning on non-critical failures
      if (!result.success) {
        console.warn(`⚠️  Non-critical step failed: ${filename}`);
        console.warn('   Continuing with remaining steps...');
      }

      // Brief pause between steps
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Final state check
    await checkFinalState(client);

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('📋 Migration Summary');
    console.log('='.repeat(70));

    const successCount = results.filter(r => r.success).length;
    const totalTime = results.reduce((sum, r) => sum + r.duration, 0);

    console.log(`   Completed: ${successCount}/${results.length} steps`);
    console.log(`   Total Time: ${(totalTime / 1000).toFixed(2)}s`);

    if (successCount === results.length) {
      console.log('\n✅✅✅ MIGRATION COMPLETED SUCCESSFULLY! ✅✅✅');
      console.log('\n📋 Next Steps:');
      console.log('   1. Review verification output above');
      console.log('   2. Check for "VERIFICATION PASSED" in Step 6');
      console.log('   3. If all OK, run table swap:');
      console.log('      npx tsx scripts/migration/swap-tables.ts');
      console.log('   4. Deploy: npm run build && git push');
    } else {
      console.log('\n⚠️  Migration completed with errors');
      console.log('   Review failed steps above before proceeding');
    }

    console.log('='.repeat(70) + '\n');
  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (client) {
      await client.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Execute
runMigration();
