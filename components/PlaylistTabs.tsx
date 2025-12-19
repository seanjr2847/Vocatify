"use client";

import React from 'react';

interface PlaylistTabsProps {
  activeTab: 'queue' | 'suggested' | 'lyrics' | 'credits';
  onTabChange: (tab: 'queue' | 'suggested' | 'lyrics' | 'credits') => void;
}

export function PlaylistTabs({ activeTab, onTabChange }: PlaylistTabsProps) {
  const tabs = [
    { id: 'queue' as const, label: 'Play queue' },
    { id: 'suggested' as const, label: 'Suggested tracks' },
    { id: 'lyrics' as const, label: 'Lyrics' },
    { id: 'credits' as const, label: 'Credits' },
  ];

  return (
    <div className="flex border-b border-gray-800 px-8 pt-6">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-4 py-3 text-sm font-semibold transition-all ${
            activeTab === tab.id
              ? 'text-white border-b-2 border-[#39c5bb]'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
