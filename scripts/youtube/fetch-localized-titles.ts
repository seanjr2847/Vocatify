/**
 * YouTube 다국어 제목 수집 스크립트
 * - snippet part를 사용하여 국가별 제목 가져오기
 * - 한국어, 일본어, 영어 제목 수집
 * - 기존 조회수 업데이트 스크립트 확장 버전
 */

import Database from 'better-sqlite3';
import path from 'path';
import { config } from 'dotenv';

config();

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
if (!YOUTUBE_API_KEY) {
  console.error('❌ YOUTUBE_API_KEY 환경변수가 필요합니다.');
  process.exit(1);
}

const BATCH_SIZE = 50;
const DELAY_MS = 100;

interface YouTubeVideoSnippet {
  title: string;
  localized?: {
    title: string;
    description: string;
  };
  defaultLanguage?: string;
  defaultAudioLanguage?: string;
}

interface YouTubeVideoStatistics {
  viewCount?: string;
}

interface YouTubeVideoItem {
  id: string;
  snippet?: YouTubeVideoSnippet;
  statistics?: YouTubeVideoStatistics;
}

interface YouTubeAPIResponse {
  items: YouTubeVideoItem[];
}

interface LocalizedTitles {
  original: string;
  korean?: string;
  japanese?: string;
  english?: string;
  defaultLanguage?: string;
}

// DB 연결
const dbPath = path.join(process.cwd(), 'data', 'vocadb', 'vocatify.db');
const db = new Database(dbPath);

// 컬럼 추가 (이미 있으면 무시)
function ensureColumns() {
  const columnsToAdd = [
    'titleKorean TEXT',
    'titleOriginal TEXT',
    'defaultLanguage TEXT',
  ];

  for (const column of columnsToAdd) {
    try {
      const [columnName] = column.split(' ');
      db.exec(`ALTER TABLE songs ADD COLUMN ${column};`);
      console.log(`✅ ${columnName} 컬럼 추가됨`);
    } catch (e: any) {
      if (!e.message.includes('duplicate column name')) {
        console.error('컬럼 추가 오류:', e.message);
      }
    }
  }
}

// YouTube API 호출 (여러 언어)
async function fetchLocalizedTitles(
  videoIds: string[],
  language: 'ko' | 'ja' | 'en' = 'ko'
): Promise<Map<string, YouTubeVideoItem>> {
  // snippet과 statistics 모두 요청
  const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoIds.join(',')}&hl=${language}&key=${YOUTUBE_API_KEY}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`YouTube API error: ${response.status} - ${error}`);
    }

    const data: YouTubeAPIResponse = await response.json();
    const results = new Map<string, YouTubeVideoItem>();

    for (const item of data.items || []) {
      results.set(item.id, item);
    }

    return results;
  } catch (error: any) {
    console.error('❌ API 호출 실패:', error.message);
    return new Map();
  }
}

// 3개 언어로 제목 가져오기
async function fetchAllLanguages(videoIds: string[]): Promise<Map<string, LocalizedTitles>> {
  console.log(`  📥 ${videoIds.length}개 비디오 처리 중...`);

  // 한국어로 요청 (한국어 제목 + 조회수)
  const koreanData = await fetchLocalizedTitles(videoIds, 'ko');
  await delay(DELAY_MS);

  // 일본어로 요청 (일본어 제목)
  const japaneseData = await fetchLocalizedTitles(videoIds, 'ja');
  await delay(DELAY_MS);

  // 영어로 요청 (영어 제목)
  const englishData = await fetchLocalizedTitles(videoIds, 'en');

  const results = new Map<string, LocalizedTitles>();

  for (const videoId of videoIds) {
    const korean = koreanData.get(videoId);
    const japanese = japaneseData.get(videoId);
    const english = englishData.get(videoId);

    if (!korean) continue;

    results.set(videoId, {
      original: korean.snippet?.title || '',
      korean: korean.snippet?.localized?.title,
      japanese: japanese?.snippet?.localized?.title,
      english: english?.snippet?.localized?.title,
      defaultLanguage: korean.snippet?.defaultLanguage,
    });
  }

  return results;
}

