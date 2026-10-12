'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Search, X, FileText } from 'lucide-react'

import { DOCS_CONFIG } from '@/lib/docs-config'

export function SearchModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('')

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (open) {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  const filteredPages = query.trim() === ''
    ? DOCS_CONFIG
    : DOCS_CONFIG.filter((p) => p.title.toLowerCase().includes(query.toLowerCase()) || p.category.toLowerCase().includes(query.toLowerCase()))

  return (
    <div className='fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/60 backdrop-blur-sm p-4' onClick={onClose}>
      <div className='w-full max-w-xl bg-[var(--surface-1)] border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden flex flex-col' onClick={(e) => e.stopPropagation()}>
        <div className='flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]'>
          <Search className='size-5 text-[var(--text-muted)]' />
          <input
            type='text'
            autoFocus
            placeholder='Search documentation...'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className='flex-1 bg-transparent text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] text-sm'
          />
          <button onClick={onClose} className='text-[var(--text-muted)] hover:text-[var(--text-primary)]'>
            <X className='size-5' />
          </button>
        </div>

        <div className='max-h-96 overflow-y-auto p-2 divide-y divide-[var(--border)]/20'>
          {filteredPages.length > 0 ? (
            filteredPages.map((page) => (
              <Link
                key={page.href}
                href={page.href}
                onClick={onClose}
                className='flex items-center justify-between p-3 rounded-lg hover:bg-[var(--surface-hover)] transition-colors group'
              >
                <div className='flex items-center gap-3'>
                  <FileText className='size-4 text-[var(--text-muted)] group-hover:text-[var(--text-primary)]' />
                  <span className='text-sm text-[var(--text-primary)] font-medium'>{page.title}</span>
                </div>
                <span className='text-xs text-[var(--text-subtle)] bg-[var(--surface-active)] px-2 py-0.5 rounded'>
                  {page.category}
                </span>
              </Link>
            ))
          ) : (
            <div className='p-6 text-center text-sm text-[var(--text-muted)]'>
              No matching documentation pages found.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
