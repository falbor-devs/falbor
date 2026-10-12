'use client'
import { Badge } from '~/components/visual-editor/ui/badge'
import { EditorBtns } from '~/lib/visual-editor/constants'
import { getFunnel, getFunnelProducts, getSubaccountDetails } from '~/lib/visual-editor/queries'
import { EditorElement, useEditor } from '~/providers/visual-editor/editor/editor-provider'
import { PayPalButtons, PayPalScriptProvider } from '@paypal/react-paypal-js'
import clsx from 'clsx'
import { Trash } from 'lucide-react'
import React, { useEffect, useState } from 'react'

type Props = {
  element: EditorElement
}

const PayPalComponent = (props: Props) => {
  const { dispatch, state, subaccountId, funnelId } = useEditor()
  const [paypalClientId, setPaypalClientId] = useState('')
  const [totalPrice, setTotalPrice] = useState('0')
  const styles = props.element.styles

  useEffect(() => {
    if (!subaccountId || !funnelId) return
    const fetchData = async () => {
      const subaccountDetails = await getSubaccountDetails(subaccountId)
      if (subaccountDetails) {
        setPaypalClientId(subaccountDetails.paypalClientId || '')
      }

      const funnelData = await getFunnel(funnelId)
      if (funnelData) {
        const liveProducts: { productId: string; recurring: boolean }[] = JSON.parse(
          funnelData.liveProducts || '[]'
        )
        
        
        const allProducts = await getFunnelProducts(subaccountId)

        const selectedProducts = allProducts.filter(p => 
          liveProducts.some(lp => lp.productId === p.priceId)
        )

        const total = selectedProducts.reduce((acc, curr) => acc + parseFloat(curr.price), 0)
        setTotalPrice(total.toString())
      }
    }
    fetchData()
  }, [subaccountId, funnelId])

  const handleDragStart = (e: React.DragEvent, type: EditorBtns) => {
    if (type === null) return
    e.dataTransfer.setData('componentType', type)
  }

  const handleOnClickBody = (e: React.MouseEvent) => {
    e.stopPropagation()
    dispatch({
      type: 'CHANGE_CLICKED_ELEMENT',
      payload: {
        elementDetails: props.element,
      },
    })
  }

  const handleDeleteElement = () => {
    dispatch({
      type: 'DELETE_ELEMENT',
      payload: { elementDetails: props.element },
    })
  }

  return (
    <div
      style={styles}
      draggable
      onDragStart={(e) => handleDragStart(e, 'paypal')}
      onClick={handleOnClickBody}
      className={clsx(
        'p-[2px] w-full m-[5px] relative text-[16px] transition-all flex items-center justify-center editor-element',
        {
          'editor-element-selected':
            state.editor.selectedElement.id === props.element.id &&
            !state.editor.liveMode,
        }
      )}
    >
      {state.editor.selectedElement.id === props.element.id &&
        !state.editor.liveMode && (
          <Badge className="absolute -top-[23px] -left-[1px] rounded-none rounded-t-lg ">
            {state.editor.selectedElement.name}
          </Badge>
        )}

      <div className="border-none transition-all w-full flex items-center justify-center">
        {paypalClientId ? (
          <div className="w-full">
            <PayPalScriptProvider
              options={{
                clientId: paypalClientId,
                currency: 'USD',
                intent: 'capture',
              }}
            >
              <PayPalButtons
                style={{ layout: 'vertical' }}
                disabled={!state.editor.liveMode}
                createOrder={(data, actions) => {
                  return actions.order.create({
                    intent: 'CAPTURE',
                    purchase_units: [
                      {
                        amount: {
                          currency_code: 'USD',
                          value: totalPrice,
                        },
                      },
                    ],
                  })
                }}
                onApprove={async (data, actions) => {
                  if (actions.order) {
                    const capture = await actions.order.capture()
                    console.log('Payment Captured', capture)
                  }
                }}
              />
            </PayPalScriptProvider>
          </div>
        ) : (
          <div className="bg-white text-black p-4 rounded-lg border border-dashed border-slate-300 w-full text-center">
            Connect PayPal in Launchpad to see buttons
          </div>
        )}
      </div>

      {state.editor.selectedElement.id === props.element.id &&
        !state.editor.liveMode && (
          <div className="absolute bg-primary px-2.5 py-1 text-xs font-bold  -top-[25px] -right-[1px] rounded-none rounded-t-lg !text-white">
            <Trash
              className="cursor-pointer"
              size={16}
              onClick={handleDeleteElement}
            />
          </div>
        )}
    </div>
  )
}

export default PayPalComponent
