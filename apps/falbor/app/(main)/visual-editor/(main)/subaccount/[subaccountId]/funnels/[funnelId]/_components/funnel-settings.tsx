import React from 'react'

import { Funnel, SubAccount } from '~/lib/db/schema'
import { db } from '~/lib/visual-editor/db'
import { getConnectAccountProducts } from '~/lib/visual-editor/stripe/stripe-actions'


import FunnelForm from '~/components/visual-editor/forms/funnel-form'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/visual-editor/ui/card'
import FunnelProductsTable from './funnel-products-table'
import CreateFunnelProductButton from './create-funnel-product-button'

interface FunnelSettingsProps {
  subaccountId: string
  defaultData: Funnel
}

const FunnelSettings: React.FC<FunnelSettingsProps> = async ({
  subaccountId,
  defaultData,
}) => {
  

  const subaccountDetails = await db.query.veSubAccounts.findFirst({
    where: (table, { eq }) => eq(table.id, subaccountId),
  })

  if (!subaccountDetails) return

  const products = subaccountDetails.connectAccountId
    ? await getConnectAccountProducts(subaccountDetails.connectAccountId)
    : []

  const funnelProducts = await db.query.veFunnelsProduct.findMany({
    where: (table, { eq }) => eq(table.subAccountId, subaccountId),
  })

  return (
    <div className="flex gap-4 flex-col xl:!flex-row">
      <Card className="flex-1 flex-shrink">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Funnel Products</CardTitle>
            <CardDescription>
              Select the products and services you wish to sell on this funnel.
              You can sell one time and recurring products too.
            </CardDescription>
          </div>
          <CreateFunnelProductButton subaccountId={subaccountId} />
        </CardHeader>
        <CardContent>
          <FunnelProductsTable
            defaultData={defaultData}
            products={products}
            paypalProducts={funnelProducts}
          />
        </CardContent>
      </Card>

      <FunnelForm
        subAccountId={subaccountId}
        defaultData={defaultData}
      />
    </div>
  )
}

export default FunnelSettings
