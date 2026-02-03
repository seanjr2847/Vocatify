"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { X } from 'lucide-react';

interface AdBannerProps {
  id: string;
  imageUrl: string;
  mobileImageUrl?: string; // 모바일용 이미지 (선택)
  linkUrl: string;
  alt: string;
  height?: number; // 기본 90px (리더보드 배너)
  closeable?: boolean;
  external?: boolean; // 외부 링크 여부
}

export function AdBanner({
  id,
  imageUrl,
  mobileImageUrl,
  linkUrl,
  alt,
  height = 90,
  closeable = true,
  external = false,
}: AdBannerProps) {
  // Start with null state to avoid hydration mismatch
  const [isVisible, setIsVisible] = useState<boolean | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const storageKey = `ad-banner-closed-${id}`;

  useEffect(() => {
    // 클라이언트에서만 sessionStorage 확인
    const isClosed = sessionStorage.getItem(storageKey);
    setIsVisible(!isClosed);
  }, [storageKey]);

  const handleClose = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsVisible(false);
    sessionStorage.setItem(storageKey, 'true');
  };

  // 초기 상태(null) 또는 닫힘 상태에서는 렌더링하지 않음
  if (isVisible !== true) return null;

  const linkProps = external
    ? { target: "_blank", rel: "noopener noreferrer sponsored" }
    : {};

  return (
    <div className="relative w-full bg-[#0a0a0a] border-b border-gray-800">
      <div className="max-w-[970px] mx-auto relative">
        <Link
          href={linkUrl}
          {...linkProps}
          className="block relative w-full overflow-hidden"
          style={{ height: `${height}px` }}
        >
          {/* Desktop Image */}
          <Image
            src={imageUrl}
            alt={alt}
            fill
            className={`object-contain hidden sm:block transition-opacity duration-300 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setIsLoaded(true)}
            priority
          />
          {/* Mobile Image */}
          <Image
            src={mobileImageUrl || imageUrl}
            alt={alt}
            fill
            className={`object-contain sm:hidden transition-opacity duration-300 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setIsLoaded(true)}
            priority
          />
          {/* Placeholder */}
          {!isLoaded && (
            <div className="absolute inset-0 bg-gray-900 animate-pulse" />
          )}
        </Link>

        {/* Close Button */}
        {closeable && (
          <button
            onClick={handleClose}
            className="absolute top-1 right-1 z-10 p-1 bg-black/60 hover:bg-black/80 rounded-full transition-colors"
            aria-label="배너 닫기"
          >
            <X className="w-3 h-3 text-gray-400" />
          </button>
        )}

        {/* Ad Label */}
        <span className="absolute bottom-1 right-1 text-[10px] text-gray-500 bg-black/60 px-1 rounded">
          AD
        </span>
      </div>
    </div>
  );
}
