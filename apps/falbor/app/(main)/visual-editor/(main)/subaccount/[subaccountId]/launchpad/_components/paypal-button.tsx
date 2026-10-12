'use client'
import CustomModal from '~/components/visual-editor/global/custom-modal'
import PayPalConfigForm from '~/components/visual-editor/forms/paypal-config-form'
import { Button } from '~/components/visual-editor/ui/button'
import { useModal } from '~/providers/visual-editor/modal-provider'
import { CheckCircleIcon } from 'lucide-react'
import Image from 'next/image'
import React from 'react'

type Props = {
  subaccountId: string
  connected: boolean
}

const PayPalButton = ({ subaccountId, connected }: Props) => {
  const { setOpen } = useModal()

  return (
    <div className="flex justify-between items-center w-full h-20 border p-4 rounded-lg">
      <div className="flex items-center gap-4">
        <Image
          src="/paypal.png"
          alt="PayPal logo"
          height={80}
          width={80}
          className="rounded-md object-contain"
        />
        <p>
          Connect your PayPal account to accept payments.
        </p>
      </div>
      {connected ? (
        <CheckCircleIcon
          size={50}
          className="text-primary p-2 flex-shrink-0"
        />
      ) : (
        <Button
          className="bg-primary py-2 px-4 rounded-md text-white"
          onClick={() => {
            setOpen(
              <CustomModal
                title="Connect PayPal"
                subheading="Enter your PayPal Client ID from the PayPal Developer Portal"
              >
                <PayPalConfigForm subaccountId={subaccountId} />
              </CustomModal>
            )
          }}
        >
          Start
        </Button>
      )}
    </div>
  )
}

export default PayPalButton
