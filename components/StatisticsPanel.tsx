import { TrendingUp, Calendar, BarChart3 } from 'lucide-react';

interface SongStatistics {
  dailyAverage: number;
  weeklyAverage: number;
  monthlyAverage: number;
  totalDays: number;
}

interface StatisticsPanelProps {
  statistics: SongStatistics;
}

function formatNumber(num: number): string {
  if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(1)}B`;
  }
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }
  return Math.round(num).toLocaleString();
}

export function StatisticsPanel({ statistics }: StatisticsPanelProps) {
  const stats = [
    {
      label: '일 평균',
      value: statistics.dailyAverage,
      period: 'per day',
      icon: TrendingUp,
    },
    {
      label: '주 평균',
      value: statistics.weeklyAverage,
      period: 'per week',
      icon: Calendar,
    },
    {
      label: '월 평균',
      value: statistics.monthlyAverage,
      period: 'per month',
      icon: BarChart3,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        const hasValue = stat.value > 0;

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
