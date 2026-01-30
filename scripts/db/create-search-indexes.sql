-- ============================================================
-- Search Optimization Indexes for Vocatify
-- ILIKE 검색 성능 향상을 위한 GIN trigram 인덱스
-- ============================================================

-- 1. pg_trgm 확장 활성화 (trigram 기반 유사 검색)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. songs 테이블: default_name ILIKE 검색 최적화
CREATE INDEX IF NOT EXISTS idx_songs_default_name_trgm
  ON songs USING gin(default_name gin_trgm_ops);

-- 3. song_names 테이블: 다국어 제목 ILIKE 검색 최적화
CREATE INDEX IF NOT EXISTS idx_song_names_value_trgm
  ON song_names USING gin(value gin_trgm_ops);

-- 4. artists 테이블: 아티스트명 ILIKE 검색 최적화
CREATE INDEX IF NOT EXISTS idx_artists_name_trgm
  ON artists USING gin(name gin_trgm_ops);

-- 5. songs_enhanced 테이블: 통합 검색 최적화
CREATE INDEX IF NOT EXISTS idx_songs_enhanced_name_trgm
  ON songs_enhanced USING gin(default_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_songs_enhanced_artist_trgm
  ON songs_enhanced USING gin(artist_string gin_trgm_ops);

-- 6. 복합 텍스트 검색용 (선택적 - 전체 텍스트 검색)
-- Note: CONCURRENTLY 옵션은 트랜잭션 외부에서만 사용 가능
CREATE INDEX IF NOT EXISTS idx_songs_enhanced_titles_trgm
  ON songs_enhanced USING gin(
    COALESCE(title_korean, '') gin_trgm_ops
  );

CREATE INDEX IF NOT EXISTS idx_songs_enhanced_title_en_trgm
  ON songs_enhanced USING gin(
    COALESCE(title_english, '') gin_trgm_ops
  );

-- ============================================================
-- 인덱스 확인 쿼리
-- ============================================================
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE indexname LIKE '%trgm%';
