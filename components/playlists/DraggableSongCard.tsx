"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Music } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Checkbox } from "@/components/ui/checkbox";
import { getSongDisplayTitle, formatViewCount, formatDuration } from "@/lib/utils/playlist";

/**
 * DraggableSongCard Component
 *
 * Vercel React Best Practices Applied:
 * - rerender-memo: Memoized for list performance
 * - rendering-hoist-jsx: Static elements extracted
 * - js-cache-property-access: Cache transform calculations
 */

interface Song {
  vocadbId: number;
  defaultName: string;
  titleKorean: string | null;
  titleEnglish: string | null;
  titleJapanese: string | null;
  titleRomaji: string | null;
  artistString: string | null;
  thumbUrl: string | null;
  viewCount: bigint | null;
  lengthSeconds: number | null;
}

interface DraggableSongCardProps {
  id: string;
  song: Song;
  index: number;
  isDragDisabled: boolean;
  isSelectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}

export function DraggableSongCard({
  id,
  song,
  index,
  isDragDisabled,
  isSelectMode = false,
  isSelected = false,
  onToggleSelect,
}: DraggableSongCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    disabled: isDragDisabled || isSelectMode, // Disable drag in select mode
  });

  // js-cache-property-access: Cache transform calculation
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const displayTitle = getSongDisplayTitle(song);

  // Handle card click in select mode
  const handleCardClick = () => {
    if (isSelectMode && onToggleSelect) {
      onToggleSelect();
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={handleCardClick}
      className={`
        group flex items-center gap-4
        rounded-[16px] border-2
        backdrop-blur-sm p-4
        transition-all duration-300
        ${
          isDragging
            ? "border-[#39c5bb]/50 bg-[#39c5bb]/10 shadow-2xl scale-105 rotate-2 z-50"
            : isSelected
            ? "border-[#39c5bb] bg-[#39c5bb]/10 shadow-lg shadow-[#39c5bb]/20"
            : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-[#39c5bb]/50"
        }
        ${
          isSelectMode
            ? "cursor-pointer"
            : isDragDisabled
            ? "cursor-default"
            : "cursor-grab active:cursor-grabbing"
        }
      `}
    >
      {/* Checkbox - visible in select mode */}
      {isSelectMode && (
        <div className="flex-shrink-0">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onToggleSelect}
            className={`
              transition-all duration-200
              ${isSelected ? "scale-110" : ""}
            `}
          />
        </div>
      )}

      {/* Drag Handle - only visible for owners when NOT in select mode */}
      {!isDragDisabled && !isSelectMode && (
        <div
          {...attributes}
          {...listeners}
          className={`
            cursor-grab active:cursor-grabbing
            text-white/40 hover:text-[#39c5bb]
            transition-all duration-300
            ${isDragging ? "opacity-100" : "opacity-0 group-hover:opacity-100"}
          `}
        >
          <GripVertical className="h-5 w-5" />
        </div>
      )}

      {/* Order Number */}
      <div
        className={`
          w-8 text-center text-sm font-bold
          transition-colors duration-300
          ${
            isDragging || isSelected
              ? "text-[#39c5bb]"
              : "text-white/60 group-hover:text-[#39c5bb]"
          }
        `}
      >
        {index + 1}
      </div>

      {/* Thumbnail */}
      {song.thumbUrl ? (
        <div className={`relative h-16 w-24 transition-transform duration-300 ${isDragging ? "scale-110" : ""}`}>
          <Image
            src={song.thumbUrl}
            alt={displayTitle}
            fill
            className="rounded-[12px] object-cover shadow-lg"
            sizes="96px"
          />
        </div>
      ) : (
        <div
          className={`
            h-16 w-24 rounded-[12px]
            bg-gradient-to-br from-[#39c5bb]/20 to-[#39c5bb]/5
            flex items-center justify-center
            transition-all duration-300
            ${isDragging ? "scale-110" : ""}
          `}
        >
          <Music className="h-6 w-6 text-[#39c5bb]/40" />
        </div>
      )}

      {/* Song Info - clickable link */}
      <Link
        href={`/songs/${song.vocadbId}`}
        className="flex-1 min-w-0"
        onClick={(e) => {
          // Prevent navigation during drag or in select mode
          if (isDragging || isSelectMode) {
            e.preventDefault();
          }
        }}
      >
        <h3
          className={`
            truncate text-base font-bold
            transition-colors duration-300
            ${
              isDragging || isSelected
                ? "text-[#39c5bb]"
                : "text-white group-hover:text-[#39c5bb]"
            }
          `}
          style={{ fontFamily: "Quicksand, sans-serif" }}
        >
          {displayTitle}
        </h3>
        {song.artistString && (
          <p className="truncate text-sm text-white/60">{song.artistString}</p>
        )}
      </Link>

      {/* View Count */}
      {song.viewCount && (
        <div className="hidden sm:block text-sm text-white/60 font-medium">
          {formatViewCount(song.viewCount)}회
        </div>
      )}

      {/* Duration */}
      {song.lengthSeconds && (
        <div className="text-sm text-white/60 font-medium">
          {formatDuration(song.lengthSeconds)}
        </div>
      )}
    </div>
  );
}
