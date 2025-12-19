/**
 * VocaDB SQLite 크롤러
 * - 무제한 수집 (YouTube 있는 Original 곡 전부)
 * - SQLite DB에 저장
 * - 중복 자동 제거
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

console.log('🚀 VocaDB SQLite 크롤러 시작\n');

const VOCADB_API_BASE = 'https://vocadb.net/api';
const batchSize = parseInt(process.argv[2]) || 100;
const targetCount = parseInt(process.argv[3]) || 999999; // 기본: 무제한

console.log(`설정:`);
console.log(`  - 배치 크기: ${batchSize}곡`);
console.log(`  - 목표: ${targetCount === 999999 ? '무제한' : `${targetCount}곡`} (Original만)`);
console.log(`  - 저장: SQLite DB\n`);

// DB 초기화
const dataDir = path.join(process.cwd(), 'data', 'vocadb');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'vocatify.db');
const db = new Database(dbPath);

// 테이블 생성
db.exec(`
  CREATE TABLE IF NOT EXISTS songs (
    vocadbId INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    titleEnglish TEXT,
    titleJapanese TEXT,
    titleRomaji TEXT,
    artist TEXT NOT NULL,
    artistType TEXT,
    youtubeId TEXT NOT NULL,
    youtubeUrl TEXT NOT NULL,
    thumbUrl TEXT,
    favoritedTimes INTEGER DEFAULT 0,
    ratingScore INTEGER DEFAULT 0,
    tags TEXT,
    publishDate TEXT,
    songType TEXT,
    crawledAt TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_youtube ON songs(youtubeId);
  CREATE INDEX IF NOT EXISTS idx_favorited ON songs(favoritedTimes DESC);
  CREATE INDEX IF NOT EXISTS idx_rating ON songs(ratingScore DESC);
  CREATE INDEX IF NOT EXISTS idx_publish ON songs(publishDate DESC);
`);

// Insert 문 준비
const insertStmt = db.prepare(`
  INSERT OR REPLACE INTO songs (
    vocadbId, title, titleEnglish, titleJapanese, titleRomaji,
    artist, artistType, youtubeId, youtubeUrl, thumbUrl,
    favoritedTimes, ratingScore, tags, publishDate, songType, crawledAt
  ) VALUES (
    @vocadbId, @title, @titleEnglish, @titleJapanese, @titleRomaji,
    @artist, @artistType, @youtubeId, @youtubeUrl, @thumbUrl,
    @favoritedTimes, @ratingScore, @tags, @publishDate, @songType, @crawledAt
  )
`);

async function crawl() {
  let start = 0;
  let totalProcessed = 0;
  let consecutiveEmpty = 0;

  while (totalProcessed < targetCount) {
    const fields = 'Names,Artists,PVs,Tags,ThumbUrl,MainPicture';
    const url = `${VOCADB_API_BASE}/songs?start=${start}&maxResults=${batchSize}&fields=${fields}&songTypes=Original&sort=AdditionDate`;

    console.log(`📥 배치 ${Math.floor(start / batchSize) + 1}: 인덱스 ${start}...`);

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Vocatify/1.0',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API 에러: ${response.status}`);
      }

      const data = await response.json();
      const items = data.items || [];

      if (items.length === 0) {
        consecutiveEmpty++;
        if (consecutiveEmpty >= 3) {
          console.log('\n✅ 더 이상 데이터 없음 (3번 연속 빈 응답)\n');
          break;
        }
      } else {
        consecutiveEmpty = 0;
      }

      console.log(`   받은 곡: ${items.length}개`);

      let batchProcessed = 0;

      for (const item of items) {
        // YouTube PV 필터
        if (!item.pvs || item.pvs.length === 0) continue;
        const youtube = item.pvs.find((pv: any) => pv.service === 'Youtube');
        if (!youtube || !youtube.pvId) continue;

        // 다국어 이름
        const names = item.names || [];
        const englishName = names.find((n: any) => n.language === 'English')?.value;
        const japaneseName = names.find((n: any) => n.language === 'Japanese')?.value;
        const romajiName = names.find((n: any) => n.language === 'Romaji')?.value;
        const preferredTitle = englishName || romajiName || japaneseName || item.name;

        // 아티스트 타입
        let artistType = null;
        if (item.artists && item.artists.length > 0) {
          const vocaloid = item.artists.find((a: any) => a.artist?.artistType === 'Vocaloid');
          const producer = item.artists.find((a: any) => a.artist?.artistType === 'Producer');
          artistType = vocaloid?.artist?.artistType || producer?.artist?.artistType || null;
        }

        // 태그 (JSON 문자열로 저장)
        const tags = (item.tags || [])
          .slice(0, 10)
          .map((t: any) => t.tag?.name || t.name)
          .filter((t: string) => t);

        // 썸네일
        const thumbUrl = item.mainPicture?.urlThumb || item.thumbUrl || null;

        // DB에 저장
        insertStmt.run({
          vocadbId: item.id,
          title: preferredTitle,
          titleEnglish: englishName || null,
          titleJapanese: japaneseName || null,
          titleRomaji: romajiName || null,
          artist: item.artistString,
          artistType,
          youtubeId: youtube.pvId,
          youtubeUrl: `https://www.youtube.com/watch?v=${youtube.pvId}`,
          thumbUrl,
          favoritedTimes: item.favoritedTimes || 0,
          ratingScore: item.ratingScore || 0,
          tags: JSON.stringify(tags),
          publishDate: item.publishDate || null,
          songType: item.songType,
          crawledAt: new Date().toISOString(),
        });

        batchProcessed++;
        totalProcessed++;

        if (totalProcessed >= targetCount) break;
      }

      console.log(`   처리된 곡: ${batchProcessed}개`);
      console.log(`   현재 총: ${totalProcessed}곡\n`);

      if (items.length < batchSize) {
        console.log('✅ 모든 데이터 가져옴\n');
        break;
      }

      start += batchSize;

      // 딜레이
      if (totalProcessed < targetCount) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

    } catch (error) {
      console.error('❌ 에러:', error);
      console.log('10초 후 재시도...\n');
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }

  // 통계
  const stats = db.prepare('SELECT COUNT(*) as total FROM songs').get() as { total: number };
  const withEnglish = db.prepare('SELECT COUNT(*) as count FROM songs WHERE titleEnglish IS NOT NULL').get() as { count: number };
  const withJapanese = db.prepare('SELECT COUNT(*) as count FROM songs WHERE titleJapanese IS NOT NULL').get() as { count: number };
  const avgFavorites = db.prepare('SELECT AVG(favoritedTimes) as avg FROM songs').get() as { avg: number };

  console.log(`💾 DB 저장 완료: ${dbPath}`);
  console.log(`   총 ${stats.total}곡\n`);

  console.log('📊 통계:');
  console.log(`   전체 곡: ${stats.total}곡`);
  console.log(`   영어 제목: ${withEnglish.count}곡 (${Math.round(withEnglish.count / stats.total * 100)}%)`);
  console.log(`   일본어 제목: ${withJapanese.count}곡 (${Math.round(withJapanese.count / stats.total * 100)}%)`);
  console.log(`   평균 즐겨찾기: ${Math.round(avgFavorites.avg)}회`);

  console.log('\n🎉 크롤링 완료!');

  // 샘플 출력
  const samples = db.prepare('SELECT * FROM songs ORDER BY favoritedTimes DESC LIMIT 3').all();
  console.log('\n📝 인기 곡 TOP 3:');
  samples.forEach((song: any, i: number) => {
    console.log(`\n${i + 1}. ${song.title}`);
    console.log(`   아티스트: ${song.artist}`);
    console.log(`   즐겨찾기: ${song.favoritedTimes}회`);
    console.log(`   YouTube: ${song.youtubeUrl}`);
  });
}

// 실행
crawl()
  .catch(error => {
    console.error('💥 치명적 에러:', error);
    process.exit(1);
  })
  .finally(() => {
    db.close();
  });
