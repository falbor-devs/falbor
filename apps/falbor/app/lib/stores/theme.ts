import { atom } from 'nanostores';
import { logStore } from './logs';

export type Theme = 'dark' | 'light' | 'system';

export const kTheme = 'falbor_theme';

export function themeIsDark() {
  const theme = themeStore.get();
  if (theme === 'system') {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  }
  return theme === 'dark';
}

export const DEFAULT_THEME = 'system';

export const themeStore = atom<Theme>(initStore());

function initStore() {
  if (typeof window !== 'undefined') {
    const persistedTheme = localStorage.getItem(kTheme) as Theme | undefined;
    const themeAttribute = document.querySelector('html')?.getAttribute('data-theme');
    const theme = persistedTheme ?? (themeAttribute as Theme) ?? DEFAULT_THEME;

    let actualTheme = theme;
    if (theme === 'system') {
      actualTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    
    document.documentElement.setAttribute('data-theme', actualTheme);
    document.documentElement.classList.remove(actualTheme === 'dark' ? 'light' : 'dark');
    document.documentElement.classList.add(actualTheme);

    return theme;
  }

  return DEFAULT_THEME;
}

export function setTheme(newTheme: Theme) {
  themeStore.set(newTheme);
  localStorage.setItem(kTheme, newTheme);
  
  let actualTheme = newTheme;
  if (newTheme === 'system') {
    actualTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.querySelector('html')?.setAttribute('data-theme', actualTheme);

  try {
    const userProfile = localStorage.getItem('falbor_user_profile');
    if (userProfile) {
      const profile = JSON.parse(userProfile);
      profile.theme = newTheme;
      localStorage.setItem('falbor_user_profile', JSON.stringify(profile));
    }
  } catch (error) {
    console.error('Error updating user profile theme:', error);
  }
  logStore.logSystem(`Theme changed to ${newTheme} mode`);
}

export function toggleTheme() {
  const currentTheme = themeStore.get();
  let newTheme: Theme = currentTheme === 'dark' ? 'light' : 'dark';
  if (currentTheme === 'system') {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    newTheme = isDark ? 'light' : 'dark';
  }

  setTheme(newTheme);
}

