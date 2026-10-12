'use client'

import type * as React from 'react'
import { blockTypeToIconMap } from '@/components/ui/icon-mapping'

interface BlockInfoCardProps {
  type: string
  color: string
  icon?: React.ComponentType<{ className?: string }>
}

function isLightTileColor(color: string): boolean {
  let hex = color.replace('#', '').trim()

  if (/^[0-9a-fA-F]{3}$/.test(hex)) {
    hex = hex
      .split('')
      .map((char) => char + char)
      .join('')
  }

  if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
    return false
  }

  const r = Number.parseInt(hex.slice(0, 2), 16)
  const g = Number.parseInt(hex.slice(2, 4), 16)
  const b = Number.parseInt(hex.slice(4, 6), 16)

  return (r * 299 + g * 587 + b * 114) / 1000 > 150
}

export function BlockInfoCard({
  type,
  color,
  icon: IconComponent,
}: BlockInfoCardProps): React.ReactNode {
  const ResolvedIcon = IconComponent || blockTypeToIconMap[type] || null
  const iconColorClass = isLightTileColor(color) ? 'text-black' : 'text-white'

  return (
    <div
      aria-hidden='true'
      className='mb-6 flex items-center justify-center overflow-hidden rounded-lg p-8'
      style={{ background: color }}
    >
      {ResolvedIcon ? (
        <ResolvedIcon className={`size-10 ${iconColorClass}`} />
      ) : (
        <div className={`font-mono text-xl opacity-70 ${iconColorClass}`}>
          {type.substring(0, 2)}
        </div>
      )}
    </div>
  )
}