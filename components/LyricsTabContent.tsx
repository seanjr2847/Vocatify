"use client";

import React, { useEffect, useState } from 'react';
import { useMusicPlayer } from '@/lib/MusicPlayerContext';
import { ExternalLink } from 'lucide-react';

interface Lyric {
  id: number;
  translationType: string;
  cultureCode: string | null;
  source: string | null;
  url: string | null;
  value: string | null;
}

export function LyricsTabContent() {
  const { state } = useMusicPlayer();
  const [lyrics, setLyrics] = useState<Lyric[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const currentSong = state.currentSong;

    if (!currentSong) {
      setLyrics([]);
      return;
    }

    const fetchLyrics = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/songs/${currentSong.vocadbId}`);
        const data = await response.json();

        if (data.success && data.data?.song?.lyrics) {
          setLyrics(data.data.song.lyrics);
        } else {
          setLyrics([]);
        }
      } catch (err) {
        console.error('Failed to fetch lyrics:', err);
        setError('가사를 불러오는데 실패했습니다');
        setLyrics([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLyrics();
  }, [state.currentSong]);

  if (!state.currentSong) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center text-gray-400">
          <p className="text-lg mb-2">재생 중인 곡이 없습니다</p>
          <p className="text-sm">곡을 재생하면 가사를 확인할 수 있습니다</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-gray-400">가사를 불러오는 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center text-red-400">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (lyrics.length === 0) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center text-gray-400">
          <p className="text-lg mb-2">가사 정보가 없습니다</p>
          <p className="text-sm">이 곡에는 등록된 가사가 없습니다</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {lyrics.map((lyric) => (
        <div key={lyric.id} className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-gray-700">
            <div>
              <div className="font-semibold text-white text-lg">
                {lyric.translationType}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-400 mt-1">
                {lyric.cultureCode && (
                  <span>{lyric.cultureCode.toUpperCase()}</span>
                )}
                {lyric.source && (
                  <>
                    {lyric.cultureCode && <span>•</span>}
                    <span>{lyric.source}</span>
                  </>
                )}
              </div>
            </div>
            {lyric.url && (
              <a
                href={lyric.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[#39c5bb] hover:text-[#2da89f] transition-colors text-sm"
              >
                원본 <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>

          {/* Lyrics Text */}
          {lyric.value ? (
            <div className="text-gray-300 whitespace-pre-wrap leading-relaxed text-sm">
              {lyric.value}
            </div>
          ) : (
            <div className="text-gray-500 italic text-sm">
              가사 텍스트가 없습니다.
              {lyric.url && ' 원본 링크를 확인하세요.'}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
