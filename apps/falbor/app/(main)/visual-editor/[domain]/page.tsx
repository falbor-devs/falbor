import { db } from '~/lib/visual-editor/db'
import { getDomainContent } from '~/lib/visual-editor/queries'
import { eq, sql } from 'drizzle-orm'
import { veFunnelPages } from '~/lib/db/schema'
import EditorProvider from '~/providers/visual-editor/editor/editor-provider'
import { notFound } from 'next/navigation'
import React from 'react'
import FunnelEditorNavigation from '../(main)/subaccount/[subaccountId]/funnels/[funnelId]/editor/[funnelPageId]/_components/funnel-editor-navigation'
import FunnelEditor from '../(main)/subaccount/[subaccountId]/funnels/[funnelId]/editor/[funnelPageId]/_components/funnel-editor'

const Page = async ({ params }: { params: { domain: string } }) => {
  const domainData = await getDomainContent(params.domain.slice(0, -1))
  if (!domainData) return notFound()

  const pageData = domainData.FunnelPages.find((page) => !page.pathName)

  if (!pageData) return notFound()

  await db.update(veFunnelPages)
    .set({ visits: sql`${veFunnelPages.visits} + 1` })
    .where(eq(veFunnelPages.id, pageData.id))

  return (
    <EditorProvider
      subaccountId={domainData.subAccountId}
      pageDetails={pageData}
      funnelId={domainData.id}
    >
      <FunnelEditor
        funnelPageId={pageData.id}
        liveMode={true}
      />
    </EditorProvider>
  )
}

export default Page
