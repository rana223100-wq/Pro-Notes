
import { useEffect, useState } from 'react';
import { App as CapacitorApp } from '@capacitor/app';

import { Splash } from '@/components/Splash';
import { Home } from '@/components/Home';
import { NoteEditor } from '@/components/NoteEditor';
import { LockFolder } from '@/components/LockFolder';
import { Trash } from '@/components/Trash';
import { Account } from '@/components/Account';
import { LockedNoteGuard } from '@/components/LockedNoteGuard';
import { NotesProvider, useNotes } from '@/store/NotesContext';
import type { Category, Filter } from '@/types';

type Screen = 'home' | 'editor' | 'lock' | 'trash' | 'account';

function AppInner() {
  const {
    notes,
    saveContent,
    updateNote,
    deleteNote,
    moveToLockFolder,
  } = useNotes();

  const [screen, setScreen] = useState<Screen>('home');
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [unlockedNote, setUnlockedNote] = useState(false);
  const [lockAuthed, setLockAuthed] = useState(false);

  // Navigation Stack State
  const [filter, setFilter] = useState<Filter>('All');
  const [category, setCategory] = useState<Category>('All');
  const [prevScreen, setPrevScreen] = useState<Screen | null>(null);

  const activeNote =
    notes.find((n) => n.id === activeNoteId) ?? null;

  /*
   * Open a note.
   *
   * No matter where the note was opened from, pressing Back
   * from the note will now return to Home.
   */
  const openNote = (id: string) => {
    setPrevScreen(screen);
    setActiveNoteId(id);
    setUnlockedNote(false);
    setScreen('editor');
  };

  /*
   * Handle Back Navigation logic
   */
  const handleBack = () => {
    if (screen === 'editor') {
      setActiveNoteId(null);
      setUnlockedNote(false);
      setScreen(prevScreen || 'home');
      return;
    }

    if (screen === 'lock' || screen === 'trash' || screen === 'account') {
      if (screen === 'lock') {
        // Reset Lock Folder authentication when leaving the screen
        setLockAuthed(false);
      }
      setScreen('home');
      setFilter('All');
      return;
    }

    if (screen === 'home') {
      if (filter !== 'All' || category !== 'All') {
        setFilter('All');
        setCategory('All');
        return;
      }
    }

    // If we are at Home with no filters, exit
    CapacitorApp.exitApp();
  };

  const goHome = () => {
    setActiveNoteId(null);
    setUnlockedNote(false);
    setScreen('home');
    setFilter('All');
    setCategory('All');
  };

  /*
   * Android Back button / system back gesture.
   *
   * If we are anywhere other than Home:
   *     -> go Home
   *
   * If we are already on Home:
   *     -> allow Android to close the app.
   */
  useEffect(() => {
    let backListener: { remove: () => void } | null = null;

    const setupBackHandler = async () => {
      backListener = await CapacitorApp.addListener(
        'backButton',
        () => {
          // If in editor, let NoteEditor handle its own hardware back button
          // to ensure saving logic runs before screen navigation occurs.
          if (screen === 'editor') return;

          handleBack();
        }
      );
    };

    setupBackHandler();

    return () => {
      if (backListener) {
        backListener.remove();
      }
    };
  }, [screen]);

  return (
    <div
      className="h-full"
      style={{ background: 'var(--bg)' }}
    >
      {screen === 'home' && (
        <Home
          onOpenNote={openNote}
          onOpenLockFolder={() => setScreen('lock')}
          onOpenTrash={() => setScreen('trash')}
          onOpenAccount={() => setScreen('account')}
          filter={filter}
          setFilter={setFilter}
          category={category}
          setCategory={setCategory}
        />
      )}

      {screen === 'editor' && activeNote && (
        <LockedNoteGuard
          note={activeNote}
          onUnlocked={() => setUnlockedNote(true)}
          onBack={handleBack}
        >
          {(unlockedNote || !activeNote.locked) && (
            <NoteEditor
              note={activeNote}
              onBack={handleBack}
              onSaveContent={saveContent}
              onUpdate={updateNote}
              onDelete={deleteNote}
              onMoveToLockFolder={moveToLockFolder}
            />
          )}
        </LockedNoteGuard>
      )}

      {screen === 'lock' && (
        <LockFolder
          onBack={handleBack}
          onOpenNote={openNote}
          authed={lockAuthed}
          setAuthed={setLockAuthed}
        />
      )}

      {screen === 'trash' && (
        <Trash
          onBack={handleBack}
          onOpenNote={openNote}
        />
      )}

      {screen === 'account' && (
        <Account onBack={handleBack} />
      )}
    </div>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <NotesProvider>
      {showSplash && (
        <Splash
          onDone={() => setShowSplash(false)}
        />
      )}

      {!showSplash && <AppInner />}
    </NotesProvider>
  );
}
