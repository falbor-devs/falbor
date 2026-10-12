'use client'
import React from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '~/components/visual-editor/ui/card'
import { Badge } from '~/components/visual-editor/ui/badge'
import { Button } from '~/components/visual-editor/ui/button'
import { Plus, Settings2, Trash } from 'lucide-react'
import { useModal } from '~/providers/visual-editor/modal-provider'
import CustomModal from '~/components/visual-editor/global/custom-modal'
import TriggerForm from '~/components/visual-editor/forms/trigger-form'
import ActionForm from '~/components/visual-editor/forms/action-form'
import { Automation, Trigger, Action } from '~/lib/db/schema'

type Props = {
  automation: Automation & {
    Trigger: Trigger | null
    Action: Action[]
  }
  subaccountId: string
}

const AutomationBuilder = ({ automation, subaccountId }: Props) => {
  const { setOpen } = useModal()

  const onEditTrigger = () => {
    setOpen(
      <CustomModal
        title="Configure Trigger"
        subheading="Specify what event should start this automation."
      >
        <TriggerForm
          subAccountId={subaccountId}
          automationId={automation.id}
          defaultData={automation.Trigger}
        />
      </CustomModal>
    )
  }

  const onAddAction = () => {
    setOpen(
      <CustomModal
        title="Add Action"
        subheading="Specify what should happen when the trigger is fired."
      >
        <ActionForm
          automationId={automation.id}
          order={automation.Action.length}
        />
      </CustomModal>
    )
  }

  const onEditAction = (action: Action) => {
    setOpen(
      <CustomModal
        title="Edit Action"
        subheading="Update the configuration for this action."
      >
        <ActionForm
          automationId={automation.id}
          order={action.order}
          defaultData={action}
        />
      </CustomModal>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      {}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold">1</div>
          <h2 className="text-2xl font-semibold">Trigger</h2>
        </div>
        <Card
          className="border-dashed border-2 hover:border-primary transition-all cursor-pointer group relative"
          onClick={onEditTrigger}
        >
          <CardContent className="pt-6">
            {automation.Trigger ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Badge className="bg-primary/10 text-primary hover:bg-primary/20">{automation.Trigger.type}</Badge>
                  <div>
                    <p className="font-medium text-lg">{automation.Trigger.name}</p>
                    <p className="text-sm text-muted-foreground">Runs when a contact form is submitted.</p>
                  </div>
                </div>
                <Settings2 className="text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-4 text-muted-foreground gap-2">
                <Plus size={40} className="opacity-20" />
                <p>Click to configure a trigger</p>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {}
      <div className="flex justify-center -my-8">
        <div className="w-1 h-12 bg-border relative">
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-border rotate-45" />
        </div>
      </div>

      {}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold">2</div>
          <h2 className="text-2xl font-semibold">Actions</h2>
        </div>

        <div className="flex flex-col gap-4">
          {automation.Action.sort((a, b) => a.order - b.order).map((action, index) => (
            <React.Fragment key={action.id}>
              <Card
                className="hover:border-primary transition-all cursor-pointer group"
                onClick={() => onEditAction(action)}
              >
                <CardContent className="pt-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Badge variant="outline">{action.type}</Badge>
                    <div>
                      <p className="font-medium">{action.name}</p>
                      <p className="text-sm text-muted-foreground">Creates or updates a contact in the database.</p>
                    </div>
                  </div>
                  <Settings2 className="text-muted-foreground group-hover:text-primary transition-colors" />
                </CardContent>
              </Card>
              {index < automation.Action.length - 1 && (
                <div className="flex justify-center -my-4">
                  <div className="w-1 h-8 bg-border relative">
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-border rotate-45" />
                  </div>
                </div>
              )}
            </React.Fragment>
          ))}

          <Button
            variant="outline"
            className="border-dashed border-2 py-8 flex flex-col gap-2 h-auto"
            onClick={onAddAction}
          >
            <Plus size={24} />
            Add Action
          </Button>
        </div>
      </section>
    </div>
  )
}

export default AutomationBuilder
