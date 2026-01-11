import React from 'react';

interface InfoCardProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function InfoCard({ title, icon, children, className = '' }: InfoCardProps) {
  return (
    <div className={`bg-[#1a1a1a] rounded-xl p-6 border border-gray-800 ${className}`}>
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
        {icon}
        {title}
      </h3>
      {children}
    </div>
  );
}
