'use client'
import React, { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/visual-editor/ui/table'
import Stripe from 'stripe'
import Image from 'next/image'
import {
  saveActivityLogsNotification,
  updateFunnelProducts,
} from '~/lib/visual-editor/queries'
import { Funnel } from '~/lib/db/schema'
import { useRouter } from 'next/navigation'
import { Input } from '~/components/visual-editor/ui/input'
import { Button } from '~/components/visual-editor/ui/button'
import { FunnelProduct } from '~/lib/db/schema'

interface FunnelProductsTableProps {
  defaultData: Funnel
  products: Stripe.Product[]
  paypalProducts: FunnelProduct[]
}

const FunnelProductsTable: React.FC<FunnelProductsTableProps> = ({
  products,
  defaultData,
  paypalProducts,
}) => {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [liveProducts, setLiveProducts] = useState<
    { productId: string; recurring: boolean }[] | []
  >(JSON.parse(defaultData.liveProducts || '[]'))

  const handleSaveProducts = async () => {
    setIsLoading(true)
    const response = await updateFunnelProducts(
      JSON.stringify(liveProducts),
      defaultData.id
    )
    await saveActivityLogsNotification({
      agencyId: undefined,
      description: `Update funnel products | ${response.name}`,
      subaccountId: defaultData.subAccountId,
    })
    setIsLoading(false)
    router.refresh()
  }

  const handleAddProduct = async (product: Stripe.Product) => {
    const defaultPrice = product.default_price as Stripe.Price | undefined | null
    if (!defaultPrice) return

    const productIdExists = liveProducts.find(
      (prod) => prod.productId === defaultPrice.id
    )
    productIdExists
      ? setLiveProducts(
        liveProducts.filter(
          (prod) => prod.productId !== defaultPrice.id
        )
      )
      : setLiveProducts([
        ...liveProducts,
        {
          productId: defaultPrice.id,
          recurring: !!defaultPrice.recurring,
        },
      ])
  }

  const handleAddPayPalProduct = (product: FunnelProduct) => {
    const productIdExists = liveProducts.find(
      (prod) => prod.productId === product.priceId
    )
    productIdExists
      ? setLiveProducts(
        liveProducts.filter((prod) => prod.productId !== product.priceId)
      )
      : setLiveProducts([
        ...liveProducts,
        {
          productId: product.priceId,
          recurring: false,
        },
      ])
  }

  return (
    <>
      <Table className="bg-card border-[1px] border-border rounded-md">
        <TableHeader className="rounded-md">
          <TableRow>
            <TableHead>Live</TableHead>
            <TableHead>Image</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Interval</TableHead>
            <TableHead className="text-right">Price</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="font-medium truncate">
          {products.map((product) => (
            <TableRow key={product.id}>
              <TableCell>
                <Input
                  defaultChecked={
                    !!liveProducts.find(

                      (prod) =>
                        prod.productId ===
                        (product.default_price as Stripe.Price | null)?.id
                    )
                  }
                  onChange={() => handleAddProduct(product)}
                  type="checkbox"
                  className="w-4 h-4"
                />
              </TableCell>
              <TableCell>
                <Image
                  alt="product Image"
                  height={60}
                  width={60}
                  src={product.images[0]}
                />
              </TableCell>
              <TableCell>{product.name}</TableCell>
              <TableCell>
                {

                  (product.default_price as Stripe.Price | null)?.recurring
                    ? 'Recurring'
                    : 'One Time'
                }
              </TableCell>
              <TableCell className="text-right">
                $
                {

                  ((product.default_price as Stripe.Price | null)?.unit_amount ??
                    0) / 100
                }
              </TableCell>
            </TableRow>
          ))}
          {paypalProducts.map((product) => (
            <TableRow key={product.id}>
              <TableCell>
                <Input
                  defaultChecked={
                    !!liveProducts.find(
                      (prod) => prod.productId === product.priceId
                    )
                  }
                  onChange={() => handleAddPayPalProduct(product)}
                  type="checkbox"
                  className="w-4 h-4"
                />
              </TableCell>
              <TableCell>
                <Image
                  alt="product Image"
                  height={60}
                  width={60}
                  src="/paypal.png"
                />
              </TableCell>
              <TableCell>{product.name}</TableCell>
              <TableCell>One Time</TableCell>
              <TableCell className="text-right">
                PayPal Product
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Button
        disabled={isLoading}
        onClick={handleSaveProducts}
        className="mt-4"
      >
        Save Products
      </Button>
    </>
  )
}

export default FunnelProductsTable
