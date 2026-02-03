"use client";

import { useState, useEffect } from 'react';
import { X, Megaphone } from 'lucide-react';

interface AnnouncementBannerProps {
  id: string; // Unique ID for localStorage
  message: string;
  link?: {
    text: string;
    href: string;
  };
  variant?: 'info' | 'warning' | 'success';
}

export function AnnouncementBanner({
  id,
  message,
  link,
  variant = 'info'
}: AnnouncementBannerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const storageKey = `banner-dismissed-${id}`;

  useEffect(() => {
    // Check if banner was dismissed
    const isDismissed = localStorage.getItem(storageKey);
    if (!isDismissed) {
      setIsVisible(true);
    }
  }, [storageKey]);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem(storageKey, 'true');
  };

  if (!isVisible) return null;

  const variantStyles = {
    info: 'bg-gradient-to-r from-[#39c5bb]/90 to-[#2db3a9]/90 text-white',
    warning: 'bg-gradient-to-r from-amber-500/90 to-orange-500/90 text-white',
    success: 'bg-gradient-to-r from-emerald-500/90 to-green-500/90 text-white',
  };

  return (
    <div className={`relative z-[100] ${variantStyles[variant]}`}>
      <div className="max-w-7xl mx-auto px-4 py-2.5 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center gap-3 text-sm font-medium">
          <Megaphone className="w-4 h-4 flex-shrink-0" />
          <p className="text-center">
            {message}
            {link && (
              <a
                href={link.href}
                className="ml-2 underline underline-offset-2 hover:no-underline font-semibold"
              >
                {link.text} →
              </a>
            )}
          </p>
          <button
            onClick={handleDismiss}
            className="absolute right-4 p-1 rounded-full hover:bg-white/20 transition-colors"
            aria-label="배너 닫기"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
