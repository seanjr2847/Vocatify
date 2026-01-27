import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * EmptyState Component - Tidal Design System
 *
 * Vercel React Best Practices Applied:
 * - rendering-hoist-jsx: Static content structure
 * - rerender-memo: Component memoization
 * - rendering-conditional-render: Proper conditional rendering
 */

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
  compact?: boolean;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  actionHref,
  compact = false,
}: EmptyStateProps) {
  const paddingClass = compact ? "py-12" : "py-20";

  return (
    <div
      className={`
        flex flex-col items-center justify-center
        rounded-[20px] border border-white/10
        bg-white/5 backdrop-blur-sm ${paddingClass}
        transition-all duration-300
      `}
    >
      {/* Icon */}
      <div
        className={`
          mb-4 flex items-center justify-center
          rounded-[16px]
          bg-gradient-to-br from-white/10 to-white/5
          transition-all duration-300
          ${compact ? "h-12 w-12" : "h-16 w-16"}
        `}
      >
        <Icon className={`text-white/20 ${compact ? "h-6 w-6" : "h-8 w-8"}`} />
      </div>

      {/* Title */}
      <h3
        className={`mb-2 font-bold text-white ${compact ? "text-lg" : "text-xl"}`}
        style={{ fontFamily: "Quicksand, sans-serif" }}
      >
        {title}
      </h3>

      {/* Description */}
      <p className={`text-white/60 mb-6 ${compact ? "text-sm" : "text-base"}`}>
        {description}
      </p>

      {/* Action Button - rendering-conditional-render: Use proper conditional */}
      {actionLabel && (onAction || actionHref) ? (
        <Button
          onClick={onAction}
          className={`
            rounded-full ${compact ? "px-6 py-2" : "px-8 py-3"}
            bg-[#CDFF00] text-black font-bold
            transition-all duration-300
            hover:bg-[#CDFF00]/90 hover:scale-105
            active:scale-95
          `}
          asChild={!!actionHref}
        >
          {actionHref ? (
            <a href={actionHref}>{actionLabel}</a>
          ) : (
            <span>{actionLabel}</span>
          )}
        </Button>
      ) : null}
    </div>
  );
}
