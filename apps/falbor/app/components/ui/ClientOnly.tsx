'use client';
import { useState, useEffect } from 'react';
import { MainContentSpinner } from './MainContentSpinner';

export function ClientOnly({ children, fallback = <MainContentSpinner /> }: { children: () => React.ReactNode, fallback?: React.ReactNode }) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return <>{fallback}</>;
  }

  return <>{children()}</>;
}
