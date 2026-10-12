'use client'
import React, { useEffect } from 'react'
import { z } from 'zod'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '~/components/visual-editor/ui/form'
import { Card, CardHeader, CardTitle, CardContent } from '~/components/visual-editor/ui/card'
import { useForm } from 'react-hook-form'
import { Funnel } from '~/lib/db/schema'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { Button } from '../ui/button'
import Loading from '../global/loading'
import { CreateFunnelFormSchema } from '~/lib/visual-editor/types'
import { saveActivityLogsNotification, upsertFunnel } from '~/lib/visual-editor/queries'
import { v4 } from 'uuid'
import { toast } from '../ui/use-toast'
import { useModal } from '~/providers/visual-editor/modal-provider'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import FileUpload from '../global/file-upload'

interface CreateFunnelProps {
  defaultData?: Funnel
  subAccountId: string
}

const FunnelForm: React.FC<CreateFunnelProps> = ({
  defaultData,
  subAccountId,
}) => {
  const { setClose } = useModal()
  const router = useRouter()

  const form = useForm<z.infer<typeof CreateFunnelFormSchema>>({
    mode: 'onChange',
    resolver: zodResolver(CreateFunnelFormSchema),
    defaultValues: {
      name: defaultData?.name || '',
      description: defaultData?.description || '',
      favicon: defaultData?.favicon || '',
      subDomainName: defaultData?.subDomainName || '',
    },
  })

  useEffect(() => {
    if (defaultData) {
      form.reset({
        name: defaultData.name || '',
        description: defaultData.description || '',
        favicon: defaultData.favicon || '',
        subDomainName: defaultData.subDomainName || '',
      })
    }
  }, [defaultData, form])

  const isLoading = form.formState.isSubmitting

  const onSubmit = async (values: z.infer<typeof CreateFunnelFormSchema>) => {
    if (!subAccountId) return

    const response = await upsertFunnel(
      subAccountId,
      {
        ...values,
        liveProducts: defaultData?.liveProducts || '[]'
      },
      defaultData?.id || v4()
    )

    await saveActivityLogsNotification({
      agencyId: undefined,
      description: `Update funnel | ${response.name}`,
      subaccountId: subAccountId,
    })

    if (response) {
      toast({
        title: 'Success',
        description: 'Saved funnel details',
      })
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not save funnel details',
      })
    }

    setClose()
    router.refresh()
  }

  return (
    <Card className="flex-1">
      <CardHeader>
        <CardTitle>Funnel Details</CardTitle>
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
                  <FormLabel>Funnel Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              disabled={isLoading}
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Funnel Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Tell us a little bit more about this funnel."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              disabled={isLoading}
              control={form.control}
              name="subDomainName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sub Domain</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="your-subdomain"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {}
            <FormField
              disabled={isLoading}
              control={form.control}
              name="favicon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Favicon / Icon (Optional)</FormLabel>
                  <FormControl>
                    <FileUpload
                      apiEndpoint="subaccountLogo"
                      value={field.value || ''}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormDescription>
                    Upload a favicon or icon for your funnel (recommended size: 512x512)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              className="w-full mt-4"
              disabled={isLoading}
              type="submit"
            >
              {isLoading ? <Loading /> : 'Save Funnel'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

export default FunnelForm