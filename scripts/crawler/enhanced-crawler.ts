/**
 * VocaDB 개선된 크롤러
 * - Original 곡만 수집
 * - 다국어 제목 (영어/일본어/로마자)
 * - 아티스트 타입
 * - 썸네일, 태그, 인기도 등 전체 정보
 */

import fs from 'fs';
import path from 'path';

console.log('🚀 VocaDB 개선된 크롤러 시작\n');

const VOCADB_API_BASE = 'https://vocadb.net/api';
const totalSongs = parseInt(process.argv[2]) || 100;
const batchSize = parseInt(process.argv[3]) || 10;

console.log(`설정:`);
console.log(`  - 목표: ${totalSongs}곡 (Original만)`);
console.log(`  - 배치: ${batchSize}곡\n`);

interface EnhancedSong {
  vocadbId: number;
  title: string;              // 기본 제목
  titleEnglish: string | null;
  titleJapanese: string | null;
  titleRomaji: string | null;
  artist: string;             // 아티스트 문자열
  artistType: string | null;  // Producer/Vocaloid
  youtubeId: string;
  youtubeUrl: string;
  thumbUrl: string | null;
  favoritedTimes: number;     // 즐겨찾기 수
  ratingScore: number;        // 평점
  tags: string[];             // 태그
  publishDate: string | null;
  songType: string;
  crawledAt: string;
}

async function crawl() {
  const songs: EnhancedSong[] = [];
  let start = 0;

  while (songs.length < totalSongs) {
    // 모든 필드 포함
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

      console.log(`   받은 곡: ${items.length}개`);

      let processed = 0;

      for (const item of items) {
        // YouTube PV 필터
        if (!item.pvs || item.pvs.length === 0) continue;
        const youtube = item.pvs.find((pv: any) => pv.service === 'Youtube');
        if (!youtube || !youtube.pvId) continue;

        // 다국어 이름 추출
        const names = item.names || [];
        const englishName = names.find((n: any) => n.language === 'English')?.value;
        const japaneseName = names.find((n: any) => n.language === 'Japanese')?.value;
        const romajiName = names.find((n: any) => n.language === 'Romaji')?.value;

        // 선호 제목 (English > Romaji > Japanese > Default)
        const preferredTitle = englishName || romajiName || japaneseName || item.name;

        // 아티스트 타입 (첫 번째 보컬로이드 또는 프로듀서)
        let artistType = null;
        if (item.artists && item.artists.length > 0) {
          const vocaloid = item.artists.find((a: any) => a.artist?.artistType === 'Vocaloid');
          const producer = item.artists.find((a: any) => a.artist?.artistType === 'Producer');
          artistType = vocaloid?.artist?.artistType || producer?.artist?.artistType || null;
        }

        // 태그 추출 (상위 10개)
        const tags = (item.tags || [])
          .slice(0, 10)
          .map((t: any) => t.tag?.name || t.name)
          .filter((t: string) => t);

        // 썸네일 (우선순위: mainPicture > thumbUrl)
        const thumbUrl = item.mainPicture?.urlThumb || item.thumbUrl || null;

        songs.push({
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
          tags,
          publishDate: item.publishDate || null,
          songType: item.songType,
          crawledAt: new Date().toISOString(),
        });

        processed++;

        if (songs.length >= totalSongs) break;
      }

      console.log(`   처리된 곡: ${processed}개`);
      console.log(`   현재 총: ${songs.length}곡\n`);

      if (items.length < batchSize) {
        console.log('✅ 모든 데이터 가져옴\n');
        break;
      }

      start += batchSize;

      // 딜레이
      if (songs.length < totalSongs) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

    } catch (error) {
      console.error('❌ 에러:', error);
      break;
    }
  }

  // 저장
  const dataDir = path.join(process.cwd(), 'data', 'vocadb');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const filepath = path.join(dataDir, 'vocadb-songs-enhanced.json');
  fs.writeFileSync(filepath, JSON.stringify(songs, null, 2), 'utf-8');

  console.log(`💾 저장 완료: ${filepath}`);
  console.log(`   총 ${songs.length}곡 수집\n`);

  // 통계
  const withEnglish = songs.filter(s => s.titleEnglish).length;
  const withJapanese = songs.filter(s => s.titleJapanese).length;
  const withRomaji = songs.filter(s => s.titleRomaji).length;
  const avgFavorites = Math.round(songs.reduce((sum, s) => sum + s.favoritedTimes, 0) / songs.length);

  console.log('📊 통계:');
  console.log(`   영어 제목: ${withEnglish}곡 (${Math.round(withEnglish / songs.length * 100)}%)`);
  console.log(`   일본어 제목: ${withJapanese}곡 (${Math.round(withJapanese / songs.length * 100)}%)`);
  console.log(`   로마자 제목: ${withRomaji}곡 (${Math.round(withRomaji / songs.length * 100)}%)`);
  console.log(`   평균 즐겨찾기: ${avgFavorites}회`);

  console.log('\n🎉 크롤링 완료!');

  // 샘플 출력
  if (songs.length > 0) {
    console.log('\n📝 샘플 데이터:');
    console.log(JSON.stringify(songs.slice(0, 2), null, 2));
  }
}

crawl().catch(error => {
  console.error('💥 치명적 에러:', error);
  process.exit(1);
});
