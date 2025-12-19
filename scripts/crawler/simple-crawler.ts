/**
 * VocaDB 간단 크롤러
 * 테스트용 간소화 버전
 */

import fs from 'fs';
import path from 'path';

console.log('🚀 VocaDB 크롤링 시작\n');

const VOCADB_API_BASE = 'https://vocadb.net/api';
const totalSongs = parseInt(process.argv[2]) || 100;
const batchSize = parseInt(process.argv[3]) || 10;

console.log(`설정:`);
console.log(`  - 목표: ${totalSongs}곡`);
console.log(`  - 배치: ${batchSize}곡\n`);

interface Song {
  vocadbId: number;
  title: string;
  artist: string;
  youtubeId: string;
  youtubeUrl: string;
}

async function crawl() {
  const songs: Song[] = [];
  let start = 0;

  while (songs.length < totalSongs) {
    const url = `${VOCADB_API_BASE}/songs?start=${start}&maxResults=${batchSize}&fields=PVs&songTypes=Original`;

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

      let withYoutube = 0;

      for (const item of items) {
        if (!item.pvs || item.pvs.length === 0) continue;

        const youtube = item.pvs.find((pv: any) => pv.service === 'Youtube');
        if (!youtube || !youtube.pvId) continue;

        songs.push({
          vocadbId: item.id,
          title: item.name,
          artist: item.artistString,
          youtubeId: youtube.pvId,
          youtubeUrl: `https://www.youtube.com/watch?v=${youtube.pvId}`,
        });

        withYoutube++;

        if (songs.length >= totalSongs) break;
      }

      console.log(`   YouTube 있는 곡: ${withYoutube}개`);
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

  const filepath = path.join(dataDir, 'vocadb-songs.json');
  fs.writeFileSync(filepath, JSON.stringify(songs, null, 2), 'utf-8');

  console.log(`💾 저장 완료: ${filepath}`);
  console.log(`   총 ${songs.length}곡 수집\n`);

  console.log('🎉 크롤링 완료!');

  // 샘플 출력
  if (songs.length > 0) {
    console.log('\n📝 샘플 데이터:');
    console.log(JSON.stringify(songs.slice(0, 3), null, 2));
  }
}

crawl().catch(error => {
  console.error('💥 치명적 에러:', error);
  process.exit(1);
});
