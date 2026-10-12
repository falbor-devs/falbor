import { db } from '~/lib/visual-editor/db'
import EditorProvider from '~/providers/visual-editor/editor/editor-provider'
import { redirect } from 'next/navigation'
import React from 'react'
import FunnelEditorNavigation from './_components/funnel-editor-navigation'
import FunnelEditorSidebar from './_components/funnel-editor-sidebar'
import FunnelEditor from './_components/funnel-editor'

type Props = {
  params: {
    subaccountId: string
    funnelId: string
    funnelPageId: string
  }
}

const Page = async ({ params }: Props) => {
  
  if (params.funnelPageId === 'undefined' || !params.funnelPageId) {
    redirect(`/visual-editor/subaccount/${params.subaccountId}/funnels/${params.funnelId}`)
  }

  let funnelPageDetails = null;
  try {
    funnelPageDetails = await db.query.veFunnelPages.findFirst({
      where: (table, { eq }) => eq(table.id, params.funnelPageId),
    })
  } catch (err) {
    
  }
  if (!funnelPageDetails) {
    return redirect(
      `/visual-editor/subaccount/${params.subaccountId}/funnels/${params.funnelId}`
    )
  }

  return (
    <div className="fixed top-0 bottom-0 left-0 right-0 z-[20] bg-background overflow-hidden">
      <EditorProvider
        subaccountId={params.subaccountId}
        funnelId={params.funnelId}
        pageDetails={funnelPageDetails}
      >
        <FunnelEditorNavigation
          funnelId={params.funnelId}
          funnelPageDetails={funnelPageDetails}
          subaccountId={params.subaccountId}
        />
        <div className="h-full flex justify-center">
          <FunnelEditor funnelPageId={params.funnelPageId} />
        </div>

        <FunnelEditorSidebar subaccountId={params.subaccountId} />
      </EditorProvider>
    </div>
  )
}

export default Page
