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
import { savePayPalConfig } from '~/lib/visual-editor/queries'
import { useRouter } from 'next/navigation'

interface PayPalConfigFormProps {
  subaccountId: string
  defaultValues?: {
    paypalClientId?: string
  }
}

const FormSchema = z.object({
  paypalClientId: z.string().min(1, 'PayPal Client ID is required'),
})

const PayPalConfigForm: React.FC<PayPalConfigFormProps> = ({
  subaccountId,
  defaultValues,
}) => {
  const router = useRouter()
  const form = useForm<z.infer<typeof FormSchema>>({
    mode: 'onChange',
    resolver: zodResolver(FormSchema),
    defaultValues: {
      paypalClientId: defaultValues?.paypalClientId || '',
    },
  })

  useEffect(() => {
    if (defaultValues) {
      form.reset(defaultValues)
    }
  }, [defaultValues])

  const isLoading = form.formState.isSubmitting

  const handleSubmit = async (values: z.infer<typeof FormSchema>) => {
    try {
      await savePayPalConfig(subaccountId, values.paypalClientId)
      toast({
        title: 'Success',
        description: 'PayPal configuration saved successfully',
      })
      router.refresh()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Oppse!',
        description: 'Could not save PayPal configuration',
      })
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>PayPal Configuration</CardTitle>
        <CardDescription>
          Enter your PayPal Client ID to enable PayPal payments in your funnels.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex flex-col gap-4"
          >
            <FormField
              disabled={isLoading}
              control={form.control}
              name="paypalClientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>PayPal Client ID</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter your PayPal Client ID"
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
              {isLoading ? <Loading /> : 'Save Configuration'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

export default PayPalConfigForm
