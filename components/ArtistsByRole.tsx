/**
 * ArtistsByRole Component
 *
 * Displays artists grouped by their role categories (Producer, Vocalist, etc.)
 * with visual hierarchy and hover effects.
 * Clicking an artist navigates to search results for that artist.
 */

import Link from 'next/link';

interface Artist {
  id: number;
  name: string;
  artistType: string;
  categories: string;
  roles: string | null;
  isSupport: boolean;
}

interface ArtistsByRoleProps {
  artists: Artist[];
}

// Korean labels for role categories
const ROLE_LABELS: Record<string, string> = {
  Producer: '작곡/작사',
  Vocalist: '보컬',
  Arranger: '편곡',
  Instrumentalist: '연주',
  Illustrator: '일러스트',
  Animator: '애니메이션',
  Mastering: '마스터링',
  Mixer: '믹싱',
  Other: '기타',
} as const;

// Display priority order for roles
const ROLE_ORDER = [
  'Producer',
  'Vocalist',
  'Arranger',
  'Instrumentalist',
  'Illustrator',
  'Animator',
  'Mixer',
  'Mastering',
  'Other',
];

// Normalize category names to handle variations
const CATEGORY_NORMALIZATION: Record<string, string> = {
  Producer: 'Producer',
  Composer: 'Producer',
  Lyricist: 'Producer',
  Vocalist: 'Vocalist',
  Singer: 'Vocalist',
  Voice: 'Vocalist',
  Arranger: 'Arranger',
  Instrumentalist: 'Instrumentalist',
  Illustrator: 'Illustrator',
  Animator: 'Animator',
  Mastering: 'Mastering',
  Mixer: 'Mixer',
};

/**
 * Group artists by their role categories
 */
function groupArtistsByRole(artists: Artist[]): Map<string, Artist[]> {
  // Filter out support artists
  const nonSupportArtists = artists.filter(a => !a.isSupport);

  const grouped = new Map<string, Artist[]>();

  nonSupportArtists.forEach(artist => {
    // Handle multiple categories (e.g., "Producer,Vocalist")
    const categories = artist.categories
      .split(',')
      .map(c => c.trim())
      .filter(c => c.length > 0);

    categories.forEach(category => {
      // Normalize category name
      const normalizedRole = CATEGORY_NORMALIZATION[category] || 'Other';

      if (!grouped.has(normalizedRole)) {
        grouped.set(normalizedRole, []);
      }

      // Avoid duplicates (artist might be added via multiple categories)
      const roleArtists = grouped.get(normalizedRole)!;
      if (!roleArtists.some(a => a.id === artist.id)) {
        roleArtists.push(artist);
      }
    });
  });

  return grouped;
}

/**
 * Sort grouped artists by role priority
 */
function sortByRolePriority(grouped: Map<string, Artist[]>): [string, Artist[]][] {
  return Array.from(grouped.entries()).sort((a, b) => {
    const indexA = ROLE_ORDER.indexOf(a[0]);
    const indexB = ROLE_ORDER.indexOf(b[0]);

    // If not in ROLE_ORDER, put at end
    const priorityA = indexA === -1 ? ROLE_ORDER.length : indexA;
    const priorityB = indexB === -1 ? ROLE_ORDER.length : indexB;

    return priorityA - priorityB;
  });
}

/**
 * Artist chip component - clickable, navigates to search
 */
function ArtistChip({ artist }: { artist: Artist }) {
  const searchUrl = `/search?q=${encodeURIComponent(artist.name)}`;

  return (
    <Link
      href={searchUrl}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full
                 bg-[#2a2a2a] border border-gray-800
                 hover:bg-[#3a3a3a] hover:border-[#39c5bb]
                 transition-all cursor-pointer group"
      title={`${artist.name} 검색하기`}
    >
      <span className="text-sm font-medium text-gray-200 group-hover:text-white">
        {artist.name}
      </span>
    </Link>
  );
}

/**
 * Role section component
 */
function RoleSection({
  role,
  artists,
  showAll,
}: {
  role: string;
  artists: Artist[];
  showAll: boolean;
}) {
  const maxVisible = 8;
  const visibleArtists = showAll ? artists : artists.slice(0, maxVisible);
  const hiddenCount = artists.length - maxVisible;
  const roleLabel = ROLE_LABELS[role] || ROLE_LABELS.Other;

  return (
    <div className="space-y-2">
      {/* Role Header */}
      <div className="text-xs text-gray-400 font-medium">
        {roleLabel}
      </div>

      {/* Artist Chips */}
      <div className="flex flex-wrap gap-2">
        {visibleArtists.map(artist => (
          <ArtistChip key={`${role}-${artist.id}`} artist={artist} />
        ))}

        {/* Show More Button */}
        {!showAll && hiddenCount > 0 && (
          <button
            className="inline-flex items-center px-3 py-1.5 rounded-full
                       text-xs text-[#39c5bb] hover:text-[#4ad5cb]
                       hover:underline transition-colors"
            onClick={() => {
              // Note: For now, this is a placeholder
              // In a client component, this would toggle showAll state
              console.log(`Show ${hiddenCount} more artists`);
            }}
          >
            +{hiddenCount}명 더보기
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Main component: Artists grouped by role
 */
export function ArtistsByRole({ artists }: ArtistsByRoleProps) {
  // Edge case: No artists
  if (!artists || artists.length === 0) {
    return (
      <div className="text-sm text-gray-500">
        아티스트 정보 없음
      </div>
    );
  }

  // Filter and group
  const nonSupportArtists = artists.filter(a => !a.isSupport);

  // Edge case: Only support artists
  if (nonSupportArtists.length === 0) {
    return (
      <div className="space-y-2">
        <div className="text-xs text-gray-500">
          (서포트 아티스트)
        </div>
        <div className="flex flex-wrap gap-2">
          {artists.map(artist => (
            <ArtistChip key={artist.id} artist={artist} />
          ))}
        </div>
      </div>
    );
  }

  // Group by role
  const grouped = groupArtistsByRole(artists);
  const sortedGroups = sortByRolePriority(grouped);

  return (
    <div
      className="space-y-3"
      role="list"
      aria-label="곡 참여 아티스트"
    >
      {sortedGroups.map(([role, roleArtists]) => (
        <div
          key={role}
          role="group"
          aria-labelledby={`role-${role}`}
        >
          <RoleSection
            role={role}
            artists={roleArtists}
            showAll={false}
          />
        </div>
      ))}
    </div>
  );
}
