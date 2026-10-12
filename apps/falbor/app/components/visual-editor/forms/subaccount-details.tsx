'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { v4 } from 'uuid'

import { Button } from '~/components/visual-editor/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '~/components/visual-editor/ui/form'
import { useRouter } from 'next/navigation'

import { Input } from '~/components/visual-editor/ui/input'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '~/components/visual-editor/ui/card'

import FileUpload from '../global/file-upload'
import { Agency, SubAccount } from '~/lib/db/schema'
import { useToast } from '../ui/use-toast'
import { saveActivityLogsNotification, upsertSubAccount } from '~/lib/visual-editor/queries'
import { useEffect } from 'react'
import Loading from '../global/loading'
import { useModal } from '~/providers/visual-editor/modal-provider'

const formSchema = z.object({
  name: z.string().min(1, 'Account name is required'),
  companyEmail: z.string().email('Please enter a valid email'),
  companyPhone: z.string().min(1, 'Phone number is required'),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  subAccountLogo: z.string().optional(), 
  zipCode: z.string().min(1, 'Zip code is required'),
  state: z.string().min(1, 'State is required'),
  country: z.string().min(1, 'Country is required'),
})

interface SubAccountDetailsProps {
  agencyDetails: Agency
  details?: Partial<SubAccount>
  userId: string
  userName: string
}

const SubAccountDetails: React.FC<SubAccountDetailsProps> = ({
  details,
  agencyDetails,
  userId,
  userName,
}) => {
  const { toast } = useToast()
  const { setClose } = useModal()
  const router = useRouter()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: details?.name || '',
      companyEmail: details?.companyEmail || '',
      companyPhone: details?.companyPhone || '',
      address: details?.address || '',
      city: details?.city || '',
      zipCode: details?.zipCode || '',
      state: details?.state || '',
      country: details?.country || '',
      subAccountLogo: details?.subAccountLogo || '',
    },
  })

  async function onSubmit(submittedValues: z.infer<typeof formSchema>) {
    const values = form.getValues()
    console.log('🟡 CLIENT SIDE FORM VALUES:', values)
    console.log('🟡 SUBMITTED VALUES:', submittedValues)
    try {
      
      const logoValue = values.subAccountLogo || ''
      const safeLogo = logoValue.startsWith('data:') ? '' : logoValue

      const payload = {
        id: details?.id ? details.id : v4(),
        address: values.address,
        subAccountLogo: safeLogo,
        city: values.city,
        companyPhone: values.companyPhone,
        country: values.country,
        name: values.name,
        state: values.state,
        zipCode: values.zipCode,
        companyEmail: values.companyEmail,
        agencyId: agencyDetails.id,
        connectAccountId: '',
        goal: 5000,
        paypalClientId: details?.paypalClientId || '',
      };
      
      const response = await upsertSubAccount(JSON.parse(JSON.stringify(payload)))

      if (!response) throw new Error('No response from server')

      await saveActivityLogsNotification({
        agencyId: response.agencyId,
        description: `${userName} | updated sub account | ${response.name}`,
        subaccountId: response.id,
      })

      toast({
        title: 'Subaccount details saved',
        description: 'Successfully saved your subaccount details.',
      })

      setClose()
      router.refresh()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not save sub account details.',
      })
    }
  }

  useEffect(() => {
    if (details) {
      form.reset({
        ...details,
        subAccountLogo: details.subAccountLogo || '',
      })
    }
  }, [details, form])

  const isLoading = form.formState.isSubmitting

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Sub Account Information</CardTitle>
        <CardDescription>Please enter business details</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {}
            <FormField
              disabled={isLoading}
              control={form.control}
              name="subAccountLogo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Logo (Optional)</FormLabel>
                  <FormControl>
                    <FileUpload
                      apiEndpoint="subaccountLogo"
                      value={field.value || ''}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex md:flex-row gap-4">
              <FormField
                disabled={isLoading}
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Account Name</FormLabel>
                    <FormControl>
                      <Input required placeholder="Your sub account name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                disabled={isLoading}
                control={form.control}
                name="companyEmail"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Account Email</FormLabel>
                    <FormControl>
                      <Input placeholder="Email" type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              disabled={isLoading}
              control={form.control}
              name="companyPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Phone Number</FormLabel>
                  <FormControl>
                    <Input required placeholder="Phone" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              disabled={isLoading}
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input required placeholder="123 Street..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid md:grid-cols-3 gap-4">
              <FormField
                disabled={isLoading}
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input required placeholder="City" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                disabled={isLoading}
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <FormControl>
                      <Input required placeholder="State" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                disabled={isLoading}
                control={form.control}
                name="zipCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Zip Code</FormLabel>
                    <FormControl>
                      <Input required placeholder="Zipcode" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              disabled={isLoading}
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country</FormLabel>
                  <FormControl>
                    <Input required placeholder="Country" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? <Loading /> : 'Save Account Information'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

export default SubAccountDetails