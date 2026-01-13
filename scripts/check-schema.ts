/**
 * Check current database schema to understand the state
 */
import { Client } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkSchema() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ Connected\n');

    // Check songs table columns
    console.log('📋 Songs table columns:');
    console.log('='.repeat(70));

    const columns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'songs'
      ORDER BY ordinal_position
    `);

    columns.rows.forEach(col => {
      console.log(
        `   ${col.column_name.padEnd(30)} ${col.data_type.padEnd(20)} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`
      );
    });

    // Check all tables
    console.log('\n📋 All tables in database:');
    console.log('='.repeat(70));

    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    tables.rows.forEach(table => {
      console.log(`   ${table.table_name}`);
    });

    // Check daily_view_counts structure
    console.log('\n📋 daily_view_counts columns:');
    console.log('='.repeat(70));

    const dvcCols = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'daily_view_counts'
      ORDER BY ordinal_position
    `);

    dvcCols.rows.forEach(col => {
      console.log(`   ${col.column_name.padEnd(30)} ${col.data_type}`);
    });

    await client.end();
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    await client.end();
  }
}

checkSchema();
