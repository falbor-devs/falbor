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
import { TriggerTypes } from '~/lib/db/schema'
import { upsertTrigger } from '~/lib/visual-editor/queries'
import { toast } from '~/components/visual-editor/ui/use-toast'
import { useRouter } from 'next/navigation'
import { v4 } from 'uuid'
import Loading from '~/components/visual-editor/global/loading'

interface TriggerFormProps {
  subAccountId: string
  automationId: string
  defaultData?: any
}

const FormSchema = z.object({
  name: z.string().min(1),
  type: z.nativeEnum(TriggerTypes),
})

const TriggerForm: React.FC<TriggerFormProps> = ({
  subAccountId,
  automationId,
  defaultData,
}) => {
  const router = useRouter()
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: defaultData?.name || '',
      type: defaultData?.type || TriggerTypes.CONTACT_FORM,
    },
  })

  const isLoading = form.formState.isSubmitting

  const onSubmit = async (values: z.infer<typeof FormSchema>) => {
    try {
      await upsertTrigger({
        ...values,
        id: defaultData?.id || v4(),
        subAccountId,
        Automations: {
          connect: { id: automationId },
        },
      } as any)
      toast({
        title: 'Success',
        description: 'Trigger saved successfully',
      })
      router.refresh()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Oppse!',
        description: 'Could not save trigger',
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
              <FormLabel>Trigger Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Contact Form Submission" {...field} />
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
              <FormLabel>Trigger Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a trigger type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={TriggerTypes.CONTACT_FORM}>
                    Contact Form Submission
                  </SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isLoading}>
          {isLoading ? <Loading /> : 'Save Trigger'}
        </Button>
      </form>
    </Form>
  )
}

export default TriggerForm
