'use server'
import Stripe from 'stripe'
import { db } from '../db'
import { stripe } from '.'

export const subscriptionCreated = async (
  subscription: Stripe.Subscription,
  customerId: string
) => {
  try {
    const agency = await db.query.veAgencies.findFirst({
      where: (table, { eq }) => eq(table.customerId, customerId),
      with: {
        SubAccount: true,
      },
    })
    if (!agency) {
      throw new Error('Could not find and agency to upsert the subscription')
    }

    const data = {
      active: subscription.status === 'active',
      agencyId: agency.id,
      customerId,
      //@ts-ignore
      currentPeriodEndDate: new Date(subscription.current_period_end * 1000),
      //@ts-ignore
      priceId: subscription.plan.id,
      subscritiptionId: subscription.id,
      //@ts-ignore
      plan: subscription.plan.id,
    }
    const res = data
    console.log(`Created Subscription for ${subscription.id}`)
  } catch (error) {
    console.log('Error from Create action', error)
  }
}

export const getConnectAccountProducts = async (stripeAccount: string) => {
  const products = await stripe.products.list(
    {
      limit: 50,
      expand: ['data.default_price'],
    },
    {
      stripeAccount,
    }
  )
  return products.data
}