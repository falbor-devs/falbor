import { db } from '~/lib/visual-editor/db'
import { stripe } from '~/lib/visual-editor/stripe'
import { NextResponse } from 'next/server'
import { veAgencies } from '~/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function POST(req: Request) {
  const { customerId, priceId, email, agencyId } = await req.json()
  if (!priceId)
    return new NextResponse('Price id is missing', {
      status: 400,
    })

  let activeCustomerId = customerId

  // If customer ID is missing, create a new one in Stripe and update DB
  if (!activeCustomerId || activeCustomerId === '') {
    if (!email || !agencyId) {
       return new NextResponse('Customer Id or Email/AgencyId is missing', {
        status: 400,
      })
    }
    const customer = await stripe.customers.create({
      email,
    })
    activeCustomerId = customer.id
    await db.update(veAgencies)
      .set({ customerId: activeCustomerId })
      .where(eq(veAgencies.id, agencyId))
  }

  const subscriptionExists = await db.query.veAgencies.findFirst({
    where: (table, { eq }) => eq(table.customerId, activeCustomerId),
  }) as any

  try {
    if (
      subscriptionExists?.Subscription?.subscritiptionId &&
      subscriptionExists.Subscription.active
    ) {
      //update the subscription instead of creating one.
      if (!subscriptionExists.Subscription.subscritiptionId) {
        throw new Error(
          'Could not find the subscription Id to update the subscription.'
        )
      }
      console.log('Updating the subscription')
      const currentSubscriptionDetails = await stripe.subscriptions.retrieve(
        subscriptionExists.Subscription.subscritiptionId
      )

      const subscription = await stripe.subscriptions.update(
        subscriptionExists.Subscription.subscritiptionId,
        {
          items: [
            {
              id: currentSubscriptionDetails.items.data[0].id,
              deleted: true,
            },
            { price: priceId },
          ],
          expand: ['latest_invoice.payment_intent'],
        }
      )
      return NextResponse.json({
        subscriptionId: subscription.id,
        //@ts-ignore
        clientSecret: subscription.latest_invoice.payment_intent.client_secret,
      })
    } else {
      console.log('Createing a sub')
      const subscription = await stripe.subscriptions.create({
        customer: activeCustomerId,
        items: [
          {
            price: priceId,
          },
        ],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
      })
      return NextResponse.json({
        subscriptionId: subscription.id,
        //@ts-ignore
        clientSecret: subscription.latest_invoice.payment_intent.client_secret,
      })
    }
  } catch (error) {
    console.log('🔴 Error', error)
    return new NextResponse('Internal Server Error', {
      status: 500,
    })
  }
}
