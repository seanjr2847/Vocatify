"use client";

import { useState, useEffect } from "react";
import { Music, Lock, Globe } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { usePlaylists } from "@/lib/hooks";
import {
  validatePlaylistName,
  validatePlaylistDescription,
} from "@/lib/utils/playlist";

/**
 * EditPlaylistDialog Component
 *
 * Vercel React Best Practices Applied:
 * - rerender-functional-setstate: Functional updates for state
 * - rerender-defer-reads: Don't subscribe to state only used in callbacks
 * - rendering-hoist-jsx: Static JSX hoisted outside render
 * - js-early-exit: Early returns for validation
 * - bundle-conditional: Dialog only loads when opened
 */

interface EditPlaylistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playlistId: string;
  initialName: string;
  initialDescription: string | null;
  initialIsPublic: boolean;
  onSuccess?: () => void;
}

export function EditPlaylistDialog({
  open,
  onOpenChange,
  playlistId,
  initialName,
  initialDescription,
  initialIsPublic,
  onSuccess,
}: EditPlaylistDialogProps) {
  const { updatePlaylist, isLoading } = usePlaylists();

  // Form state - reset when dialog opens
  // rerender-lazy-state-init: Initialize with props
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription || "");
  const [isPublic, setIsPublic] = useState(initialIsPublic);

  // Validation errors
  const [nameError, setNameError] = useState<string | null>(null);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);

  // Reset form when dialog opens or initial values change
  useEffect(() => {
    if (open) {
      setName(initialName);
      setDescription(initialDescription || "");
      setIsPublic(initialIsPublic);
      setNameError(null);
      setDescriptionError(null);
    }
  }, [open, initialName, initialDescription, initialIsPublic]);

  /**
   * Handle form submission
   * async-defer-await: Validation before async operation
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // js-early-exit: Validate before submission
    const nameValidation = validatePlaylistName(name);
    const descriptionValidation = validatePlaylistDescription(description);

    if (nameValidation) {
      setNameError(nameValidation);
      return;
    }

    if (descriptionValidation) {
      setDescriptionError(descriptionValidation);
      return;
    }

    // Check if anything changed
    const hasChanges =
      name.trim() !== initialName ||
      (description.trim() || null) !== initialDescription ||
      isPublic !== initialIsPublic;

    // js-early-exit: Skip if no changes
    if (!hasChanges) {
      onOpenChange(false);
      return;
    }

    try {
      await updatePlaylist(playlistId, {
        name: name.trim(),
        description: description.trim() || null,
        isPublic,
      });

      // Success callback
      if (onSuccess) {
        onSuccess();
      }

      onOpenChange(false);
    } catch (error) {
      // Error handled by hook with toast
      console.error("Failed to update playlist:", error);
    }
  };

  /**
   * Handle name change with inline validation
   */
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setName(value);

    // Clear error when user types
    if (nameError) {
      setNameError(null);
    }

    // Show error if exceeds max length
    if (value.length > 100) {
      setNameError("플레이리스트 이름은 100자 이하여야 합니다");
    }
  };

  /**
   * Handle description change with inline validation
   */
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setDescription(value);

    // Clear error when user types
    if (descriptionError) {
      setDescriptionError(null);
    }

    // Show error if exceeds max length
    if (value.length > 500) {
      setDescriptionError("설명은 500자 이하여야 합니다");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`
          max-w-2xl
          bg-black border-white/20
          rounded-[20px]
        `}
      >
        <DialogHeader>
          <DialogTitle
            className="text-2xl font-bold text-white"
            style={{ fontFamily: "Quicksand, sans-serif" }}
          >
            플레이리스트 편집
          </DialogTitle>
          <DialogDescription className="text-white/60">
            플레이리스트 정보를 수정하세요
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Playlist Name Field */}
          <div className="space-y-2">
            <Label htmlFor="edit-name" className="text-white text-base">
              플레이리스트 이름 <span className="text-red-400">*</span>
            </Label>
            <div className="relative">
              <Music className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
              <Input
                id="edit-name"
                type="text"
                value={name}
                onChange={handleNameChange}
                placeholder="나만의 플레이리스트"
                maxLength={100}
                disabled={isLoading}
                className={`
                  pl-10 h-12
                  bg-white/10 border-white/20
                  text-white placeholder:text-white/40
                  focus-visible:border-[#39c5bb] focus-visible:ring-[#39c5bb]
                  transition-all duration-300
                  ${nameError ? "border-red-400" : ""}
                `}
                required
              />
            </div>
            {/* Character count and error */}
            <div className="flex items-center justify-between text-sm">
              {nameError ? (
                <span className="text-red-400">{nameError}</span>
              ) : (
                <span className="text-white/40">{name.length}/100</span>
              )}
            </div>
          </div>

          {/* Description Field */}
          <div className="space-y-2">
            <Label htmlFor="edit-description" className="text-white text-base">
              설명 <span className="text-white/40 text-sm">(선택)</span>
            </Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={handleDescriptionChange}
              placeholder="이 플레이리스트에 대한 설명을 입력하세요"
              maxLength={500}
              disabled={isLoading}
              rows={4}
              className={`
                bg-white/10 border-white/20
                text-white placeholder:text-white/40
                focus-visible:border-[#39c5bb] focus-visible:ring-[#39c5bb]
                resize-none transition-all duration-300
                ${descriptionError ? "border-red-400" : ""}
              `}
            />
            {/* Character count and error */}
            <div className="flex items-center justify-between text-sm">
              {descriptionError ? (
                <span className="text-red-400">{descriptionError}</span>
              ) : (
                <span className="text-white/40">
                  {description.length}/500
                </span>
              )}
            </div>
          </div>

          {/* Public/Private Toggle */}
          <div className="space-y-3">
            <Label className="text-white text-base">공개 설정</Label>
            <div
              className={`
                flex items-center justify-between p-4 rounded-[12px]
                bg-white/5 border border-white/10
                transition-all duration-300
                ${isPublic ? "bg-[#39c5bb]/10 border-[#39c5bb]/30" : ""}
              `}
            >
              <div className="flex items-center gap-3">
                {isPublic ? (
                  <Globe className="h-5 w-5 text-[#39c5bb]" />
                ) : (
                  <Lock className="h-5 w-5 text-white/60" />
                )}
                <div>
                  <div className="text-white font-medium">
                    {isPublic ? "공개" : "비공개"}
                  </div>
                  <div className="text-white/40 text-sm">
                    {isPublic
                      ? "누구나 이 플레이리스트를 볼 수 있습니다"
                      : "나만 이 플레이리스트를 볼 수 있습니다"}
                  </div>
                </div>
              </div>
              <Switch
                checked={isPublic}
                onCheckedChange={setIsPublic}
                disabled={isLoading}
                className="data-[state=checked]:bg-[#39c5bb]"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={isLoading || !name.trim()}
              className={`
                flex-1 h-12 rounded-full
                bg-[#39c5bb] text-black font-bold
                hover:bg-[#39c5bb]/90 hover:scale-105
                active:scale-95
                transition-all duration-300
                disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
              `}
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 border-2 border-black/30 border-t-black rounded-full animate-spin mr-2" />
                  저장 중...
                </>
              ) : (
                "변경사항 저장"
              )}
            </Button>
            <Button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className={`
                flex-1 h-12 rounded-full
                bg-white/10 text-white font-medium
                hover:bg-white/20 hover:scale-105
                active:scale-95
                transition-all duration-300
                disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
              `}
            >
              취소
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
