'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChipLink } from '../falbor-ui'
import { SearchTrigger } from '@/components/ui/search-trigger'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { SearchModal } from '@/components/ui/search-modal'
import { FALBOR_SITE_URL } from '@/lib/urls'
import { cn } from '@/lib/utils'

/**
 * Sections that own a tab, in reading order: the main docs, then the three
 * reference surfaces, then Academy. `Documentation` matches by exclusion.
 */
const SECTION_TABS = ['api-reference', 'academy', 'cli', 'mcp'] as const

/**
 * Whether a pathname is inside a section, matched on its first path segment.
 */
function isInSection(pathname: string, section: string): boolean {
  return pathname === `/${section}` || pathname.startsWith(`/${section}/`)
}

const NAV_TABS = [
  {
    label: 'Documentation',
    href: '/builder',
    match: (p: string) =>
      !SECTION_TABS.some((section) => isInSection(p, section)),
    external: false,
  },
  {
    label: 'API Reference',
    href: '/api-reference',
    match: (p: string) => isInSection(p, 'api-reference'),
    external: false,
  },
] as const

export function Navbar() {
  const pathname = usePathname()
  const [searchOpen, setSearchOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen((prev) => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  return (
    <>
      <SearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
      />

      <nav className="sticky top-0 z-50 bg-[var(--bg)]/80 backdrop-blur-md backdrop-saturate-150 border-b border-[var(--border)]">
        <div className="hidden w-full flex-col lg:flex max-w-[1400px] mx-auto px-6">
          <div className="relative flex h-[52px] w-full items-center justify-between">
            <Link
              href="/"
              aria-label="Falbor documentation home"
              className="flex shrink-0 items-center"
            >
              <img
                src="/logo-dark-styled.png"
                alt="Falbor"
                className="hidden h-12 w-auto dark:block"
              />
              <img
                src="/logo-light-styled.png"
                alt="Falbor"
                className="h-12 w-auto dark:hidden"
              />
            </Link>

            <div
              className="absolute left-1/2 flex -translate-x-1/2 items-center justify-center"
              onClick={() => setSearchOpen(true)}
            >
              <SearchTrigger />
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {/* <ThemeToggle /> */}
              <ChipLink href={FALBOR_SITE_URL} variant="primary">
                Get started
              </ChipLink>
            </div>
          </div>

          {/* Bottom row: navigation tabs */}
          <div className="flex h-[40px] items-stretch gap-6">
            {NAV_TABS.map((tab) => {
              const isActive = !tab.external && tab.match(pathname)

              return (
                <Link
                  key={tab.label}
                  href={tab.href}
                  aria-current={isActive ? 'page' : undefined}
                  {...(tab.external
                    ? {
                      target: '_blank',
                      rel: 'noopener noreferrer',
                    }
                    : {})}
                  className={cn(
                    '-mb-px relative flex items-center border-b text-sm tracking-[-0.01em] transition-colors',
                    isActive
                      ? 'border-[var(--text-muted)] font-medium text-[var(--text-primary)]'
                      : 'border-transparent font-normal text-[var(--text-secondary)] hover:border-[var(--border-1)] hover:text-[var(--text-primary)]'
                  )}
                >
                  {/* Invisible bold text reserves width to prevent layout shift */}
                  <span className="invisible font-medium">
                    {tab.label}
                  </span>

                  <span className="absolute">
                    {tab.label}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      </nav>
    </>
  )
}