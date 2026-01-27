import { Metadata } from "next";
import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { ListMusic } from "lucide-react";
import { getPlaylistById } from "@/lib/db/user";
import { PlaylistHeader } from "@/components/playlists/PlaylistHeader";
import { EmptyState } from "@/components/playlists/EmptyState";
import { PlaylistSongsList } from "@/components/playlists/PlaylistSongsList";

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

  // Check if current user is the owner
  const isOwner = session.user.id === playlist.userId;

  return (
    <div className="min-h-screen bg-black">
      {/* Playlist Header with Edit/Delete functionality */}
      <PlaylistHeader
        playlistId={playlist.id}
        name={playlist.name}
        description={playlist.description}
        isPublic={playlist.isPublic}
        songCount={playlist.songCount}
        updatedAt={playlist.updatedAt}
        isOwner={isOwner}
        userId={session.user.id}
      />

      {/* Songs List */}
      <div className="container mx-auto px-4 py-8">
        {playlist.songs.length === 0 ? (
          <EmptyState
            icon={ListMusic}
            title="플레이리스트가 비어있습니다"
            description="곡을 추가해보세요"
            actionLabel="곡 둘러보기"
            actionHref="/"
          />
        ) : (
          <PlaylistSongsList
            playlistId={playlist.id}
            songs={playlist.songs}
            isOwner={isOwner}
          />
        )}
      </div>
    </div>
  );
}
