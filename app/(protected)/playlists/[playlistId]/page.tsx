import { Metadata } from "next";
import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { ListMusic, Globe, Lock, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getPlaylistById, UserPlaylistDetail } from "@/lib/db/user";

export const metadata: Metadata = {
  title: "플레이리스트 | Vocatify",
  description: "플레이리스트 상세",
};

interface PlaylistPageProps {
  params: Promise<{
    playlistId: string;
  }>;
}

export default async function PlaylistDetailPage({ params }: PlaylistPageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/signin");
  }

  const { playlistId } = await params;

  // Fetch playlist details directly from database (server-side)
  const playlist = await getPlaylistById(playlistId, session.user.id);

  if (!playlist) {
    redirect("/playlists");
  }

  const formattedDate = new Date(playlist.updatedAt).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-[#1d2123]">
      {/* Header */}
      <div className="border-b border-neutral-800 bg-[#1a1a1a]">
        <div className="container mx-auto px-4 py-8">
          <Link
            href="/playlists"
            className="mb-4 flex items-center gap-2 text-sm text-neutral-400 hover:text-[#39c5bb] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            플레이리스트로 돌아가기
          </Link>

          <div className="flex items-start gap-6">
            {/* Playlist Icon */}
            <div className="flex h-32 w-32 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#39c5bb]/20 to-[#39c5bb]/5">
              <ListMusic className="h-16 w-16 text-[#39c5bb]" />
            </div>

            {/* Playlist Info */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white">{playlist.name}</h1>
              {playlist.description && (
                <p className="mt-2 text-neutral-400">{playlist.description}</p>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-neutral-500">
                <span>{playlist.songCount}곡</span>
                <span>•</span>
                <div className="flex items-center gap-1">
                  {playlist.isPublic ? (
                    <>
                      <Globe className="h-4 w-4" />
                      <span>공개</span>
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" />
                      <span>비공개</span>
                    </>
                  )}
                </div>
                <span>•</span>
                <span>최종 수정: {formattedDate}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Songs List */}
      <div className="container mx-auto px-4 py-8">
        {playlist.songs.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-neutral-800 bg-[#1a1a1a] py-20">
            <ListMusic className="mb-4 h-16 w-16 text-neutral-700" />
            <p className="mb-2 text-lg font-semibold text-neutral-400">
              플레이리스트가 비어있습니다
            </p>
            <p className="text-sm text-neutral-500">
              곡을 추가해보세요
            </p>
            <Link href="/">
              <button className="mt-6 rounded-lg bg-[#39c5bb] px-6 py-2 text-white transition-colors hover:bg-[#2da59a]">
                곡 둘러보기
              </button>
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {playlist.songs.map((playlistSong, index: number) => {
              const song = playlistSong.song;
              const displayTitle =
                song.titleKorean ||
                song.titleEnglish ||
                song.titleJapanese ||
                song.defaultName;

              return (
                <Link
                  key={playlistSong.id}
                  href={`/songs/${song.vocadbId}`}
                  className="group flex items-center gap-4 rounded-lg border border-neutral-800 bg-[#1a1a1a] p-4 transition-all hover:border-[#39c5bb] hover:shadow-lg hover:shadow-[#39c5bb]/10"
                >
                  {/* Order Number */}
                  <div className="w-8 text-center text-sm text-neutral-500">
                    {index + 1}
                  </div>

                  {/* Thumbnail */}
                  {song.thumbUrl ? (
                    <img
                      src={song.thumbUrl}
                      alt={displayTitle}
                      className="h-16 w-24 rounded object-cover"
                    />
                  ) : (
                    <div className="h-16 w-24 rounded bg-gradient-to-br from-[#39c5bb]/20 to-[#39c5bb]/5 flex items-center justify-center">
                      <ListMusic className="h-6 w-6 text-[#39c5bb]/40" />
                    </div>
                  )}

                  {/* Song Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="truncate text-base font-semibold text-white group-hover:text-[#39c5bb] transition-colors">
                      {displayTitle}
                    </h3>
                    {song.artistString && (
                      <p className="truncate text-sm text-neutral-400">
                        {song.artistString}
                      </p>
                    )}
                  </div>

                  {/* View Count */}
                  {song.viewCount && (
                    <div className="hidden sm:block text-sm text-neutral-500">
                      {Number(song.viewCount).toLocaleString()}회
                    </div>
                  )}

                  {/* Duration */}
                  {song.lengthSeconds && (
                    <div className="text-sm text-neutral-500">
                      {Math.floor(song.lengthSeconds / 60)}:
                      {(song.lengthSeconds % 60).toString().padStart(2, "0")}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
