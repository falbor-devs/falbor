import React from 'react'
import { stripe } from '~/lib/visual-editor/stripe'
import { addOnProducts, pricingCards } from '~/lib/visual-editor/constants'
import { db } from '~/lib/visual-editor/db'
import { Separator } from '~/components/visual-editor/ui/separator'
import PricingCard from './_components/pricing-card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/visual-editor/ui/table'
import clsx from 'clsx'
import SubscriptionHelper from './_components/subscription-helper'

type Props = {
  params: { agencyId: string }
}

const page = async ({ params }: Props) => {
  
  let addOns: any = { data: [] }
  try {
    addOns = await stripe.products.list({
      ids: addOnProducts.map((product) => product.id),
      expand: ['data.default_price'],
    })
  } catch (error) {
    console.log('🔴 Error fetching add-ons', error)
  }

  const agencySubscription = await db.query.veAgencies.findFirst({
    where: (table, { eq }) => eq(table.id, params.agencyId),
    columns: {
      customerId: true,
      companyEmail: true,
    },
  })

  let prices: any = { data: [] }
  try {
    if (process.env.NEXT_PLURA_PRODUCT_ID) {
      prices = await stripe.prices.list({
        product: process.env.NEXT_PLURA_PRODUCT_ID,
        active: true,
      })
    }
  } catch (error) {
    console.log('🔴 Error fetching prices', error)
  }

  const currentPlanDetails = pricingCards.find(
    (c) => c.priceId === (agencySubscription as any)?.Subscription?.priceId
  )

  let allCharges: any[] = []
  try {
    if (agencySubscription?.customerId && agencySubscription.customerId !== '') {
      const charges = await stripe.charges.list({
        limit: 50,
        customer: agencySubscription?.customerId,
      })
      allCharges = charges.data.map((charge) => ({
        description: charge.description,
        id: charge.id,
        date: `${new Date(charge.created * 1000).toLocaleTimeString()} ${new Date(
          charge.created * 1000
        ).toLocaleDateString()}`,
        status: 'Paid',
        amount: `$${charge.amount / 100}`,
      }))
    }
  } catch (error) {
    console.log('🔴 Error fetching charges', error)
  }

  return (
    <>
      <SubscriptionHelper
        prices={prices.data}
        customerId={agencySubscription?.customerId || ''}
        planExists={(agencySubscription as any)?.Subscription?.active === true}
        email={agencySubscription?.companyEmail || ''}
        agencyId={params.agencyId}
      />
      <h1 className="text-4xl p-4">Billing</h1>
      <Separator className=" mb-6" />
      <h2 className="text-2xl p-4">Current Plan</h2>
      <div className="flex flex-col lg:!flex-row justify-between gap-8">
        <PricingCard
          planExists={(agencySubscription as any)?.Subscription?.active === true}
          prices={prices.data}
          customerId={agencySubscription?.customerId || ''}
          email={agencySubscription?.companyEmail || ''}
          agencyId={params.agencyId}
          amt={
            (agencySubscription as any)?.Subscription?.active === true
              ? currentPlanDetails?.price || '$0'
              : '$0'
          }
          buttonCta={
            (agencySubscription as any)?.Subscription?.active === true
              ? 'Change Plan'
              : 'Get Started'
          }
          highlightDescription="Want to modify your plan? You can do this here. If you have
          further question contact support@plura-app.com"
          highlightTitle="Plan Options"
          description={
            (agencySubscription as any)?.Subscription?.active === true
              ? currentPlanDetails?.description || 'Lets get started'
              : 'Lets get started! Pick a plan that works best for you.'
          }
          duration="/ month"
          features={
            (agencySubscription as any)?.Subscription?.active === true
              ? currentPlanDetails?.features || []
              : currentPlanDetails?.features ||
              pricingCards.find((pricing) => pricing.title === 'Starter')
                ?.features ||
              []
          }
          title={
            (agencySubscription as any)?.Subscription?.active === true
              ? currentPlanDetails?.title || 'Starter'
              : 'Starter'
          }
        />
        {addOns.data.map((addOn: any) => (
          <PricingCard
            planExists={(agencySubscription as any)?.Subscription?.active === true}
            prices={prices.data}
            customerId={agencySubscription?.customerId || ''}
            email={agencySubscription?.companyEmail || ''}
            agencyId={params.agencyId}
            key={addOn.id}
            amt={
              
              addOn.default_price?.unit_amount
                ? 
                `$${addOn.default_price.unit_amount / 100}`
                : '$0'
            }
            buttonCta="Subscribe"
            description="Dedicated support line & teams channel for support"
            duration="/ month"
            features={[]}
            title={'24/7 priority support'}
            highlightTitle="Get support now!"
            highlightDescription="Get priority support and skip the long long with the click of a button."
          />
        ))}
      </div>
      <h2 className="text-2xl p-4">Payment History</h2>
      <Table className="bg-card border-[1px] border-border rounded-md">
        <TableHeader className="rounded-md">
          <TableRow>
            <TableHead className="w-[200px]">Description</TableHead>
            <TableHead className="w-[200px]">Invoice Id</TableHead>
            <TableHead className="w-[300px]">Date</TableHead>
            <TableHead className="w-[200px]">Paid</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="font-medium truncate">
          {allCharges.map((charge) => (
            <TableRow key={charge.id}>
              <TableCell>{charge.description}</TableCell>
              <TableCell className="text-muted-foreground">
                {charge.id}
              </TableCell>
              <TableCell>{charge.date}</TableCell>
              <TableCell>
                <p
                  className={clsx('', {
                    'text-emerald-500': charge.status.toLowerCase() === 'paid',
                    'text-orange-600':
                      charge.status.toLowerCase() === 'pending',
                    'text-red-600': charge.status.toLowerCase() === 'failed',
                  })}
                >
                  {charge.status.toUpperCase()}
                </p>
              </TableCell>
              <TableCell className="text-right">{charge.amount}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  )
}

export default page
