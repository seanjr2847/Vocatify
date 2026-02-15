"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export type TabType = 'total' | 'daily' | 'weekly' | 'new' | 'rising';

interface ChartsTabNavigationProps {
  activeTab: TabType;
  onChange: (tab: TabType) => void;
}

interface TabConfig {
  id: TabType;
  labelEn: string;
  labelKo: string;
}

export function ChartsTabNavigation({ activeTab, onChange }: ChartsTabNavigationProps) {
  const tabs: TabConfig[] = [
    { id: 'total', labelEn: 'TOTAL RANKINGS', labelKo: '전체 랭킹' },
    { id: 'daily', labelEn: 'DAILY TRENDING', labelKo: '일간 트렌딩' },
    { id: 'weekly', labelEn: 'WEEKLY TRENDING', labelKo: '주간 트렌딩' },
    { id: 'new', labelEn: 'NEW RELEASES', labelKo: '최신 발매' },
    { id: 'rising', labelEn: 'RISING NEW', labelKo: '급상승 신곡' },
  ];

  return (
    <div className="border-b border-white/10">
      <div className="flex gap-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <motion.button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={cn(
                "relative px-6 py-3 rounded-t-lg transition-all duration-300",
                isActive
                  ? "bg-[#39c5bb]/10 text-[#39c5bb]"
                  : "text-white/60 hover:text-white/80 hover:bg-white/5"
              )}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex flex-col items-center gap-1">
                <span className="text-sm uppercase tracking-wider font-semibold">
                  {tab.labelEn}
                </span>
                <span className="text-xs text-white/40">
                  {tab.labelKo}
                </span>
              </div>

              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#39c5bb]"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
