'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false)
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    setMounted(true)
    setIsDark(document.documentElement.classList.contains('dark'))
  }, [])

  const toggleTheme = () => {
    const nextDark = !isDark
    setIsDark(nextDark)
    if (nextDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  if (!mounted) {
    return <div className='size-[30px]' />
  }

  return (
    <button
      type='button'
      onClick={toggleTheme}
      className='flex size-[30px] cursor-pointer items-center justify-center rounded-lg text-[var(--text-icon)] transition-colors hover:bg-[var(--surface-active)]'
      aria-label='Toggle theme'
    >
      {isDark ? (
        <Moon className='size-[14px]' />
      ) : (
        <Sun className='size-[14px]' />
      )}
    </button>
  )
}
