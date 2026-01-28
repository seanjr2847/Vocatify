'use client';

import { RankingItem } from '@/lib/db';
import TrendingTableRow from './TrendingTableRow';
import Link from 'next/link';

interface AllTimeBestTableProps {
  songs: RankingItem[];
}

export default function AllTimeBestTable({ songs }: AllTimeBestTableProps) {
  const displaySongs = songs.slice(0, 10);

  return (
    <section className="py-16 px-8">
      {/* Section Header */}
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-white text-3xl font-bold">ALL-TIME BEST</h2>
        <Link
          href="/charts?tab=total"
          className="text-white/60 hover:text-white text-sm uppercase tracking-wider transition-colors"
        >
          View all
        </Link>
      </div>

      {/* Table Header */}
      <div className="tidal-table-header grid-cols-[auto_2fr_1.5fr_1.5fr_auto_auto]">
        <div>#</div>
        <div>TITLE</div>
        <div>ARTIST</div>
        <div>ALBUM</div>
        <div className="text-right">TOTAL VIEWS</div>
        <div></div>
      </div>

      {/* Table Rows */}
      <div>
        {displaySongs.map((song, index) => (
          <TrendingTableRow
            key={song.vocadbId}
            song={song}
            rank={index + 1}
          />
        ))}
      </div>
    </section>
  );
}
