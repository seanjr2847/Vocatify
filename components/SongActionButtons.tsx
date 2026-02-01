"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, Share2, Plus } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { PlaySongButton } from '@/components/PlaySongButton';
import { AddToPlaylistButton } from '@/components/user/AddToPlaylistButton';
import { useMusicPlayer } from '@/lib/MusicPlayerContext';
import { Tooltip } from '@/components/ui/tooltip';
import type { Song } from '@/lib/db';
import { getDisplayTitle } from '@/lib/utils/format-utils';

interface SongActionButtonsProps {
  song: Song & {
    titleKorean?: string | null;
    titleEnglish?: string | null;
    artistString: string;
  };
  initialIsFavorited?: boolean;
}

export function SongActionButtons({ song, initialIsFavorited = false }: SongActionButtonsProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const { addToPlaylist } = useMusicPlayer();
  const [isFavorited, setIsFavorited] = useState(initialIsFavorited);
  const [isLoading, setIsLoading] = useState(false);

  const handleFavorite = async () => {
    if (!session?.user) {
      toast.error('로그인이 필요합니다');
      router.push(`/signin?callbackUrl=/songs/${song.vocadbId}`);
      return;
    }

    setIsLoading(true);
    try {
      const method = isFavorited ? 'DELETE' : 'POST';
      const response = await fetch('/api/user/favorites', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songId: song.vocadbId }),
      });

      const data = await response.json();

      if (data.success) {
        setIsFavorited(!isFavorited);
        toast.success(isFavorited ? '즐겨찾기에서 제거했습니다' : '즐겨찾기에 추가했습니다');
      } else {
        toast.error(data.error || '오류가 발생했습니다');
      }
    } catch (error) {
      console.error('Favorite error:', error);
      toast.error('오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    const title = song.titleKorean ?? song.titleEnglish ?? song.defaultName;
    const text = `${song.artistString} - ${title}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text,
          url: window.location.href,
        });
      } catch (error) {
        // 사용자가 공유를 취소한 경우 등 무시
        console.log('Share cancelled or failed:', error);
      }
    } else {
      // Web Share API 미지원 시 클립보드에 복사
      try {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('링크가 복사되었습니다');
      } catch (error) {
        console.error('Clipboard copy failed:', error);
        toast.error('링크 복사에 실패했습니다');
      }
    }
  };

  const handleAddToQueue = () => {
    addToPlaylist(song);
    toast.success(`"${getDisplayTitle(song)}"을(를) 재생 대기열에 추가했습니다`);
  };

  return (
    <div className="flex items-center gap-3 mb-6 animate-fadeIn">
      <PlaySongButton song={song} />

      <Tooltip content={isFavorited ? '즐겨찾기 제거' : '즐겨찾기 추가'}>
        <button
          onClick={handleFavorite}
          disabled={isLoading}
          className={`flex items-center justify-center w-12 h-12 rounded-full transition-all ${
            isFavorited
              ? 'bg-pink-500/20 hover:bg-pink-500/30 text-pink-500'
              : 'bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white'
          } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          aria-label={isFavorited ? '즐겨찾기 제거' : '즐겨찾기 추가'}
        >
          <Heart className={`w-6 h-6 ${isFavorited ? 'fill-current' : ''}`} />
        </button>
      </Tooltip>

      <Tooltip content="공유하기">
        <button
          onClick={handleShare}
          className="flex items-center justify-center w-12 h-12 rounded-full bg-[#2a2a2a] hover:bg-[#3a3a3a] transition-colors"
          aria-label="공유하기"
        >
          <Share2 className="w-6 h-6" />
        </button>
      </Tooltip>

      <Tooltip content="재생 대기열에 추가">
        <button
          onClick={handleAddToQueue}
          className="flex items-center justify-center w-12 h-12 rounded-full bg-[#2a2a2a] hover:bg-[#3a3a3a] transition-colors text-white hover:text-[#39c5bb]"
          aria-label="재생 대기열에 추가"
        >
          <Plus className="w-6 h-6" />
        </button>
      </Tooltip>

      <Tooltip content="플레이리스트에 추가">
        <AddToPlaylistButton
          songId={song.vocadbId}
          songTitle={getDisplayTitle(song)}
          variant="ghost"
          size="icon"
          showText={false}
        />
      </Tooltip>
    </div>
  );
}
