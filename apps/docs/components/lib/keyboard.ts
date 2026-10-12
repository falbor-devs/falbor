import type { KeyboardEvent } from 'react'

export function handleKeyboardActivation(
  event: KeyboardEvent,
  handler?: () => void
) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    handler?.()
  }
}
