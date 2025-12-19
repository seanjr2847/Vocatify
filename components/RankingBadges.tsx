import { Trophy, Flame, TrendingUp } from 'lucide-react';

interface RankingBadgesProps {
  rankings: {
    total: number | null;
    daily: number | null;
    weekly: number | null;
  };
}

function getBadgeStyle(rank: number | null) {
  if (!rank) {
    return {
      bg: 'bg-[#2a2a2a]',
      text: 'text-gray-400',
      border: 'border-gray-600',
    };
  }

  if (rank <= 10) {
    return {
      bg: 'bg-[#facd66]/10',
      text: 'text-[#facd66]',
      border: 'border-[#facd66]',
    };
  }

  if (rank <= 50) {
    return {
      bg: 'bg-[#39c5bb]/10',
      text: 'text-[#39c5bb]',
      border: 'border-[#39c5bb]',
    };
  }

  return {
    bg: 'bg-[#2a2a2a]',
    text: 'text-gray-300',
    border: 'border-gray-500',
  };
}

export function RankingBadges({ rankings }: RankingBadgesProps) {
  const badges = [
    {
      label: '전체',
      icon: Trophy,
      rank: rankings.total,
    },
    {
      label: '일간',
      icon: Flame,
      rank: rankings.daily,
    },
    {
      label: '주간',
      icon: TrendingUp,
      rank: rankings.weekly,
    },
  ];

  return (
    <div className="flex flex-wrap gap-3">
      {badges.map((badge) => {
        const style = getBadgeStyle(badge.rank);
        const Icon = badge.icon;

        return (
          <div
            key={badge.label}
            className={`${style.bg} ${style.border} border rounded-lg px-4 py-3 flex items-center gap-3 min-w-[140px]`}
          >
            <Icon className={`w-5 h-5 ${style.text}`} />
            <div>
              <div className="text-xs text-gray-400">{badge.label}</div>
              {badge.rank ? (
                <div className={`text-lg font-bold ${style.text}`}>
                  #{badge.rank}
                </div>
              ) : (
                <div className="text-sm text-gray-500">Not Ranked</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
