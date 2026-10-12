import { atom } from 'nanostores';

const STORE_KEY = 'falbor_language';
const getInitialLanguage = () => {
  if (typeof window !== 'undefined') {
    const savedProfile = localStorage.getItem('falbor_user_profile');
    if (savedProfile) {
      try {
        const parsed = JSON.parse(savedProfile);
        if (parsed.language) return parsed.language;
      } catch (e) {
      }
    }
    const savedLang = localStorage.getItem(STORE_KEY);
    if (savedLang) return savedLang;
  }
  return 'en';
};

export const languageStore = atom<string>(getInitialLanguage());

export const setLanguage = (lang: string) => {
  languageStore.set(lang);
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORE_KEY, lang);
    
    try {
      const savedProfile = localStorage.getItem('falbor_user_profile');
      const profile = savedProfile ? JSON.parse(savedProfile) : {};
      profile.language = lang;
      localStorage.setItem('falbor_user_profile', JSON.stringify(profile));
    } catch (e) {
    }
  }
};
