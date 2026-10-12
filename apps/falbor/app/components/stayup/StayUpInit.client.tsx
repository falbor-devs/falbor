'use client';

import { useEffect } from 'react';
import stayup from 'falbor-stayup-sdk';

export function StayUpInit() {
  useEffect(() => {
    stayup.init({
      projectId: process.env.NEXT_PUBLIC_STAYUP_PROJECT_ID || 'ffa796bc-ae8a-46a7-926e-b1a46d72d5dd',
      apiKey: process.env.NEXT_PUBLIC_STAYUP_API_KEY || 'su_f0163cecd9d5464391cb9d7cece868a6',
      environment: process.env.NODE_ENV || 'development'
    });
  }, []);

  return null;
}
