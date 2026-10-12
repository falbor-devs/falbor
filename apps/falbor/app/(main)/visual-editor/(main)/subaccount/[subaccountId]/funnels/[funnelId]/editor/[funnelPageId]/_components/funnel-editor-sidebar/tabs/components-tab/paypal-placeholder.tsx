import { EditorBtns } from '~/lib/visual-editor/constants'
import { Wallet } from 'lucide-react'
import React from 'react'

type Props = {}

const PayPalPlaceholder = (props: Props) => {
  const handleDragStart = (e: React.DragEvent, type: EditorBtns) => {
    if (type === null) return
    e.dataTransfer.setData('componentType', type)
  }

  return (
    <div
      draggable
      onDragStart={(e) => handleDragStart(e, 'paypal')}
      className=" h-14 w-14 bg-muted rounded-lg flex items-center justify-center"
    >
      <Wallet
        size={40}
        className="text-muted-foreground"
      />
    </div>
  )
}

export default PayPalPlaceholder
