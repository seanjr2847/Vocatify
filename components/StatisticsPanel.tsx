import { TrendingUp, Calendar, BarChart3, Award } from 'lucide-react';
import type { SongStatistics } from '@/lib/db';

interface StatisticsPanelProps {
  statistics: SongStatistics;
}

function formatNumber(num: bigint | number | null): string {
  if (!num) return '0';
  const n = typeof num === 'bigint' ? Number(num) : num;
  if (n >= 1_000_000_000) {
    return `${(n / 1_000_000_000).toFixed(1)}B`;
  }
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1)}M`;
  }
  if (n >= 1_000) {
    return `${(n / 1_000).toFixed(1)}K`;
  }
  return Math.round(n).toLocaleString();
}

function formatDate(date: Date | null): string {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function StatisticsPanel({ statistics }: StatisticsPanelProps) {
  const stats = [
    {
      label: '일 평균',
      value: statistics.avgDailyViews,
      period: 'per day',
      icon: TrendingUp,
    },
    {
      label: '이번 주',
      value: statistics.viewsThisWeek,
      period: 'this week',
      icon: Calendar,
    },
    {
      label: '최고 일일 증가',
      value: statistics.peakDailyIncrease,
      period: formatDate(statistics.peakDate),
      icon: Award,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        const hasValue = stat.value != null && (typeof stat.value === 'bigint' ? stat.value > BigInt(0) : stat.value > 0);

        return (
          <div
            key={stat.label}
            className={`bg-[#1a1a1a] rounded-lg p-4 border ${
              hasValue
                ? 'border-[#39c5bb]/30 hover:border-[#39c5bb] hover:bg-[#39c5bb]/5'
                : 'border-gray-700'
            } transition-all`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon
                className={`w-4 h-4 ${hasValue ? 'text-[#39c5bb]' : 'text-gray-500'}`}
              />
              <span className="text-xs text-gray-400">{stat.label}</span>
            </div>
            {hasValue ? (
              <div>
                <div className="text-2xl font-bold text-[#39c5bb]">
                  +{formatNumber(stat.value)}
                </div>
                <div className="text-xs text-gray-500 mt-1">{stat.period}</div>
              </div>
            ) : (
              <div className="text-sm text-gray-500">데이터 없음</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
