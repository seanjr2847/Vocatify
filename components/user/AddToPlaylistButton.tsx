"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { ListMusic, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Playlist {
  id: string;
  name: string;
  songCount: number;
}

interface AddToPlaylistButtonProps {
  songId: number;
  songTitle?: string;
  variant?: "default" | "ghost" | "outline";
  size?: "default" | "sm" | "lg" | "icon";
  showText?: boolean;
  className?: string;
}

export function AddToPlaylistButton({
  songId,
  songTitle,
  variant: _variant = "ghost",
  size: _size = "icon",
  showText = false,
  className,
}: AddToPlaylistButtonProps) {
  const { status } = useSession();
  const router = useRouter();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Fetch playlists when dropdown opens
  useEffect(() => {
    if (isOpen && status === "authenticated") {
      fetchPlaylists();
    }
  }, [isOpen, status]);

  const fetchPlaylists = async () => {
    try {
      const response = await fetch("/api/user/playlists");
      if (response.ok) {
        const data = await response.json();
        setPlaylists(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch playlists:", error);
      toast.error("플레이리스트를 불러올 수 없습니다");
    }
  };

  const handleAddToPlaylist = async (playlistId: string, playlistName: string) => {
    if (status === "unauthenticated") {
      toast.info("로그인이 필요합니다");
      router.push("/signin");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/user/playlists/${playlistId}/songs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songId }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          toast.info(`이미 "${playlistName}" 플레이리스트에 있는 곡입니다`);
        } else {
          throw new Error(data.error || "Failed to add to playlist");
        }
      } else {
        toast.success(
          songTitle
            ? `"${songTitle}"을(를) "${playlistName}"에 추가했습니다`
            : `"${playlistName}"에 추가했습니다`
        );
      }

      setIsOpen(false);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "플레이리스트 추가에 실패했습니다");
      console.error("Error adding to playlist:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNewPlaylist = () => {
    router.push("/playlists?create=true");
  };

  const handleOpenChange = (open: boolean) => {
    if (status === "unauthenticated" && open) {
      toast.info("로그인이 필요합니다");
      router.push("/signin");
      return;
    }
    setIsOpen(open);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        {showText ? (
          <button
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-3 rounded-full bg-[#2a2a2a] hover:bg-[#3a3a3a] transition-colors text-white"
          >
            <ListMusic className="h-5 w-5" />
            <span className="text-sm font-medium">플레이리스트에 추가</span>
          </button>
        ) : (
          <button
            disabled={isLoading}
            className={className || "flex items-center justify-center w-12 h-12 rounded-full bg-[#2a2a2a] hover:bg-[#3a3a3a] transition-colors text-white hover:text-[#39c5bb]"}
          >
            <ListMusic className={className ? "h-5 w-5" : "h-6 w-6"} />
          </button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>플레이리스트 선택</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {playlists.length === 0 ? (
          <div className="px-2 py-6 text-center text-sm text-muted-foreground">
            플레이리스트가 없습니다
          </div>
        ) : (
          playlists.map((playlist) => (
            <DropdownMenuItem
              key={playlist.id}
              onClick={() => handleAddToPlaylist(playlist.id, playlist.name)}
              disabled={isLoading}
            >
              <ListMusic className="mr-2 h-4 w-4" />
              <span className="flex-1">{playlist.name}</span>
              <span className="text-xs text-muted-foreground">
                {playlist.songCount}곡
              </span>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleCreateNewPlaylist}>
          <Plus className="mr-2 h-4 w-4" />
          새 플레이리스트 만들기
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
