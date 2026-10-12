'use client'
import CustomModal from '~/components/visual-editor/global/custom-modal'
import CreateFunnelProductForm from '~/components/visual-editor/forms/create-funnel-product-form'
import { Button } from '~/components/visual-editor/ui/button'
import { useModal } from '~/providers/visual-editor/modal-provider'
import { Plus } from 'lucide-react'
import React from 'react'

type Props = {
  subaccountId: string
}

const CreateFunnelProductButton = ({ subaccountId }: Props) => {
  const { setOpen } = useModal()

  return (
    <Button
      onClick={() => {
        setOpen(
          <CustomModal
            title="Create Funnel Product"
            subheading="Products created here can be used with PayPal."
          >
            <CreateFunnelProductForm subaccountId={subaccountId} />
          </CustomModal>
        )
      }}
    >
      <Plus size={15} />
      Create Product
    </Button>
  )
}

export default CreateFunnelProductButton
