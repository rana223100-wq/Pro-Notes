const KEY = 'pro-notes-v1';

export function loadNotes<T>(): T[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveNotes<T>(notes: T[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(notes));
  } catch {
    // storage full — silently ignore
  }
}
