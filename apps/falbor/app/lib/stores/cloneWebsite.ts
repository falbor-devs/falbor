import { atom } from 'nanostores';

export const cloneWebsiteModalOpen = atom<boolean>(false);
export const cloneWebsitePayload = atom<{ prompt: string; images: string[] } | null>(null);
