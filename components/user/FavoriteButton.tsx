"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface FavoriteButtonProps {
  songId: number;
  songTitle?: string;
  initialFavorited?: boolean;
  variant?: "default" | "ghost" | "outline";
  size?: "default" | "sm" | "lg" | "icon";
  showText?: boolean;
}

export function FavoriteButton({
  songId,
  songTitle,
  initialFavorited = false,
  variant = "ghost",
  size = "icon",
  showText = false,
}: FavoriteButtonProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isFavorited, setIsFavorited] = useState(initialFavorited);
  const [isLoading, setIsLoading] = useState(false);

  const checkFavoriteStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/user/favorites`);
      if (response.ok) {
        const data = await response.json();
        const favorited = data.data.some((fav: { songId: number }) => fav.songId === songId);
        setIsFavorited(favorited);
      }
    } catch (error) {
      console.error("Failed to check favorite status:", error);
    }
  }, [songId]);

  // Check favorite status when user logs in or songId changes
  useEffect(() => {
    if (status === "authenticated" && session?.user?.id) {
      // Only check if we don't have initial state
      if (!initialFavorited) {
        checkFavoriteStatus();
      }
    }
  }, [status, session?.user?.id, initialFavorited, checkFavoriteStatus]);

  const handleToggleFavorite = async () => {
    // Redirect to signin if not authenticated
    if (status === "unauthenticated") {
      toast.info("로그인이 필요합니다");
      router.push("/signin");
      return;
    }

    if (status === "loading" || isLoading) {
      return;
    }

    setIsLoading(true);

    // Optimistic update
    const previousState = isFavorited;
    setIsFavorited(!isFavorited);

    try {
      const method = isFavorited ? "DELETE" : "POST";
      const response = await fetch("/api/user/favorites", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update favorite");
      }

      // Success toast
      if (method === "POST") {
        toast.success(songTitle ? `"${songTitle}" 즐겨찾기에 추가되었습니다` : "즐겨찾기에 추가되었습니다");
      } else {
        toast.success(songTitle ? `"${songTitle}" 즐겨찾기에서 제거되었습니다` : "즐겨찾기에서 제거되었습니다");
      }
    } catch (error: unknown) {
      // Revert optimistic update on error
      setIsFavorited(previousState);
      toast.error(error instanceof Error ? error.message : "즐겨찾기 업데이트에 실패했습니다");
      console.error("Error toggling favorite:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleToggleFavorite}
      disabled={isLoading}
      className="transition-colors"
      title={isFavorited ? "즐겨찾기에서 제거" : "즐겨찾기에 추가"}
    >
      <Heart
        className={`h-5 w-5 ${
          isFavorited
            ? "fill-red-500 text-red-500"
            : "text-white/60 hover:text-red-500"
        } ${isLoading ? "opacity-50" : ""}`}
      />
      {showText && (
        <span className="ml-2">
          {isFavorited ? "즐겨찾기 해제" : "즐겨찾기"}
        </span>
      )}
    </Button>
  );
}
