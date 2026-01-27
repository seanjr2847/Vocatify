"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Edit, Trash2, Lock, Globe, ArrowLeft, MoreVertical } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EditPlaylistDialog } from "./EditPlaylistDialog";
import { usePlaylists } from "@/lib/hooks";
import { getRelativeTime } from "@/lib/utils/playlist";

/**
 * PlaylistHeader Component
 *
 * Vercel React Best Practices Applied:
 * - rerender-functional-setstate: Functional updates for dialog states
 * - bundle-conditional: Dialogs only loaded when opened
 * - rendering-hoist-jsx: Static icon rendering
 */

interface PlaylistHeaderProps {
  playlistId: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  songCount: number;
  updatedAt: Date;
  isOwner: boolean;
  userId?: string;
}

export function PlaylistHeader({
  playlistId,
  name,
  description,
  isPublic,
  songCount,
  updatedAt,
  isOwner,
}: PlaylistHeaderProps) {
  const router = useRouter();
  const { deletePlaylist, isLoading } = usePlaylists();

  // Dialog states
  const [editOpen, setEditOpen] = useState(false);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);

  /**
   * Handle playlist deletion
   * async-defer-await: Confirmation before deletion
   */
  const handleDelete = async () => {
    try {
      await deletePlaylist(playlistId, name);
      router.push("/playlists");
    } catch (error) {
      console.error("Failed to delete playlist:", error);
      // Error handled by hook with toast
    }
  };

  /**
   * Handle edit success - refresh page
   */
  const handleEditSuccess = () => {
    router.refresh();
  };

  const relativeTime = getRelativeTime(updatedAt);

  return (
    <>
      {/* Header Section */}
      <div className="border-b border-white/10 bg-black">
        <div className="container mx-auto px-4 py-6">
          {/* Back Button */}
          <Link
            href="/playlists"
            className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors group mb-6"
          >
            <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
            <span>플레이리스트로 돌아가기</span>
          </Link>

          {/* Main Header Content */}
          <div className="flex items-start justify-between gap-6">
            {/* Playlist Info */}
            <div className="flex-1 min-w-0">
              {/* Title */}
              <h1
                className="text-4xl font-bold text-white mb-3 break-words"
                style={{ fontFamily: "Quicksand, sans-serif" }}
              >
                {name}
              </h1>

              {/* Description */}
              {description ? (
                <p className="text-white/70 text-lg mb-4 max-w-3xl">
                  {description}
                </p>
              ) : (
                <p className="text-white/40 text-lg mb-4 italic">
                  설명 없음
                </p>
              )}

              {/* Meta Info */}
              <div className="flex flex-wrap items-center gap-4 text-white/60">
                <div className="flex items-center gap-2">
                  {isPublic ? (
                    <>
                      <Globe className="h-4 w-4 text-green-400" />
                      <span className="text-green-400 font-medium">공개</span>
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" />
                      <span>비공개</span>
                    </>
                  )}
                </div>
                <span className="text-white/30">•</span>
                <span className="font-medium">{songCount}곡</span>
                <span className="text-white/30">•</span>
                <span className="text-sm">{relativeTime} 업데이트</span>
              </div>
            </div>

            {/* Action Buttons - Only for owner */}
            {isOwner && (
              <div className="flex items-center gap-2">
                {/* Edit Button - Desktop */}
                <Button
                  onClick={() => setEditOpen(true)}
                  disabled={isLoading}
                  className={`
                    hidden sm:flex items-center gap-2
                    h-10 px-4 rounded-full
                    bg-white/10 text-white font-medium
                    hover:bg-white/20 hover:scale-105
                    active:scale-95
                    transition-all duration-300
                  `}
                >
                  <Edit className="h-4 w-4" />
                  편집
                </Button>

                {/* Delete Button - Desktop */}
                <Button
                  onClick={() => setDeleteAlertOpen(true)}
                  disabled={isLoading}
                  className={`
                    hidden sm:flex items-center gap-2
                    h-10 px-4 rounded-full
                    bg-red-500/10 text-red-400 font-medium
                    hover:bg-red-500/20 hover:scale-105
                    active:scale-95
                    transition-all duration-300
                  `}
                >
                  <Trash2 className="h-4 w-4" />
                  삭제
                </Button>

                {/* Mobile Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      className={`
                        sm:hidden h-10 w-10
                        bg-white/10 text-white
                        hover:bg-white/20
                        rounded-full
                      `}
                    >
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-48 bg-black border-white/20"
                  >
                    <DropdownMenuItem
                      onClick={() => setEditOpen(true)}
                      className="text-white cursor-pointer"
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      편집
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-white/10" />
                    <DropdownMenuItem
                      onClick={() => setDeleteAlertOpen(true)}
                      className="text-red-400 cursor-pointer focus:text-red-400"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      삭제
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <EditPlaylistDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        playlistId={playlistId}
        initialName={name}
        initialDescription={description}
        initialIsPublic={isPublic}
        onSuccess={handleEditSuccess}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent className="bg-black border-white/20 rounded-[20px]">
          <AlertDialogHeader>
            <AlertDialogTitle
              className="text-2xl font-bold text-white"
              style={{ fontFamily: "Quicksand, sans-serif" }}
            >
              플레이리스트 삭제
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/60 text-base">
              정말로 &quot;{name}&quot; 플레이리스트를 삭제하시겠습니까?
              <br />
              <span className="text-red-400 font-medium">
                이 작업은 되돌릴 수 없으며, 모든 곡이 제거됩니다.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel
              className={`
                h-11 rounded-full
                bg-white/10 text-white border-white/20
                hover:bg-white/20
                transition-all duration-300
              `}
            >
              취소
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isLoading}
              className={`
                h-11 rounded-full
                bg-red-500 text-white font-bold
                hover:bg-red-600 hover:scale-105
                active:scale-95
                transition-all duration-300
                disabled:opacity-50
              `}
            >
              {isLoading ? "삭제 중..." : "삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
