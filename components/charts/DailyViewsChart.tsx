"use client";

import { ResponsiveLine } from '@nivo/line';
import type { DailyViewCount } from '@/lib/db';
import { formatNumber } from '@/lib/utils/format-utils';

interface DailyViewsChartProps {
  data: DailyViewCount[];
}

export function DailyViewsChart({ data }: DailyViewsChartProps) {
  // Transform data for nivo with daily increase calculation
  const chartData = [
    {
      id: '조회수',
      color: '#39c5bb',
      data: data.map((record, index) => {
        const currentViews = Number(record.totalViews);
        const previousViews = index > 0 ? Number(data[index - 1].totalViews) : currentViews;
        const dailyIncrease = currentViews - previousViews;

        return {
          x: new Date(record.recordedDate).toLocaleDateString('ko-KR', {
            month: 'short',
            day: 'numeric',
          }),
          y: currentViews,
          dailyIncrease: dailyIncrease,
        };
      }),
    },
  ];

  return (
    <div className="h-[400px] w-full">
      <ResponsiveLine
        data={chartData}
        margin={{ top: 20, right: 20, bottom: 60, left: 80 }}
        xScale={{ type: 'point' }}
        yScale={{
          type: 'linear',
          min: 'auto',
          max: 'auto',
          stacked: false,
          reverse: false,
        }}
        yFormat=" >-.0f"
        curve="monotoneX"
        axisTop={null}
        axisRight={null}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: -45,
          legend: '날짜',
          legendOffset: 50,
          legendPosition: 'middle',
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: '조회수',
          legendOffset: -60,
          legendPosition: 'middle',
          format: (value) => formatNumber(value),
        }}
        enableGridX={false}
        enableGridY={true}
        colors={{ scheme: 'category10' }}
        lineWidth={3}
        pointSize={8}
        pointColor={{ theme: 'background' }}
        pointBorderWidth={2}
        pointBorderColor={{ from: 'serieColor' }}
        pointLabelYOffset={-12}
        enableArea={true}
        areaOpacity={0.1}
        useMesh={true}
        theme={{
          background: 'transparent',
          text: {
            fill: '#9ca3af',
            fontSize: 12,
          },
          axis: {
            domain: {
              line: {
                stroke: '#374151',
                strokeWidth: 1,
              },
            },
            ticks: {
              line: {
                stroke: '#374151',
                strokeWidth: 1,
              },
              text: {
                fill: '#9ca3af',
              },
            },
            legend: {
              text: {
                fill: '#d1d5db',
                fontSize: 14,
                fontWeight: 600,
              },
            },
          },
          grid: {
            line: {
              stroke: '#374151',
              strokeWidth: 1,
              strokeDasharray: '4 4',
            },
          },
          tooltip: {
            container: {
              background: '#1f2937',
              color: '#f3f4f6',
              fontSize: 14,
              borderRadius: '8px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
              padding: '12px 16px',
            },
          },
          crosshair: {
            line: {
              stroke: '#39c5bb',
              strokeWidth: 1,
              strokeOpacity: 0.5,
              strokeDasharray: '6 6',
            },
          },
        }}
        tooltip={({ point }) => {
          const dailyIncrease = (point.data as { x: string; y: number; dailyIncrease?: number }).dailyIncrease || 0;
          const increaseColor = dailyIncrease > 0 ? '#10b981' : dailyIncrease < 0 ? '#ef4444' : '#6b7280';
          const increaseSymbol = dailyIncrease > 0 ? '+' : '';

          return (
            <div className="bg-[#1f2937] text-white px-4 py-3 rounded-lg shadow-xl border border-gray-700">
              <div className="text-sm font-semibold mb-2">{point.data.xFormatted}</div>
              <div className="text-lg font-bold text-[#39c5bb] mb-1">
                {formatNumber(point.data.y as number)} 조회
              </div>
              {dailyIncrease !== 0 && (
                <div className="text-sm font-medium" style={{ color: increaseColor }}>
                  일간 {increaseSymbol}{formatNumber(dailyIncrease)}
                </div>
              )}
            </div>
          );
        }}
      />
    </div>
  );
}
