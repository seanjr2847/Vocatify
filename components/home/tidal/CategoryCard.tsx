'use client';

import Image from 'next/image';
import Link from 'next/link';

interface CategoryCardProps {
  category: {
    name: string;
    subtitle: string;
    image: string;
    href: string;
  };
}

export default function CategoryCard({ category }: CategoryCardProps) {
  return (
    <Link
      href={category.href}
      className="group cursor-pointer block"
    >
      {/* Square Image Container */}
      <div className="relative aspect-square overflow-hidden bg-white/5 rounded-sm">
        <Image
          src={category.image}
          fill
          alt={category.name}
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Vertical Label (Tidal Style) */}
        <div className="absolute right-4 top-4 bottom-4 flex items-center">
          <p
            className="text-white font-bold text-lg uppercase tracking-widest"
            style={{ writingMode: 'vertical-rl' }}
          >
            {category.name}
          </p>
        </div>

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      {/* Bottom Text */}
      <div className="mt-3">
        <p className="text-white font-medium text-sm">
          {category.subtitle}
        </p>
        <p className="text-white/50 text-xs mt-1">
          VOCATIFY
        </p>
      </div>
    </Link>
  );
}
