'use client'

import { memo, useContext } from 'react'
import { cn } from '@/lib/utils'
import type { Node, NodeProps } from '@xyflow/react'
import { PreviewSelectionContext } from '@/components/workflow-preview/preview-selection-context'
import { DIMMED_PREVIEW_CLASS } from '@/components/workflow-preview/workflow-data'

export interface SubflowNodeData {
  kind: 'parallel' | 'loop'
  name: string
  width?: number
  height?: number
  parentId?: string
  isPreview?: boolean
  isPreviewSelected?: boolean
}

export interface DocsContainerData extends Record<string, unknown> {
  name: string
  blockType: string
  size?: { width: number; height: number }
  parentId?: string
  isHighlighted?: boolean
  isDimmed?: boolean
}

export type DocsContainerNodeType = Node<DocsContainerData, 'previewContainer'>

/**
 * Docs adapter for loop/parallel container blocks.
 */
export const DocsContainerNode = memo(function DocsContainerNode({
  id,
  data,
}: NodeProps<DocsContainerNodeType>) {
  const selectBlock = useContext(PreviewSelectionContext)

  return (
    <div
      onClick={() => selectBlock?.(id)}
      className={cn(
        'size-full rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-1)]/50 p-4 transition-colors hover:border-[var(--border-hover)]',
        data.isHighlighted && 'border-[var(--brand-secondary)] border-solid ring-2 ring-[var(--brand-secondary)]/20',
        data.isDimmed && DIMMED_PREVIEW_CLASS
      )}
      style={{
        width: data.size?.width ?? 300,
        height: data.size?.height ?? 200,
      }}
    >
      <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
        <span className="capitalize">{data.blockType}:</span>
        <span>{data.name}</span>
      </div>
    </div>
  )
})
