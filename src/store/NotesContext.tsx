import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { storage, uid } from '@/lib/storage';
import { newNote, recomputeFromContent } from '@/lib/notes';
import type { Note, UserProfile } from '@/types';

interface NotesCtx {
  notes: Note[];
  profile: UserProfile | null;
  setProfile: (p: UserProfile | null) => void;
  createNote: () => Note;
  updateNote: (id: string, patch: Partial<Note>) => void;
  saveContent: (id: string, title: string, content: string) => void;
  deleteNote: (id: string) => void; // move to trash
  permanentDelete: (ids: string[]) => void;
  restoreNote: (id: string) => void;
  togglePin: (id: string) => void;
  toggleFavorite: (id: string) => void;
  setLocked: (id: string, locked: boolean, password?: string) => void;
  moveToLockFolder: (id: string) => void;
  moveOutFromLock: (ids: string[]) => void;
  totalNotes: () => number;
}

const Ctx = createContext<NotesCtx | null>(null);

export function NotesProvider({ children }: { children: ReactNode }) {
  const [notes, setNotes] = useState<Note[]>(() => storage.loadNotes());
  const [profile, setProfileState] = useState<UserProfile | null>(() => storage.loadProfile());

  const persist = useCallback((next: Note[]) => {
    setNotes(next);
    storage.saveNotes(next);
  }, []);

  const setProfile = useCallback((p: UserProfile | null) => {
    setProfileState(p);
    storage.saveProfile(p);
  }, []);

  const createNote = useCallback(() => {
    const n = newNote();
    persist([n, ...notes]);
    return n;
  }, [notes, persist]);

  const updateNote = useCallback((id: string, patch: Partial<Note>) => {
    setNotes((prev) => {
      const next = prev.map((n) => (n.id === id ? { ...n, ...patch, modifiedAt: Date.now() } : n));
      storage.saveNotes(next);
      return next;
    });
  }, []);

  const saveContent = useCallback((id: string, title: string, content: string) => {
    setNotes((prev) => {
      const next = prev.map((n) =>
        n.id === id ? recomputeFromContent({ ...n, title, content }) : n,
      );
      storage.saveNotes(next);
      return next;
    });
  }, []);

  const deleteNote = useCallback((id: string) => {
    setNotes((prev) => {
      const next = prev.map((n) => (n.id === id ? { ...n, inTrash: true, pinned: false } : n));
      storage.saveNotes(next);
      return next;
    });
  }, []);

  const permanentDelete = useCallback((ids: string[]) => {
    setNotes((prev) => {
      const set = new Set(ids);
      const next = prev.filter((n) => !set.has(n.id));
      storage.saveNotes(next);
      return next;
    });
  }, []);

  const restoreNote = useCallback((id: string) => {
    setNotes((prev) => {
      const next = prev.map((n) => (n.id === id ? { ...n, inTrash: false } : n));
      storage.saveNotes(next);
      return next;
    });
  }, []);

  const togglePin = useCallback((id: string) => {
    setNotes((prev) => {
      const next = prev.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n));
      storage.saveNotes(next);
      return next;
    });
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setNotes((prev) => {
      const next = prev.map((n) => (n.id === id ? { ...n, favorite: !n.favorite } : n));
      storage.saveNotes(next);
      return next;
    });
  }, []);

  const setLocked = useCallback((id: string, locked: boolean, password?: string) => {
    setNotes((prev) => {
      const next = prev.map((n) =>
        n.id === id
          ? { ...n, locked, lockPassword: locked ? password ?? n.lockPassword : undefined }
          : n,
      );
      storage.saveNotes(next);
      return next;
    });
  }, []);

  const moveToLockFolder = useCallback((id: string) => {
    setNotes((prev) => {
      const next = prev.map((n) => (n.id === id ? { ...n, inLockFolder: true } : n));
      storage.saveNotes(next);
      return next;
    });
  }, []);

  const moveOutFromLock = useCallback((ids: string[]) => {
    setNotes((prev) => {
      const set = new Set(ids);
      const next = prev.map((n) => (set.has(n.id) ? { ...n, inLockFolder: false } : n));
      storage.saveNotes(next);
      return next;
    });
  }, []);

  const totalNotes = useCallback(
    () => notes.filter((n) => !n.inTrash && !n.inLockFolder).length,
    [notes],
  );

  const value: NotesCtx = {
    notes,
    profile,
    setProfile,
    createNote,
    updateNote,
    saveContent,
    deleteNote,
    permanentDelete,
    restoreNote,
    togglePin,
    toggleFavorite,
    setLocked,
    moveToLockFolder,
    moveOutFromLock,
    totalNotes,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useNotes() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useNotes must be used within NotesProvider');
  return ctx;
}

export { uid };
