import { Client } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function syncSongsEnhanced() {
  console.log('🔄 Syncing songs_enhanced table with source data\n');

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Check current row count
    const beforeCount = await client.query('SELECT COUNT(*) FROM songs_enhanced');
    console.log(`📊 Current songs_enhanced rows: ${beforeCount.rows[0].count}\n`);

    console.log('⏱️  Syncing data (this may take 1-2 minutes)...\n');

    const startTime = Date.now();

    // Complex INSERT query that aggregates data from multiple tables
    const syncQuery = `
      INSERT INTO songs_enhanced (
        song_id,
        default_name,
        song_type,
        publish_date,
        favorited_times,
        rating_score,
        length_seconds,
        thumb_url,
        title_korean,
        title_english,
        title_japanese,
        title_romaji,
        artist_string,
        artist_type_primary,
        is_vocaloid_song,
        youtube_pv_id,
        youtube_id,
        youtube_url,
        view_count,
        view_count_updated_at,
        last_synced_at
      )
      SELECT
        s.vocadb_id as song_id,
        s.default_name,
        s.song_type,
        s.publish_date,
        s.favorited_times,
        s.rating_score,
        s.length_seconds,
        s.thumb_url,

        -- Titles from song_names
        MAX(CASE WHEN sn.language = 'Korean' THEN sn.value END) as title_korean,
        MAX(CASE WHEN sn.language = 'English' THEN sn.value END) as title_english,
        MAX(CASE WHEN sn.language = 'Japanese' THEN sn.value END) as title_japanese,
        MAX(CASE WHEN sn.language = 'Romaji' THEN sn.value END) as title_romaji,

        -- Artist string from song_artists
        (
          SELECT STRING_AGG(a.name, ', ' ORDER BY sa2.id)
          FROM song_artists sa2
          JOIN artists a ON sa2.artist_id = a.vocadb_id
          WHERE sa2.song_id = s.vocadb_id AND sa2.is_support = false
        ) as artist_string,

        -- Primary artist type
        (
          SELECT a.artist_type
          FROM song_artists sa2
          JOIN artists a ON sa2.artist_id = a.vocadb_id
          WHERE sa2.song_id = s.vocadb_id AND sa2.is_support = false
          ORDER BY sa2.id
          LIMIT 1
        ) as artist_type_primary,

        -- Is Vocaloid song check
        EXISTS (
          SELECT 1
          FROM song_artists sa2
          JOIN artists a ON sa2.artist_id = a.vocadb_id
          WHERE sa2.song_id = s.vocadb_id
            AND a.artist_type IN (
              'Vocaloid', 'UTAU', 'SynthesizerV', 'CeVIO',
              'VOICEVOX', 'AIVOICE', 'VoiSona', 'Voiceroid',
              'NEUTRINO', 'ACEVirtualSinger'
            )
        ) as is_vocaloid_song,

        -- YouTube info from pvs (best PV by view count)
        yt.id as youtube_pv_id,
        yt.pv_id as youtube_id,
        yt.url as youtube_url,
        yt.view_count,
        yt.view_count_updated_at,

        NOW() as last_synced_at

      FROM songs s
      LEFT JOIN song_names sn ON sn.song_id = s.vocadb_id
      LEFT JOIN LATERAL (
        SELECT id, pv_id, url, view_count, view_count_updated_at
        FROM pvs
        WHERE song_id = s.vocadb_id
          AND service = 'Youtube'
          AND view_count IS NOT NULL
        ORDER BY view_count DESC NULLS LAST
        LIMIT 1
      ) yt ON true
      GROUP BY
        s.vocadb_id,
        s.default_name,
        s.song_type,
        s.publish_date,
        s.favorited_times,
        s.rating_score,
        s.length_seconds,
        s.thumb_url,
        yt.id,
        yt.pv_id,
        yt.url,
        yt.view_count,
        yt.view_count_updated_at

      ON CONFLICT (song_id) DO UPDATE SET
        default_name = EXCLUDED.default_name,
        song_type = EXCLUDED.song_type,
        publish_date = EXCLUDED.publish_date,
        favorited_times = EXCLUDED.favorited_times,
        rating_score = EXCLUDED.rating_score,
        length_seconds = EXCLUDED.length_seconds,
        thumb_url = EXCLUDED.thumb_url,
        title_korean = EXCLUDED.title_korean,
        title_english = EXCLUDED.title_english,
        title_japanese = EXCLUDED.title_japanese,
        title_romaji = EXCLUDED.title_romaji,
        artist_string = EXCLUDED.artist_string,
        artist_type_primary = EXCLUDED.artist_type_primary,
        is_vocaloid_song = EXCLUDED.is_vocaloid_song,
        youtube_pv_id = EXCLUDED.youtube_pv_id,
        youtube_id = EXCLUDED.youtube_id,
        youtube_url = EXCLUDED.youtube_url,
        view_count = EXCLUDED.view_count,
        view_count_updated_at = EXCLUDED.view_count_updated_at,
        last_synced_at = NOW();
    `;

    const result = await client.query(syncQuery);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`✅ Sync completed in ${duration}s\n`);

    // Check final row count
    const afterCount = await client.query('SELECT COUNT(*) FROM songs_enhanced');
    const totalRows = parseInt(afterCount.rows[0].count);
    const newRows = totalRows - parseInt(beforeCount.rows[0].count);

    console.log('📊 Sync Results:');
    console.log(`  Total rows: ${totalRows.toLocaleString()}`);
    console.log(`  New rows: ${newRows.toLocaleString()}`);
    console.log(`  Updated rows: ${Math.max(0, result.rowCount! - newRows).toLocaleString()}\n`);

    // Sample verification
    const sample = await client.query(`
      SELECT
        song_id,
        default_name,
        title_korean,
        artist_string,
        is_vocaloid_song,
        view_count
      FROM songs_enhanced
      WHERE view_count IS NOT NULL
      ORDER BY view_count DESC
      LIMIT 5;
    `);

    console.log('🔍 Sample Data (Top 5 by views):');
    sample.rows.forEach((row, idx) => {
      const title = row.title_korean || row.default_name;
      const views = parseInt(row.view_count).toLocaleString();
      const vocaloid = row.is_vocaloid_song ? '🎤' : '  ';
      console.log(`  ${idx + 1}. ${vocaloid} ${title.substring(0, 40)} - ${views} views`);
    });

    // Vocaloid song count
    const vocaloidCount = await client.query(`
      SELECT COUNT(*) FROM songs_enhanced WHERE is_vocaloid_song = true
    `);

    console.log(`\n📈 Statistics:`);
    console.log(`  Vocaloid songs: ${parseInt(vocaloidCount.rows[0].count).toLocaleString()}`);
    console.log(`  Non-Vocaloid songs: ${(totalRows - parseInt(vocaloidCount.rows[0].count)).toLocaleString()}`);

    console.log('\n📝 Next Steps:');
    console.log('  1. Compute daily/weekly increases: npm run compute:increases');
    console.log('  2. Test new query functions');
    console.log('  3. Set up automatic sync triggers\n');

  } catch (error: any) {
    console.error('❌ Sync failed:', error.message);
    console.error(error);
    throw error;
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

syncSongsEnhanced()
  .then(() => {
    console.log('\n🎉 Sync completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Sync failed:', error);
    process.exit(1);
  });
