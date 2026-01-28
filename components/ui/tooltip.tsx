"use client";

import * as React from "react";

interface TooltipProps {
  children: React.ReactNode;
  content: string;
  side?: "top" | "right" | "bottom" | "left";
}

export function Tooltip({ children, content, side = "right" }: TooltipProps) {
  const [show, setShow] = React.useState(false);

  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
  };

  const arrowClasses = {
    top: "top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent",
    right: "right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent",
    bottom: "bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent",
    left: "left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent",
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div
          className={`
            absolute z-50 px-3 py-2 text-sm font-medium text-white
            bg-gray-900 rounded-lg shadow-lg whitespace-nowrap
            pointer-events-none animate-in fade-in-0 zoom-in-95
            ${positionClasses[side]}
          `}
          role="tooltip"
        >
          {content}
          <div
            className={`
              absolute w-0 h-0 border-4 border-gray-900
              ${arrowClasses[side]}
            `}
          />
        </div>
      )}
    </div>
  );
}
