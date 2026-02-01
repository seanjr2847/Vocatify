"use client";

import { useState } from "react";
import { Trash2, CheckSquare, XSquare, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
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

/**
 * PlaylistBulkActions Component
 *
 * Floating command center for multi-select and bulk operations
 * Vercel React Best Practices Applied:
 * - rendering-hoist-jsx: Static alert dialog structure
 * - rerender-functional-setstate: Functional updates for dialog state
 */

interface PlaylistBulkActionsProps {
  isOwner: boolean;
  selectedCount: number;
  totalCount: number;
  isSelectMode: boolean;
  onToggleSelectMode: () => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onDeleteSelected: () => Promise<void>;
}

export function PlaylistBulkActions({
  isOwner,
  selectedCount,
  totalCount,
  isSelectMode,
  onToggleSelectMode,
  onSelectAll,
  onDeselectAll,
  onDeleteSelected,
}: PlaylistBulkActionsProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // rendering-hoist-jsx: Early exit for non-owners
  if (!isOwner) return null;

  /**
   * Handle delete confirmation
   * rerender-functional-setstate: Functional state updates
   */
  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await onDeleteSelected();
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error("Failed to delete songs:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      {/* Floating Toolbar - Command Center Aesthetic */}
      <div
        className={`
          fixed bottom-8 left-1/2 -translate-x-1/2 z-50
          transition-all duration-500 ease-out
          ${
            isSelectMode
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-16 pointer-events-none"
          }
        `}
      >
        <div
          className={`
            flex items-center gap-3 px-6 py-4
            rounded-full border-2
            bg-black/80 backdrop-blur-xl
            shadow-2xl shadow-[#39c5bb]/20
            ${isSelectMode ? "border-[#39c5bb]/50" : "border-white/10"}
            transition-all duration-300
          `}
        >
          {/* Digital Counter Display */}
          <div
            className={`
              flex items-center gap-2 px-4 py-2 rounded-full
              bg-[#39c5bb]/10 border border-[#39c5bb]/30
              transition-all duration-300
            `}
          >
            <ListChecks className="h-4 w-4 text-[#39c5bb]" />
            <span
              className="text-sm font-bold text-[#39c5bb] tabular-nums"
              style={{ fontFamily: "Quicksand, monospace" }}
            >
              {selectedCount}곡 선택됨
            </span>
          </div>

          {/* Divider */}
          <div className="h-8 w-px bg-white/10" />

          {/* Select All/None Toggle */}
          <Button
            onClick={selectedCount === totalCount ? onDeselectAll : onSelectAll}
            disabled={totalCount === 0}
            className={`
              h-10 px-4 rounded-full font-medium
              bg-white/10 text-white border-2 border-white/20
              hover:bg-white/20 hover:border-white/30 hover:scale-105
              active:scale-95
              transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            {selectedCount === totalCount ? (
              <>
                <XSquare className="h-4 w-4 mr-2" />
                선택 해제
              </>
            ) : (
              <>
                <CheckSquare className="h-4 w-4 mr-2" />
                전체 선택
              </>
            )}
          </Button>

          {/* Delete Button - Critical Action */}
          <Button
            onClick={() => setDeleteDialogOpen(true)}
            disabled={selectedCount === 0}
            className={`
              h-10 px-4 rounded-full font-bold
              bg-red-500/20 text-red-400 border-2 border-red-500/30
              hover:bg-red-500/30 hover:border-red-500/50 hover:scale-105
              active:scale-95
              transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            삭제
          </Button>

          {/* Divider */}
          <div className="h-8 w-px bg-white/10" />

          {/* Exit Selection Mode */}
          <Button
            onClick={onToggleSelectMode}
            className={`
              h-10 px-4 rounded-full font-medium
              bg-white/5 text-white/60 border-2 border-white/10
              hover:bg-white/10 hover:text-white hover:border-white/20
              hover:scale-105 active:scale-95
              transition-all duration-200
            `}
          >
            완료
          </Button>
        </div>
      </div>

      {/* Selection Mode Toggle Button - Persistent */}
      <div className="fixed bottom-8 right-8 z-40">
        <Button
          onClick={onToggleSelectMode}
          className={`
            h-14 px-6 rounded-full font-bold
            shadow-2xl
            transition-all duration-300
            ${
              isSelectMode
                ? "bg-[#39c5bb] text-black border-2 border-[#39c5bb] scale-110 shadow-[#39c5bb]/40"
                : "bg-white/10 text-white border-2 border-white/20 hover:bg-white/20 hover:border-white/30 hover:scale-105"
            }
            active:scale-95
          `}
        >
          {isSelectMode ? (
            <>
              <ListChecks className="h-5 w-5 mr-2" />
              선택 중
            </>
          ) : (
            <>
              <ListChecks className="h-5 w-5 mr-2" />
              선택 모드
            </>
          )}
        </Button>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-black border-red-500/30 rounded-[20px]">
          <AlertDialogHeader>
            <AlertDialogTitle
              className="text-2xl font-bold text-white"
              style={{ fontFamily: "Quicksand, sans-serif" }}
            >
              곡 삭제 확인
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/60 text-base">
              선택한 <span className="text-[#39c5bb] font-bold">{selectedCount}곡</span>을
              플레이리스트에서 삭제하시겠습니까?
              <br />
              <span className="text-red-400 font-medium">
                이 작업은 되돌릴 수 없습니다.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel
              disabled={isDeleting}
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
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className={`
                h-11 rounded-full
                bg-red-500 text-white font-bold
                hover:bg-red-600 hover:scale-105
                active:scale-95
                transition-all duration-300
                disabled:opacity-50
              `}
            >
              {isDeleting ? "삭제 중..." : `${selectedCount}곡 삭제`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
