"use client";

import React from 'react';

interface LoadMoreButtonProps {
  onClick: () => void;
  isLoading: boolean;
}

export function LoadMoreButton({ onClick, isLoading }: LoadMoreButtonProps) {
  return (
    <div className="flex justify-center mt-8">
      <button
        onClick={onClick}
        disabled={isLoading}
        className="bg-[#39c5bb] hover:bg-[#45d1c7] text-black font-semibold px-8 py-3 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? '로딩 중...' : '더 보기 (Load More)'}
      </button>
    </div>
  );
}
