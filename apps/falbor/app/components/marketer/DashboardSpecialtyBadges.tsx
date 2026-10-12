'use client';

import React from 'react';

interface DashboardSpecialtyBadgesProps {
  specialties: string[];
}

export function DashboardSpecialtyBadges({ specialties }: DashboardSpecialtyBadgesProps) {
  if (!specialties || specialties.length === 0) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-500 border border-blue-500/20">
          Social Media Marketing
        </span>
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
          Google Ads
        </span>
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-500 border border-purple-500/20">
          SEO & Reviews
        </span>
      </div>
    );
  }

  const badgeStyles = [
    'bg-blue-500/10 text-blue-500 border-blue-500/20',
    'bg-amber-500/10 text-amber-500 border-amber-500/20',
    'bg-purple-500/10 text-purple-500 border-purple-500/20',
    'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {specialties.slice(0, 3).map((spec, idx) => (
        <span
          key={spec}
          className={`px-3 py-1 rounded-full text-xs font-semibold border ${badgeStyles[idx % badgeStyles.length]}`}
        >
          {spec}
        </span>
      ))}
    </div>
  );
}
