'use client';

import { useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { themeStore } from '~/lib/stores/theme';

export function ThemeSync() {
  const theme = useStore(themeStore);

  useEffect(() => {
    
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return null;
}
