"use client";

import React from 'react';

export type TabType = 'total' | 'daily' | 'weekly';

interface ChartsTabNavigationProps {
  activeTab: TabType;
  onChange: (tab: TabType) => void;
}

export function ChartsTabNavigation({ activeTab, onChange }: ChartsTabNavigationProps) {
  const tabs: { id: TabType; label: string }[] = [
    { id: 'total', label: '전체 랭킹 (Total Rankings)' },
    { id: 'daily', label: '일간 트렌딩 (Daily Trending)' },
    { id: 'weekly', label: '주간 트렌딩 (Weekly Trending)' },
  ];

  return (
    <div className="border-b border-white/10">
      <div className="flex gap-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`relative pb-4 text-sm font-semibold transition-colors ${
              activeTab === tab.id
                ? 'text-white'
                : 'text-white/60 hover:text-white/80'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#39c5bb]" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
