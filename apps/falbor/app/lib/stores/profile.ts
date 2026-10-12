import { atom } from 'nanostores';

export interface CustomLink {
  title: string;
  url: string;
  description?: string;
}

export interface Profile {
  username: string;
  bio: string;
  avatar: string;
  cover: string;
  timezone: string;
  displayEmail: boolean;
  instagram: string;
  linkedin: string;
  twitter: string;
  customLinks: CustomLink[];
  location?: string;
  statusMessage?: string;
  skills?: string[];
  badges?: any[];
  stats?: {
    followers: number;
    following: number;
    views: number;
  };
  profileApps?: any[];
}

const storedProfile = typeof window !== 'undefined' ? localStorage.getItem('falbor_profile') : null;
const initialProfile: Profile = storedProfile
  ? JSON.parse(storedProfile)
  : {
      username: '',
      bio: '',
      avatar: '',
      cover: '',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      displayEmail: false,
      instagram: '',
      linkedin: '',
      twitter: '',
      customLinks: [],
      location: '',
      statusMessage: '',
      skills: [],
      badges: [],
      stats: { followers: 0, following: 0, views: 0 },
    };

export const profileStore = atom<Profile>(initialProfile);

export const updateProfile = (updates: Partial<Profile>) => {
  profileStore.set({ ...profileStore.get(), ...updates });
  if (typeof window !== 'undefined') {
    localStorage.setItem('falbor_profile', JSON.stringify(profileStore.get()));
  }
};

function authHeaders(): Record<string, string> {
  return {};
}

export const loadProfileFromServer = async () => {
  try {
    const res = await fetch('/api/profile', { headers: authHeaders() });
    if (!res.ok) return;
    const serverProfile = (await res.json()) as Profile;
    if (serverProfile.username || serverProfile.avatar || serverProfile.bio || serverProfile.cover || serverProfile.timezone) {
      profileStore.set(serverProfile);
      if (typeof window !== 'undefined') {
        localStorage.setItem('falbor_profile', JSON.stringify(serverProfile));
      }
    }
  } catch {
  }
};

export const saveProfileToServer = async (profile: Profile) => {
  try {
    await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(profile),
    });
  } catch {
  }
};
