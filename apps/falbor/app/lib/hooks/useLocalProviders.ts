import { useCallback, useState } from 'react';
import type { IProviderConfig } from '~/types/model';

export interface UseLocalProvidersReturn {
  localProviders: IProviderConfig[];
  refreshLocalProviders: () => void;
}

export function useLocalProviders(): UseLocalProvidersReturn {
  const [localProviders, setLocalProviders] = useState<IProviderConfig[]>([]);

  const refreshLocalProviders = useCallback(() => {

    setLocalProviders([]);
  }, []);

  return {
    localProviders,
    refreshLocalProviders,
  };
}
