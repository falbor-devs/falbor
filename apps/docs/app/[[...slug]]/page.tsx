import fs from 'fs'
import path from 'path'
import type React from 'react'
import { Children, cloneElement, isValidElement } from 'react'
import { highlight } from 'fumadocs-core/highlight'
import { findNeighbour } from 'fumadocs-core/page-tree'
import type { ApiPageProps } from 'fumadocs-openapi/ui'
import { createAPIPage } from 'fumadocs-openapi/ui'
import { Pre } from 'fumadocs-ui/components/codeblock'
import defaultMdxComponents from 'fumadocs-ui/mdx'
import { DocsBody, DocsPage } from 'fumadocs-ui/page'
import { notFound } from 'next/navigation'
import { PageFooter } from '@/components/docs-layout/page-footer'
import { PageHeader } from '@/components/docs-layout/page-header'
import { PageNavigationArrows } from '@/components/docs-layout/page-navigation-arrows'
import { LLMCopyButton } from '@/components/page-actions'
import { StructuredData } from '@/components/structured-data'
import { APIExampleSelector } from '@/components/ui/api-example-selector'
import { CodeBlock } from '@/components/ui/code-block'
import { Heading } from '@/components/ui/heading'
import { ResponseSection } from '@/components/ui/response-section'
import { getApiSpecContent, getAuthenticatedCodeSamples, openapi } from '@/lib/openapi'
import { simShikiOptions } from '@/lib/shiki-theme'
import { type PageData, source } from '@/lib/source'
import { DOCS_CONFIG } from '@/lib/docs-config'
import { DOCS_BASE_URL } from '@/lib/urls'

const BASE_URL = DOCS_BASE_URL

/**
 * Most pages close with a `## Next` / `## Next steps` grid of onward links.
 * That heading is navigation, not content, so it is kept out of the table of
 * contents — the ToC should say what the page covers, not where to go after it.
 * The heading itself still renders above the cards.
 *
 * Matched on the slug rather than the rendered title because a ToC title is a
 * `ReactNode`; the trailing group tolerates the slugger's dedupe suffix.
 */
const ONWARD_NAV_SLUG = /^#next(-steps)?(-\d+)?$/i

function isContentHeading(item: { url: string }): boolean {
  return !ONWARD_NAV_SLUG.test(item.url)
}

/**
 * Renders the API reference's request and response samples through the docs' own `CodeBlock`
 * rather than fumadocs-openapi's built-in one, so those blocks get the emcn copy control
 * instead of fumadocs' lucide clipboard. Mirrors the default renderer — same `highlight` call,
 * same `Pre` component, same `my-0` — differing only in which shell wraps the result.
 */
async function ApiCodeBlock({ lang, code }: { lang: string; code: string }) {
  return (
    <CodeBlock className='my-0'>
      {await highlight(code, { lang, ...simShikiOptions, components: { pre: Pre } })}
    </CodeBlock>
  )
}

interface ApiSlotElementProps extends React.HTMLAttributes<HTMLElement> {
  items?: unknown[]
}

/** Labels Fumadocs auth selectors while retaining their selection state and content. */
function labelAuthSelectors(node: React.ReactNode): React.ReactNode {
  if (!isValidElement<ApiSlotElementProps>(node)) return node

  const props = node.props
  const children =
    props.children === undefined ? undefined : Children.map(props.children, labelAuthSelectors)

  if (Array.isArray(props.items)) {
    return cloneElement(node, { 'aria-label': 'Authentication method' }, children)
  }
  return children === undefined ? node : cloneElement(node, undefined, children)
}

const APIPage = createAPIPage(openapi, {
  renderCodeBlock: (props) => <ApiCodeBlock {...props} />,
  playground: { enabled: false },
  generateCodeSamples: getAuthenticatedCodeSamples,
  /**
   * fumadocs-openapi highlights its request and response samples through its own Shiki
   * instance, not the MDX pipeline, so it does not inherit `source.config.ts`. Left alone,
   * every API reference page renders `github-light` / `github-dark` while the rest of the docs
   * render the platform palette.
   */
  shikiOptions: simShikiOptions,
  client: {
    operation: { APIExampleSelector },
  },
  content: {
    renderOperationLayout: (slots) => {
      return (
        <div className='flex @4xl:flex-row flex-col @4xl:items-start gap-x-6 gap-y-4 [--badge-amber-text:#854d0e] [--badge-blue-text:#1e40af] [--badge-error-text:#991b1b] [--badge-orange-text:#9a3412] [--badge-success-text:#166534] dark:[--badge-amber-text:#fcd34d] dark:[--badge-blue-text:#93c5fd] dark:[--badge-error-text:#fca5a5] dark:[--badge-orange-text:#fdba74] dark:[--badge-success-text:#86efac] [&_button[aria-haspopup=dialog]]:min-h-6'>
          <div className='min-w-0 flex-1'>
            {slots.header}
            {slots.description}
            {slots.apiPlayground}
            {slots.authSchemes && (
              <div className='api-section-divider'>{labelAuthSelectors(slots.authSchemes)}</div>
            )}
            {slots.parameters}
            {slots.body && <div className='api-section-divider'>{slots.body}</div>}
            <ResponseSection>{slots.responses}</ResponseSection>
            {slots.callbacks}
          </div>
          <div className='@4xl:sticky @4xl:top-[calc(var(--fd-docs-row-1,2rem)+1rem)] @4xl:w-[400px]'>
            {slots.apiExample}
          </div>
        </div>
      )
    },
  },
})

