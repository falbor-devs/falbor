"use client"

import React, { useState, useEffect } from "react"
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js"

interface CheckoutClientProps {
  clientId: string;
}

export default function CheckoutClient({ clientId }: CheckoutClientProps) {
  const [amount, setAmount] = useState<number>(0);
  const [tier, setTier] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    
    const params = new URLSearchParams(window.location.search);
    const amtStr = params.get('amount');
    const tierStr = params.get('tier');

    if (amtStr) {
      setAmount(parseInt(amtStr, 10));
    }

    if (tierStr) {
      setTier(tierStr);
    }

    if (clientId && clientId.trim() !== '') {
      setStatus('ready');
    } else {
      setStatus('error');
    }
  }, [clientId]);

  const onApprove = async (data: any, actions: any) => {
    try {
      const details = await actions.order.capture()

      
      const body: any = {
        orderId: details.id,
        amount: amount * 100, 
      }

      if (tier) body.tier = tier.toLowerCase()

      const res = await fetch("/api/user/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        setStatus('success');
        const bc = new BroadcastChannel('paypal_checkout');
        bc.postMessage({ type: 'PAYMENT_SUCCESS' });
        setTimeout(() => { window.close(); }, 3000);
      } else {
        const errData = await res.json().catch(() => ({}));
        setErrorMsg(errData.detail || errData.error || `Server responded with ${res.status}`);
        setStatus('error');
      }
    } catch (e) {
      console.error(e);
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
        <div className="bg-green-500/10 border border-green-500/30 p-8 rounded-2xl flex flex-col items-center max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-6">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2">Payment Successful!</h1>
          <p className="text-gray-400 mb-6">Your balance has been updated in the main app.</p>
          <p className="text-sm text-gray-500">This window will close automatically. If it doesn't, you can safely close it.</p>
          <button
            onClick={() => window.close()}
            className="mt-6 px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            Close Window
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
      <div className="bg-gray-800 border border-gray-700 p-8 rounded-2xl max-w-md w-full text-center shadow-2xl">
        <h1 className="text-2xl font-bold mb-2 text-white">Complete Purchase</h1>

        {tier ? (
          <p className="text-gray-400 mb-8">You are upgrading to the <strong className="text-purple-400">{tier}</strong> plan</p>
        ) : (
          <p className="text-gray-400 mb-8">You are adding <strong>{amount} Credits</strong> to your AI balance.</p>
        )}

        {status === 'loading' && <div className="text-purple-400">Loading checkout...</div>}

        {status === 'error' && (
          <div className="text-red-400 p-4 bg-red-400/10 rounded-lg text-sm text-left break-words">
            <strong>Payment Error:</strong><br />
            {errorMsg ? errorMsg : "There was an error initializing the payment or capturing the order. Please try again."}<br /><br />
            <strong>Debug info:</strong> clientId length is {clientId ? clientId.length : 0}.<br />
            Check the browser console (F12 {'->'} Console) for more details.
          </div>
        )}

        {status === 'ready' && amount > 0 && (
          <div className="mt-4 relative z-0 min-h-[150px]">
            <PayPalScriptProvider
              options={{
                clientId: clientId,
                currency: "USD",
                intent: "capture",
                components: "buttons",
              }}
            >
              <PayPalButtons
                style={{ layout: "vertical", shape: "rect", color: "blue" }}
                createOrder={(data, actions) => {
                  return actions.order.create({
                    intent: "CAPTURE",
                    purchase_units: [
                      {
                        amount: {
                          value: amount.toString(),
                          currency_code: "USD",
                        },
                      },
                    ],
                  })
                }}
                onApprove={onApprove}
                onError={(err: any) => {
                  console.error("PayPal Error:", err);
                  setErrorMsg(err?.message || err?.toString() || "Unknown PayPal SDK error");
                  setStatus('error');
                }}
              />
            </PayPalScriptProvider>
          </div>
        )}
      </div>
    </div>
  )
}
