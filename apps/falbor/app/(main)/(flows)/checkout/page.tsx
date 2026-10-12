import React from 'react';
import CheckoutClient from './CheckoutClient';

export default function CheckoutPage() {
  
  const clientId = (process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '').trim();
  
  return <CheckoutClient clientId={clientId} />;
}
