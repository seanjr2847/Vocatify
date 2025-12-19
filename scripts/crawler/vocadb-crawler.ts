/**
 * VocaDB Crawler
 *
 * VocaDB API를 사용하여 보컬로이드 곡 정보를 크롤링합니다.
 * - 곡 제목
 * - 아티스트 (보컬로이드 가수)
 * - YouTube 비디오 ID
 * - 조회수 등
 */

import fs from 'fs';
import path from 'path';

// VocaDB API 기본 설정
const VOCADB_API_BASE = 'https://vocadb.net/api';
const USER_AGENT = 'Vocatify/1.0 (https://github.com/yourproject)';
const REQUEST_DELAY = 1000; // API 요청 간 딜레이 (ms)

// 데이터 타입 정의
interface VocaDBSong {
  id: number;
  name: string;
  artistString: string;
  songType: string;
  pvs?: Array<{
    id: number;
    service: string;
    pvId: string;
    pvType: string;
    name?: string;
    url?: string;
  }>;
  publishDate?: string;
  createDate?: string;
}

interface ProcessedSong {
  vocadbId: number;
  title: string;
  artist: string;
  youtubeId: string | null;
  youtubeUrl: string | null;
  songType: string;
  publishDate: string | null;
  crawledAt: string;
}

/**
 * VocaDB API 요청
 */
async function fetchFromVocaDB(endpoint: string, params: Record<string, any> = {}): Promise<any> {
  const queryString = new URLSearchParams({
    ...params,
    lang: 'Default', // 기본 언어
  }).toString();

  const url = `${VOCADB_API_BASE}${endpoint}?${queryString}`;

  console.log(`📡 API 요청: ${url}`);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API 요청 실패: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('❌ API 요청 에러:', error);
    throw error;
  }
}

/**
 * 노래 목록 가져오기
 */
async function fetchSongs(options: {
  start?: number;
  maxResults?: number;
  sort?: string;
  songTypes?: string[];
}): Promise<{ items: VocaDBSong[]; totalCount: number }> {
  const params: Record<string, any> = {
    start: options.start || 0,
    maxResults: options.maxResults || 50,
    getTotalCount: true,
    fields: 'PVs,Artists', // PVs: YouTube 등 비디오 정보, Artists: 아티스트 정보
    sort: options.sort || 'AdditionDate', // 최신 추가순
  };

  // 노래 타입 필터 (Original, Remaster, Remix 등)
  if (options.songTypes && options.songTypes.length > 0) {
    params.songTypes = options.songTypes.join(',');
  }

  const data = await fetchFromVocaDB('/songs', params);

  return {
    items: data.items || [],
    totalCount: data.totalCount || 0,
  };
}

/**
 * YouTube PV 추출
 */
function extractYouTubePV(song: VocaDBSong): { id: string; url: string } | null {
  if (!song.pvs || song.pvs.length === 0) {
    return null;
  }

  // YouTube 서비스 PV 찾기 (Original 우선)
  const youtubePV = song.pvs.find(pv =>
    pv.service === 'Youtube' && pv.pvType === 'Original'
  ) || song.pvs.find(pv =>
    pv.service === 'Youtube'
  );

  if (!youtubePV || !youtubePV.pvId) {
    return null;
  }

  return {
    id: youtubePV.pvId,
    url: `https://www.youtube.com/watch?v=${youtubePV.pvId}`,
  };
}

/**
 * 데이터 가공
 */
function processSong(song: VocaDBSong): ProcessedSong | null {
  const youtube = extractYouTubePV(song);

  // YouTube 정보가 없으면 제외
  if (!youtube) {
    return null;
  }

  return {
    vocadbId: song.id,
    title: song.name,
    artist: song.artistString,
    youtubeId: youtube.id,
    youtubeUrl: youtube.url,
    songType: song.songType,
    publishDate: song.publishDate || null,
    crawledAt: new Date().toISOString(),
  };
}

/**
 * 데이터 저장
 */
