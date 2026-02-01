"use client";

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface Tag {
  id: number;
  name: string;
  categoryName: string | null;
  count: number;
}

interface TagListProps {
  tags: Tag[];
}

// Mint color scheme for all tags
const getMintColor = () => {
  return { border: '#39c5bb', glow: 'rgba(57, 197, 187, 0.3)', text: '#5eead4' };
};

export function TagList({ tags }: TagListProps) {
  const router = useRouter();
  const [hoveredTag, setHoveredTag] = useState<number | null>(null);

  const handleTagClick = (tag: Tag) => {
    // Only use tagId for filtering, not text search
    // This allows finding all songs with this tag regardless of title/artist match
    const params = new URLSearchParams({
      tagId: tag.id.toString(),
      tagName: tag.name,
    });
    router.push(`/search?${params.toString()}`);
  };

  return (
    <div className="mb-8 relative">
      {/* Section Header with Neon Accent */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🏷️</span>
          <h3 className="text-xl font-bold text-[#39c5bb]">
            태그
          </h3>
        </div>
        <div className="flex-1 h-px bg-gradient-to-r from-[#39c5bb]/30 via-transparent to-transparent"></div>
      </div>

      {/* Tags Container with Staggered Animation */}
      <div className="flex flex-wrap gap-3">
        {tags.map((tag, index) => {
          const colorScheme = getMintColor();
          const isHovered = hoveredTag === tag.id;

          return (
            <button
              key={tag.id}
              onClick={() => handleTagClick(tag)}
              onMouseEnter={() => setHoveredTag(tag.id)}
              onMouseLeave={() => setHoveredTag(null)}
              className="group relative overflow-hidden"
              style={{
                animation: `tagFadeIn 0.4s ease-out ${index * 0.05}s both`,
              }}
              title={`${tag.categoryName || '태그'} - 클릭하여 검색`}
            >
              {/* Animated Background Gradient */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  background: `linear-gradient(135deg, ${colorScheme.glow}, transparent)`,
                }}
              />

              {/* Glow Effect */}
              {isHovered && (
                <div
                  className="absolute -inset-1 blur-xl opacity-60 animate-pulse"
                  style={{
                    background: `radial-gradient(circle, ${colorScheme.glow}, transparent)`,
                  }}
                />
              )}

              {/* Tag Content */}
              <div
                className="relative px-4 py-2.5 rounded-xl backdrop-blur-sm transition-all duration-300 border-2"
                style={{
                  background: 'rgba(26, 26, 26, 0.6)',
                  borderColor: isHovered ? colorScheme.border : 'rgba(75, 75, 75, 0.5)',
                  transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
                }}
              >
                <div className="flex items-center gap-2">
                  {/* Tag Name */}
                  <span
                    className="text-sm font-medium transition-colors duration-300"
                    style={{
                      color: isHovered ? colorScheme.text : '#d1d5db',
                    }}
                  >
                    {tag.name}
                  </span>

                  {/* Count Badge */}
                  {tag.count > 5 && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-semibold transition-all duration-300"
                      style={{
                        background: isHovered
                          ? `linear-gradient(135deg, ${colorScheme.glow}, rgba(0,0,0,0.3))`
                          : 'rgba(55, 55, 55, 0.5)',
                        color: isHovered ? colorScheme.text : '#9ca3af',
                        border: `1px solid ${isHovered ? colorScheme.border : 'transparent'}`,
                      }}
                    >
                      {tag.count}
                    </span>
                  )}
                </div>

                {/* Ripple Effect on Click */}
                <div className="absolute inset-0 rounded-xl opacity-0 group-active:opacity-100 group-active:animate-ping"
                  style={{
                    background: `radial-gradient(circle, ${colorScheme.glow}, transparent)`,
                  }}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* Inline Keyframes */}
      <style jsx>{`
        @keyframes tagFadeIn {
          from {
            opacity: 0;
            transform: translateY(10px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
