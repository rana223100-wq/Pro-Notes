import type { Note, UserProfile, ThemePref } from '@/types';

const KEYS = {
  notes: 'pronotes.notes',
  profile: 'pronotes.profile',
  theme: 'pronotes.theme',
  folderLock: 'pronotes.folderLock', // password for the Lock folder
  folderLockSet: 'pronotes.folderLockSet',
};

export const storage = {
  loadNotes(): Note[] {
    try {
      const raw = localStorage.getItem(KEYS.notes);
      if (!raw) return [];
      return JSON.parse(raw) as Note[];
    } catch {
      return [];
    }
  },
  saveNotes(notes: Note[]) {
    try {
      localStorage.setItem(KEYS.notes, JSON.stringify(notes));
    } catch {
      // storage may be full from large attachments; best-effort
    }
  },

  loadProfile(): UserProfile | null {
    try {
      const raw = localStorage.getItem(KEYS.profile);
      return raw ? (JSON.parse(raw) as UserProfile) : null;
    } catch {
      return null;
    }
  },
  saveProfile(p: UserProfile | null) {
    if (p) localStorage.setItem(KEYS.profile, JSON.stringify(p));
    else localStorage.removeItem(KEYS.profile);
  },

  loadTheme(): ThemePref {
    const t = localStorage.getItem(KEYS.theme);
    return t === 'dark' || t === 'light' || t === 'system' ? t : 'system';
  },
  saveTheme(t: ThemePref) {
    localStorage.setItem(KEYS.theme, t);
  },

  loadFolderLock(): string | null {
    return localStorage.getItem(KEYS.folderLock);
  },
  setFolderLock(pw: string | null) {
    if (pw) {
      localStorage.setItem(KEYS.folderLock, pw);
      localStorage.setItem(KEYS.folderLockSet, '1');
    } else {
      localStorage.removeItem(KEYS.folderLock);
      localStorage.removeItem(KEYS.folderLockSet);
    }
  },
  isFolderLockSet(): boolean {
    return localStorage.getItem(KEYS.folderLockSet) === '1';
  },
};

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