function saveData(songs: ProcessedSong[], filename: string = 'vocadb-songs.json'): void {
  const dataDir = path.join(process.cwd(), 'data', 'vocadb');

  // 디렉토리 생성
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const filepath = path.join(dataDir, filename);

  // 기존 데이터 로드
  let existingData: ProcessedSong[] = [];
  if (fs.existsSync(filepath)) {
    const content = fs.readFileSync(filepath, 'utf-8');
    existingData = JSON.parse(content);
  }

  // 중복 제거 (vocadbId 기준)
  const existingIds = new Set(existingData.map(s => s.vocadbId));
  const newSongs = songs.filter(s => !existingIds.has(s.vocadbId));

  // 병합
  const mergedData = [...existingData, ...newSongs];

  // 저장
  fs.writeFileSync(filepath, JSON.stringify(mergedData, null, 2), 'utf-8');

  console.log(`\n💾 저장 완료: ${filepath}`);
  console.log(`   - 기존: ${existingData.length}곡`);
  console.log(`   - 신규: ${newSongs.length}곡`);
  console.log(`   - 총합: ${mergedData.length}곡`);
}

/**
 * 메인 크롤링 함수
 */
async function crawlVocaDB(options: {
  totalSongs?: number;
  batchSize?: number;
  songTypes?: string[];
}) {
  const totalSongs = options.totalSongs || 1000;
  const batchSize = options.batchSize || 50;
  const songTypes = options.songTypes || ['Original']; // Original 곡만

  console.log('🚀 VocaDB 크롤링 시작');
  console.log(`   - 목표: ${totalSongs}곡`);
  console.log(`   - 배치 크기: ${batchSize}곡`);
  console.log(`   - 곡 타입: ${songTypes.join(', ')}\n`);

  const allProcessedSongs: ProcessedSong[] = [];
  let start = 0;
  let processedCount = 0;

  while (processedCount < totalSongs) {
    try {
      console.log(`\n📥 배치 ${Math.floor(start / batchSize) + 1} - 인덱스 ${start}부터 가져오는 중...`);

      const { items, totalCount } = await fetchSongs({
        start,
        maxResults: batchSize,
        songTypes,
      });

      console.log(`   받은 곡: ${items.length}개 (전체: ${totalCount}개)`);

      // 데이터 가공
      const processed = items
        .map(processSong)
        .filter((song): song is ProcessedSong => song !== null);

      console.log(`   YouTube 있는 곡: ${processed.length}개`);

      allProcessedSongs.push(...processed);
      processedCount += processed.length;

      // 중간 저장 (100곡마다)
      if (allProcessedSongs.length % 100 === 0 && allProcessedSongs.length > 0) {
        saveData(allProcessedSongs);
        allProcessedSongs.length = 0; // 메모리 정리
      }

      // 더 이상 데이터가 없으면 종료
      if (items.length < batchSize) {
        console.log('\n✅ 모든 데이터를 가져왔습니다.');
        break;
      }

      start += batchSize;

      // 목표 달성 체크
      if (processedCount >= totalSongs) {
        console.log(`\n✅ 목표 ${totalSongs}곡 달성!`);
        break;
      }

      // API 요청 딜레이
      console.log(`⏳ ${REQUEST_DELAY}ms 대기...`);
      await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY));

    } catch (error) {
      console.error('❌ 크롤링 에러:', error);
      console.log('⚠️  현재까지의 데이터를 저장합니다...');
      break;
    }
  }

  // 최종 저장
  if (allProcessedSongs.length > 0) {
    saveData(allProcessedSongs);
  }

  console.log('\n🎉 크롤링 완료!');
  console.log(`   - 총 ${processedCount}곡 수집`);
}

/**
 * CLI 실행
 */
const isMainModule = import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`;

if (isMainModule) {
  const args = process.argv.slice(2);

  const totalSongs = args[0] ? parseInt(args[0]) : 1000;
  const batchSize = args[1] ? parseInt(args[1]) : 50;

  crawlVocaDB({
    totalSongs,
    batchSize,
    songTypes: ['Original'], // Original 곡만
  }).catch(error => {
    console.error('💥 치명적 에러:', error);
    process.exit(1);
  });
}

export { crawlVocaDB, fetchSongs, processSong };
