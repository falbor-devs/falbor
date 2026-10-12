import { useStore } from '@nanostores/react';
import { languageStore } from '../stores/language';
import { translations } from './translations';

export function useTranslation() {
  const currentLanguage = useStore(languageStore);

  const t = (key: string): string => {
    const dict = translations[currentLanguage] || translations.en;
    return dict[key] || translations.en[key] || key;
  };

  return { t, currentLanguage };
}
