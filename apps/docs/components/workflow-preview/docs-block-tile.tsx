import { coreBlockTypes } from '@/components/ui/icon-mapping'
import { normalizeBlockType, resolveIcon } from '@/components/workflow-preview/block-icons'

interface DocsBlockTileProps {
  type: string
  color?: string
  isIntegration?: boolean
  triggerMode?: boolean
  size?: 'sm' | 'md' | 'lg'
}

/** Resolves authored diagram metadata for the editor's shared tile view. */
export function DocsBlockTile({
  type,
  color,
  isIntegration,
  triggerMode,
  size = 'lg',
}: DocsBlockTileProps) {
  const blockType = normalizeBlockType(type, triggerMode)
  const Icon = resolveIcon(blockType)

  return (
    <div
      className="flex items-center justify-center rounded-lg p-2"
      style={{ backgroundColor: color || 'var(--surface-2)' }}
    >
      {Icon ? <Icon className="size-5 text-[var(--text-primary)]" /> : null}
    </div>
  )
}
