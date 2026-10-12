'use client'
import SubscriptionFormWrapper from '~/components/visual-editor/forms/subscription-form/subscription-form-wrapper'
import CustomModal from '~/components/visual-editor/global/custom-modal'
import { PricesList } from '~/lib/visual-editor/types'
import { useModal } from '~/providers/visual-editor/modal-provider'
import { useSearchParams } from 'next/navigation'
import React, { useEffect } from 'react'

type Props = {
  prices: PricesList['data']
  customerId: string
  planExists: boolean
  email: string
  agencyId: string
}

const SubscriptionHelper = ({
  customerId,
  planExists,
  prices,
  email,
  agencyId,
}: Props) => {
  const { setOpen } = useModal()
  const searchParams = useSearchParams()
  const plan = searchParams.get('plan')

  useEffect(() => {
    if (plan)
      setOpen(
        <CustomModal
          title="Upgrade Plan!"
          subheading="Get started today to get access to premium features"
        >
          <SubscriptionFormWrapper
            planExists={planExists}
            customerId={customerId}
            email={email}
            agencyId={agencyId}
          />
        </CustomModal>,
        async () => ({
          plans: {
            defaultPriceId: plan ? plan : '',
            plans: prices,
          },
        })
      )
  }, [plan])

  return <div>SubscriptionHelper</div>
}

export default SubscriptionHelper
