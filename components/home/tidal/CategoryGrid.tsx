'use client';

import CategoryCard from './CategoryCard';
import Link from 'next/link';
import { RankingItem } from '@/lib/db';
import { getYouTubeThumbnail } from '@/lib/utils/format-utils';

interface CategoryGridProps {
  weeklyRanking: RankingItem[];
  totalRanking: RankingItem[];
  newRanking: RankingItem[];
}

export default function CategoryGrid({
  weeklyRanking,
  totalRanking,
  newRanking,
}: CategoryGridProps) {
  // maxres 썸네일 헬퍼 함수
  const getMaxResThumbnail = (song: RankingItem | undefined): string => {
    if (!song) return '/placeholder.png';
    if (song.youtubeId) return getYouTubeThumbnail(song.youtubeId, 'maxres');
    return song.thumbUrl || '/placeholder.png';
  };

  const categories = [
    {
      name: '요즘 뜨는',
      subtitle: '주간 급상승 차트',
      image: getMaxResThumbnail(weeklyRanking[0]),
      href: '/charts?tab=weekly',
    },
    {
      name: '역대 최고',
      subtitle: '총 조회수 TOP',
      image: getMaxResThumbnail(totalRanking[0]),
      href: '/charts?tab=total',
    },
    {
      name: '화제 신곡',
      subtitle: '최신 발매곡',
      image: getMaxResThumbnail(newRanking[0]),
      href: '/charts?tab=new',
    },
    {
      name: '라디오',
      subtitle: '테마별 채널',
      image: getMaxResThumbnail(weeklyRanking[2]),
      href: '/radio',
    },
    {
      name: '플레이리스트',
      subtitle: '내 플레이리스트',
      image: getMaxResThumbnail(totalRanking[2]),
      href: '/playlists',
    },
  ];

  return (
    <section className="py-16 px-8">
      {/* Section Header */}
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-white text-3xl font-bold">THE HITS</h2>
        <Link
          href="/charts"
          className="text-white/60 hover:text-white text-sm uppercase tracking-wider transition-colors"
        >
          View all
        </Link>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
        {categories.map((category, index) => (
          <CategoryCard key={index} category={category} />
        ))}
      </div>
    </section>
  );
}
