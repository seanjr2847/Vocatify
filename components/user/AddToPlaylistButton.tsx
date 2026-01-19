"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { ListMusic, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
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
}

export function AddToPlaylistButton({
  songId,
  songTitle,
  variant = "ghost",
  size = "icon",
  showText = false,
}: AddToPlaylistButtonProps) {
  const { data: session, status } = useSession();
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
        <Button
          variant={variant}
          size={size}
          disabled={isLoading}
          className="transition-colors"
          title="플레이리스트에 추가"
        >
          <ListMusic className="h-5 w-5 text-white/60 hover:text-white" />
          {showText && <span className="ml-2">플레이리스트에 추가</span>}
        </Button>
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
