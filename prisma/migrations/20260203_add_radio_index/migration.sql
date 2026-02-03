-- Radio query optimization: Composite partial index
-- Covers WHERE is_vocaloid_song = true AND youtube_id IS NOT NULL AND view_count >= X

CREATE INDEX IF NOT EXISTS "idx_songs_enhanced_radio"
ON songs_enhanced (view_count DESC)
WHERE is_vocaloid_song = true AND youtube_id IS NOT NULL;

-- Index for random sampling with song_id ordering
CREATE INDEX IF NOT EXISTS "idx_songs_enhanced_radio_songid"
ON songs_enhanced (song_id)
WHERE is_vocaloid_song = true AND youtube_id IS NOT NULL;
