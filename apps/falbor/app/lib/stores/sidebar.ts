import { atom } from 'nanostores';

const IS_BROWSER = typeof window !== 'undefined';

export const sidebarOpen = atom(false);
export const sidebarPinned = atom(
  IS_BROWSER ? localStorage.getItem('falbor_sidebar_pinned') === 'true' : false
);

sidebarPinned.listen((value) => {
  if (IS_BROWSER) {
    localStorage.setItem('falbor_sidebar_pinned', value ? 'true' : 'false');
  }
});