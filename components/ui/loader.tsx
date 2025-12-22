"use client";

import React from "react";

interface LoaderProps {
  size?: "sm" | "md" | "lg";
  color?: string;
  className?: string;
}

export function Loader({ size = "md", color = "#22c55e", className = "" }: LoaderProps) {
  const sizeMap = {
    sm: { container: 40, origin: 20, top: 1.5, left: 18.5, width: 3, height: 9 },
    md: { container: 80, origin: 40, top: 3, left: 37, width: 6, height: 18 },
    lg: { container: 120, origin: 60, top: 4.5, left: 55.5, width: 9, height: 27 },
  };

  const s = sizeMap[size];

  return (
    <div
      className={`inline-block relative ${className}`}
      style={{ width: s.container, height: s.container }}
    >
      {Array.from({ length: 12 }, (_, i) => (
        <div
          key={i}
          className="absolute animate-loader-spinner"
          style={{
            transformOrigin: `${s.origin}px ${s.origin}px`,
            transform: `rotate(${i * 30}deg)`,
            animationDelay: `${-1.1 + i * 0.1}s`,
          }}
        >
          <div
            style={{
              position: "absolute",
              top: s.top,
              left: s.left,
              width: s.width,
              height: s.height,
              borderRadius: "20%",
              background: color,
            }}
          />
        </div>
      ))}
    </div>
  );
}
