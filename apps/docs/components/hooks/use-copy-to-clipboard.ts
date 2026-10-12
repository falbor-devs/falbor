'use client'

import { useCallback, useState } from 'react'

export function useCopyToClipboard() {
    const [copied, setCopied] = useState(false)

    const copy = useCallback(async (text: string) => {
        try {
            await navigator.clipboard.writeText(text)
            setCopied(true)

            setTimeout(() => {
                setCopied(false)
            }, 2000)

            return true
        } catch (error) {
            console.error('Failed to copy text:', error)
            setCopied(false)
            return false
        }
    }, [])

    return { copied, copy }
}