import { getAutomations } from '~/lib/visual-editor/queries'
import React from 'react'
import FunnelsDataTable from '../funnels/data-table' 
import { Plus } from 'lucide-react'
import { columns } from './columns'
import AutomationForm from '~/components/visual-editor/forms/automation-form'
import BlurPage from '~/components/visual-editor/global/blur-page'

const AutomationsPage = async ({ params }: { params: { subaccountId: string } }) => {
  const automations = await getAutomations(params.subaccountId)
  if (!automations) return null

  return (
    <BlurPage>
      <div className="flex flex-col gap-4">
        <h1 className="text-4xl font-bold">Automations</h1>
        <p className="text-muted-foreground">
          Automate your marketing and workflows with triggers and actions.
        </p>
        <FunnelsDataTable
          actionButtonText={
            <>
              <Plus size={15} />
              Create Automation
            </>
          }
          modalChildren={
            <AutomationForm subAccountId={params.subaccountId}></AutomationForm>
          }
          filterValue="name"
          columns={columns}
          data={automations}
        />
      </div>
    </BlurPage>
  )
}

export default AutomationsPage
