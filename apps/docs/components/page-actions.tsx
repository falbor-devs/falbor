'use client'

import { Chip, ChipLink, chipVariants } from './falbor-ui'
import { Check, Copy } from 'lucide-react'
import { useCopyButton } from 'fumadocs-ui/utils/use-copy-button'

export function LLMCopyButton({ content }: { content: string }) {
  const [checked, onClick] = useCopyButton(() => navigator.clipboard.writeText(content))

  return (
    <Chip
      onClick={onClick}
      leftIcon={checked ? Check : Copy}
      aria-label={checked ? 'Copied to clipboard' : 'Copy page content'}
    >
      {checked ? 'Copied' : 'Copy page'}
    </Chip>
  )
}
