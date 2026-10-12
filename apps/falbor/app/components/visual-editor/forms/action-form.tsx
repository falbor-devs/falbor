'use client'
import React from 'react'
import { z } from 'zod'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '~/components/visual-editor/ui/form'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '~/components/visual-editor/ui/input'
import { Button } from '~/components/visual-editor/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/visual-editor/ui/select'
import { ActionType } from '~/lib/db/schema'
import { upsertAction } from '~/lib/visual-editor/queries'
import { toast } from '~/components/visual-editor/ui/use-toast'
import { useRouter } from 'next/navigation'
import { v4 } from 'uuid'
import Loading from '~/components/visual-editor/global/loading'

interface ActionFormProps {
  automationId: string
  order: number
  defaultData?: any
}

const FormSchema = z.object({
  name: z.string().min(1),
  type: z.nativeEnum(ActionType),
})

const ActionForm: React.FC<ActionFormProps> = ({
  automationId,
  order,
  defaultData,
}) => {
  const router = useRouter()
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: defaultData?.name || '',
      type: defaultData?.type || ActionType.CREATE_CONTACT,
    },
  })

  const isLoading = form.formState.isSubmitting

  const onSubmit = async (values: z.infer<typeof FormSchema>) => {
    try {
      await upsertAction({
        ...values,
        id: defaultData?.id || v4(),
        automationId,
        order,
      })
      toast({
        title: 'Success',
        description: 'Action saved successfully',
      })
      router.refresh()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Oppse!',
        description: 'Could not save action',
      })
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Action Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Create a new contact" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Action Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an action type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={ActionType.CREATE_CONTACT}>
                    Create Contact
                  </SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isLoading}>
          {isLoading ? <Loading /> : 'Save Action'}
        </Button>
      </form>
    </Form>
  )
}

export default ActionForm
