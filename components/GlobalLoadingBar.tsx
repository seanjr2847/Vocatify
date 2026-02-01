'use client';

/**
 * GlobalLoadingBar Component
 *
 * A full-width loading bar that appears at the top of the page during navigation.
 * Similar to YouTube/GitHub style loading indicators.
 */

export function GlobalLoadingBar() {
  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-1 bg-transparent overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-[#39c5bb] via-[#4ad5cb] to-[#39c5bb]
                   animate-loading-bar shadow-[0_0_10px_#39c5bb,0_0_5px_#39c5bb]"
      />
    </div>
  );
}

/**
 * FullPageLoading Component
 *
 * Full page loading state with centered loading bar and optional backdrop
 */
export function FullPageLoading({ withBackdrop = false }: { withBackdrop?: boolean }) {
  return (
    <div className={`fixed inset-0 z-[9998] ${withBackdrop ? 'bg-[#121212]/80' : ''}`}>
      <GlobalLoadingBar />
    </div>
  );
}