export default async function Page(props: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await props.params
  const slugStr = slug && slug.length > 0 ? slug.join('/') : 'builder'
  
  const docConfig = DOCS_CONFIG.find((d) => d.slug === slugStr) || DOCS_CONFIG[0]
  const filePath = path.join(process.cwd(), 'content/docs', `${docConfig.slug}.mdx`)

  let title = docConfig.title
  let lines: string[] = []

  if (fs.existsSync(filePath)) {
    const rawContent = fs.readFileSync(filePath, 'utf-8')
    lines = rawContent.split('\n')
    const titleLine = lines.find((l) => l.startsWith('# '))
    if (titleLine) {
      title = titleLine.replace('# ', '').trim()
    }
  }

  const headings = lines
    .filter((l) => l.startsWith('## '))
    .map((l) => {
      const text = l.replace('## ', '').trim()
      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      return { text, id }
    })

  const bodyLines = lines.filter((l) => !l.startsWith('# '))

  const rawNeighbours = findNeighbour(source.pageTree, `/${docConfig.slug}`)
  const neighbours = rawNeighbours

  const breadcrumbs = [
    { name: 'Home', url: BASE_URL },
    { name: title, url: `${BASE_URL}/${docConfig.slug}` }
  ]

  const footer = <PageFooter previous={neighbours?.previous} next={neighbours?.next} />

  return (
    <>
      <StructuredData
        title={title}
        description={`${title} documentation`}
        url={`${BASE_URL}/${docConfig.slug}`}
        breadcrumb={breadcrumbs}
      />
      <div className='flex gap-10 w-full'>
        <article className='flex-1 min-w-0 prose prose-invert max-w-none'>
          <PageHeader title={title}>
            <PageNavigationArrows previous={neighbours?.previous} next={neighbours?.next} />
          </PageHeader>

          <div className='mt-6 space-y-4 text-[var(--text-secondary)]'>
            {bodyLines.map((line, idx) => {
              if (line.startsWith('## ')) {
                const text = line.replace('## ', '').trim()
                const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-')
                return (
                  <Heading
                    key={idx}
                    as='h2'
                    id={id}
                    className='text-xl font-semibold text-[var(--text-primary)] mt-8 mb-4'
                  >
                    {text}
                  </Heading>
                )
              }
              if (line.startsWith('### ')) {
                const text = line.replace('### ', '').trim()
                return (
                  <Heading
                    key={idx}
                    as='h3'
                    className='text-lg font-medium text-[var(--text-primary)] mt-6 mb-2'
                  >
                    {text}
                  </Heading>
                )
              }
              if (line.startsWith('- ')) {
                return (
                  <li key={idx} className='ml-4 list-disc text-[var(--text-muted)]'>
                    {line.replace('- ', '')}
                  </li>
                )
              }
              if (!line.trim()) return null
              return <p key={idx} className='leading-relaxed'>{line}</p>
            })}
          </div>

          <div className='mt-12 border-t border-[var(--border)] pt-6'>
            {footer}
          </div>
        </article>

        {headings.length > 0 && (
          <aside className='w-56 flex-shrink-0 hidden lg:block sticky top-[116px] h-[calc(100vh-140px)] overflow-y-auto border-l border-[var(--border)] pl-6'>
            <p className='mb-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-subtle)]'>
              On this page
            </p>
            <nav className='flex flex-col gap-2 text-xs'>
              {headings.map((h) => (
                <a
                  key={h.id}
                  href={`#${h.id}`}
                  className='text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors truncate'
                >
                  {h.text}
                </a>
              ))}
            </nav>
          </aside>
        )}
      </div>
    </>
  )
}

export async function generateStaticParams() {
  return source.generateParams()
}

export async function generateMetadata(props: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await props.params
  const page = source.getPage(slug)
  if (!page) notFound()

  const data = page.data as unknown as PageData
  const fullUrl = `${BASE_URL}${page.url}`

  const ogImageUrl = `${BASE_URL}/api/og?title=${encodeURIComponent(data.title)}`

  return {
    title: data.title,
    description:
      data.description ||
      'Documentation for Sim — the open-source AI workspace where teams build, deploy, and manage AI agents.',
    keywords: [
      'AI agents',
      'AI workspace',
      'AI agent builder',
      'build AI agents',
      'LLM orchestration',
      'AI automation',
      'knowledge base',
      'AI integrations',
      data.title?.toLowerCase().split(' '),
    ]
      .flat()
      .filter(Boolean),
    authors: [{ name: 'Sim Team' }],
    category: 'Developer Tools',
    openGraph: {
      title: data.title,
      description:
        data.description ||
        'Documentation for Sim — the open-source AI workspace where teams build, deploy, and manage AI agents.',
      url: fullUrl,
      siteName: 'Sim Documentation',
      type: 'article',
      locale: 'en_US',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 675,
          alt: data.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: data.title,
      description:
        data.description ||
        'Documentation for Sim — the open-source AI workspace where teams build, deploy, and manage AI agents.',
      images: [ogImageUrl],
      creator: '@simdotai',
      site: '@simdotai',
    },
    alternates: {
      canonical: fullUrl,
    },
  }
}