import { atom } from 'nanostores';

export type DatabaseProvider = 'neon' | 'supabase' | null;
export const selectedDatabase = atom<DatabaseProvider>(null);
