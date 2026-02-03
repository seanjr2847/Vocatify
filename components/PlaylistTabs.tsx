"use client";

import React from 'react';

interface PlaylistTabsProps {
  activeTab: 'queue' | 'radio' | 'lyrics';
  onTabChange: (tab: 'queue' | 'radio' | 'lyrics') => void;
  hasRadio?: boolean; // 라디오 모드 활성화 여부
}

export function PlaylistTabs({ activeTab, onTabChange, hasRadio = false }: PlaylistTabsProps) {
  const tabs = [
    { id: 'queue' as const, label: '재생 대기열' },
    { id: 'radio' as const, label: '라디오', disabled: !hasRadio },
    { id: 'lyrics' as const, label: '가사' },
  ];

  return (
    <div className="flex border-b border-gray-800 px-8 pt-6">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => !tab.disabled && onTabChange(tab.id)}
          disabled={tab.disabled}
          className={`px-4 py-3 text-sm font-semibold transition-all ${
            activeTab === tab.id
              ? 'text-white border-b-2 border-[#39c5bb]'
              : tab.disabled
                ? 'text-gray-600 cursor-not-allowed'
                : 'text-gray-400 hover:text-white'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