// DB 업데이트
function updateLocalizedTitles(
  videoId: string,
  titles: LocalizedTitles,
  viewCount?: number
) {
  const stmt = db.prepare(`
    UPDATE songs
    SET
      titleOriginal = ?,
      titleKorean = ?,
      titleJapanese = COALESCE(titleJapanese, ?),
      titleEnglish = COALESCE(titleEnglish, ?),
      defaultLanguage = ?,
      viewCount = COALESCE(?, viewCount),
      viewCountUpdatedAt = datetime('now')
    WHERE youtubeId = ?
  `);

  stmt.run(
    titles.original,
    titles.korean || titles.original,
    titles.japanese,
    titles.english,
    titles.defaultLanguage,
    viewCount,
    videoId
  );
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 메인 실행
async function main() {
  console.log('🌍 YouTube 다국어 제목 수집 시작\n');

  ensureColumns();

  // 업데이트할 곡 가져오기 (제목이 없는 곡 우선)
  const songs = db
    .prepare(
      `SELECT youtubeId FROM songs
       WHERE titleKorean IS NULL OR titleOriginal IS NULL
       LIMIT 1000`
    )
    .all() as Array<{ youtubeId: string }>;

  if (songs.length === 0) {
    console.log('✅ 업데이트할 곡이 없습니다!\n');
    return;
  }

  console.log(`🎯 업데이트 대상: ${songs.length.toLocaleString()}곡\n`);

  const batches = Math.ceil(songs.length / BATCH_SIZE);
  let processed = 0;

  for (let i = 0; i < batches; i++) {
    const start = i * BATCH_SIZE;
    const end = Math.min(start + BATCH_SIZE, songs.length);
    const batch = songs.slice(start, end);
    const videoIds = batch.map(s => s.youtubeId);

    console.log(`\n📦 배치 ${i + 1}/${batches}`);

    // 모든 언어로 제목 가져오기
    const localizedTitles = await fetchAllLanguages(videoIds);

    // 첫 번째 요청에서 가져온 조회수도 함께 업데이트
    const koreanData = await fetchLocalizedTitles(videoIds, 'ko');

    // DB 업데이트
    for (const [videoId, titles] of localizedTitles) {
      const viewCount = koreanData.get(videoId)?.statistics?.viewCount;
      updateLocalizedTitles(
        videoId,
        titles,
        viewCount ? parseInt(viewCount) : undefined
      );
    }

    processed += batch.length;
    const percent = ((processed / songs.length) * 100).toFixed(1);
    console.log(`  ✅ ${processed.toLocaleString()}/${songs.length.toLocaleString()}곡 (${percent}%)`);

    if (i < batches - 1) {
      await delay(DELAY_MS * 3); // 3개 언어 요청하므로 딜레이 증가
    }
  }

  console.log('\n✅ 완료!\n');

  // 샘플 출력
  const samples = db
    .prepare(
      `SELECT title, titleOriginal, titleKorean, titleJapanese, titleEnglish, defaultLanguage
       FROM songs
       WHERE titleKorean IS NOT NULL
       LIMIT 5`
    )
    .all();

  console.log('📝 샘플 데이터:');
  samples.forEach((song: any, idx) => {
    console.log(`\n${idx + 1}. ${song.title}`);
    console.log(`   원본: ${song.titleOriginal} (${song.defaultLanguage})`);
    console.log(`   한국어: ${song.titleKorean}`);
    console.log(`   일본어: ${song.titleJapanese}`);
    console.log(`   영어: ${song.titleEnglish}`);
  });
}

// 실행
main()
  .then(() => {
    db.close();
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ 오류:', error);
    db.close();
    process.exit(1);
  });
