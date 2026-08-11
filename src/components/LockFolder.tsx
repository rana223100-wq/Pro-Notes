import { useEffect, useState } from 'react';
import { ArrowLeft, LogOut, Lock } from 'lucide-react';
import { App as CapacitorApp } from '@capacitor/app';

import { NoteCard } from '@/components/NoteCard';
import { PasswordSheet } from '@/components/PasswordSheet';
import { storage } from '@/lib/storage';
import { useNotes } from '@/store/NotesContext';

interface LockFolderProps {
  onBack: () => void;
  onOpenNote: (id: string) => void;
  authed: boolean;
  setAuthed: (v: boolean) => void;
}

export function LockFolder({
  onBack,
  onOpenNote,
  authed,
  setAuthed,
}: LockFolderProps) {
  const {
    notes,
    togglePin,
    toggleFavorite,
    moveOutFromLock,
  } = useNotes();

  const isSet = storage.isFolderLockSet();

  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [menuFor, setMenuFor] = useState<string | null>(null);

  const lockedNotes = notes.filter(
    (n) => n.inLockFolder && !n.inTrash
  );

  /*
   * Leaving Lock Folder always destroys authentication.
   *
   * This means:
   * Lock Folder -> Home
   * Home -> Lock Folder
   * Password required again.
   */
  const leaveLockFolder = () => {
    setSelecting(false);
    setSelected(new Set());
    setMenuFor(null);

    // IMPORTANT:
    // Lock Folder authentication is removed when leaving.
    // App.tsx also handles this in its back navigation logic.
    setAuthed(false);

    onBack();
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      if (next.size === 0) {
        setSelecting(false);
      }

      return next;
    });
  };

  const moveSelectedOut = () => {
    if (selected.size === 0) return;

    moveOutFromLock([...selected]);

    setSelected(new Set());
    setSelecting(false);
  };

  /*
   * PASSWORD SCREEN
   *
   * Every time authed === false, the password screen is shown.
   */
  if (!authed) {
    return (
      <PasswordSheet
        open
        mode={isSet ? 'enter' : 'set'}
        expectedPassword={
          isSet
            ? storage.loadFolderLock() ?? undefined
            : undefined
        }
        onClose={leaveLockFolder}
        onSuccess={(pw) => {
          /*
           * First time only:
           * create the Lock Folder password.
           */
          if (!isSet) {
            storage.setFolderLock(pw);
          }

          /*
           * Password successfully verified.
           * User can now enter Lock Folder.
           */
          setAuthed(true);
        }}
      />
    );
  }

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: 'var(--bg)' }}
    >
      {/* =========================
          TOP BAR
         ========================= */}
      <div
        className="flex items-center gap-2 px-3 py-3 border-b border-app"
        style={{ background: 'var(--bg-elevated)' }}
      >
        {/* App Back Button */}
        <button
          type="button"
          onClick={leaveLockFolder}
          className="p-2 rounded-lg hover:bg-black/5"
          aria-label="Back"
          title="Back"
        >
          <ArrowLeft
            size={20}
            style={{ color: 'var(--text-main)' }}
          />
        </button>

        {/* Lock icon */}
        <Lock
          size={20}
          style={{ color: 'var(--accent)' }}
        />

        {/* Title */}
        <div
          className="font-semibold text-main flex-1"
        >
          Lock Folder
        </div>

        {/* Selected count */}
        {selecting && (
          <div className="text-sm text-muted mr-2">
            {selected.size} selected
          </div>
        )}

        {/* Move selected out */}
        {selecting && selected.size > 0 && (
          <button
            type="button"
            onClick={moveSelectedOut}
            className="p-2 rounded-lg text-white"
            style={{ background: 'var(--accent)' }}
            title="Move selected notes out"
            aria-label="Move selected notes out"
          >
            <LogOut size={17} />
          </button>
        )}

        {/* Select / Done */}
        <button
          type="button"
          onClick={() => {
            setSelecting((s) => !s);
            setSelected(new Set());
          }}
          className="px-3 py-1.5 rounded-lg text-sm font-medium text-main surface-soft border border-app"
        >
          {selecting ? 'Done' : 'Select'}
        </button>
      </div>

      {/* =========================
          LOCKED NOTES
         ========================= */}
      <div className="flex-1 overflow-y-auto p-4">
        {lockedNotes.length === 0 ? (
          <Empty text="No locked notes. Move notes here from a note's menu." />
        ) : (
          <div className="space-y-3 max-w-3xl mx-auto">
            {lockedNotes.map((n) => (
              <NoteCard
                key={n.id}
                note={n}
                selecting={selecting}
                selected={selected.has(n.id)}
                onToggleSelect={() => toggleSelect(n.id)}
                onOpen={() => onOpenNote(n.id)}
                onTogglePin={() => togglePin(n.id)}
                onToggleFavorite={() => toggleFavorite(n.id)}
                onMenu={() => setMenuFor(n.id)}
                showLockBadge
              />
            ))}
          </div>
        )}
      </div>

      {/* =========================
          NOTE MENU
         ========================= */}
      {menuFor && (
        <div
          className="fixed inset-0 z-50"
          onClick={() => setMenuFor(null)}
        >
          <div className="absolute inset-0 bg-black/30" />

          <div
            className="absolute z-10 surface rounded-xl shadow-2xl py-1 animate-pop-in"
            style={{
              right: 16,
              top: '50%',
              transform: 'translateY(-50%)',
              minWidth: 200,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => {
                if (menuFor) {
                  moveOutFromLock([menuFor]);
                }

                setMenuFor(null);
              }}
              className="flex items-center gap-3 w-full px-4 py-3 hover:bg-black/5 text-main text-left"
            >
              <LogOut size={17} />
              Move out from lock
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center h-full min-h-[200px]">
      <div className="text-center text-muted">
        {text}
      </div>
    </div>
  );
}