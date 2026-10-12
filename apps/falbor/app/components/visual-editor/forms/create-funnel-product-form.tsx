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
import { upsertFunnelProduct } from '~/lib/visual-editor/queries'
import { useRouter } from 'next/navigation'
import { v4 } from 'uuid'

interface CreateFunnelProductFormProps {
  subaccountId: string
  defaultData?: {
    name: string
    priceId: string
  }
}

const FormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  price: z.string().min(1, 'Price is required'),
  priceId: z.string().min(1, 'Price ID (e.g. price_123 or a unique ID) is required'),
})

const CreateFunnelProductForm: React.FC<CreateFunnelProductFormProps> = ({
  subaccountId,
  defaultData,
}) => {
  const router = useRouter()
  const form = useForm<z.infer<typeof FormSchema>>({
    mode: 'onChange',
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: defaultData?.name || '',
      price: '',
      priceId: defaultData?.priceId || '',
    },
  })

  useEffect(() => {
    if (defaultData) {
      form.reset(defaultData)
    }
  }, [defaultData])

  const isLoading = form.formState.isSubmitting

  const handleSubmit = async (values: z.infer<typeof FormSchema>) => {
    try {
      await upsertFunnelProduct({
        ...values,
        subAccountId: subaccountId,
        id: v4(),
      })
      toast({
        title: 'Success',
        description: 'Product saved successfully',
      })
      router.refresh()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Oppse!',
        description: 'Could not save product',
      })
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Create Product</CardTitle>
        <CardDescription>
          Create a product to sell using PayPal.
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
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Pro Plan"
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
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price (USD)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. 29.99"
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
              name="priceId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price ID / PayPal Plan ID</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter a unique ID for this price"
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
              {isLoading ? <Loading /> : 'Save Product'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

export default CreateFunnelProductForm
