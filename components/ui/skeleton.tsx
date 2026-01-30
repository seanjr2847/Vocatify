"use client";

import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
  variant?: "default" | "shimmer" | "glow";
}

export function Skeleton({ className, variant = "shimmer" }: SkeletonProps) {
  const baseStyles = "rounded-md";

  const variantStyles = {
    default: "animate-pulse bg-white/5",
    shimmer: "relative overflow-hidden bg-white/5 before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent",
    glow: "animate-pulse bg-white/5 shadow-[0_0_15px_rgba(57,197,187,0.1)]",
  };

  return (
    <div
      className={cn(
        baseStyles,
        variantStyles[variant],
        className
      )}
    />
  );
}
