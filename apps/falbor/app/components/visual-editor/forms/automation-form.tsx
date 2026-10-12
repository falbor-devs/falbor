'use client'
import React, { useEffect } from 'react'
import { z } from 'zod'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '~/components/visual-editor/ui/form'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '~/components/visual-editor/ui/card'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '~/components/visual-editor/ui/input'
import { Button } from '~/components/visual-editor/ui/button'
import Loading from '~/components/visual-editor/global/loading'
import { toast } from '~/components/visual-editor/ui/use-toast'
import { upsertAutomation } from '~/lib/visual-editor/queries'
import { useRouter } from 'next/navigation'
import { v4 } from 'uuid'
import { Automation } from '~/lib/db/schema'

interface AutomationFormProps {
  subAccountId: string
  defaultData?: Automation
}

const FormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
})

const AutomationForm: React.FC<AutomationFormProps> = ({
  subAccountId,
  defaultData,
}) => {
  const router = useRouter()
  const form = useForm<z.infer<typeof FormSchema>>({
    mode: 'onChange',
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: defaultData?.name || '',
    },
  })

  useEffect(() => {
    if (defaultData) {
      form.reset(defaultData)
    }
  }, [defaultData])

  const isLoading = form.formState.isSubmitting

  const onSubmit = async (values: z.infer<typeof FormSchema>) => {
    try {
      const response = await upsertAutomation({
        ...values,
        id: defaultData?.id || v4(),
        subAccountId: subAccountId,
        published: false,
      })
      toast({
        title: 'Success',
        description: 'Automation saved successfully',
      })
      router.refresh()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Oppse!',
        description: 'Could not save automation',
      })
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Automation Details</CardTitle>
        <CardDescription>
          Create or update your automation. Automations allow you to automate tasks based on triggers.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <FormField
              disabled={isLoading}
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Automation Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Welcome Email Sequence"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? <Loading /> : 'Save Automation'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

export default AutomationForm
