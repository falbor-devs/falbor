import { db } from '~/lib/visual-editor/db'
import BlurPage from '~/components/visual-editor/global/blur-page'
import React from 'react'
import { redirect } from 'next/navigation'
import { Badge } from '~/components/visual-editor/ui/badge'
import AutomationBuilder from './_components/automation-builder'

const AutomationEditorPage = async ({
  params,
}: {
  params: { subaccountId: string; automationId: string }
}) => {
  const automation = await db.query.veAutomations.findFirst({
    where: (table, { eq }) => eq(table.id, params.automationId),
    with: {
      Trigger: true,
      Action: true,
    },
  })

  if (!automation) return redirect(`/visual-editor/subaccount/${params.subaccountId}/automations`)

  return (
    <BlurPage>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between mb-8">
          <div className="flex flex-col gap-1">
            <h1 className="text-4xl font-bold">{automation.name}</h1>
            <p className="text-muted-foreground">
              Design and automate your workflows.
            </p>
          </div>
          <Badge variant={automation.published ? 'default' : 'secondary'} className="text-sm px-4 py-1">
            {automation.published ? 'Published' : 'Draft'}
          </Badge>
        </div>

        <div className="max-w-3xl mx-auto w-full">
          <AutomationBuilder
            automation={automation}
            subaccountId={params.subaccountId}
          />
        </div>
      </div>
    </BlurPage>
  )
}

export default AutomationEditorPage
