'use client'
import CreatePipelineForm from '~/components/visual-editor/forms/create-pipeline-form'
import CustomModal from '~/components/visual-editor/global/custom-modal'
import { Button } from '~/components/visual-editor/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '~/components/visual-editor/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '~/components/visual-editor/ui/popover'
import { cn } from '~/lib/visual-editor/utils'
import { useModal } from '~/providers/visual-editor/modal-provider'
import { Pipeline } from '~/lib/db/schema'
import { Check, ChevronsUpDown, Plus } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

type Props = {
  subAccountId: string
  pipelines: Pipeline[]
  pipelineId: string
}

const PipelineInfoBar = ({ pipelineId, pipelines, subAccountId }: Props) => {
  const { setOpen: setOpenModal } = useModal()
  const [open, setOpen] = React.useState(false)
  const [value, setValue] = React.useState(pipelineId)

  const handleCreatePipeline = () => {
    setOpen(false)
    setOpenModal(
      <CustomModal
        title="Create A Pipeline"
        subheading="Pipelines allows you to group tickets into lanes and track your business processes all in one place."
      >
        <CreatePipelineForm subAccountId={subAccountId} />
      </CustomModal>
    )
  }

  return (
    <div>
      <div className="flex items-end gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-[200px] justify-between"
            >
              {value
                ? pipelines.find((p) => p.id === value)?.name
                : 'Select a pipeline...'}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>

          <PopoverContent className="w-[200px] p-0" align="start">
            <Command>
              <CommandList>
                <CommandEmpty>No pipelines found.</CommandEmpty>

                <CommandGroup heading="Your Pipelines">
                  {pipelines.map((pipeline) => (
                    <Link
                      key={pipeline.id}
                      href={`/visual-editor/subaccount/${subAccountId}/pipelines/${pipeline.id}`}
                      onClick={() => setOpen(false)}
                    >
                      <CommandItem
                        value={pipeline.name}
                        onSelect={() => setValue(pipeline.id)}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            value === pipeline.id ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        {pipeline.name}
                      </CommandItem>
                    </Link>
                  ))}
                </CommandGroup>

                <CommandSeparator />

                {}
                <div className="p-2">
                  <Button
                    variant="secondary"
                    className="w-full flex items-center gap-2 justify-start"
                    onClick={handleCreatePipeline}
                  >
                    <Plus size={16} />
                    Create Pipeline
                  </Button>
                </div>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}

export default PipelineInfoBar