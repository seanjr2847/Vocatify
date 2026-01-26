"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface LoadMoreButtonProps {
  onClick: () => void;
  isLoading: boolean;
}

export function LoadMoreButton({ onClick, isLoading }: LoadMoreButtonProps) {
  return (
    <div className="flex justify-center mt-8">
      <motion.button
        onClick={onClick}
        disabled={isLoading}
        className="w-full max-w-md py-4 rounded-full border-2 border-[#CDFF00]/30
                   text-[#CDFF00] hover:bg-[#CDFF00]/10 transition-all
                   disabled:opacity-50 disabled:cursor-not-allowed
                   font-semibold uppercase tracking-wider text-sm"
        whileHover={!isLoading ? { scale: 1.02 } : {}}
        whileTap={!isLoading ? { scale: 0.98 } : {}}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            >
              <Loader2 className="w-5 h-5" />
            </motion.div>
            로딩 중...
          </span>
        ) : (
          <span>더 보기 (Load More)</span>
        )}
      </motion.button>
    </div>
  );
}
